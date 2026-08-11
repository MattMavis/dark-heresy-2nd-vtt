/**
 * Character creation: merging grants from home world / background / role, and resolving the
 * book-worded choices a player makes along the way into something this system can apply.
 *
 * Deliberately free of Foundry globals (no `game`, no `Actor`) so all of it can be unit tested
 * directly in node, same discipline as `advancement.mjs` and `grant-resolution.mjs`. The wizard
 * itself (`prompts/character-creation-prompt.mjs`) is the only place that talks to `game.packs`
 * and actor documents; everything here is pure data-in, data-out.
 */
import { normaliseAptitude } from './advancement.mjs';
import { splitParenthetical } from './grant-resolution.mjs';
import { DarkHeresy } from './config.mjs';

// Re-exported so callers of this module (and its tests) need not know where it moved to.
export { splitParenthetical };

/** Normalise one fixed talent/trait grant (string or {talent|trait, speciality} object) to a
 * common {name, speciality, source} shape. */
export function normaliseFixedGrant(entry, source) {
    if (typeof entry === 'string') return { ...splitParenthetical(entry), source };
    const name = entry?.talent ?? entry?.trait ?? entry?.name ?? '';
    return { name, speciality: entry?.speciality ?? null, source };
}

/* -------------------------------------------- */
/*  Structured-data accessors                    */
/* -------------------------------------------- */

const EMPTY_SKILLS = { fixed_skills: [], skill_choices: [] };
const EMPTY_TALENTS = { fixed_talents: [], talent_choices: [] };
const EMPTY_TRAITS = { fixed_traits: [], trait_choices: [] };

/** Home world bonuses keep skills/talents/traits together under one `structured` object. */
export function homeworldStructured(homeworld) {
    return homeworld?.home_world_bonus?.structured ?? { ...EMPTY_SKILLS, ...EMPTY_TALENTS, ...EMPTY_TRAITS };
}

export function backgroundSkillsStructured(background) {
    return background?.starting_skills_structured ?? EMPTY_SKILLS;
}

export function backgroundTalentsStructured(background) {
    return background?.starting_talents_structured ?? EMPTY_TALENTS;
}

/** Unlike skills/talents, a background with no starting traits records `starting_traits: null`
 * outright rather than an empty structured object -- fall back the same way either way. */
export function backgroundTraitsStructured(background) {
    return background?.starting_traits ?? EMPTY_TRAITS;
}

export function backgroundEquipmentStructured(background) {
    return background?.starting_equipment_structured ?? { fixed_equipment: [], equipment_choices: [] };
}

/* -------------------------------------------- */
/*  Gathering grants from home world + background */
/* -------------------------------------------- */

/** Every skill grant neither source leaves to a choice, tagged with where it came from. */
export function collectFixedSkillGrants(homeworld, background) {
    const hw = homeworldStructured(homeworld).fixed_skills.map((g) => ({ ...g, source: 'Home World' }));
    const bg = backgroundSkillsStructured(background).fixed_skills.map((g) => ({ ...g, source: 'Background' }));
    return [...hw, ...bg];
}

/**
 * Every skill choice group from both sources, each given a stable id for the wizard's state to
 * key a selection against. The id is namespaced by the source's own *name*, not just its slot
 * ("hw-skill-0") -- otherwise switching home world from A to B would leave a selection made
 * against A's first skill choice group silently reinterpreted as an answer to B's unrelated
 * first skill choice group, just because both happen to be group index 0.
 */
export function collectSkillChoiceGroups(homeworld, background) {
    const hw = homeworldStructured(homeworld).skill_choices.map((group, i) => ({ id: `hw-${homeworld?.name}-skill-${i}`, source: 'Home World', group }));
    const bg = backgroundSkillsStructured(background).skill_choices.map((group, i) => ({ id: `bg-${background?.name}-skill-${i}`, source: 'Background', group }));
    return [...hw, ...bg];
}

export function collectFixedTalentGrants(homeworld, background) {
    const hw = homeworldStructured(homeworld).fixed_talents.map((g) => normaliseFixedGrant(g, 'Home World'));
    const bg = backgroundTalentsStructured(background).fixed_talents.map((g) => normaliseFixedGrant(g, 'Background'));
    return [...hw, ...bg];
}

/** Same id-namespacing reasoning as {@link collectSkillChoiceGroups}. */
export function collectTalentChoiceGroups(homeworld, background) {
    const hw = homeworldStructured(homeworld).talent_choices.map((group, i) => ({ id: `hw-${homeworld?.name}-talent-${i}`, source: 'Home World', group }));
    const bg = backgroundTalentsStructured(background).talent_choices.map((group, i) => ({ id: `bg-${background?.name}-talent-${i}`, source: 'Background', group }));
    return [...hw, ...bg];
}

export function collectFixedTraitGrants(homeworld, background) {
    const hw = homeworldStructured(homeworld).fixed_traits.map((g) => normaliseFixedGrant(g, 'Home World'));
    const bg = backgroundTraitsStructured(background).fixed_traits.map((g) => normaliseFixedGrant(g, 'Background'));
    return [...hw, ...bg];
}

/** Same id-namespacing reasoning as {@link collectSkillChoiceGroups}. */
export function collectTraitChoiceGroups(homeworld, background) {
    const hw = homeworldStructured(homeworld).trait_choices.map((group, i) => ({ id: `hw-${homeworld?.name}-trait-${i}`, source: 'Home World', group }));
    const bg = backgroundTraitsStructured(background).trait_choices.map((group, i) => ({ id: `bg-${background?.name}-trait-${i}`, source: 'Background', group }));
    return [...hw, ...bg];
}

/** A `free_choice` group names no candidate list -- the book says "pick one" without enumerating
 * the options, so its single "option" only carries the skill the player must specialise within
 * ("any one Scholastic Lore"). Returns null for an ordinary group. */
export function freeChoiceSkillName(group) {
    if (!group?.free_choice) return null;
    return group.options?.[0]?.grants?.[0]?.skill ?? null;
}

/* -------------------------------------------- */
/*  Aptitudes                                    */
/* -------------------------------------------- */

/** Every character has the General aptitude regardless of home world/background/role (see the
 * General entry's own description in the aptitudes pack) -- included unconditionally so no
 * caller can forget it. Names are deduplicated case/whitespace-insensitively (two sources
 * granting "Toughness" must not produce two Toughness aptitude Items), keeping the first-seen
 * casing. */
export function mergeAptitudeNames(sources = []) {
    const seen = new Map();
    for (const name of [...sources, 'General']) {
        if (!name) continue;
        const key = normaliseAptitude(name);
        if (!seen.has(key)) seen.set(key, String(name).trim());
    }
    return [...seen.values()];
}

/* -------------------------------------------- */
/*  Talent/trait speciality resolution           */
/* -------------------------------------------- */

const NEEDS_PLAYER_CHOICE = /player.?s choice|pick one|choice|^any\b/i;

/**
 * Resolve a grant's free-text speciality/level against the *actual* compendium item's own
 * schema (discovered by the caller after fetching the Document): whether it takes a `choice`
 * from one of `config.mjs`'s named lists, and/or a numeric `level`.
 *
 * Two different source shapes collapse to the same handling here: a bare number ("1" for
 * Toxic, which only has a level) and a compound "Name (N)" string (Unnatural Characteristic's
 * "Agility (1)", which has both a characteristic choice and a level). Never throws; an
 * unresolvable speciality comes back with `unresolved` set so the caller can surface it rather
 * than silently granting a blank talent.
 */
export function resolveGrantSpeciality(speciality, { choiceList = null, hasLevel = false } = {}) {
    const result = { selected: null, level: null, unresolved: null };
    if (!speciality) return result;

    const text = String(speciality).trim();
    if (!choiceList && NEEDS_PLAYER_CHOICE.test(text)) {
        result.unresolved = `"${text}" needs a player choice this system cannot infer automatically.`;
        return result;
    }

    const compound = splitParenthetical(text);
    let namePart = text;
    let levelPart = null;
    if (compound.speciality && /^\d+$/.test(compound.speciality)) {
        namePart = compound.name;
        levelPart = Number(compound.speciality);
    } else if (/^\d+$/.test(text)) {
        namePart = null;
        levelPart = Number(text);
    }

    if (hasLevel && levelPart !== null) result.level = levelPart;

    if (choiceList) {
        const candidate = namePart ?? text;
        const options = DarkHeresy.choices?.[choiceList];
        if (Array.isArray(options)) {
            const found = options.find((o) => o.toLowerCase() === candidate.toLowerCase());
            if (found) result.selected = found;
            else result.unresolved = `"${candidate}" is not a valid ${choiceList} option.`;
        } else if (options && typeof options === 'object') {
            const found = Object.entries(options).find(([, label]) => label.toLowerCase() === candidate.toLowerCase());
            if (found) result.selected = found[0];
            else result.unresolved = `"${candidate}" is not a valid ${choiceList} option.`;
        } else {
            result.unresolved = `Item expects a choice from an unrecognised list "${choiceList}".`;
        }
    } else if (levelPart === null && !hasLevel) {
        result.unresolved = `Don't know how to apply speciality "${text}" to this item.`;
    }

    return result;
}

/* -------------------------------------------- */
/*  Divination                                   */
/* -------------------------------------------- */

/**
 * Resolve one divination's `mechanical_effect` into concrete deltas, given the player's answers
 * to anything it needs a choice for (`context.characteristicChoices`, keyed by the index of the
 * `characteristic_changes` entry) and closures telling it whether the character already has a
 * talent/skill the divination might instead be a fallback for.
 *
 * `table_rolls` (both divinations that send the character to roll on the Malignancies table) are
 * passed through as `manualTableRolls` rather than resolved -- rolling and applying an entire
 * separate table is out of scope here (see CLAUDE.md's "GM-side subsystems" note), and silently
 * doing nothing would be worse than saying so.
 */
export function resolveDivinationEffect(divination, context = {}) {
    const eff = divination?.mechanical_effect ?? {};
    const hasTalent = context.hasTalent ?? (() => false);
    const hasSkill = context.hasSkill ?? (() => false);
    const characteristicChoices = context.characteristicChoices ?? {};

    const result = {
        characteristicDeltas: [],
        talentGrant: null,
        skillGrant: null,
        mentalDisorders: (eff.mental_disorder_grants ?? []).map((m) => ({ name: m.name, page: m.page })),
        fateThresholdDelta: eff.fate_threshold_change ?? null,
        manualTableRolls: eff.table_rolls ?? [],
        needsChoice: [],
    };

    (eff.characteristic_changes ?? []).forEach((change, index) => {
        const candidates = change.characteristics ?? [];
        if (candidates.length <= 1) {
            if (candidates[0]) result.characteristicDeltas.push({ characteristic: candidates[0], amount: change.amount });
            return;
        }
        const chosen = characteristicChoices[index];
        if (chosen && candidates.includes(chosen)) {
            result.characteristicDeltas.push({ characteristic: chosen, amount: change.amount });
        } else {
            result.needsChoice.push({ kind: 'characteristic', index, candidates });
        }
    });

    for (const grant of eff.talent_grants ?? []) {
        if (grant.already_has_fallback && hasTalent(grant.talent)) {
            result.characteristicDeltas.push({ characteristic: grant.already_has_fallback.characteristic, amount: grant.already_has_fallback.amount });
        } else {
            result.talentGrant = { talent: grant.talent, subchoice: grant.subchoice ?? null, fixedSubchoice: grant.fixed_subchoice ?? null };
        }
    }

    for (const grant of eff.skill_grants ?? []) {
        if (grant.already_has_fallback && hasSkill(grant.skill, grant.rank)) {
            result.characteristicDeltas.push({ characteristic: grant.already_has_fallback.characteristic, amount: grant.already_has_fallback.amount });
        } else {
            result.skillGrant = { skill: grant.skill, rank: grant.rank };
        }
    }

    return result;
}

/** Table 6-9's `roll` field is either a bare number ("01", "100") or an inclusive range
 * ("50-54") as a string. Finds whichever entry a 1d100 result of `rollNumber` falls under. */
export function findDivinationForRoll(rollNumber, list = []) {
    return (
        list.find((d) => {
            const [lo, hi] = String(d.roll)
                .split('-')
                .map((n) => parseInt(n, 10));
            return rollNumber >= lo && rollNumber <= (Number.isFinite(hi) ? hi : lo);
        }) ?? null
    );
}

/* -------------------------------------------- */
/*  Characteristics                              */
/* -------------------------------------------- */

/**
 * A rolled/typed characteristic value (2d10+25, RAW) plus whatever the home world's bonus or
 * penalty adds -- home world bonuses are not applied anywhere in `prepareDerivedData`
 * (`_computeCharacteristics` only sets a `has_bonus`/`has_negative` *display* flag for the sheet
 * to highlight; the actual +5/-5 is expected to already be baked into what the player types into
 * `base`), so folding it into the rolled value here is the only place it actually happens.
 *
 * `characteristicLabel` is the display label ("Weapon Skill"), matched the same
 * whitespace/case-insensitive way `fieldMatch` (config.mjs) does, since home world data spells
 * characteristics with spaces while this system's internal keys do not.
 */
export function applyHomeworldCharacteristicModifier(rawValue, characteristicLabel, homeworld) {
    if (!homeworld) return rawValue;
    const fold = (name) => normaliseAptitude(name).replace(/\s+/g, '');
    const key = fold(characteristicLabel);
    if ((homeworld.bonus_characteristics ?? []).some((c) => fold(c) === key)) return rawValue + 5;
    if (fold(homeworld.negative_characteristic ?? '') === key) return rawValue - 5;
    return rawValue;
}
