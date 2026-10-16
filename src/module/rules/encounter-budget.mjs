/**
 * Encounter budgeting, Core Rulebook pp.379-382. Pure functions -- no Foundry globals -- so the
 * band edges, which are where the bugs live, can be unit-tested (tests/test-encounter-budget.mjs).
 *
 *   encounter level   = average SPENT xp across the player characters in the encounter
 *   threat threshold  = Table 12-1 multiplier for that level x number of PCs
 *   each NPC profile carries a threat value; the GM fills the budget until the total ~ threshold
 */

/**
 * Table 12-1: Threat Threshold (Core Rulebook p.382). `min` is the first encounter level in the
 * band; a band runs up to (not including) the next band's `min`, and the last is open-ended.
 * Transcribed as lower edges only so the bands cannot overlap or leave a gap.
 */
export const THREAT_THRESHOLDS = [
    { min: 0, max: 499, multiplier: 4 },
    { min: 500, max: 999, multiplier: 5 },
    { min: 1000, max: 1299, multiplier: 6 },
    { min: 1300, max: 2299, multiplier: 7 },
    { min: 2300, max: 4499, multiplier: 8 },
    { min: 4500, max: 6999, multiplier: 10 },
    { min: 7000, max: 9999, multiplier: 12 },
    { min: 10000, max: 13499, multiplier: 14 },
    { min: 13500, max: 17499, multiplier: 17 },
    { min: 17500, max: 21999, multiplier: 20 },
    { min: 22000, max: 26999, multiplier: 23 },
    { min: 27000, max: 30999, multiplier: 27 },
    { min: 31000, max: 35999, multiplier: 31 },
    { min: 36000, max: null, multiplier: 35 }, // "36000+"
];

/** "A typical encounter should have roughly 1-3 Elites and Masters, with the rest of the threat
 * threshold being filled in with Troops." (p.380) */
export const ELITE_MASTER_RANGE = { min: 1, max: 3 };

/**
 * Encounter level: the mean spent XP of the given PCs, rounded DOWN to a whole number.
 *
 * The book's bands are whole numbers ("0-499", "500-999"), so a level of 499.9 has not reached
 * the 500 band; flooring keeps the integer part, which is how the printed bands read. Rounding to
 * nearest would let 499.5 jump a band the party has not actually earned. An empty party gives 0.
 * @param spentXpValues {number[]}
 * @returns {number}
 */
export function encounterLevel(spentXpValues) {
    const values = (spentXpValues ?? []).map((v) => Number(v) || 0);
    if (values.length === 0) return 0;
    return Math.floor(values.reduce((a, b) => a + b, 0) / values.length);
}

/** The Table 12-1 row containing `level` (negative levels are clamped to the first band). */
export function thresholdBand(level) {
    const lvl = Math.max(0, Math.floor(Number(level) || 0));
    return THREAT_THRESHOLDS.find((b) => b.max === null || lvl <= b.max);
}

/** The Table 12-1 multiplier for an encounter level. */
export function thresholdMultiplier(level) {
    return thresholdBand(level).multiplier;
}

/** Threat threshold = multiplier x number of PCs. No PCs, no budget. */
export function threatThreshold(level, pcCount) {
    const pcs = Math.max(0, Math.floor(Number(pcCount) || 0));
    return thresholdMultiplier(level) * pcs;
}

/**
 * The recommended encounter shape for a threshold: 1-3 Elites/Masters, the rest Troops.
 *
 * The book gives a head-count for leaders but no per-type threat values, so what can be said
 * from the threshold alone is the leader range, capped so it never exceeds the budget (every NPC
 * costs at least 1 threat, so a threshold of 2 cannot hold 3 leaders, and 0 holds none).
 *
 * If the caller knows what an Elite/Master costs (`leaderThreat`, e.g. the cheapest or the
 * typical one they intend to use), the advice also says how many are affordable and how much
 * budget that leaves for Troops. Where 1 leader would eat the entire budget, the leader range
 * shrinks to what fits and `leadersConsumeBudget` is set so the UI can say so.
 * @param threshold {number}
 * @param leaderThreat {number} [optional] threat of one Elite/Master
 * @returns {{threshold:number, leaders:{min:number,max:number}, troopBudget:{min:number,max:number}|null, leadersConsumeBudget:boolean}}
 */
export function compositionAdvice(threshold, leaderThreat = null) {
    const budget = Math.max(0, Math.floor(Number(threshold) || 0));
    const cost = Number(leaderThreat) > 0 ? Number(leaderThreat) : null;
    const affordable = cost === null ? budget : Math.floor(budget / cost);
    const leaders = {
        min: Math.min(ELITE_MASTER_RANGE.min, affordable),
        max: Math.min(ELITE_MASTER_RANGE.max, affordable),
    };
    const troopBudget = cost === null ? null : { min: budget - leaders.max * cost, max: budget - leaders.min * cost };
    // True when the guideline's minimum of one leader leaves nothing (or less than nothing) for Troops.
    const leadersConsumeBudget = cost !== null && budget > 0 && budget - leaders.min * cost <= 0;
    return { threshold: budget, leaders, troopBudget, leadersConsumeBudget };
}
