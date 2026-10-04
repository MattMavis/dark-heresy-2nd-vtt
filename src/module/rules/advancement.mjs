/**
 * Advancement costs.
 *
 * What an advance costs in Dark Heresy depends on how many of the character's aptitudes match
 * the thing being bought: two, one, or none. The `cost` fields template.json carries on
 * characteristics and skills play no part in this and sit at zero.
 *
 * Deliberately free of Foundry globals so the arithmetic can be unit tested directly in node.
 * Every number below was read from the Core Rulebook page images (pages 80 and 81); the text
 * extraction of Table 2-4 came out with its rows wrapped across columns and would have produced
 * wrong costs, so do not "correct" these against a text dump. A third-party quick reference was
 * cross-checked against them and disagreed on exactly one entry -- it lists Common Lore's second
 * aptitude as General, where the book says Knowledge twice over. The book wins.
 */
import { evaluatePrerequisites } from './talent-prerequisites.mjs';
import { evaluatePsychicPowerPrerequisites } from './psychic-power-prerequisites.mjs';

/** Progression ranks, in the order they must be bought. */
export const CHARACTERISTIC_RANKS = ['Simple', 'Intermediate', 'Trained', 'Proficient', 'Expert'];
export const SKILL_RANKS = ['Known', 'Trained', 'Experienced', 'Veteran'];

/** Table 2-2, indexed by number of matching aptitudes then by rank (1-based). */
export const CHARACTERISTIC_ADVANCE_COSTS = {
    2: [100, 250, 500, 750, 1250],
    1: [250, 500, 750, 1000, 1500],
    0: [500, 750, 1000, 1500, 2500],
};

/** Table 2-4. */
export const SKILL_ADVANCE_COSTS = {
    2: [100, 200, 300, 400],
    1: [200, 400, 600, 800],
    0: [300, 600, 900, 1200],
};

/** Table 2-6, indexed by matching aptitudes then talent tier (1-based). */
export const TALENT_ADVANCE_COSTS = {
    2: [200, 300, 400],
    1: [300, 450, 600],
    0: [600, 900, 1200],
};

/**
 * Table 2-3. Influence is deliberately absent: the book lists nine characteristics here and
 * Influence is not among them, because it is not advanced with experience.
 */
export const CHARACTERISTIC_APTITUDES = {
    weaponSkill: ['Weapon Skill', 'Offence'],
    ballisticSkill: ['Ballistic Skill', 'Finesse'],
    strength: ['Strength', 'Offence'],
    toughness: ['Toughness', 'Defence'],
    agility: ['Agility', 'Finesse'],
    intelligence: ['Intelligence', 'Knowledge'],
    perception: ['Perception', 'Fieldcraft'],
    willpower: ['Willpower', 'Psyker'],
    fellowship: ['Fellowship', 'Social'],
};

/** Table 2-5. Keys match the skill keys in template.json. */
export const SKILL_APTITUDES = {
    acrobatics: ['Agility', 'General'],
    athletics: ['Strength', 'General'],
    awareness: ['Perception', 'Fieldcraft'],
    charm: ['Fellowship', 'Social'],
    command: ['Fellowship', 'Leadership'],
    commerce: ['Intelligence', 'Knowledge'],
    commonLore: ['Intelligence', 'Knowledge'],
    deceive: ['Fellowship', 'Social'],
    dodge: ['Agility', 'Defence'],
    forbiddenLore: ['Intelligence', 'Knowledge'],
    inquiry: ['Fellowship', 'Social'],
    interrogation: ['Willpower', 'Social'],
    intimidate: ['Strength', 'Social'],
    linguistics: ['Intelligence', 'General'],
    logic: ['Intelligence', 'Knowledge'],
    medicae: ['Intelligence', 'Fieldcraft'],
    navigate: ['Intelligence', 'Fieldcraft'],
    operate: ['Agility', 'Fieldcraft'],
    parry: ['Weapon Skill', 'Defence'],
    psyniscience: ['Perception', 'Psyker'],
    scholasticLore: ['Intelligence', 'Knowledge'],
    scrutiny: ['Perception', 'General'],
    security: ['Intelligence', 'Tech'],
    sleightOfHand: ['Agility', 'Knowledge'],
    stealth: ['Agility', 'Fieldcraft'],
    survival: ['Perception', 'Fieldcraft'],
    techUse: ['Intelligence', 'Tech'],
    trade: ['Intelligence', 'General'],
};

/* -------------------------------------------- */
/*  Aptitude matching                           */
/* -------------------------------------------- */

/**
 * Aptitudes are compared by name and arrive from several places with inconsistent formatting --
 * item names, free text on talents ("Weapon Skill, Ballistic Skill"), and the tables above. Fold
 * case and whitespace, and accept the American spelling of Defence/Offence so a hand-typed
 * talent still matches.
 */
export function normaliseAptitude(name) {
    if (!name) return '';
    return String(name)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/\bdefense\b/, 'defence')
        .replace(/\boffense\b/, 'offence');
}

/** Split a free-text aptitude field ("Weapon Skill, Ballistic Skill") into normalised names. */
export function parseAptitudeList(value) {
    if (Array.isArray(value)) return value.map(normaliseAptitude).filter(Boolean);
    if (!value) return [];
    return String(value)
        .split(/[,;/]| or /i)
        .map(normaliseAptitude)
        .filter(Boolean);
}

/**
 * How many of `required` the character has, capped at 2 -- the cost tables have no column for
 * more than two, and a few talents list only one aptitude, which simply makes two matches
 * impossible for them.
 */
export function countMatchingAptitudes(ownedAptitudes, required) {
    const owned = new Set(parseAptitudeList(ownedAptitudes));
    const need = parseAptitudeList(required);
    let matches = 0;
    for (const apt of new Set(need)) if (owned.has(apt)) matches += 1;
    return Math.min(matches, 2);
}

/* -------------------------------------------- */
/*  Costs                                       */
/* -------------------------------------------- */

function lookup(table, matches, rank) {
    const row = table[Math.min(Math.max(matches, 0), 2)];
    const cost = row?.[rank - 1];
    return Number.isFinite(cost) ? cost : null;
}

/** Cost of the single step that takes a characteristic to `rank` (1 = Simple .. 5 = Expert). */
export function characteristicAdvanceCost(rank, matches) {
    return lookup(CHARACTERISTIC_ADVANCE_COSTS, matches, rank);
}

/** Cost of the single step that takes a skill to `rank` (1 = Known .. 4 = Veteran). */
export function skillAdvanceCost(rank, matches) {
    return lookup(SKILL_ADVANCE_COSTS, matches, rank);
}

/** Cost of a talent of the given tier (1-3). */
export function talentCost(tier, matches) {
    return lookup(TALENT_ADVANCE_COSTS, matches, Number(tier) || 1);
}

/**
 * Total cost of climbing from `fromRank` to `toRank`.
 *
 * Advances are cumulative: a character cannot buy Trained without having bought Known, and pays
 * for each step on the way. Returns null if the range is invalid, so callers can refuse rather
 * than charge a nonsense amount.
 */
export function progressionCost(kind, fromRank, toRank, matches) {
    const table = kind === 'characteristic' ? CHARACTERISTIC_ADVANCE_COSTS : SKILL_ADVANCE_COSTS;
    const max = table[0].length;
    const from = Number(fromRank) || 0;
    const to = Number(toRank) || 0;
    if (to <= from || from < 0 || to > max) return null;

    let total = 0;
    for (let rank = from + 1; rank <= to; rank++) {
        const step = lookup(table, matches, rank);
        if (step === null) return null;
        total += step;
    }
    return total;
}

/* -------------------------------------------- */
/*  Steps and rows                              */
/* -------------------------------------------- */

/** The one step available from `rank`, or null at the top of the ladder. */
export function nextCharacteristicStep(rank, matches) {
    const current = Number(rank) || 0;
    if (current >= CHARACTERISTIC_RANKS.length) return null;
    const cost = characteristicAdvanceCost(current + 1, matches);
    return cost === null ? null : { rank: current + 1, matches, cost, label: CHARACTERISTIC_RANKS[current] };
}

/** Same, for a skill or one of its specialities. */
export function nextSkillStep(rank, matches) {
    const current = Number(rank) || 0;
    if (current >= SKILL_RANKS.length) return null;
    const cost = skillAdvanceCost(current + 1, matches);
    return cost === null ? null : { rank: current + 1, matches, cost, label: SKILL_RANKS[current] };
}

/**
 * The view-model behind one row of an advancement table.
 *
 * The spend window and the creation wizard render identical tables; all that differs is where the
 * three inputs come from -- a live actor in one case, the wizard's pending state in the other --
 * so they are passed in rather than looked up here. Only the *next* rung is ever offered, which
 * is what makes the cumulative rule automatic: a rank cannot be skipped because it is never shown.
 *
 * @param kind {'characteristic'|'skill'}
 */
export function advanceRow(kind, { key, spKey = null, label, rank, matches, available }) {
    const isCharacteristic = kind === 'characteristic';
    const ranks = isCharacteristic ? CHARACTERISTIC_RANKS : SKILL_RANKS;
    const current = Number(rank) || 0;
    const step = isCharacteristic ? nextCharacteristicStep(current, matches) : nextSkillStep(current, matches);
    return {
        key,
        ...(isCharacteristic ? {} : { spKey }),
        label,
        rankLabel: current > 0 ? ranks[current - 1] : 'None',
        matches,
        nextLabel: step?.label ?? null,
        nextCost: step?.cost ?? null,
        canAfford: !!step && step.cost <= available,
    };
}

/**
 * The view-model behind one row of a talent table, for the same two hosts as {@link advanceRow}.
 *
 * `prereqBlocked` is reported raw, before `ignorePrerequisites` is applied, so the row still shows
 * a GM which talents they are overriding; only `canAfford` -- what the Buy button reads -- honours
 * the override. A talent with no valid tier prices as null and can never be bought.
 *
 * The caller decides which candidates reach here: the spend window drops talents the actor already
 * owns, the wizard drops ones it has already planned.
 */
export function talentRow(candidate, { aptitudes, available, snapshot, ignorePrerequisites = false }) {
    const matches = countMatchingAptitudes(aptitudes, candidate.aptitudes);
    const cost = talentCost(candidate.tier, matches);
    const prereq = evaluatePrerequisites(candidate.prerequisites, snapshot);
    return {
        ...candidate,
        matches,
        cost,
        prereqClauses: prereq.clauses,
        prereqBlocked: prereq.blocked,
        canAfford: cost !== null && cost <= available && !(prereq.blocked && !ignorePrerequisites),
    };
}

/**
 * The view-model behind one row of a psychic power table, for the Spend Experience window.
 *
 * Unlike {@link talentRow}, cost is not aptitude-priced -- it is the power's own flat
 * `system.cost` (see `compendium-grants.mjs`'s `loadPsychicPowerCandidates`), so there is no
 * `matches`/`aptitudes` input here. A power priced at 0 (a data gap in a few pack entries, not a
 * deliberately free power) is still shown and still buyable -- `canAfford` only asks whether
 * `cost <= available`, which 0 always satisfies, rather than treating 0 as "unpriced" the way
 * `talentRow` treats a null tier cost.
 *
 * `prereqClauses`/`prereqBlocked` come from {@link evaluatePsychicPowerPrerequisites}, which
 * rewrites the pack's non-standard prerequisite phrasings (see psychic-power-prerequisites.mjs)
 * before handing off to the same three-valued clause grammar a talent's prerequisites use --
 * including the "owns another power" clauses that encode a discipline's power tree.
 */
export function psychicPowerRow(candidate, { available, snapshot, ignorePrerequisites = false }) {
    const cost = Number(candidate.cost) || 0;
    const prereq = evaluatePsychicPowerPrerequisites(candidate.prerequisite, snapshot);
    return {
        ...candidate,
        cost,
        prereqClauses: prereq.clauses,
        prereqBlocked: prereq.blocked,
        canAfford: cost <= available && !(prereq.blocked && !ignorePrerequisites),
    };
}

/* -------------------------------------------- */
/*  Ledger                                      */
/* -------------------------------------------- */

/**
 * One spend-ledger entry, in the shape `_computeExperience` sums and the experience panel renders.
 *
 * Both the spend window and the creation wizard append these, for characteristics, skills and
 * talents -- six call sites that previously each wrote the field set out by hand and could drift
 * apart. `rank` and `matches` are omitted when not supplied (a talent has no rank), and any extra
 * fields a caller needs are carried through.
 *
 * `id` is a parameter rather than generated here so this module stays free of Foundry globals;
 * callers pass `foundry.utils.randomID()`.
 */
export function purchaseEntry(kind, { id, cost, label, key, rank, matches, at = Date.now(), ...extra }) {
    return {
        id,
        kind,
        source: 'purchase',
        cost,
        label,
        at,
        ...(key === undefined ? {} : { key }),
        ...(rank === undefined ? {} : { rank }),
        ...(matches === undefined ? {} : { matches }),
        ...extra,
    };
}

/** Entries may carry a negative cost (a refund or a downward adjustment). */
export function ledgerTotal(ledger) {
    if (!Array.isArray(ledger)) return 0;
    return ledger.reduce((sum, e) => sum + (Number(e?.cost) || 0), 0);
}

/**
 * Partitions a ledger's cost by `kind`, for the experience panel's spend-by-category display.
 * Anything outside the four recognised kinds (including the `'adjustment'` kind the legacy
 * opening-balance entry from `migrateExperienceLedger` uses) falls into `other` rather than being
 * dropped, so the five buckets always sum to {@link ledgerTotal} exactly.
 */
export function ledgerByKind(ledger) {
    const byKind = { characteristic: 0, skill: 0, talent: 0, psychicPower: 0, other: 0 };
    const knownKinds = ['characteristic', 'skill', 'talent', 'psychicPower'];
    for (const entry of Array.isArray(ledger) ? ledger : []) {
        const bucket = knownKinds.includes(entry?.kind) ? entry.kind : 'other';
        byKind[bucket] += Number(entry?.cost) || 0;
    }
    return byKind;
}

export function ledgerSorted(ledger) {
    if (!Array.isArray(ledger)) return [];
    return [...ledger].sort((a, b) => (Number(b?.at) || 0) - (Number(a?.at) || 0));
}

/**
 * Sum of a character's XP awards -- the mirror image of {@link ledgerTotal} on the other side of
 * the account. Ledger entries spend from `total`; award entries are what `total` is made of, once
 * a character has at least one.
 */
export function awardsTotal(awards) {
    if (!Array.isArray(awards)) return 0;
    return awards.reduce((sum, a) => sum + (Number(a?.amount) || 0), 0);
}

/**
 * Every remaining step for something at `currentRank`, as {rank, label, cost, cumulative}, for
 * showing the whole ladder in the spend UI rather than only the next rung.
 */
export function remainingProgression(kind, currentRank, matches) {
    const isChar = kind === 'characteristic';
    const labels = isChar ? CHARACTERISTIC_RANKS : SKILL_RANKS;
    const out = [];
    let cumulative = 0;
    for (let rank = (Number(currentRank) || 0) + 1; rank <= labels.length; rank++) {
        const cost = lookup(isChar ? CHARACTERISTIC_ADVANCE_COSTS : SKILL_ADVANCE_COSTS, matches, rank);
        if (cost === null) break;
        cumulative += cost;
        out.push({ rank, label: labels[rank - 1], cost, cumulative });
    }
    return out;
}
