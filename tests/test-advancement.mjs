// Unit tests for the advancement cost tables. Every figure here was read off the Core Rulebook
// page images -- if one of these fails, the module is wrong, not the test.
import {
    CHARACTERISTIC_APTITUDES, SKILL_APTITUDES,
    characteristicAdvanceCost, skillAdvanceCost, talentCost,
    progressionCost, remainingProgression,
    countMatchingAptitudes, normaliseAptitude, parseAptitudeList,
    advanceRow,
} from '../src/module/rules/advancement.mjs';
import { check, done } from './harness.mjs';

// --- Table 2-2, characteristic advances, every cell -------------------------------------
check('char two-apt row', [1,2,3,4,5].map((r) => characteristicAdvanceCost(r, 2)), [100,250,500,750,1250]);
check('char one-apt row', [1,2,3,4,5].map((r) => characteristicAdvanceCost(r, 1)), [250,500,750,1000,1500]);
check('char zero-apt row', [1,2,3,4,5].map((r) => characteristicAdvanceCost(r, 0)), [500,750,1000,1500,2500]);

// --- Table 2-4, skill advances, every cell ----------------------------------------------
check('skill two-apt row', [1,2,3,4].map((r) => skillAdvanceCost(r, 2)), [100,200,300,400]);
check('skill one-apt row', [1,2,3,4].map((r) => skillAdvanceCost(r, 1)), [200,400,600,800]);
check('skill zero-apt row', [1,2,3,4].map((r) => skillAdvanceCost(r, 0)), [300,600,900,1200]);

// --- Table 2-6, talents ------------------------------------------------------------------
check('talent two-apt row', [1,2,3].map((t) => talentCost(t, 2)), [200,300,400]);
check('talent one-apt row', [1,2,3].map((t) => talentCost(t, 1)), [300,450,600]);
check('talent zero-apt row', [1,2,3].map((t) => talentCost(t, 0)), [600,900,1200]);

// --- cumulative behaviour -----------------------------------------------------------------
// This is the rule behind the book's own worked example: "a player could not simply pay 500 xp
// for a +10 increase ... required to buy the Simple advance for 250 xp first, and then pay the
// 500 xp for the Intermediate advance." -- i.e. every intervening step is charged, which is
// exactly what the two checks below assert (the one-aptitude row above already pins 250 and 500).
check('skill 0 -> Veteran at two aptitudes sums all four steps',
    progressionCost('skill', 0, 4, 2), 100 + 200 + 300 + 400);
check('partial climb charges only the steps taken',
    progressionCost('skill', 2, 4, 1), 600 + 800);
// The two guards below are the whole of `if (to <= from || from < 0 || to > max) return null` --
// "backwards is refused" and "beyond Expert is refused" hit the same two conditions again.
check('no movement costs nothing (null, not zero)', progressionCost('skill', 3, 3, 2), null);
check('beyond the top rank is refused', progressionCost('skill', 3, 5, 2), null);

// --- ladder for the UI ---------------------------------------------------------------------
check('remaining ladder from Trained skill, one aptitude',
    remainingProgression('skill', 2, 1),
    [{ rank: 3, label: 'Experienced', cost: 600, cumulative: 600 },
     { rank: 4, label: 'Veteran', cost: 800, cumulative: 1400 }]);
check('nothing remains at max rank', remainingProgression('characteristic', 5, 2), []);

// --- advanceRow: the shared table row for both the spend window and the wizard ---------------
// Only the next rung is ever offered, which is what makes the cumulative rule automatic.
check('an unadvanced characteristic offers Simple and reads rank "None"',
    advanceRow('characteristic', { key: 'agility', label: 'Agility', rank: 0, matches: 2, available: 1000 }),
    { key: 'agility', label: 'Agility', rankLabel: 'None', matches: 2, nextLabel: 'Simple', nextCost: 100, canAfford: true });
check('a partly advanced skill names the rank it has and the one it can buy',
    advanceRow('skill', { key: 'dodge', spKey: null, label: 'Dodge', rank: 2, matches: 1, available: 1000 }),
    { key: 'dodge', spKey: null, label: 'Dodge', rankLabel: 'Trained', matches: 1, nextLabel: 'Experienced', nextCost: 600, canAfford: true });
check('at the top of the ladder there is nothing left to buy',
    advanceRow('characteristic', { key: 'agility', label: 'Agility', rank: 5, matches: 2, available: 99999 }),
    { key: 'agility', label: 'Agility', rankLabel: 'Expert', matches: 2, nextLabel: null, nextCost: null, canAfford: false });
check('too little XP makes the step unaffordable but still shows its price', () =>
    advanceRow('skill', { key: 'dodge', spKey: null, label: 'Dodge', rank: 0, matches: 0, available: 299 }),
{ key: 'dodge', spKey: null, label: 'Dodge', rankLabel: 'None', matches: 0, nextLabel: 'Known', nextCost: 300, canAfford: false });
// A speciality row carries spKey so the buy handler knows which one to advance; a characteristic
// row must not, or the template would render a stray data attribute.
check('a speciality row carries its speciality key',
    advanceRow('skill', { key: 'commonLore', spKey: 'imperialGuard', label: 'Common Lore: Imperial Guard', rank: 1, matches: 0, available: 1000 }).spKey,
    'imperialGuard');
check('a characteristic row has no spKey at all',
    'spKey' in advanceRow('characteristic', { key: 'agility', label: 'Agility', rank: 0, matches: 0, available: 0 }), false);

// --- aptitude matching ----------------------------------------------------------------------
const owned = ['Agility', 'Finesse', 'Fieldcraft', 'Weapon Skill'];
check('two matches', countMatchingAptitudes(owned, SKILL_APTITUDES.stealth), 2);   // Agility+Fieldcraft
check('one match', countMatchingAptitudes(owned, SKILL_APTITUDES.dodge), 1);       // Agility, not Defence
check('zero matches', countMatchingAptitudes(owned, SKILL_APTITUDES.commerce), 0);
check('characteristic matching works the same',
    countMatchingAptitudes(owned, CHARACTERISTIC_APTITUDES.ballisticSkill), 1);    // Finesse only
check('capped at two even if more overlap',
    countMatchingAptitudes(['Agility','General','Fieldcraft'], ['Agility','General','Fieldcraft']), 2);
check('duplicates in the required list do not double count',
    countMatchingAptitudes(['Agility'], ['Agility','Agility']), 1);

// --- normalisation ---------------------------------------------------------------------------
check('case and spacing folded', normaliseAptitude('  Weapon   Skill '), 'weapon skill');
check('american spelling accepted', normaliseAptitude('Defense'), 'defence');
check('free-text talent field parsed', parseAptitudeList('Weapon Skill, Ballistic Skill'),
    ['weapon skill', 'ballistic skill']);
check('"or" in a talent field parsed', parseAptitudeList('Ballistic Skill or Weapon Skill'),
    ['ballistic skill', 'weapon skill']);
check('empty is safe', parseAptitudeList(''), []);

// --- data completeness -------------------------------------------------------------------------
check('all 28 skills mapped', Object.keys(SKILL_APTITUDES).length, 28);
// Influence is deliberately absent from the map, so the count is 9 rather than 10. A separate
// `CHARACTERISTIC_APTITUDES.influence === undefined` check fails in lockstep with this one.
check('nine characteristics mapped, Influence excluded', Object.keys(CHARACTERISTIC_APTITUDES).length, 9);
check('Common Lore is Knowledge, not General (quickref disagrees; book wins)',
    SKILL_APTITUDES.commonLore, ['Intelligence', 'Knowledge']);
const everyPairHasTwo = Object.values(SKILL_APTITUDES).every((a) => a.length === 2)
    && Object.values(CHARACTERISTIC_APTITUDES).every((a) => a.length === 2);
check('every entry has exactly two aptitudes', everyPairHasTwo, true);

done();
