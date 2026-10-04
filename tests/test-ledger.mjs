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
//
// Only a representative slice of that replay is asserted here. The full twenty lines collapse to
// nine distinct table lookups, and `test-advancement.mjs` already asserts every cell of all three
// cost tables exhaustively, so replaying them line by line re-tested the same arithmetic a third
// time. What is kept is one advance per aptitude-match tier, one talent, and both divergences --
// the divergences being the only entries here carrying information the tables do not.
import {
    CHARACTERISTIC_APTITUDES, SKILL_APTITUDES,
    characteristicAdvanceCost, skillAdvanceCost, talentCost,
    countMatchingAptitudes, ledgerTotal, ledgerByKind, ledgerSorted, awardsTotal, purchaseEntry,
} from '../src/module/rules/advancement.mjs';
import { check, done } from './harness.mjs';

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
/*  purchaseEntry -- the shape all six buy sites write */
/* -------------------------------------------- */

check('a characteristic purchase carries the full field set', () =>
    purchaseEntry('characteristic', { id: 'x', cost: 100, label: 'Agility -- Simple', key: 'agility', rank: 1, matches: 2, at: 7 }),
{ id: 'x', kind: 'characteristic', source: 'purchase', cost: 100, label: 'Agility -- Simple', at: 7, key: 'agility', rank: 1, matches: 2 });

// A talent has no rank, and the wizard's talent entries carry an extra field the spend window's
// do not -- so absent fields must be omitted rather than written as undefined, and extras kept.
check('a talent purchase omits rank and carries extras', () =>
    purchaseEntry('talent', { id: 'y', cost: 400, label: 'Catfall', matches: 1, at: 7, talentName: 'Catfall' }),
{ id: 'y', kind: 'talent', source: 'purchase', cost: 400, label: 'Catfall', at: 7, matches: 1, talentName: 'Catfall' });

check('entries built this way are summed by ledgerTotal like any other', () =>
    ledgerTotal([purchaseEntry('skill', { id: 'a', cost: 200, label: 'Dodge', key: 'dodge', rank: 1, matches: 1 })]), 200);

/* -------------------------------------------- */
/*  awardsTotal (the mirror image of ledgerTotal, for GM-awarded XP)  */
/* -------------------------------------------- */

// `awardsTotal` is the same `reduce` as `ledgerTotal` over a different field name, so the empty /
// non-array / negative / non-numeric cases above already cover it. The one thing that could
// diverge independently is the field name itself, which is what this single check pins.
check('amounts are summed', awardsTotal([{ amount: 1000 }, { amount: 250 }]), 1250);

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
    { characteristic: 100, skill: 200, talent: 300, psychicPower: 0, other: 1300 });
check('ledgerByKind on an empty ledger is all zeroes', ledgerByKind([]),
    { characteristic: 0, skill: 0, talent: 0, psychicPower: 0, other: 0 });
check('ledgerByKind is safe against a non-array', ledgerByKind(undefined),
    { characteristic: 0, skill: 0, talent: 0, psychicPower: 0, other: 0 });
check('an unrecognised kind (e.g. the legacy "adjustment" entry) falls into other',
    ledgerByKind([{ kind: 'adjustment', cost: 50 }]), { characteristic: 0, skill: 0, talent: 0, psychicPower: 0, other: 50 });
check('a psychicPower purchase buckets into its own kind',
    ledgerByKind([{ kind: 'psychicPower', cost: 150 }]), { characteristic: 0, skill: 0, talent: 0, psychicPower: 150, other: 0 });
// (A "the four buckets sum back to ledgerTotal" check used to sit here. Both sides of it are
// already pinned to literals by the two checks above, so it restated the same arithmetic a third
// time without being able to fail on its own.)

check('ledgerSorted orders most-recent-first', () => ledgerSorted(SPEND_LOG).map((e) => e.id),
    ['b', 'c', 'a', 'd']);
check('ledgerSorted does not mutate the original array', () => {
    const original = [...SPEND_LOG];
    ledgerSorted(SPEND_LOG);
    return SPEND_LOG.every((e, i) => e === original[i]);
}, true);
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
check('ledgerSorted applies unchanged to award-shaped entries', () => ledgerSorted(AWARD_LOG).map((e) => e.id),
    ['y', 'z', 'x']);

/* -------------------------------------------- */
/*  Replay of a real table's spend log          */
/* -------------------------------------------- */

const charCost = (apt, key, rank) =>
    characteristicAdvanceCost(rank, countMatchingAptitudes(apt, CHARACTERISTIC_APTITUDES[key]));
const skillCost = (apt, key, rank) =>
    skillAdvanceCost(rank, countMatchingAptitudes(apt, SKILL_APTITUDES[key]));
const talent = (apt, required, tier) => talentCost(tier, countMatchingAptitudes(apt, required));

// Aptitudes as owned on the sheets the log belongs to.
const GERRY = ['Perception', 'Strength', 'Tech', 'Intelligence', 'Toughness', 'General', 'Knowledge', 'Fieldcraft'];
const MAKO = ['Strength', 'General', 'Defence', 'Offence', 'Weapon Skill', 'Fellowship', 'Ballistic Skill', 'Leadership'];
const YURT = ['Offence', 'Leadership', 'General', 'Fieldcraft', 'Agility', 'Willpower', 'Toughness', 'Fellowship', 'Weapon Skill'];

// One entry per aptitude-match tier, plus one talent. Gerry has both of Medicae's aptitudes;
// Mako has Dodge's Defence but not its Agility; the zero-match tier is covered by the Agility
// divergence below.
check('two matches: Gerry, Medicae to Known = 100', skillCost(GERRY, 'medicae', 1), 100);
check('one match: Mako, Dodge to Known = 200', skillCost(MAKO, 'dodge', 1), 200);
check('two matches, talent: Gerry, Superior Chirurgeon (tier 3, Int+Fieldcraft) = 400',
    talent(GERRY, ['Intelligence', 'Fieldcraft'], 3), 400);
check('one match, talent: Yurt, Blind Fighting (tier 1, Per+Fieldcraft) = 300',
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

done();
