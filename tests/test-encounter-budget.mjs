// Unit tests for the encounter budget (Core Rulebook pp.379-382, Table 12-1 on p.382). The band
// edges are where this module can be wrong by one, so every edge is pinned from both sides.
import {
    THREAT_THRESHOLDS, encounterLevel, thresholdBand, thresholdMultiplier, threatThreshold, compositionAdvice,
} from '../src/module/rules/encounter-budget.mjs';
import { check, done } from './harness.mjs';

// --- Table 12-1, transcribed independently of the module's own data ---------------------
// [first level, last level (null = open-ended), multiplier]
const TABLE = [
    [0, 499, 4], [500, 999, 5], [1000, 1299, 6], [1300, 2299, 7], [2300, 4499, 8],
    [4500, 6999, 10], [7000, 9999, 12], [10000, 13499, 14], [13500, 17499, 17],
    [17500, 21999, 20], [22000, 26999, 23], [27000, 30999, 27], [31000, 35999, 31],
    [36000, null, 35],
];
check('table has all 14 bands', THREAT_THRESHOLDS.length, 14);
check('module table matches the transcription',
    THREAT_THRESHOLDS.map((b) => [b.min, b.max, b.multiplier]), TABLE);
// Bands must tile the number line: each starts exactly one past the previous one's end.
check('bands are contiguous, no gap or overlap',
    THREAT_THRESHOLDS.slice(1).every((b, i) => b.min === THREAT_THRESHOLDS[i].max + 1), true);

// --- every band edge: first, last, and the value either side ----------------------------
TABLE.forEach(([first, last, mult], i) => {
    check(`band ${i + 1} first value ${first} -> x${mult}`, thresholdMultiplier(first), mult);
    if (i > 0) check(`band ${i + 1}: ${first - 1} (one below) is the previous band x${TABLE[i - 1][2]}`,
        thresholdMultiplier(first - 1), TABLE[i - 1][2]);
    if (last !== null) {
        check(`band ${i + 1} last value ${last} -> x${mult}`, thresholdMultiplier(last), mult);
        check(`band ${i + 1}: ${last + 1} (one above) is the next band x${TABLE[i + 1][2]}`,
            thresholdMultiplier(last + 1), TABLE[i + 1][2]);
    }
});
check('mid-band value', thresholdMultiplier(1150), 6);

// --- open-ended top band ------------------------------------------------------------------
check('36000 starts the top band', thresholdMultiplier(36000), 35);
check('a very high level stays in the top band', thresholdMultiplier(1000000), 35);
check('top band label has no upper edge', thresholdBand(50000).max, null);
// Out-of-range input must not throw or fall off the table.
check('negative level clamps to the first band', thresholdMultiplier(-5), 4);

// --- threshold scales with party size -----------------------------------------------------
check('1 PC at level 0 -> 4', threatThreshold(0, 1), 4);
check('4 PCs at level 0 -> 16', threatThreshold(0, 4), 16);
check('5 PCs at 1000 -> 30', threatThreshold(1000, 5), 30);
check('6 PCs at the 36000 band -> 210', threatThreshold(40000, 6), 210);
check('no PCs, no budget', threatThreshold(5000, 0), 0);
check('the edge value is used, not the one below (4 PCs at 500)', threatThreshold(500, 4), 20);
check('and the one below uses the lower band (4 PCs at 499)', threatThreshold(499, 4), 16);

// --- averaging ----------------------------------------------------------------------------
check('plain average', encounterLevel([1000, 2000, 3000]), 2000);
check('single PC is their own level', encounterLevel([1500]), 1500);
check('PC with 0 spent XP counts toward the average', encounterLevel([0, 1000]), 500);
check('all zero', encounterLevel([0, 0, 0]), 0);
check('empty party is level 0, not NaN', encounterLevel([]), 0);
check('undefined party is level 0', encounterLevel(undefined), 0);
// Rounding is DOWN: 499.5 has not reached the 500 band.
check('fractional average floors (499.5 -> 499)', encounterLevel([499, 500]), 499);
check('floored 499.5 stays in the 0-499 band', thresholdMultiplier(encounterLevel([499, 500])), 4);
check('fractional average floors (2/3)', encounterLevel([0, 0, 2]), 0);
check('non-numeric spent XP counts as 0', encounterLevel([1000, undefined, 'x', 2000]), 750);
// A party whose average lands exactly on a boundary.
check('average of exactly 500 enters the 500 band',
    thresholdMultiplier(encounterLevel([400, 600])), 5);
check('average of exactly 36000 enters the top band',
    thresholdMultiplier(encounterLevel([35000, 37000])), 35);
check('average of 999.67 stays below 1000', thresholdMultiplier(encounterLevel([999, 1000, 1000])), 5);
check('end to end: 3 PCs avg 1300 -> x7 -> 21',
    threatThreshold(encounterLevel([1000, 1300, 1600]), 3), 21);

// --- composition advice ----------------------------------------------------------------------
// "roughly 1-3 Elites and Masters, with the rest ... Troops" (p.380)
check('large threshold: 1-3 leaders', compositionAdvice(30).leaders, { min: 1, max: 3 });
check('large threshold, leader cost unknown: no troop figure', compositionAdvice(30).troopBudget, null);
check('large threshold, leaders at 5 each: troops get 15..25',
    compositionAdvice(30, 5).troopBudget, { min: 15, max: 25 });
check('large threshold: leaders do not eat the budget', compositionAdvice(30, 5).leadersConsumeBudget, false);
// Small threshold: one leader can take the whole budget.
check('small threshold, 1 leader costs it all: flagged', compositionAdvice(4, 4).leadersConsumeBudget, true);
check('small threshold, 1 leader costs it all: 1 leader, 0 troops',
    [compositionAdvice(4, 4).leaders, compositionAdvice(4, 4).troopBudget],
    [{ min: 1, max: 1 }, { min: 0, max: 0 }]);
check('leader range shrinks to what is affordable (budget 8, cost 4)',
    compositionAdvice(8, 4).leaders, { min: 1, max: 2 });
check('a leader that costs more than the budget is unaffordable',
    [compositionAdvice(4, 6).leaders, compositionAdvice(4, 6).leadersConsumeBudget],
    [{ min: 0, max: 0 }, false]);
check('every NPC costs at least 1, so threshold 2 holds at most 2 leaders',
    compositionAdvice(2).leaders, { min: 1, max: 2 });
check('zero threshold: no leaders', compositionAdvice(0).leaders, { min: 0, max: 0 });
check('advice echoes the threshold', compositionAdvice(16).threshold, 16);

done();
