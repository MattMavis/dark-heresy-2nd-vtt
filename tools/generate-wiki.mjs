// Generate GitHub-wiki-ready markdown reference pages from the compendium pack YAML.
//
//     node tools/generate-wiki.mjs [outDir]      (default: build/wiki)
//
// Why this exists: the compendium YAML under src/packs is the single source of truth for every
// weapon, talent, power and so on, but nobody reads YAML for fun. This turns it into one page per
// pack on the project's GitHub wiki, plus an index and sidebar, so players and GMs can browse it.
//
// Determinism is the whole point of the design below -- a CI job regenerates this output and
// diffs it against what is checked into the wiki to catch drift, so the same YAML must produce
// byte-identical markdown on every run, on every machine. That rules out anything that depends on
// object key insertion order being stable by luck, on `Array.prototype.sort`'s locale defaults
// (which vary by ICU data, not just by OS), or on the current date. Every sort below compares
// lower-cased strings directly instead of calling `localeCompare` with no explicit locale, and
// nothing here reads the clock.
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PACKS_DIR = join(ROOT, 'src', 'packs');

/* -------------------------------------------------------------------------------------------- */
/*  Text cleanup                                                                                  */
/* -------------------------------------------------------------------------------------------- */

// Only the entities that actually turn up in Foundry text content -- this is not a general HTML
// decoder, just enough to undo what a rich-text editor would have written.
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeEntities(text) {
    return text.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body) => {
        if (body[0] === '#') {
            const codePoint = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
            return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
        }
        return ENTITIES[body] ?? match;
    });
}

// Cut text to roughly `max` characters without severing a word, then mark the cut with an
// ellipsis. Breaking on the last space keeps "Fate point, roll 1d10. On a result of 7-10, the…"
// from turning into "...resul…".
function truncate(text, max) {
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    const trimmed = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
    return `${trimmed.trimEnd()}…`;
}

// The one pipeline every table cell goes through: strip any rich-text markup, decode entities,
// fold embedded newlines/runs of whitespace down to single spaces (a YAML folded scalar already
// does most of this, but nothing here should depend on that), optionally truncate long prose, and
// only THEN escape pipes -- escaping first and truncating second risks slicing a `\|` pair in two.
// Foundry inline-roll syntax -- `[[@pr/2]]`, `[[1d10]]` -- is byte-identical to GitHub's
// wiki-link syntax, so leaving it as written turns every formula in the pack text into a link to
// a page called "@pr/2". It is rewritten to a code span instead: unambiguous on the wiki, and it
// reads as the formula it is. Done after truncation, because truncating afterwards could slice a
// code span and leave an unbalanced backtick.
function cellText(raw, { longProse = false } = {}) {
    if (raw === null || raw === undefined) return '';
    let text = String(raw);
    text = text.replace(/<[^>]*>/g, '');
    text = decodeEntities(text);
    text = text.replace(/\s+/g, ' ').trim();
    if (longProse) text = truncate(text, 160);
    text = neutraliseInlineRolls(text);
    text = text.replace(/\|/g, '\\|');
    return text;
}

/*
 * `[[expr]]` -> `` `expr` ``. Truncation can leave a half-open `[[` with no closer, and a stray
 * `]]` is possible in hand-authored description text, so anything left over after the balanced
 * pass is escaped rather than left to be interpreted.
 */
function neutraliseInlineRolls(text) {
    return text
        .replace(/\[\[([^\]]+)\]\]/g, (_match, expr) => `\`${expr}\``)
        .replace(/\[\[/g, '\\[\\[')
        .replace(/\]\]/g, '\\]\\]');
}

function titleCaseWord(word) {
    return word ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

// 'mental-disorders' -> 'Mental-Disorders'. Wiki pages are flat files named after their title, so
// this doubles as both the page title and the filename stem.
function pageName(packDir) {
    return packDir.split('-').map(titleCaseWord).join('-');
}

// Case-insensitive compare without `localeCompare` -- see the determinism note at the top of the
// file for why. Good enough for the plain-English names in this data set.
function byLowerCase(getKey) {
    return (a, b) => {
        const ak = getKey(a).toLowerCase();
        const bk = getKey(b).toLowerCase();
        return ak < bk ? -1 : ak > bk ? 1 : 0;
    };
}

/* -------------------------------------------------------------------------------------------- */
/*  Formatters for the nested shapes a handful of packs use                                      */
/* -------------------------------------------------------------------------------------------- */

// rateOfFire is {single, burst, full}. `single` is a yes/no flag (can the weapon fire one shot);
// `burst` and `full` are round counts. Melee weapons carry the sentinel {-1,-1,-1} for "not a
// ranged weapon" rather than leaving the field blank.
function formatRateOfFire(rof) {
    if (!rof) return '';
    const { single, burst = 0, full = 0 } = rof;
    if (single === -1) return '—';
    const count = (n) => (n > 0 ? String(n) : '-');
    return `${single ? 'S' : '-'}/${count(burst)}/${count(full)}`;
}

// A `special`/flags object such as a weapon's qualities or ammo's special rules: boolean keys
// become their own label, numeric keys get the number in parentheses (e.g. a weapon's Blast(3)).
function formatFlags(flags) {
    if (!flags || typeof flags !== 'object') return '';
    return Object.entries(flags)
        .filter(([, value]) => value !== false && value !== '' && value !== null && value !== undefined)
        .map(([key, value]) => {
            const label = key.split('-').map(titleCaseWord).join('-');
            return value === true ? label : `${label} (${value})`;
        })
        .join(', ');
}

// Armour's armourPoints is always populated and always symmetric left/right in this data set
// (verified against every document in the pack), so arms/legs collapse to one number unless a
// future entry breaks that pattern, in which case both sides are shown.
function formatArmourPoints(ap) {
    if (!ap) return '';
    const { body = 0, head = 0, leftArm = 0, rightArm = 0, leftLeg = 0, rightLeg = 0 } = ap;
    const arms = leftArm === rightArm ? String(leftArm) : `${leftArm}/${rightArm}`;
    const legs = leftLeg === rightLeg ? String(leftLeg) : `${leftLeg}/${rightLeg}`;
    return `Body ${body} / Head ${head} / Arms ${arms} / Legs ${legs}`;
}

// Cybernetics' armourPoints is the opposite case: almost always all zero (only 3 of 32 implants
// grant any), so it is shown as a short list of the locations that actually get a bonus rather
// than six mostly-zero columns.
function formatCyberneticArmour(ap) {
    if (!ap) return '';
    const labels = { body: 'Body', head: 'Head', leftArm: 'Left Arm', rightArm: 'Right Arm', leftLeg: 'Left Leg', rightLeg: 'Right Leg' };
    return Object.entries(ap)
        .filter(([, value]) => value)
        .map(([key, value]) => `${labels[key] ?? key} +${value}`)
        .join(', ');
}

function formatSpeed(speed) {
    if (!speed) return '';
    return `${speed.cruising ?? ''}/${speed.tactical ?? ''}`;
}

// integrity also carries `value` (always equal to `max` in the compendium -- these are templates,
// not damaged vehicles) and `critical` (always 0), so only `max` is worth a column.
function formatIntegrity(integrity) {
    return integrity?.max != null ? String(integrity.max) : '';
}

// A psychic power's target is an opposed-test description built from up to five fields
// (characteristic-or-skill, a bonus, and the same pair for what it is opposed by). This renders
// it as the short form a player would actually read, e.g. "Willpower -20 vs Opposed Willpower".
function formatPsychicTarget(target) {
    if (!target || typeof target !== 'object') return '';
    const base = target.useSkill && target.skill ? titleCaseWord(target.skill) : titleCaseWord(target.characteristic);
    if (!base) return '';
    const signed = (n) => (n > 0 ? `+${n}` : String(n));
    let text = base;
    if (target.bonus) text += ` ${signed(target.bonus)}`;
    if (target.isOpposed) {
        const opposedBase = target.useOpposedSkill && target.opposedSkill ? titleCaseWord(target.opposedSkill) : titleCaseWord(target.opposed) || base;
        text += ` vs ${opposedBase}`;
        if (target.opposedBonus) text += ` ${signed(target.opposedBonus)}`;
    }
    return text;
}

/* -------------------------------------------------------------------------------------------- */
/*  Column definitions, one set per pack                                                         */
/* -------------------------------------------------------------------------------------------- */

// `get` always receives (system, doc) -- `system` is the already-unwrapped system-data object
// (`doc.system` for psychic-powers/vehicles, `doc.data` for everything else; see loadDocs below),
// `doc` is the raw document for the rare column that needs a top-level field. `longProse: true`
// marks the free-text columns that get the 160-character truncation; every other column is shown
// in full.
function col(header, get, { longProse = false } = {}) {
    return { header, get, longProse };
}

// Fields that only ever hold runtime/instance state -- not reference data -- are left out of
// every pack below, rather than threaded through as a special case per pack:
//   - `equipped` / `installed` (always `false` in the compendium; set when an item is carried)
//   - `modifications` (always `[]`; populated only once a weapon mod is actually attached)
//   - `choice` / `conditionalBonuses` (selection placeholders such as Enemy's unset faction
//     choice, or a condition like "+20 when scanning" that only matters on a placed actor)
// All four were confirmed empty/constant across their packs before being excluded.
const PACKS = [
    {
        dir: 'weapons',
        columns: [
            col('Class', (sys) => sys.class),
            col('Damage', (sys) => sys.damage),
            col('Damage Type', (sys) => sys.damageType),
            col('Penetration', (sys) => sys.penetration),
            col('Range', (sys) => sys.range),
            col('RoF (S/B/F)', (sys) => formatRateOfFire(sys.rateOfFire)),
            col('Clip', (sys) => sys.clip?.max),
            col('Reload', (sys) => sys.reload),
            col('Special', (sys) => formatFlags(sys.special)),
            col('Weight', (sys) => sys.weight),
            col('Availability', (sys) => sys.availability),
            col('Craftsmanship', (sys) => sys.craftsmanship),
            col('Source', (sys) => sys.source),
            // Every one of the 178 weapons ships with an empty `description` -- the flavour text
            // simply was not written for this pack. The column is dropped automatically because
            // it comes out empty for every row; it is not a bug in this generator.
            col('Description', (sys) => sys.description, { longProse: true }),
        ],
    },
    {
        dir: 'talents',
        columns: [
            col('Tier', (sys) => sys.tier),
            // `cost` is "0" for all 154 talents -- XP cost is evidently computed from tier
            // elsewhere rather than stored per-talent. Shown as-is rather than hidden, since a
            // column of zeroes is still an accurate (if unhelpful) report of the source data.
            col('Cost', (sys) => sys.cost),
            col('Aptitudes', (sys) => sys.aptitudes),
            col('Prerequisites', (sys) => sys.prerequisites),
            col('Source', (sys) => sys.source),
            col('Benefit', (sys) => sys.benefit, { longProse: true }),
        ],
    },
    {
        dir: 'psychic-powers',
        columns: [
            col('Discipline', (sys) => sys.discipline),
            col('Cost', (sys) => sys.cost),
            col('Prerequisite', (sys) => sys.prerequisite),
            col('Action', (sys) => sys.action),
            col('Subtype', (sys) => sys.subtype),
            col('Sustained', (sys) => sys.sustained),
            col('Range', (sys) => sys.range),
            col('Damage', (sys) => sys.damage),
            col('Damage Type', (sys) => sys.damageType),
            col('Penetration', (sys) => sys.penetration),
            col('Target', (sys) => formatPsychicTarget(sys.target)),
            col('Special', (sys) => formatFlags(sys.special)),
            col('Source', (sys) => sys.source),
            col('Description', (sys) => sys.description, { longProse: true }),
        ],
    },
    {
        dir: 'traits',
        columns: [
            // `level` is "0" for all 57 traits in the compendium -- the real value (e.g. Natural
            // Armour (2)) is assigned per-creature when the trait is applied to an actor, not
            // stored on the template. Shown as-is for the same reason talents' Cost is.
            col('Level', (sys) => sys.level),
            // Not in the pack-shape notes this generator started from, but present and populated
            // for 16 of 57 traits -- worth keeping rather than dropping.
            col('Source', (sys) => sys.source),
            col('Description', (sys) => sys.description, { longProse: true }),
        ],
    },
    {
        dir: 'gear',
        columns: [
            col('Availability', (sys) => sys.availability),
            col('Craftsmanship', (sys) => sys.craftsmanship),
            col('Weight', (sys) => sys.weight),
            col('Source', (sys) => sys.source),
            col('Description', (sys) => sys.description, { longProse: true }),
        ],
    },
    {
        dir: 'attack-specials',
        columns: [
            // `hasLevel` genuinely varies (13 of 40 qualities take a parenthetical value such as
            // Blast(3)); the raw `level` field does not -- it is "0" for every single entry,
            // because the actual number is set when the quality is applied to a specific weapon.
            // Showing the literal 0 would be noise, so this column reports whether a level
            // applies rather than its always-zero compendium value.
            col('Level', (sys) => (sys.hasLevel ? '(set per weapon)' : '—')),
            col('Description', (sys) => sys.description, { longProse: true }),
        ],
    },
    {
        dir: 'tools',
        columns: [
            col('Availability', (sys) => sys.availability),
            col('Craftsmanship', (sys) => sys.craftsmanship),
            col('Weight', (sys) => sys.weight),
            col('Description', (sys) => sys.description, { longProse: true }),
        ],
    },
    {
        dir: 'armour',
        columns: [
            col('Type', (sys) => sys.type),
            col('Armour Points', (sys) => formatArmourPoints(sys.armourPoints)),
            col('Max Agility', (sys) => sys.maxAgility),
            col('Availability', (sys) => sys.availability),
            col('Craftsmanship', (sys) => sys.craftsmanship),
            col('Weight', (sys) => sys.weight),
            col('Description', (sys) => sys.description, { longProse: true }),
        ],
    },
    {
        dir: 'weapon-mods',
        columns: [
            col('Availability', (sys) => sys.availability),
            col('Craftsmanship', (sys) => sys.craftsmanship),
            col('Weight', (sys) => sys.weight),
            col('Upgrades', (sys) => sys.upgrades),
            col('Description', (sys) => sys.description, { longProse: true }),
        ],
    },
    {
        dir: 'cybernetics',
        columns: [
            col('Armour Points', (sys) => formatCyberneticArmour(sys.armourPoints)),
            col('Availability', (sys) => sys.availability),
            col('Craftsmanship', (sys) => sys.craftsmanship),
            col('Weight', (sys) => sys.weight),
            col('Description', (sys) => sys.description, { longProse: true }),
        ],
    },
    {
        dir: 'ammo',
        columns: [
            col('Weapon Type', (sys) => sys.weapon_type),
            col('Damage', (sys) => sys.damage),
            // Capitalisation is inconsistent in the source ('Energy' vs 'energy') -- left as-is
            // rather than silently normalised, since fixing data is out of scope here.
            col('Damage Type', (sys) => sys.damageType),
            col('Penetration', (sys) => sys.penetration),
            col('Effect', (sys) => sys.effect, { longProse: true }),
            col('Special', (sys) => formatFlags(sys.special)),
            col('Availability', (sys) => sys.availability),
        ],
    },
    {
        dir: 'aptitudes',
        // No `source` field at all in this pack (unlike mutations/malignancies/mental-disorders,
        // which share the same two-field shape elsewhere) -- confirmed absent on all 19 entries.
        columns: [col('Description', (sys) => sys.description, { longProse: true })],
    },
    {
        dir: 'mutations',
        columns: [col('Source', (sys) => sys.source), col('Description', (sys) => sys.description, { longProse: true })],
    },
    {
        dir: 'malignancies',
        columns: [col('Source', (sys) => sys.source), col('Description', (sys) => sys.description, { longProse: true })],
    },
    {
        dir: 'mental-disorders',
        columns: [col('Source', (sys) => sys.source), col('Description', (sys) => sys.description, { longProse: true })],
    },
    {
        dir: 'consumables',
        columns: [
            // The one pack-level field worth pulling up from the document instead of `system`/
            // `data`: the doc's own `type` splits this pack into drugs vs. plain consumables
            // (Ration Pack, Sacred Unguents), which the task's field list did not call out.
            col('Type', (_sys, doc) => doc.type),
            col('Availability', (sys) => sys.availability),
            col('Craftsmanship', (sys) => sys.craftsmanship),
            col('Weight', (sys) => sys.weight),
            col('Description', (sys) => sys.description, { longProse: true }),
        ],
    },
    {
        dir: 'vehicles',
        columns: [
            col('Type', (sys) => sys.type),
            col('Front', (sys) => sys.front),
            col('Side', (sys) => sys.side),
            col('Rear', (sys) => sys.rear),
            col('Speed (Cruising/Tactical)', (sys) => formatSpeed(sys.speed)),
            col('Crew', (sys) => sys.crew),
            col('Manoeuvrability', (sys) => sys.manoeuverability),
            col('Carrying Capacity', (sys) => sys.carryingCapacity),
            col('Integrity', (sys) => formatIntegrity(sys.integrity)),
            col('Size', (sys) => sys.size),
            col('Threat Level', (sys) => sys.threatLevel),
            col('Availability', (sys) => sys.availability),
            // `faction`/`subfaction` are dropped automatically below -- every one of the 7
            // vehicles ships with both set to ''.
            col('Faction', (sys) => sys.faction),
            col('Subfaction', (sys) => sys.subfaction),
        ],
    },
];

/* -------------------------------------------------------------------------------------------- */
/*  YAML loading                                                                                 */
/* -------------------------------------------------------------------------------------------- */

function loadPackDocs(packDir) {
    const file = join(PACKS_DIR, packDir, `${packDir}.yml`);
    const text = readFileSync(file, 'utf8');
    return yaml.loadAll(text).filter(Boolean);
}

// Most packs nest their fields under `data`; psychic-powers and vehicles use `system` instead.
// Preferring `system` and falling back to `data` handles both without needing to know per pack.
function systemOf(doc) {
    return doc.system ?? doc.data ?? {};
}

/* -------------------------------------------------------------------------------------------- */
/*  Markdown rendering                                                                            */
/* -------------------------------------------------------------------------------------------- */

function renderTable(headers, rows) {
    const headerLine = `| ${headers.join(' | ')} |`;
    const dividerLine = `| ${headers.map(() => '---').join(' | ')} |`;
    const bodyLines = rows.map((row) => `| ${row.join(' | ')} |`);
    return [headerLine, dividerLine, ...bodyLines].join('\n');
}

function pluralDocs(count) {
    return `${count} document${count === 1 ? '' : 's'}`;
}

// Build one pack's page: sort its documents by name, render every candidate column for every
// document, then drop whichever columns came out empty for all of them (this is also how
// vehicles' always-blank faction/subfaction and weapons' always-blank description disappear,
// without a special case for either).
function renderPackPage(pack, docs) {
    const sortedDocs = [...docs].sort(byLowerCase((d) => d.name));
    const rows = sortedDocs.map((doc) => {
        const sys = systemOf(doc);
        return {
            name: cellText(doc.name),
            cells: pack.columns.map((c) => cellText(c.get(sys, doc), { longProse: c.longProse })),
        };
    });

    const keptColumns = pack.columns.map((_, i) => i).filter((i) => rows.some((row) => row.cells[i] !== ''));
    const headers = ['Name', ...keptColumns.map((i) => pack.columns[i].header)];
    const tableRows = rows.map((row) => [row.name, ...keptColumns.map((i) => row.cells[i])]);

    const title = pageName(pack.dir);
    return [
        `# ${title}`,
        '',
        `*${pluralDocs(docs.length)}, generated from \`src/packs/${pack.dir}/${pack.dir}.yml\` by \`tools/generate-wiki.mjs\` — do not edit by hand.*`,
        '',
        renderTable(headers, tableRows),
        '',
    ].join('\n');
}

// RollTables (tables.yml) do not fit the Name-indexed column layout every other pack uses: a
// table is a formula plus a weighted list of ranges, not a flat record. Each table gets its own
// section with its own Roll/Result table instead of being forced into the generic shape.
function renderTablesPage(docs) {
    const sortedDocs = [...docs].sort(byLowerCase((d) => d.name));
    const sections = sortedDocs.map((table) => {
        const results = [...(table.results ?? [])].sort((a, b) => (a.range?.[0] ?? 0) - (b.range?.[0] ?? 0));
        const resultRows = results.map((r) => {
            const [low, high] = r.range ?? [];
            const range = high === undefined || high === low ? cellText(low) : `${cellText(low)}-${cellText(high)}`;
            return [range, cellText(r.text, { longProse: true })];
        });
        return [
            `## ${cellText(table.name)}`,
            '',
            `*Formula: \`${cellText(table.formula)}\`*`,
            '',
            cellText(table.description),
            '',
            renderTable(['Roll', 'Result'], resultRows),
            '',
        ].join('\n');
    });

    return [
        '# Tables',
        '',
        `*${pluralDocs(docs.length)}, generated from \`src/packs/tables/tables.yml\` by \`tools/generate-wiki.mjs\` — do not edit by hand. RollTables carry a formula plus weighted ranges rather than the flat fields every other pack has, so each one gets its own Roll/Result table below instead of being squeezed into the usual layout.*`,
        '',
        ...sections,
    ].join('\n');
}

function renderCompendiumIndex(summaries) {
    const total = summaries.reduce((sum, s) => sum + s.count, 0);
    return [
        '# Compendium',
        '',
        '*Index of every compendium pack, generated by `tools/generate-wiki.mjs` — do not edit by hand.*',
        '',
        ...summaries.map((s) => `- [[${s.title}]] — ${pluralDocs(s.count)}`),
        '',
        `**Total: ${pluralDocs(total)} across ${summaries.length} packs.**`,
        '',
    ].join('\n');
}

/*
 * The hand-written pages the sidebar links alongside the generated ones. They live in `wiki/`
 * in the repo and are copied into the wiki beside this output, so the sidebar has to name them
 * even though nothing here produces them. Keep in step with the files in that directory --
 * tests/test-wiki-generator.mjs fails if the two disagree in either direction.
 *
 * `page` is the filename stem, which is what a wiki link actually resolves against; `label` is
 * what the sidebar shows. They differ for the rules pages because "Rules: Combat Turn" cannot
 * be a filename -- a colon is not legal in one on Windows.
 */
const PROSE_SECTIONS = [
    {
        heading: 'Automation',
        pages: [
            { page: 'Character-Creation', label: 'Character Creation' },
            { page: 'Experience-and-Advancement', label: 'Experience and Advancement' },
            { page: 'Playing-a-Psyker', label: 'Playing a Psyker' },
            { page: 'Requisition-and-Influence', label: 'Requisition and Influence' },
        ],
    },
    {
        heading: 'Rules reference',
        pages: [
            { page: 'Rules-Tests-and-Difficulty', label: 'Tests and Difficulty' },
            { page: 'Rules-Combat-Turn', label: 'Combat Turn' },
            { page: 'Rules-Attacking', label: 'Attacking' },
            { page: 'Rules-Damage-and-Injury', label: 'Damage and Injury' },
            { page: 'Rules-Conditions', label: 'Conditions' },
            { page: 'Rules-Psychic-Powers', label: 'Psychic Powers' },
            { page: 'Rules-Corruption-and-Insanity', label: 'Corruption and Insanity' },
        ],
    },
];

/** Every prose page across all sections, as filename stems. */
const PROSE_PAGES = PROSE_SECTIONS.flatMap((section) => section.pages.map((p) => p.page));

function renderSidebar(summaries) {
    return [
        '### Dark Heresy 2e: Expanded',
        '',
        '**[[Home]]**',
        '',
        ...PROSE_SECTIONS.flatMap((section) => [
            `**${section.heading}**`,
            ...section.pages.map((p) => `- [[${p.label}|${p.page}]]`),
            '',
        ]),
        '**[[Compendium]]**',
        ...summaries.map((s) => `- [[${s.title}]]`),
        '',
    ].join('\n');
}

/* -------------------------------------------------------------------------------------------- */
/*  Entry point                                                                                   */
/* -------------------------------------------------------------------------------------------- */

function main() {
    // `resolve` (not `join`) against argv[2]: a relative outDir resolves against the caller's
    // cwd as you would expect, but an absolute one (as a test harness passing a temp dir would
    // use) must be left alone rather than appended to the cwd.
    const outDir = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, 'build', 'wiki');
    mkdirSync(outDir, { recursive: true });

    // Confirm every pack directory this script knows about still exists, and nothing new showed
    // up that it does not -- a silently-skipped pack would be a worse failure mode than a loud
    // one here.
    const knownDirs = new Set(PACKS.map((p) => p.dir));
    knownDirs.add('tables');
    const actualDirs = new Set(readdirSync(PACKS_DIR));
    for (const dir of actualDirs) {
        if (!knownDirs.has(dir)) throw new Error(`src/packs/${dir} has no column definition in tools/generate-wiki.mjs -- add one`);
    }
    for (const dir of knownDirs) {
        if (!actualDirs.has(dir)) throw new Error(`tools/generate-wiki.mjs expects src/packs/${dir}, but it no longer exists`);
    }

    const summaries = [];

    for (const pack of [...PACKS].sort(byLowerCase((p) => p.dir))) {
        const docs = loadPackDocs(pack.dir);
        const title = pageName(pack.dir);
        const filename = `${title}.md`;
        writeFileSync(join(outDir, filename), renderPackPage(pack, docs));
        summaries.push({ title, count: docs.length, filename });
        console.log(`${pack.dir.padEnd(20)} ${String(docs.length).padStart(4)} docs -> ${filename}`);
    }

    const tableDocs = loadPackDocs('tables');
    const tablesFilename = `${pageName('tables')}.md`;
    writeFileSync(join(outDir, tablesFilename), renderTablesPage(tableDocs));
    summaries.push({ title: pageName('tables'), count: tableDocs.length, filename: tablesFilename });
    console.log(`${'tables'.padEnd(20)} ${String(tableDocs.length).padStart(4)} docs -> ${tablesFilename}`);

    summaries.sort(byLowerCase((s) => s.title));
    writeFileSync(join(outDir, 'Compendium.md'), renderCompendiumIndex(summaries));
    writeFileSync(join(outDir, '_Sidebar.md'), renderSidebar(summaries));
    console.log(`${'(index)'.padEnd(20)} ${String(summaries.reduce((sum, s) => sum + s.count, 0)).padStart(4)} docs -> Compendium.md, _Sidebar.md`);
}

main();
