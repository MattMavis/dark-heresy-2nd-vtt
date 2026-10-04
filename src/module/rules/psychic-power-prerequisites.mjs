/**
 * Psychic power prerequisites -- a thin layer over `talent-prerequisites.mjs`'s clause grammar,
 * for the handful of ways `src/packs/psychic-powers/psychic-powers.yml`'s `prerequisite` field
 * (singular; see the item sheet fix in item-psychic-power-sheet.hbs) diverges from the phrasing
 * that grammar was built against (talents.yml).
 *
 * None of this is a new grammar: every fix-up below rewrites the text into a shape the shared
 * parser already understands, then hands off to it unchanged. That keeps the discipline-tree
 * enforcement -- "Smite", "Life Leech", "Iron Arm OR Endurace" and the like naming a power the
 * character must already own -- on the exact same hasTalent-style ownership check a talent
 * prerequisite gets: a bare name that isn't otherwise a characteristic/skill/Psy Rating/etc.
 * clause resolves to a definite met/unmet against what the character owns, never indeterminate.
 * See {@link module:talent-prerequisites.evaluatePrerequisites} for why that must never block on
 * an indeterminate clause and always must block on a definite unmet one.
 *
 * Every fix-up here was found by diffing every non-characteristic, non-Psy-Rating, non-Corruption,
 * non-Insanity, non-Rank clause in the pack against the real power and talent names in their
 * compendia (see tests/test-psychic-powers.mjs's sweep) -- these are the only mismatches found,
 * not a guess at what else might be out there:
 *
 *   - "None" -- the pack's own way of writing "no prerequisite" (talents.yml uses an empty
 *     string for the same thing).
 *   - "Rank N <Skill>" ("Rank 1 Psyniscience") and "<Skill> rank N" ("Psyniscience rank 1") --
 *     two skill-rank phrasings the pack uses that omit or reorder the "in" the shared parser's
 *     `resolveRankClause` requires. Rewritten to "Rank N in <Skill>" before evaluation.
 *   - "Str 35" / "Fellowship 55" -- the book-standard characteristic codes the shared parser
 *     recognises are "S" and "Fel"; the pack spells them out in a few entries.
 *   - "Endurace" / "Spontanous Combustion" -- single-letter typos for the real power names
 *     "Endurance" and "Spontaneous Combustion". Left uncorrected, each reads as a reference to a
 *     power that does not exist and blocks forever regardless of ownership.
 *   - "5+ Insanity Points" -- the shared parser's Insanity clause is "Insanity N" (no "Points",
 *     no "+"); this pack's only Insanity clause spells it differently. Rewritten to "Insanity N",
 *     the same "at least N" meaning the existing clause already carries. Left uncorrected this is
 *     *not* actually indeterminate -- it falls through every atom resolver to the bare-name/owned-
 *     power check and comes back a hard, permanent "unmet", which is worse than either an advisory
 *     or the correct answer this rewrite produces.
 */
import { evaluatePrerequisites, splitTopLevel } from './talent-prerequisites.mjs';

const RANK_THEN_NAME = /^Rank\s+(\d+)\s+(?!in\b)([A-Za-z].*)$/i;
const NAME_THEN_RANK = /^([A-Za-z][A-Za-z\s-]*?)\s+[Rr]ank\s+(\d+)$/;

const BARE_NAME_FIXUPS = [
    [/\bEndurace\b/g, 'Endurance'],
    [/\bSpontanous Combustion\b/g, 'Spontaneous Combustion'],
];

/** Rewrite one already-comma-split clause into the shape the shared grammar expects. */
function normaliseClause(clause) {
    let text = clause.trim();
    if (!text) return text;

    for (const [pattern, replacement] of BARE_NAME_FIXUPS) text = text.replace(pattern, replacement);
    text = text
        .replace(/\bStr\s+(\d+)/g, 'S $1')
        .replace(/\bFellowship\s+(\d+)/g, 'Fel $1')
        .replace(/^(\d+)\+?\s*Insanity\s+Points?$/i, 'Insanity $1');

    const rankThenName = text.match(RANK_THEN_NAME);
    if (rankThenName) return `Rank ${rankThenName[1]} in ${rankThenName[2]}`;

    const nameThenRank = text.match(NAME_THEN_RANK);
    if (nameThenRank) return `Rank ${nameThenRank[2]} in ${nameThenRank[1]}`;

    return text;
}

/**
 * The pack-specific rewrite described above, applied clause by clause (comma-split, same as the
 * shared parser's own top-level split) so a fix-up aimed at one clause can never bleed into its
 * neighbours.
 */
export function normalisePsychicPowerPrerequisite(text) {
    const trimmed = String(text ?? '').trim();
    if (/^none$/i.test(trimmed)) return '';
    return splitTopLevel(trimmed, ',').map(normaliseClause).join(', ');
}

/** {@link module:talent-prerequisites.evaluatePrerequisites}, after the rewrite above. */
export function evaluatePsychicPowerPrerequisites(text, snapshot) {
    return evaluatePrerequisites(normalisePsychicPowerPrerequisite(text), snapshot);
}
