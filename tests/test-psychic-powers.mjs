// Unit tests for buying psychic powers with XP -- the same treatment talents already get, per
// the goal this feature was built against: a power's cost comes off its own `system.cost` (no
// aptitude table), a prerequisite naming another power the character must already own is a HARD
// block (this is how the pack encodes a discipline's power tree -- "T 35, Smite" cannot be bought
// without Smite), and the pack's non-standard prerequisite phrasings are normalised before they
// ever reach the shared talent-prerequisites grammar.
import { readFileSync } from 'node:fs';
import { check, done } from './harness.mjs';
import { psychicPowerRow, purchaseEntry, ledgerByKind } from '../src/module/rules/advancement.mjs';
import {
    normalisePsychicPowerPrerequisite,
    evaluatePsychicPowerPrerequisites,
} from '../src/module/rules/psychic-power-prerequisites.mjs';
import { normaliseName } from '../src/module/rules/grant-resolution.mjs';

/* -------------------------------------------- */
/*  Snapshot builder (same shape as test-prerequisites.mjs)                                       */
/* -------------------------------------------- */

const template = JSON.parse(readFileSync(new URL('../src/template.json', import.meta.url), 'utf8'));
const REAL_SKILLS = template.Actor.templates.creature.skills;

function freshSkills() {
    return JSON.parse(JSON.stringify(REAL_SKILLS));
}

function setSkillRank(skills, key, rank) {
    skills[key].advance = rank;
}

function snapshot(overrides = {}) {
    return {
        characteristics: {
            weaponSkill: 0, ballisticSkill: 0, strength: 0, toughness: 0, agility: 0,
            intelligence: 0, perception: 0, willpower: 0, fellowship: 0,
        },
        skills: freshSkills(),
        talents: [],
        psychicPowers: [],
        psyRating: 0,
        corruption: 0,
        insanity: 0,
        eliteAdvance: null,
        ...overrides,
    };
}

/* -------------------------------------------- */
/*  normalisePsychicPowerPrerequisite -- the pack-specific rewrite                                */
/* -------------------------------------------- */

check('"None" becomes the empty string (talents.yml\'s equivalent of no prerequisite)',
    normalisePsychicPowerPrerequisite('None'), '');
check('"none" folds case the same way', normalisePsychicPowerPrerequisite('none'), '');
check('"Str 35" is rewritten to the book-standard code "S 35"',
    normalisePsychicPowerPrerequisite('Str 35'), 'S 35');
check('"Fellowship 55" is rewritten to the book-standard code "Fel 55"',
    normalisePsychicPowerPrerequisite('Fellowship 55'), 'Fel 55');
check('the "Endurace" typo is corrected to the real power name "Endurance"',
    normalisePsychicPowerPrerequisite('Psy rating 5, Iron Arm OR Endurace'), 'Psy rating 5, Iron Arm OR Endurance');
check('the "Spontanous Combustion" typo is corrected',
    normalisePsychicPowerPrerequisite('Psy rating 3, Spontanous Combustion'), 'Psy rating 3, Spontaneous Combustion');
check('"5+ Insanity Points" is rewritten to the shared grammar\'s "Insanity N" clause',
    normalisePsychicPowerPrerequisite('Fel 35, 5+ Insanity Points'), 'Fel 35, Insanity 5');
check('"Rank N <Skill>" (no "in") is rewritten to "Rank N in <Skill>"',
    normalisePsychicPowerPrerequisite('Rank 1 Psyniscience'), 'Rank 1 in Psyniscience');
check('"<Skill> rank N" (reversed order) is rewritten to "Rank N in <Skill>"',
    normalisePsychicPowerPrerequisite('Psyniscience rank 1, Warp Perception'), 'Rank 1 in Psyniscience, Warp Perception');
check('a clause needing no rewrite passes through unchanged',
    normalisePsychicPowerPrerequisite('WP 35'), 'WP 35');
check('empty/undefined input is safe', [normalisePsychicPowerPrerequisite(''), normalisePsychicPowerPrerequisite(undefined)], ['', '']);

/* -------------------------------------------- */
/*  Psy Rating clause ("ADD: 'Psy rating N'")                                                     */
/* -------------------------------------------- */

check('"Psy rating 4" met at exactly 4',
    evaluatePsychicPowerPrerequisites('Psy rating 4', snapshot({ psyRating: 4 })).blocked, false);
check('"Psy rating 4" unmet one short',
    evaluatePsychicPowerPrerequisites('Psy rating 4', snapshot({ psyRating: 3 })).blocked, true);
// The pack also writes it lower-case ("psy rating 4") -- the shared atom's regex is already
// case-insensitive, so this is a regression guard on that rather than new behaviour.
check('a lower-case "psy rating" clause is still recognised',
    evaluatePsychicPowerPrerequisites('Ag 30, psy rating 4, Terrify', snapshot({
        characteristics: { agility: 30 }, psyRating: 4, psychicPowers: ['Terrify'],
    })).blocked, false);

/* -------------------------------------------- */
/*  Owns-another-power clause -- the discipline power tree, and the case the maintainer flagged   */
/*  as most important to get right: this MUST be a hard block, never advisory.                    */
/* -------------------------------------------- */

check('a power naming another power blocks when that power is not owned',
    evaluatePsychicPowerPrerequisites('T 35, Smite', snapshot({ characteristics: { toughness: 35 } })).blocked, true);
check('the same clause unblocks once the named power is owned',
    evaluatePsychicPowerPrerequisites('T 35, Smite', snapshot({
        characteristics: { toughness: 35 }, psychicPowers: ['Smite'],
    })).blocked, false);
// A talent can satisfy a bare-name clause too -- the clause itself never says which kind of item
// it means, so both owned lists are checked as one pool (see talent-prerequisites.mjs).
check('a talent of the same name also satisfies a bare-name clause',
    evaluatePsychicPowerPrerequisites('T 35, Smite', snapshot({
        characteristics: { toughness: 35 }, talents: ['Smite'],
    })).blocked, false);
check('"Iron Arm OR Endurace" (real typo) is met by owning either side',
    evaluatePsychicPowerPrerequisites('Psy rating 5, Iron Arm OR Endurace', snapshot({
        psyRating: 5, psychicPowers: ['Endurance'],
    })).blocked, false);
check('"Iron Arm OR Endurace" blocks when neither side is owned',
    evaluatePsychicPowerPrerequisites('Psy rating 5, Iron Arm OR Endurace', snapshot({ psyRating: 5 })).blocked, true);

/* -------------------------------------------- */
/*  knownAdvanceNames: a REAL unowned power still hard-blocks the tree, but a bare name that is    */
/*  not a real talent/power is advisory rather than a hard refusal (parser fix). Also a positive/  */
/*  negative correctness pair, which the "no indeterminate" sweep alone cannot catch.             */
/* -------------------------------------------- */

const knownAdvances = new Set(['Smite', 'Life Leech', 'Enfeeble'].map(normaliseName));

check('a real, unowned power named in a prerequisite still hard-blocks (discipline tree intact)',
    evaluatePsychicPowerPrerequisites('T 35, Smite', snapshot({ characteristics: { toughness: 35 }, knownAdvanceNames: knownAdvances })).blocked, true);
check('the same power, once owned, no longer blocks -- with the known-advance set supplied',
    evaluatePsychicPowerPrerequisites('T 35, Smite', snapshot({ characteristics: { toughness: 35 }, psychicPowers: ['Smite'], knownAdvanceNames: knownAdvances })).blocked, false);
{
    const r = evaluatePsychicPowerPrerequisites('T 35, Fabricated Nonsense Power',
        snapshot({ characteristics: { toughness: 35 }, knownAdvanceNames: knownAdvances }));
    check('a bare name that is NOT a real talent/power is advisory, not a hard block', r.blocked, false);
    check('...and is surfaced as an advisory clause', r.advisories.length, 1);
}
check('without a known-advance set, an unrecognised bare name still blocks (back-compat unchanged)',
    evaluatePsychicPowerPrerequisites('T 35, Fabricated Nonsense Power', snapshot({ characteristics: { toughness: 35 } })).blocked, true);

/* -------------------------------------------- */
/*  A definite unmet clause blocks; an indeterminate one never does                               */
/* -------------------------------------------- */

{
    // "5+ Insanity Points" resolves definitely now (see the normaliser), so use a clause this
    // parser genuinely cannot classify to exercise the indeterminate path: a talent's own
    // not-yet-chosen specialisation, the one case talent-prerequisites.mjs itself documents as
    // unanswerable before purchase.
    const result = evaluatePsychicPowerPrerequisites('WP 40, Rank 4 in selected skill',
        snapshot({ characteristics: { willpower: 40 } }));
    check('an indeterminate clause alongside an otherwise-met one does not block', result.blocked, false);
    check('the indeterminate clause is still surfaced as an advisory', result.advisories.length, 1);
}
{
    const result = evaluatePsychicPowerPrerequisites('WP 40, Rank 4 in selected skill',
        snapshot({ characteristics: { willpower: 10 } }));
    check('a real unmet clause blocks regardless of an unrelated indeterminate one', result.blocked, true);
}

/* -------------------------------------------- */
/*  psychicPowerRow -- cost from the power's own field, not an aptitude table                     */
/* -------------------------------------------- */

const SMITE = { name: 'Smite', pack: 'dark-heresy-2nd.psychic-powers', itemId: 'abc123', img: 'x.webp', discipline: 'Telepathy', cost: 100, prerequisite: '' };

check('cost is read straight off the candidate, not looked up in a tier table',
    () => psychicPowerRow(SMITE, { available: 1000, snapshot: snapshot() }).cost, 100);
check('a power the character can afford, with no prerequisite, is buyable',
    () => psychicPowerRow(SMITE, { available: 1000, snapshot: snapshot() }).canAfford, true);
check('a power the character cannot afford is blocked regardless of prerequisites',
    () => psychicPowerRow(SMITE, { available: 99, snapshot: snapshot() }).canAfford, false);
check('affordability is a straight <=, not < -- exact available spends to zero',
    () => psychicPowerRow(SMITE, { available: 100, snapshot: snapshot() }).canAfford, true);

const FREE_GAP = { ...SMITE, name: 'Gap Power', cost: 0 };
check('a cost-0 power reports cost 0 honestly rather than a placeholder',
    () => psychicPowerRow(FREE_GAP, { available: 0, snapshot: snapshot() }).cost, 0);
check('a cost-0 power is affordable even with 0 XP available',
    () => psychicPowerRow(FREE_GAP, { available: 0, snapshot: snapshot() }).canAfford, true);

const GATED = { ...SMITE, name: 'Gated Power', prerequisite: 'T 35, Smite' };
check('an unmet prerequisite blocks the row even when affordable',
    () => psychicPowerRow(GATED, { available: 1000, snapshot: snapshot() }).canAfford, false);
check('the GM override frees canAfford but still reports the prerequisite as unmet',
    () => { const r = psychicPowerRow(GATED, { available: 1000, snapshot: snapshot(), ignorePrerequisites: true }); return [r.prereqBlocked, r.canAfford]; },
    [true, true]);
check('the override cannot buy what the character cannot afford',
    () => psychicPowerRow(GATED, { available: 50, snapshot: snapshot(), ignorePrerequisites: true }).canAfford, false);
check('a met prerequisite, owning the named power, is buyable without the override',
    () => psychicPowerRow(GATED, {
        available: 1000,
        snapshot: snapshot({ characteristics: { toughness: 35 }, psychicPowers: ['Smite'] }),
    }).canAfford, true);
check('the candidate fields the template renders are carried through',
    () => { const r = psychicPowerRow(SMITE, { available: 1000, snapshot: snapshot() }); return [r.name, r.discipline, r.pack, r.itemId]; },
    ['Smite', 'Telepathy', 'dark-heresy-2nd.psychic-powers', 'abc123']);

/* -------------------------------------------- */
/*  purchaseEntry('psychicPower', ...) -- the ledger entry a buy appends                          */
/* -------------------------------------------- */

check('a psychic power purchase carries the well-formed ledger shape, with no talent-only fields', () =>
    purchaseEntry('psychicPower', { id: 'p1', cost: 200, label: 'Smite', key: 'dark-heresy-2nd.psychic-powers.abc123', at: 42 }),
{ id: 'p1', kind: 'psychicPower', source: 'purchase', cost: 200, label: 'Smite', at: 42, key: 'dark-heresy-2nd.psychic-powers.abc123' });

check('ledgerByKind gives psychic power spend its own bucket, separate from talent',
    ledgerByKind([{ kind: 'psychicPower', cost: 200 }, { kind: 'talent', cost: 300 }]),
    { characteristic: 0, skill: 0, talent: 300, psychicPower: 200, other: 0 });

/* -------------------------------------------- */
/*  The item sheet field-name bug: the pack stores `system.prerequisite` (singular)               */
/* -------------------------------------------- */

const sheetHbs = readFileSync(new URL('../src/templates/item/item-psychic-power-sheet.hbs', import.meta.url), 'utf8');
check('the psychic power item sheet reads/writes the correct (singular) field name',
    /name=['"]system\.prerequisite['"]/.test(sheetHbs), true);
check('the item sheet no longer references the wrong (plural) field name',
    /system\.prerequisites\b/.test(sheetHbs), false);

/* -------------------------------------------- */
/*  The sweep: every real prerequisite string in psychic-powers.yml                               */
/* -------------------------------------------- */

// Mirrors test-prerequisites.mjs's talent sweep: every non-empty `prerequisite:` entry in the
// real pack must, after the pack-specific rewrite above, parse into clauses the shared grammar
// actually recognises (status 'met' or 'unmet') against an empty/all-zero character -- nothing
// here should come back indeterminate. Unlike the talent sweep there is no allowlist: the four
// fix-ups in psychic-power-prerequisites.mjs were built to cover every entry in this pack, and a
// new indeterminate result means either new content needing a new fix-up, or a real regression.
const yaml = readFileSync(new URL('../src/packs/psychic-powers/psychic-powers.yml', import.meta.url), 'utf8');
const prereqStrings = [...yaml.matchAll(/^\s*prerequisite:\s*(.+)$/gm)].map((m) => m[1].trim()).filter(Boolean);

// Floor guard against the pack silently shrinking. 76 official 2e powers remain after the non-2e
// ports (DH1e/RT/ITS/ToF/TNP) and the homebrew Chrono discipline were removed; every one carries a
// real prerequisite, so this doubles as an "all 76 have a prerequisite line" check.
check('at least as many prerequisite strings as the 76 official 2e powers', prereqStrings.length >= 76, true);

const emptySnapshot = snapshot();
let cleanCount = 0;
const notClean = [];
for (const raw of prereqStrings) {
    const result = evaluatePsychicPowerPrerequisites(raw, emptySnapshot);
    const hasIndeterminate = result.clauses.some((c) => c.status === 'indeterminate');
    if (hasIndeterminate) {
        notClean.push(`${raw} -- ${result.clauses.filter((c) => c.status === 'indeterminate').map((c) => c.reason).join('; ')}`);
    } else {
        cleanCount++;
    }
}
console.log(`\n  (parsed ${cleanCount}/${prereqStrings.length} real psychic power prerequisite strings with every clause recognised)`);
for (const line of notClean) console.log(`        ${line}`);
check('every prerequisite string in the pack parses with no indeterminate clauses', notClean.length, 0);

// The kept 2e powers all carry a real prerequisite -- the "None" no-prerequisite marker only ever
// appeared on the now-removed non-2e ports. The marker's behaviour (normalises to an empty string,
// so it never blocks) is still covered by the standalone normalisePsychicPowerPrerequisite('None')
// test near the top of this file, so nothing is lost by the pack no longer containing one.
check('no kept power uses the "None" marker (they all have real prerequisites now)',
    prereqStrings.filter((s) => /^none$/i.test(s)).length, 0);

done();
