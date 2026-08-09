// Unit tests for the advancement cost tables. Every figure here was read off the Core Rulebook
// page images -- if one of these fails, the module is wrong, not the test.
import {
    CHARACTERISTIC_APTITUDES, SKILL_APTITUDES,
    characteristicAdvanceCost, skillAdvanceCost, talentCost,
    progressionCost, remainingProgression,
    countMatchingAptitudes, normaliseAptitude, parseAptitudeList,
} from '../src/module/rules/advancement.mjs';

let pass = 0, fail = 0;
const check = (label, got, want) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
    if (!ok) console.log(`        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`);
    ok ? pass++ : fail++;
};

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

// --- the book's own worked example --------------------------------------------------------
// "a player could not simply pay 500 xp for a +10 increase ... required to buy the Simple
// advance for 250 xp first, and then pay the 500 xp for the Intermediate advance."  (one aptitude)
check('book example: Simple then Intermediate at one aptitude = 750',
    progressionCost('characteristic', 0, 2, 1), 750);

// --- cumulative behaviour -----------------------------------------------------------------
check('skill 0 -> Veteran at two aptitudes sums all four steps',
    progressionCost('skill', 0, 4, 2), 100 + 200 + 300 + 400);
check('partial climb charges only the steps taken',
    progressionCost('skill', 2, 4, 1), 600 + 800);
check('no movement costs nothing (null, not zero)', progressionCost('skill', 3, 3, 2), null);
check('backwards is refused', progressionCost('skill', 3, 1, 2), null);
check('beyond the top rank is refused', progressionCost('skill', 3, 5, 2), null);
check('beyond Expert is refused', progressionCost('characteristic', 4, 6, 2), null);

// --- ladder for the UI ---------------------------------------------------------------------
check('remaining ladder from Trained skill, one aptitude',
    remainingProgression('skill', 2, 1),
    [{ rank: 3, label: 'Experienced', cost: 600, cumulative: 600 },
     { rank: 4, label: 'Veteran', cost: 800, cumulative: 1400 }]);
check('nothing remains at max rank', remainingProgression('characteristic', 5, 2), []);

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
check('nine characteristics mapped, Influence excluded', Object.keys(CHARACTERISTIC_APTITUDES).length, 9);
check('Influence has no aptitudes', CHARACTERISTIC_APTITUDES.influence, undefined);
check('Common Lore is Knowledge, not General (quickref disagrees; book wins)',
    SKILL_APTITUDES.commonLore, ['Intelligence', 'Knowledge']);
const everyPairHasTwo = Object.values(SKILL_APTITUDES).every((a) => a.length === 2)
    && Object.values(CHARACTERISTIC_APTITUDES).every((a) => a.length === 2);
check('every entry has exactly two aptitudes', everyPairHasTwo, true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
