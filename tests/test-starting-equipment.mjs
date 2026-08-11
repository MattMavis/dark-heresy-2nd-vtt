// Every background's starting equipment, resolved against the real item packs.
//
// This sweep exists because the wizard spent its whole life listing starting equipment on the
// summary step and granting none of it: `equipmentSummary` returned a boolean where the apply
// step expected a compendium entry. Nothing caught it, because the display half was correct.
// Now that the grant works, an equipment name that does not resolve means a player quietly does
// not receive an item, so the resolution rate is worth watching.
//
// Deliberately warn-only for individual names. Equipment is prose ("3 doses of Stimm",
// "12 lho sticks") and some of it genuinely has no pack entry; failing the build on each would
// mean either bad data or a bad test, and there is no way to tell which from here. What IS
// asserted is that resolution never throws, that the strip-and-retry pass earns its keep, and
// that the overall rate does not regress -- a refactor that broke matching outright would drop it
// off a cliff and fail here.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { findEquipmentEntry, normaliseName } from '../src/module/rules/grant-resolution.mjs';
import { backgrounds } from '../src/module/rules/backgrounds.mjs';
import { check, done } from './harness.mjs';

/* -------------------------------------------- */
/*  An index of every item the packs ship        */
/* -------------------------------------------- */

/** The pack sources are multi-document YAML; every document has a top-level `name:`. Read the
 * names directly rather than pulling in a YAML parser for one field. */
function packItemNames() {
    const packsDir = fileURLToPath(new URL('../src/packs/', import.meta.url));
    const names = [];
    for (const pack of readdirSync(packsDir, { withFileTypes: true })) {
        if (!pack.isDirectory()) continue;
        for (const file of readdirSync(`${packsDir}${pack.name}`)) {
            if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue;
            const text = readFileSync(`${packsDir}${pack.name}/${file}`, 'utf8');
            for (const line of text.split(/\r?\n/)) {
                const m = /^name:\s*(?:'(.*)'|"(.*)"|(.*\S))\s*$/.exec(line);
                if (m) names.push((m[1] ?? m[2] ?? m[3]).trim());
            }
        }
    }
    return names;
}

const NAMES = packItemNames();
const index = new Map();
for (const name of NAMES) {
    const key = normaliseName(name);
    if (!index.has(key)) index.set(key, { name });
}

// A floor rather than the exact 842, so adding content does not fail this.
check('the packs yielded a real item index', NAMES.length > 500, true);

/* -------------------------------------------- */
/*  The matcher itself                           */
/* -------------------------------------------- */

check('an exact name matches', findEquipmentEntry(index, 'Chrono')?.name, 'Chrono');
check('case and punctuation are folded', findEquipmentEntry(index, 'chrono')?.name, 'Chrono');
check('an invented item does not match', findEquipmentEntry(index, 'Sonic Screwdriver'), null);
check('nothing throws on empty or missing text',
    () => [findEquipmentEntry(index, ''), findEquipmentEntry(index, undefined)], [null, null]);

/* -------------------------------------------- */
/*  The sweep                                    */
/* -------------------------------------------- */

/** Every equipment name a background can start with: the fixed list plus every option of every
 * choice group, since a player may pick any of them. */
function equipmentNames(background) {
    const structured = background.starting_equipment_structured;
    if (!structured) return [];
    const names = [...(structured.fixed_equipment ?? [])];
    for (const group of structured.equipment_choices ?? []) names.push(...(group.options ?? []));
    return names;
}

const all = [];
for (const background of backgrounds()) {
    for (const name of equipmentNames(background)) all.push({ background: background.name, name });
}

check('every background carries structured starting equipment',
    backgrounds().filter((b) => !equipmentNames(b).length).map((b) => b.name), []);

const unresolved = [];
let strippedMatches = 0;
for (const entry of all) {
    let match = null;
    try {
        match = findEquipmentEntry(index, entry.name);
    } catch (err) {
        match = null;
        entry.threw = err.message;
    }
    if (!match) unresolved.push(entry);
    else if (normaliseName(match.name) !== normaliseName(entry.name)) strippedMatches += 1;
}

const rate = (all.length - unresolved.length) / all.length;
console.log(`\n  (swept ${all.length} starting-equipment names across ${backgrounds().length} backgrounds)`);
console.log(`  resolved ${all.length - unresolved.length}/${all.length} (${(rate * 100).toFixed(0)}%), ` +
    `${strippedMatches} of them only after stripping a quantity or parenthetical`);
if (unresolved.length) {
    console.log('  WARN  these resolve to nothing and would be listed as "add manually":');
    for (const u of unresolved) console.log(`          ${u.background}: "${u.name}"${u.threw ? ` (threw: ${u.threw})` : ''}`);
}

check('resolving equipment never throws', all.filter((e) => e.threw).map((e) => e.name), []);
check('the strip-and-retry pass matches things an exact lookup would miss', strippedMatches > 0, true);
// A floor, not a target: it catches matching breaking wholesale, and does not police content.
// Sitting at 80% as this lands, with all 20 misses listed above for triage.
check('most starting equipment still resolves', rate > 0.75, true);

done();
