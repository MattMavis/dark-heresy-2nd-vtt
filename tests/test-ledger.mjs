// Two things are checked here.
//
// First, the ledger arithmetic itself, which decides how much XP a character appears to have
// spent.
//
// Second, and more valuable: the cost tables are replayed against purchases that were actually
// made at a real table. A group kept a hand-written "Spent XP" log per character alongside their
// sheets, which is an independent record of what each advance was paid for -- the closest thing
// to ground truth this system will ever get, since a character sheet cannot distinguish an
// advance that was bought from one granted free at creation.
//
// Eighteen of the twenty priced entries in that log agree with these tables exactly. The two
// that disagree are recorded at the bottom as known divergences rather than quietly dropped:
// both are single entries mispriced by hand at the table, in opposite directions, which is
// itself evidence the tables are right and the humans slipped.
import {
    CHARACTERISTIC_APTITUDES, SKILL_APTITUDES,
    characteristicAdvanceCost, skillAdvanceCost, talentCost,
    countMatchingAptitudes, ledgerTotal, ledgerByKind, ledgerSorted, awardsTotal,
} from '../src/module/rules/advancement.mjs';

let pass = 0, fail = 0;
const check = (label, got, want) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
    if (!ok) console.log(`        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`);
    ok ? pass++ : fail++;
};

/* -------------------------------------------- */
/*  ledgerTotal                                 */
/* -------------------------------------------- */

check('empty ledger sums to zero', ledgerTotal([]), 0);
check('a non-array is safe', ledgerTotal(undefined), 0);
check('costs are summed', ledgerTotal([{ cost: 100 }, { cost: 250 }]), 350);
check('negative entries (refunds) are honoured', ledgerTotal([{ cost: 500 }, { cost: -200 }]), 300);
check('missing and non-numeric costs count as zero',
    ledgerTotal([{ cost: 100 }, {}, { cost: 'banana' }, { cost: null }]), 100);

/* -------------------------------------------- */
/*  awardsTotal (the mirror image of ledgerTotal, for GM-awarded XP)  */
/* -------------------------------------------- */

check('empty awards sums to zero', awardsTotal([]), 0);
check('a non-array is safe', awardsTotal(undefined), 0);
check('amounts are summed', awardsTotal([{ amount: 1000 }, { amount: 250 }]), 1250);
check('a downward adjustment (negative amount) is honoured', awardsTotal([{ amount: 500 }, { amount: -100 }]), 400);
check('missing and non-numeric amounts count as zero',
    awardsTotal([{ amount: 100 }, {}, { amount: 'banana' }, { amount: null }]), 100);

/* -------------------------------------------- */
/*  ledgerByKind / ledgerSorted (experience panel breakdown + history) */
/* -------------------------------------------- */

const SPEND_LOG = [
    { id: 'a', kind: 'characteristic', cost: 100, at: 100, label: 'Agility -- Simple' },
    { id: 'b', kind: 'skill', cost: 200, at: 300, label: 'Dodge -- Known' },
    { id: 'c', kind: 'talent', cost: 300, at: 200, label: 'Catfall' },
    { id: 'd', kind: 'adjustment', source: 'legacy', cost: 1300, at: 1, label: 'legacy opening balance' },
];

check('ledgerByKind buckets by kind', ledgerByKind(SPEND_LOG),
    { characteristic: 100, skill: 200, talent: 300, other: 1300 });
check('ledgerByKind on an empty ledger is all zeroes', ledgerByKind([]),
    { characteristic: 0, skill: 0, talent: 0, other: 0 });
check('ledgerByKind is safe against a non-array', ledgerByKind(undefined),
    { characteristic: 0, skill: 0, talent: 0, other: 0 });
check('an unrecognised kind (e.g. the legacy "adjustment" entry) falls into other',
    ledgerByKind([{ kind: 'adjustment', cost: 50 }]), { characteristic: 0, skill: 0, talent: 0, other: 50 });
check('the four buckets always sum back to ledgerTotal', (() => {
    const buckets = ledgerByKind(SPEND_LOG);
    return buckets.characteristic + buckets.skill + buckets.talent + buckets.other;
})(), ledgerTotal(SPEND_LOG));

check('ledgerSorted orders most-recent-first', ledgerSorted(SPEND_LOG).map((e) => e.id),
    ['b', 'c', 'a', 'd']);
check('ledgerSorted does not mutate the original array', (() => {
    const original = [...SPEND_LOG];
    ledgerSorted(SPEND_LOG);
    return SPEND_LOG.every((e, i) => e === original[i]);
})(), true);
check('ledgerSorted on an empty ledger is empty', ledgerSorted([]), []);
check('ledgerSorted is safe against a non-array', ledgerSorted(null), []);

// ledgerSorted only ever looks at an entry's `at` field, so acolyte.mjs reuses it unchanged for
// the awards side of the panel (award entries carry `amount`/`reason`/`by` instead of
// `cost`/`label`, but sorting by `at` doesn't care).
const AWARD_LOG = [
    { id: 'x', amount: 1300, reason: 'legacy opening balance', at: 1, by: 'System' },
    { id: 'y', amount: 500, reason: 'Cleared the hive gang', at: 300, by: 'GM' },
    { id: 'z', amount: 200, reason: 'Good roleplay', at: 200, by: 'GM' },
];
check('ledgerSorted applies unchanged to award-shaped entries', ledgerSorted(AWARD_LOG).map((e) => e.id),
    ['y', 'z', 'x']);

/* -------------------------------------------- */
/*  Replay of a real table's spend log          */
/* -------------------------------------------- */

const charCost = (apt, key, rank) =>
    characteristicAdvanceCost(rank, countMatchingAptitudes(apt, CHARACTERISTIC_APTITUDES[key]));
const skillCost = (apt, key, rank) =>
    skillAdvanceCost(rank, countMatchingAptitudes(apt, SKILL_APTITUDES[key]));
const talent = (apt, required, tier) => talentCost(tier, countMatchingAptitudes(apt, required));

// Aptitudes as owned on each sheet.
const GERRY = ['Perception', 'Strength', 'Tech', 'Intelligence', 'Toughness', 'General', 'Knowledge', 'Fieldcraft'];
const PRIS = ['Intelligence', 'General', 'Willpower', 'Toughness', 'Perception', 'Psyker', 'Defence', 'Knowledge'];
const MAKO = ['Strength', 'General', 'Defence', 'Offence', 'Weapon Skill', 'Fellowship', 'Ballistic Skill', 'Leadership'];
const YURT = ['Offence', 'Leadership', 'General', 'Fieldcraft', 'Agility', 'Willpower', 'Toughness', 'Fellowship', 'Weapon Skill'];

// Gerry -- every line of his log agrees with the tables.
check('Gerry: Intelligence to Simple = 100', charCost(GERRY, 'intelligence', 1), 100);
check('Gerry: Perception to Simple = 100', charCost(GERRY, 'perception', 1), 100);
check('Gerry: Medicae to Known = 100', skillCost(GERRY, 'medicae', 1), 100);
check('Gerry: Medicae to Trained = 200', skillCost(GERRY, 'medicae', 2), 200);
check('Gerry: Commerce to Known = 100', skillCost(GERRY, 'commerce', 1), 100);
check('Gerry: Superior Chirurgeon (tier 3, Int+Fieldcraft) = 400',
    talent(GERRY, ['Intelligence', 'Fieldcraft'], 3), 400);
check('Gerry: Mechadendrite Use (tier 2, Int+Tech) = 300',
    talent(GERRY, ['Intelligence', 'Tech'], 2), 300);

// Pris -- her log totals 1000 and her sheet agrees; the four psychic powers carry their own
// recorded costs, so only the talents are table-priced.
check('Pris: Warp Sense (tier 1, Per+Psyker) = 200', talent(PRIS, ['Perception', 'Psyker'], 1), 200);
check('Pris: Favoured by the Warp (tier 3, Wil+Psyker) = 400', talent(PRIS, ['Willpower', 'Psyker'], 3), 400);

// Mako -- one aptitude match on each of these, since he has Fellowship but not Social, and
// Defence but not Agility.
check('Mako: Dodge to Known = 200', skillCost(MAKO, 'dodge', 1), 200);
check('Mako: Charm to Known = 200', skillCost(MAKO, 'charm', 1), 200);
check('Mako: Inquiry to Known = 200', skillCost(MAKO, 'inquiry', 1), 200);

// Yurt -- Weapon Skill matches both of its aptitudes, so his cheapest advances.
check('Yurt: Weapon Skill to Simple = 100', charCost(YURT, 'weaponSkill', 1), 100);
check('Yurt: Weapon Skill to Intermediate = 250', charCost(YURT, 'weaponSkill', 2), 250);
check('Yurt: Blind Fighting (tier 1, Per+Fieldcraft, one match) = 300',
    talent(YURT, ['Perception', 'Fieldcraft'], 1), 300);

/* -------------------------------------------- */
/*  Known divergences from the hand-written log */
/* -------------------------------------------- */

// Yurt was charged 300 for Dodge to Known. He has Agility but not Defence, so it is a one-match
// advance at 200 -- he was overcharged 100 at the table.
check('Yurt: Dodge to Known prices at 200, though the log recorded 300',
    skillCost(YURT, 'dodge', 1), 200);

// Mako was charged 250 for Agility to Simple. Agility's aptitudes are Agility and Finesse and he
// owns neither, so it is a zero-match advance at 500 -- he was undercharged 250. Recorded here
// so that if the sheet is ever reconciled against the log, the gap is already understood.
check('Mako: Agility to Simple prices at 500, though the log recorded 250',
    charCost(MAKO, 'agility', 1), 500);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
