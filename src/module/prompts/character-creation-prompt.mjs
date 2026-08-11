import { recursiveUpdate } from '../rolls/roll-helpers.mjs';
import { SYSTEM_ID } from '../hooks-manager.mjs';
import { DarkHeresy } from '../rules/config.mjs';
import { normaliseName, resolveSkillGrant } from '../rules/grant-resolution.mjs';
import { homeworlds, homeworldNames } from '../rules/homeworlds.mjs';
import { backgrounds, backgroundNames } from '../rules/backgrounds.mjs';
import { roles, roleNames } from '../rules/roles.mjs';
import { divinations, divinationNames } from '../rules/divinations.mjs';
import { rollWoundsAndFate } from '../sheets/actor/acolyte-sheet.mjs';
import {
    CHARACTERISTIC_APTITUDES,
    SKILL_APTITUDES,
    CHARACTERISTIC_RANKS,
    SKILL_RANKS,
    characteristicAdvanceCost,
    skillAdvanceCost,
    talentCost,
    countMatchingAptitudes,
} from '../rules/advancement.mjs';
import { evaluatePrerequisites } from '../rules/talent-prerequisites.mjs';
import {
    collectFixedSkillGrants,
    collectSkillChoiceGroups,
    collectFixedTalentGrants,
    collectTalentChoiceGroups,
    collectFixedTraitGrants,
    collectTraitChoiceGroups,
    backgroundEquipmentStructured,
    freeChoiceSkillName,
    mergeAptitudeNames,
    resolveGrantSpeciality,
    resolveDivinationEffect,
    applyHomeworldCharacteristicModifier,
    findDivinationForRoll,
} from '../rules/character-creation.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** A `<select>` with no `data-dtype="Number"` still submits `""` for an unpicked placeholder
 * option, and a field that starts life as `null`/`undefined` (never yet chosen) needs the exact
 * same "nothing picked yet" treatment as one FormDataExtended already cast to a number -- checked
 * this way everywhere an index-valued choice is read back, rather than three different ad hoc
 * comparisons drifting out of sync with each other. */
function isUnset(value) {
    return value === null || value === undefined || value === '';
}

/** The nine characteristics DH2e rolls 2d10+25 for at creation (Table 2-3) -- Influence is
 * deliberately excluded, same as {@link CHARACTERISTIC_APTITUDES}: it is never advanced with
 * experience and this system does not derive a starting value for it from home world/background
 * data, so it is left for the GM to set by hand, same as today without this wizard. */
const ROLLED_CHARACTERISTIC_KEYS = Object.keys(CHARACTERISTIC_APTITUDES);

const STEPS = ['homeworld', 'background', 'role', 'characteristics', 'aptitudes', 'xp', 'divination', 'summary'];
const STEP_LABELS = {
    homeworld: 'Home World',
    background: 'Background',
    role: 'Role',
    characteristics: 'Characteristics',
    aptitudes: 'Aptitudes',
    xp: 'Starting Experience',
    divination: 'Divination',
    summary: 'Summary',
};

/* -------------------------------------------- */
/*  Compendium lookups                           */
/* -------------------------------------------- */

/**
 * One index across every Item compendium pack this system ships, built once when the wizard
 * opens. Aptitudes, talents, traits and mental disorders are all looked up by exact/normalised
 * name against it; equipment (messier free text like "2 doses of Stimm") gets a second, fuzzier
 * pass in {@link findEquipmentEntry}. A name colliding across two different packs would silently
 * prefer whichever pack was scanned first -- this has not happened anywhere in this system's
 * packs, but it is the one sharp edge of sharing a single index this way.
 */
async function buildItemIndex() {
    const index = new Map();
    const packs = game.packs.filter((p) => p.metadata.packageName === SYSTEM_ID && p.metadata.type === 'Item');
    for (const pack of packs) {
        let entries;
        try {
            entries = await pack.getIndex({ fields: ['name', 'type', 'system.choice', 'system.level', 'system.tier', 'system.aptitudes', 'system.prerequisites'] });
        } catch (err) {
            game.dh.error(`character creation: failed to index pack ${pack.metadata.id}`, err);
            continue;
        }
        for (const entry of entries) {
            const key = normaliseName(entry.name);
            if (index.has(key)) continue;
            index.set(key, {
                pack: pack.metadata.id,
                itemId: entry._id,
                name: entry.name,
                type: entry.type,
                tier: entry.system?.tier,
                aptitudes: entry.system?.aptitudes ?? '',
                prerequisites: entry.system?.prerequisites ?? '',
                choiceList: entry.system?.choice?.list ?? null,
                hasLevel: entry.system?.level !== undefined,
            });
        }
    }
    return index;
}

/** Resolve a `{name, speciality}` grant (a talent, trait or mental disorder name) against the
 * item index. Never throws and never guesses: an unmatched name or an unresolvable speciality
 * both come back as `status: 'unresolved'` with a human-readable reason, the same contract
 * `resolveSkillGrant` uses for skills. */
function resolveNamedGrant(index, grant) {
    const entry = index.get(normaliseName(grant.name));
    if (!entry) return { status: 'unresolved', reason: `"${grant.name}" was not found in the compendium.` };
    const spec = resolveGrantSpeciality(grant.speciality, { choiceList: entry.choiceList, hasLevel: entry.hasLevel });
    if (spec.unresolved) return { status: 'unresolved', reason: `${grant.name}: ${spec.unresolved}`, entry };
    return { status: 'ok', entry, selected: spec.selected, level: spec.level };
}

/** Equipment text is prose, not structured grant data ("2 doses of Stimm", "12 lho sticks") --
 * an exact match is tried first, then a second pass strips a leading quantity/"doses of"-style
 * phrase and any parenthetical before trying again. What still doesn't match is surfaced in the
 * summary as text only, not silently dropped, but (unlike skills) does not block Confirm: a
 * missing starting weapon is obvious and easy for a GM to add by hand from the Gear tab, in a way
 * a missing starting skill is not. */
function findEquipmentEntry(index, text) {
    const direct = index.get(normaliseName(text));
    if (direct) return direct;
    const stripped = String(text)
        .replace(/^\d+\s*(doses?|vials?|extra\s+clips?|clips?)\s*(of\s+)?/i, '')
        .replace(/\([^)]*\)/g, '')
        .trim();
    if (stripped && stripped.toLowerCase() !== String(text).toLowerCase()) {
        const found = index.get(normaliseName(stripped));
        if (found) return found;
    }
    return null;
}

/** Fetch a compendium item's full data, ready for `createEmbeddedDocuments`, with an optional
 * choice/level/quantity override baked in. Mirrors `grantRequisitionedItem` (rules/requisition.mjs)
 * but deliberately skips its "bump quantity on an existing item" merge: two chargen grants of the
 * same talent with different specialisations (two Weapon Training entries, say) must stay two
 * separate items, not collapse into one. */
async function buildGrantedItemData(entry, { selected = null, level = null, quantity = null } = {}) {
    const pack = game.packs.get(entry.pack);
    const doc = await pack?.getDocument(entry.itemId);
    if (!doc) return null;
    const data = doc.toObject();
    delete data._id;
    if (selected !== null) foundry.utils.setProperty(data, 'system.choice.selected', selected);
    if (level !== null) foundry.utils.setProperty(data, 'system.level', level);
    if (quantity !== null) foundry.utils.setProperty(data, 'system.quantity', quantity);
    return data;
}

/* -------------------------------------------- */
/*  Wizard state                                 */
/* -------------------------------------------- */

/**
 * Plain state object for the Character Creation wizard, modelled on `AdvancementData`
 * (advancement-prompt.mjs) and `AwardData` (award-prompt.mjs): every choice the player makes is
 * accumulated here, and nothing reaches the actor until {@link applyCharacterCreation} runs on
 * final Confirm. An abandoned wizard (closed early) therefore leaves the actor byte-for-byte
 * unchanged.
 */
class CharacterCreationData {
    actor;
    step = STEPS[0];

    homeworldName = '';
    backgroundName = '';
    roleName = '';

    /** Selections for every ordinary (non-free-choice) skill/talent/trait choice group, keyed by
     * the group's namespaced id (see character-creation.mjs) -> chosen option index. */
    choices = {};
    /** Selections for `free_choice` skill groups, keyed the same way -> chosen speciality key
     * (the skill itself is already fixed by the group, so only the speciality is a real choice). */
    freeChoices = {};

    backgroundAptitudeValue = '';
    /** Role aptitude choice groups (only Assassin has one today) -> chosen aptitude name. */
    roleAptitudeChoices = {};
    roleTalentIndex = null;
    /** The player's pick for a role talent option's `subchoice` (a Resistance or Hatred faction),
     * when that option doesn't already pin one via `fixed_subchoice`. */
    roleTalentSubchoiceValue = '';

    /** Background equipment choice groups -> chosen option index. */
    equipmentChoices = {};

    characteristics = Object.fromEntries(ROLLED_CHARACTERISTIC_KEYS.map((k) => [k, 0]));

    startingXpPool = 0;
    /** Purchases made so far in this wizard session, same entry shape as the real experience
     * ledger (advancement.mjs) -- appended verbatim to `system.experience.ledger` on Confirm. */
    xpLedger = [];
    xpTalentSearch = '';
    /** Talent candidates for the Starting Experience step, loaded once (async compendium fetch)
     * the first time that step is reached -- see {@link refreshXpTalentCandidates}. */
    xpTalentCandidates = [];

    divinationRoll = null;
    divinationCharacteristicChoices = {};
    divinationTalentSubchoiceValue = '';

    wounds = null; // {max}
    fate = null; // {max, blessingRoll}

    /** Loaded once when the dialog opens -- see {@link buildItemIndex}. */
    itemIndex = new Map();

    constructor(actor) {
        this.actor = actor;
    }

    /* ---- lookups ---- */

    get homeworld() {
        return homeworlds().find((h) => h.name === this.homeworldName) ?? null;
    }

    get background() {
        return backgrounds().find((b) => b.name === this.backgroundName) ?? null;
    }

    get role() {
        return roles().find((r) => r.name === this.roleName) ?? null;
    }

    get divination() {
        return this.divinationRoll ? findDivinationForRoll(this.divinationRoll, divinations()) : null;
    }

    get skills() {
        return this.actor.system.skills;
    }

    /* ---- step navigation ---- */

    get stepIndex() {
        return STEPS.indexOf(this.step);
    }

    get stepLabel() {
        return STEP_LABELS[this.step];
    }

    get stepNumber() {
        return this.stepIndex + 1;
    }

    get stepCount() {
        return STEPS.length;
    }

    get isFirstStep() {
        return this.stepIndex <= 0;
    }

    get isLastStep() {
        return this.stepIndex >= STEPS.length - 1;
    }

    get onHomeworld() {
        return this.step === 'homeworld';
    }

    get onBackground() {
        return this.step === 'background';
    }

    get onRole() {
        return this.step === 'role';
    }

    get onCharacteristics() {
        return this.step === 'characteristics';
    }

    get onAptitudes() {
        return this.step === 'aptitudes';
    }

    get onXp() {
        return this.step === 'xp';
    }

    get onDivination() {
        return this.step === 'divination';
    }

    get onSummary() {
        return this.step === 'summary';
    }

    get homeworldOptions() {
        return homeworldNames();
    }

    get backgroundOptions() {
        return backgroundNames();
    }

    get roleOptions() {
        return roleNames();
    }

    /* ---- choice-group view models (used by home world / background steps) ---- */

    /** Shared view-model builder for an ordinary or free-choice skill/talent/trait group --
     * kept generic because the three kinds only differ in whether "free choice" is possible
     * (skills only) and what a resolved option's label looks like. */
    _groupView(entry, kind) {
        const { id, group, source } = entry;
        if (kind === 'skill') {
            const freeSkill = freeChoiceSkillName(group);
            if (freeSkill) {
                const skillRes = resolveSkillGrant({ skill: freeSkill }, this.skills);
                const specialityOptions =
                    skillRes.status === 'ok'
                        ? Object.entries(this.skills[skillRes.skillKey]?.specialities ?? {}).map(([key, def]) => ({ key, label: def.label }))
                        : [];
                // Only the speciality is a real player choice -- the skill itself is already
                // fixed by the group, so `freeChoices[id]` stores just the speciality key.
                const selectedSpeciality = this.freeChoices[id] || '';
                return {
                    id,
                    source,
                    isFreeChoice: true,
                    promptLabel: group.note || `Any one ${freeSkill} specialisation`,
                    skillKey: skillRes.status === 'ok' ? skillRes.skillKey : null,
                    skillLabel: skillRes.status === 'ok' ? this.skills[skillRes.skillKey].label : freeSkill,
                    specialityOptions,
                    selectedSpeciality,
                    resolved: !!selectedSpeciality,
                    unresolvedSkill: skillRes.status !== 'ok' ? `"${freeSkill}" is not a skill this system recognises.` : null,
                };
            }
        }
        const options = group.options.map((opt, i) => ({ index: i, label: opt.label }));
        const rawSelected = this.choices[id];
        const selectedIndex = isUnset(rawSelected) ? '' : Number(rawSelected);
        return { id, source, isFreeChoice: false, options, selectedIndex, resolved: Number.isInteger(selectedIndex) };
    }

    get homeworldSkillGroups() {
        return collectSkillChoiceGroups(this.homeworld, null).map((e) => this._groupView(e, 'skill'));
    }

    get backgroundSkillGroups() {
        return collectSkillChoiceGroups(null, this.background).map((e) => this._groupView(e, 'skill'));
    }

    get homeworldTalentGroups() {
        return collectTalentChoiceGroups(this.homeworld, null).map((e) => this._groupView(e, 'talent'));
    }

    get backgroundTalentGroups() {
        return collectTalentChoiceGroups(null, this.background).map((e) => this._groupView(e, 'talent'));
    }

    get homeworldTraitGroups() {
        return collectTraitChoiceGroups(this.homeworld, null).map((e) => this._groupView(e, 'trait'));
    }

    get backgroundTraitGroups() {
        return collectTraitChoiceGroups(null, this.background).map((e) => this._groupView(e, 'trait'));
    }

    get homeworldFixedSkills() {
        return collectFixedSkillGrants(this.homeworld, null);
    }

    get backgroundFixedSkills() {
        return collectFixedSkillGrants(null, this.background);
    }

    get homeworldFixedTalents() {
        return collectFixedTalentGrants(this.homeworld, null);
    }

    get backgroundFixedTalents() {
        return collectFixedTalentGrants(null, this.background);
    }

    get homeworldFixedTraits() {
        return collectFixedTraitGrants(this.homeworld, null);
    }

    get backgroundFixedTraits() {
        return collectFixedTraitGrants(null, this.background);
    }

    get backgroundAptitudeOptions() {
        return this.background?.background_aptitude?.choice?.options ?? [];
    }

    get backgroundEquipment() {
        const structured = backgroundEquipmentStructured(this.background);
        return {
            fixed: structured.fixed_equipment,
            choiceGroups: structured.equipment_choices.map((group, i) => ({
                id: `bg-${this.background?.name}-equip-${i}`,
                group,
                selectedIndex: this.equipmentChoices[`bg-${this.background?.name}-equip-${i}`] ?? '',
            })),
        };
    }

    get roleAptitudeFixed() {
        return this.role?.role_aptitudes_structured?.fixed ?? [];
    }

    get roleAptitudeGroups() {
        return (this.role?.role_aptitudes_structured?.choice_groups ?? []).map((group, i) => {
            const id = `role-${this.role?.name}-apt-${i}`;
            return { id, options: group.options, selected: this.roleAptitudeChoices[id] ?? '' };
        });
    }

    /** The role talent choice's options, each annotated with whether it needs a further
     * subchoice (a Resistance/Hatred-style pick) and, if so, what list to offer. */
    get roleTalentOptions() {
        const choice = this.role?.role_talent_choice;
        if (!choice) return [];
        return choice.options.map((opt, i) => {
            const needsSubchoice = !!opt.subchoice && !opt.fixed_subchoice;
            const subchoiceList = opt.subchoice?.ref?.split(':')[1] ?? null;
            return {
                index: i,
                label: opt.fixed_subchoice ? `${opt.talent} (${opt.fixed_subchoice})` : opt.talent,
                needsSubchoice,
                subchoiceOptions: needsSubchoice ? DarkHeresy.choices?.[subchoiceList] ?? [] : [],
            };
        });
    }

    /* ---- characteristics (step 4) ---- */

    get characteristicInputRows() {
        return ROLLED_CHARACTERISTIC_KEYS.map((key) => ({
            key,
            label: this.actor.system.characteristics[key].label,
            value: this.characteristics[key],
        }));
    }

    /* ---- aptitudes (step 5): purely derived from steps 1-3 ---- */

    get plannedAptitudeNames() {
        const sources = [];
        if (this.homeworld?.aptitude) sources.push(this.homeworld.aptitude);
        if (this.backgroundAptitudeValue) sources.push(this.backgroundAptitudeValue);
        sources.push(...this.roleAptitudeFixed);
        for (const group of this.roleAptitudeGroups) {
            if (group.selected) sources.push(group.selected);
        }
        return mergeAptitudeNames(sources);
    }

    /* ---- skill grants: fixed + resolved choice selections, run through resolveSkillGrant ---- */

    get allSkillGrants() {
        const fixed = [...this.homeworldFixedSkills, ...this.backgroundFixedSkills];
        const fromChoices = [];
        for (const entry of [...this.homeworldSkillGroups, ...this.backgroundSkillGroups]) {
            if (entry.isFreeChoice) {
                if (!entry.resolved || !entry.skillKey) continue;
                const specLabel = this.skills[entry.skillKey]?.specialities?.[entry.selectedSpeciality]?.label ?? null;
                fromChoices.push({ skill: entry.skillLabel, speciality: specLabel, source: entry.source });
            } else if (entry.resolved) {
                const group = [...collectSkillChoiceGroups(this.homeworld, this.background)].find((e) => e.id === entry.id);
                const option = group?.group.options[entry.selectedIndex];
                for (const g of option?.grants ?? []) fromChoices.push({ ...g, source: entry.source });
            }
        }
        return [...fixed, ...fromChoices];
    }

    get resolvedSkillGrants() {
        return this.allSkillGrants.map((g) => ({ ...g, resolution: resolveSkillGrant(g, this.skills) }));
    }

    get unresolvedSkillGrants() {
        return this.resolvedSkillGrants.filter((g) => g.resolution.status !== 'ok');
    }

    /* ---- talent/trait grants, resolved against the compendium index ---- */

    get allTalentGrants() {
        const fixed = [...this.homeworldFixedTalents, ...this.backgroundFixedTalents];
        const fromChoices = [];
        for (const entry of [...this.homeworldTalentGroups, ...this.backgroundTalentGroups]) {
            if (!entry.resolved) continue;
            const group = [...collectTalentChoiceGroups(this.homeworld, this.background)].find((e) => e.id === entry.id);
            const option = group?.group.options[entry.selectedIndex];
            for (const g of option?.grants ?? []) fromChoices.push({ name: g.talent, speciality: g.speciality ?? null, source: entry.source });
        }
        const roleGrant = this.resolvedRoleTalentGrant;
        return roleGrant ? [...fixed, ...fromChoices, roleGrant] : [...fixed, ...fromChoices];
    }

    /** The role's chosen talent, with its subchoice (if any) substituted in as a plain
     * speciality string -- unified with every other talent grant from here on. */
    get resolvedRoleTalentGrant() {
        if (isUnset(this.roleTalentIndex)) return null;
        const option = this.role?.role_talent_choice?.options[Number(this.roleTalentIndex)];
        if (!option) return null;
        const speciality = option.fixed_subchoice ?? (option.subchoice ? this.roleTalentSubchoiceValue || null : null);
        return { name: option.talent, speciality, source: 'Role' };
    }

    get resolvedTalentGrants() {
        return this.allTalentGrants.map((g) => ({ ...g, resolution: resolveNamedGrant(this.itemIndex, g) }));
    }

    get unresolvedTalentGrants() {
        return this.resolvedTalentGrants.filter((g) => g.resolution.status !== 'ok');
    }

    get allTraitGrants() {
        const fixed = [...this.homeworldFixedTraits, ...this.backgroundFixedTraits];
        const fromChoices = [];
        for (const entry of [...this.homeworldTraitGroups, ...this.backgroundTraitGroups]) {
            if (!entry.resolved) continue;
            const group = [...collectTraitChoiceGroups(this.homeworld, this.background)].find((e) => e.id === entry.id);
            const option = group?.group.options[entry.selectedIndex];
            for (const g of option?.grants ?? []) fromChoices.push({ name: g.trait, speciality: g.speciality ?? null, source: entry.source });
        }
        return [...fixed, ...fromChoices];
    }

    get resolvedTraitGrants() {
        return this.allTraitGrants.map((g) => ({ ...g, resolution: resolveNamedGrant(this.itemIndex, g) }));
    }

    get unresolvedTraitGrants() {
        return this.resolvedTraitGrants.filter((g) => g.resolution.status !== 'ok');
    }

    /** Normalised names of every talent this character will own once applied -- fixed grants,
     * choice-group picks, the role talent, and anything already bought with starting XP.
     * Used to (a) keep the XP-step talent list from offering something already granted for
     * free, and (b) answer a divination's "already has this talent" fallback check. */
    get plannedTalentNames() {
        const names = new Set(this.allTalentGrants.map((g) => normaliseName(g.name)));
        for (const entry of this.xpLedger) if (entry.kind === 'talent') names.add(normaliseName(entry.talentName));
        return names;
    }

    hasPlannedTalent(name) {
        return this.plannedTalentNames.has(normaliseName(name));
    }

    /* ---- divination ---- */

    get divinationEffect() {
        if (!this.divination) return null;
        return resolveDivinationEffect(this.divination, {
            hasTalent: (name) => this.hasPlannedTalent(name),
            hasSkill: (name) => {
                const res = resolveSkillGrant({ skill: name }, this.skills);
                return res.status === 'ok' && this.xpCurrentSkillRank(res.skillKey, res.specialityKey) > 0;
            },
            characteristicChoices: this.divinationCharacteristicChoices,
        });
    }

    /** The two-candidate `characteristic_changes` entries this divination needs a player pick
     * for (a single-candidate entry, e.g. "Increase Perception by 5", needs no UI at all -- see
     * {@link resolveDivinationEffect}). Exposed with the player's current answer (if any) so the
     * template can render one `<select>` per outstanding choice. */
    get divinationCharacteristicChoiceInputs() {
        const changes = this.divination?.mechanical_effect?.characteristic_changes ?? [];
        return changes
            .map((c, index) => ({ index, candidates: c.characteristics, amount: c.amount, selected: this.divinationCharacteristicChoices[index] ?? '' }))
            .filter((c) => c.candidates.length > 1);
    }

    get divinationTalentSubchoiceOptions() {
        const grant = this.divinationEffect?.talentGrant;
        if (!grant?.subchoice) return [];
        const list = grant.subchoice.ref?.split(':')[1];
        return DarkHeresy.choices?.[list] ?? [];
    }

    /* ---- starting XP: reuses advancement.mjs's cost engine over the wizard's own state ---- */

    /** Rank a skill/speciality already sits at from chargen grants alone. Only ever 0 or 1: the
     * book grants starting skills at Known, never higher. */
    chargenSkillRank(key, spKey) {
        const mapKey = spKey ? `${key}.${spKey}` : key;
        const hit = this.resolvedSkillGrants.some((g) => {
            if (g.resolution.status !== 'ok') return false;
            const gKey = g.resolution.specialityKey ? `${g.resolution.skillKey}.${g.resolution.specialityKey}` : g.resolution.skillKey;
            return gKey === mapKey;
        });
        return hit ? 1 : 0;
    }

    xpCurrentSkillRank(key, spKey) {
        const mapKey = spKey ? `${key}.${spKey}` : key;
        const purchased = this.xpLedger.filter((e) => e.kind === 'skill' && e.key === mapKey).map((e) => e.rank);
        return purchased.length ? Math.max(this.chargenSkillRank(key, spKey), ...purchased) : this.chargenSkillRank(key, spKey);
    }

    xpCurrentCharacteristicRank(key) {
        const purchased = this.xpLedger.filter((e) => e.kind === 'characteristic' && e.key === key).map((e) => e.rank);
        return purchased.length ? Math.max(0, ...purchased) : 0;
    }

    get xpAvailable() {
        const spent = this.xpLedger.reduce((sum, e) => sum + (Number(e.cost) || 0), 0);
        return (Number(this.startingXpPool) || 0) - spent;
    }

    get xpCharacteristicRows() {
        return ROLLED_CHARACTERISTIC_KEYS.map((key) => {
            const rank = this.xpCurrentCharacteristicRank(key);
            const matches = countMatchingAptitudes(this.plannedAptitudeNames, CHARACTERISTIC_APTITUDES[key]);
            const step = this._xpNextCharacteristicStep(key);
            return {
                key,
                label: this.actor.system.characteristics[key].label,
                rankLabel: rank > 0 ? CHARACTERISTIC_RANKS[rank - 1] : 'None',
                matches,
                nextLabel: step?.label ?? null,
                nextCost: step?.cost ?? null,
                canAfford: !!step && step.cost <= this.xpAvailable,
            };
        });
    }

    _xpNextCharacteristicStep(key) {
        const rank = this.xpCurrentCharacteristicRank(key);
        if (rank >= CHARACTERISTIC_RANKS.length) return null;
        const matches = countMatchingAptitudes(this.plannedAptitudeNames, CHARACTERISTIC_APTITUDES[key]);
        const cost = characteristicAdvanceCost(rank + 1, matches);
        return cost === null ? null : { rank: rank + 1, matches, cost, label: CHARACTERISTIC_RANKS[rank] };
    }

    /** One row per skill, plus one row per speciality already granted at chargen -- an
     * un-granted speciality of a specialist skill has nothing to advance yet, same restriction
     * `AdvancementDialog` applies to a live actor. */
    get xpSkillRows() {
        const rows = [];
        for (const [key, required] of Object.entries(SKILL_APTITUDES)) {
            const skill = this.skills[key];
            const matches = countMatchingAptitudes(this.plannedAptitudeNames, required);
            if (skill.isSpecialist) {
                for (const [spKey, speciality] of Object.entries(skill.specialities ?? {})) {
                    if (this.chargenSkillRank(key, spKey) <= 0) continue;
                    rows.push(this._xpSkillRow(`${skill.label}: ${speciality.label}`, key, spKey, matches));
                }
            } else {
                rows.push(this._xpSkillRow(skill.label, key, null, matches));
            }
        }
        return rows;
    }

    _xpSkillRow(label, key, spKey, matches) {
        const rank = this.xpCurrentSkillRank(key, spKey);
        const step = this._xpNextSkillStep(key, spKey);
        return {
            key,
            spKey,
            label,
            rankLabel: rank > 0 ? SKILL_RANKS[rank - 1] : 'None',
            matches,
            nextLabel: step?.label ?? null,
            nextCost: step?.cost ?? null,
            canAfford: !!step && step.cost <= this.xpAvailable,
        };
    }

    _xpNextSkillStep(key, spKey) {
        const rank = this.xpCurrentSkillRank(key, spKey);
        if (rank >= SKILL_RANKS.length) return null;
        const matches = countMatchingAptitudes(this.plannedAptitudeNames, SKILL_APTITUDES[key]);
        const cost = skillAdvanceCost(rank + 1, matches);
        return cost === null ? null : { rank: rank + 1, matches, cost, label: SKILL_RANKS[rank] };
    }

    /**
     * A plain snapshot for `evaluatePrerequisites` (rules/talent-prerequisites.mjs), built from the
     * wizard's own not-yet-applied state rather than the actor -- a fresh actor has none of this
     * yet. Characteristic totals mirror `acolyte.mjs`'s `base + advance*5` (no `modifier`: nothing
     * that grants one exists before the actor is created). Skill ranks combine what home
     * world/background/role grant for free with whatever has been bought so far this session.
     * Psy rating, corruption, insanity and elite advance are not wizard-tracked state (a fresh
     * character starts at zero/none of each), so they're read from the actor's current -- still
     * default -- values, which is exactly what they will be until Confirm.
     */
    get prerequisiteSnapshot() {
        const characteristics = {};
        for (const key of ROLLED_CHARACTERISTIC_KEYS) {
            characteristics[key] = (Number(this.characteristics[key]) || 0) + this.xpCurrentCharacteristicRank(key) * 5;
        }

        const skills = JSON.parse(JSON.stringify(this.skills));
        for (const key of Object.keys(SKILL_APTITUDES)) {
            const skill = skills[key];
            if (!skill) continue;
            if (skill.isSpecialist) {
                for (const spKey of Object.keys(skill.specialities ?? {})) {
                    skill.specialities[spKey].advance = this.xpCurrentSkillRank(key, spKey);
                }
            } else {
                skill.advance = this.xpCurrentSkillRank(key, null);
            }
        }

        const talents = this.resolvedTalentGrants
            .filter((g) => g.resolution.status === 'ok')
            .map((g) => (g.speciality ? `${g.name} (${g.speciality})` : g.name));
        for (const entry of this.xpLedger) {
            if (entry.kind === 'talent') talents.push(entry.talentName);
        }

        return {
            characteristics,
            skills,
            talents,
            psyRating: this.actor.psy?.rating ?? 0,
            corruption: this.actor.corruption ?? 0,
            insanity: this.actor.insanity ?? 0,
            eliteAdvance: this.actor.bio?.elite || null,
        };
    }

    get xpVisibleTalents() {
        const search = this.xpTalentSearch.trim().toLowerCase();
        const snapshot = this.prerequisiteSnapshot;
        return this.xpTalentCandidates
            .filter((t) => !this.hasPlannedTalent(t.name))
            .filter((t) => !search || t.name.toLowerCase().includes(search))
            .map((t) => {
                const matches = countMatchingAptitudes(this.plannedAptitudeNames, t.aptitudes);
                const cost = talentCost(t.tier, matches);
                const prereq = evaluatePrerequisites(t.prerequisites, snapshot);
                return {
                    ...t,
                    matches,
                    cost,
                    prereqClauses: prereq.clauses,
                    prereqBlocked: prereq.blocked,
                    canAfford: cost !== null && cost <= this.xpAvailable && !prereq.blocked,
                };
            });
    }

    /* ---- summary ---- */

    get equipmentSummary() {
        const { fixed, choiceGroups } = this.backgroundEquipment;
        const chosen = choiceGroups.filter((g) => g.selectedIndex !== '').map((g) => g.group.options[Number(g.selectedIndex)]);
        const names = [...fixed, ...chosen];
        return names.map((name) => ({ name, found: !!findEquipmentEntry(this.itemIndex, name) }));
    }
}

/* -------------------------------------------- */
/*  Async setup: talent candidates for the XP step */
/* -------------------------------------------- */

/** Every tier 1-3 talent not already planned for this character -- same tier restriction as
 * `buildTalentCandidates` (advancement-prompt.mjs) and for the same reason (Table 2-6 has no
 * column beyond tier 3). Rebuilt after every purchase so a bought talent drops off the list. */
async function refreshXpTalentCandidates(data) {
    const pack = game.packs.get(`${SYSTEM_ID}.talents`);
    if (!pack) {
        game.dh.error('refreshXpTalentCandidates: talents pack not found');
        data.xpTalentCandidates = [];
        return;
    }
    const index = await pack.getIndex({ fields: ['name', 'img', 'system.tier', 'system.aptitudes', 'system.prerequisites'] });
    const candidates = [];
    for (const entry of index) {
        const tier = Number(entry.system?.tier);
        if (!Number.isInteger(tier) || tier < 1 || tier > 3) continue;
        candidates.push({
            pack: pack.metadata.id,
            itemId: entry._id,
            name: entry.name,
            img: entry.img,
            tier,
            aptitudes: entry.system?.aptitudes ?? '',
            prerequisites: entry.system?.prerequisites ?? '',
        });
    }
    data.xpTalentCandidates = candidates;
}

/* -------------------------------------------- */
/*  Validation                                   */
/* -------------------------------------------- */

/** Everything that must be true before Confirm is allowed to touch the actor. Re-run in full at
 * Confirm regardless of which step is showing, so going back and invalidating an earlier answer
 * (changing home world after already picking a background aptitude, say) cannot slip through. */
function blockingIssues(data) {
    const issues = [];
    if (!data.homeworldName) issues.push('Choose a home world.');
    if (!data.backgroundName) issues.push('Choose a background.');
    if (!data.roleName) issues.push('Choose a role.');

    if (data.background) {
        for (const group of [...data.backgroundSkillGroups, ...data.backgroundTalentGroups, ...data.backgroundTraitGroups]) {
            if (!group.resolved) issues.push(`Background: finish the "${group.promptLabel ?? 'choice'}" selection.`);
        }
        if (data.backgroundAptitudeOptions.length && !data.backgroundAptitudeValue) issues.push('Choose the background aptitude.');
    }
    if (data.homeworld) {
        for (const group of [...data.homeworldSkillGroups, ...data.homeworldTalentGroups, ...data.homeworldTraitGroups]) {
            if (!group.resolved) issues.push(`Home World: finish the "${group.promptLabel ?? 'choice'}" selection.`);
        }
    }
    if (data.role) {
        for (const group of data.roleAptitudeGroups) {
            if (!group.selected) issues.push('Choose the role aptitude.');
        }
        if (isUnset(data.roleTalentIndex)) issues.push('Choose the role talent.');
        else {
            const option = data.roleTalentOptions[Number(data.roleTalentIndex)];
            if (option?.needsSubchoice && !data.roleTalentSubchoiceValue) issues.push('Choose the role talent\'s specialisation.');
        }
    }

    if (ROLLED_CHARACTERISTIC_KEYS.some((k) => !(Number(data.characteristics[k]) > 0))) {
        issues.push('Roll or enter every characteristic.');
    }

    for (const g of data.unresolvedSkillGrants) {
        issues.push(`Skill grant "${g.skill}"${g.speciality ? ` (${g.speciality})` : ''} from ${g.source}: ${g.resolution.reason ?? `status "${g.resolution.status}"`}.`);
    }
    for (const g of data.unresolvedTalentGrants) issues.push(`Talent grant "${g.name}" from ${g.source}: ${g.resolution.reason ?? `status "${g.resolution.status}"`}`);
    for (const g of data.unresolvedTraitGrants) issues.push(`Trait grant "${g.name}" from ${g.source}: ${g.resolution.reason ?? `status "${g.resolution.status}"`}`);

    if (!data.divinationRoll) issues.push('Roll a divination.');
    else if (data.divinationEffect?.needsChoice?.length) issues.push('Resolve the divination\'s characteristic choice.');
    else if (data.divinationEffect?.talentGrant?.subchoice && !data.divinationTalentSubchoiceValue) issues.push('Choose the divination talent\'s specialisation.');

    if (!data.wounds || !data.fate) issues.push('Roll starting Wounds and Fate.');

    return issues;
}

/* -------------------------------------------- */
/*  Applying the plan                            */
/* -------------------------------------------- */

/**
 * The single point where the wizard's accumulated state is actually written to the actor.
 * Everything that can be prepared without touching the actor (fetching compendium documents,
 * resolving choices) happens first; the actor is only mutated by the two calls at the very end.
 *
 * Foundry has no cross-document transaction, so these two calls are not atomic with each other
 * (buying a single talent in advancement-prompt.mjs has the same limitation, for the same
 * reason) -- if `createEmbeddedDocuments` fails after `update` already succeeded, the actor is
 * left with correct bio/characteristics/skills/XP-ledger data but missing some items. The caller
 * surfaces this rather than pretending it can't happen.
 */
async function applyCharacterCreation(data) {
    const actor = data.actor;

    const itemBuilds = [];
    const pushGrant = (resolution, overrides = {}) => {
        if (resolution.status !== 'ok') return;
        itemBuilds.push(buildGrantedItemData(resolution.entry, { selected: resolution.selected, level: resolution.level, ...overrides }));
    };

    // Aptitudes -- one item per name, deduplicated by mergeAptitudeNames already.
    for (const name of data.plannedAptitudeNames) {
        const entry = data.itemIndex.get(normaliseName(name));
        if (entry) itemBuilds.push(buildGrantedItemData(entry));
        else game.dh.error(`character creation: aptitude "${name}" missing from the compendium -- skipped`);
    }

    // Talents and traits.
    for (const g of data.resolvedTalentGrants) pushGrant(g.resolution);
    for (const g of data.resolvedTraitGrants) pushGrant(g.resolution);

    // Starting-XP-purchased talents.
    for (const entry of data.xpLedger) {
        if (entry.kind !== 'talent') continue;
        const idxEntry = data.itemIndex.get(normaliseName(entry.talentName));
        if (idxEntry) itemBuilds.push(buildGrantedItemData(idxEntry));
    }

    // Divination talent grant, if any.
    const divEffect = data.divinationEffect;
    if (divEffect?.talentGrant) {
        const speciality = divEffect.talentGrant.fixedSubchoice ?? (divEffect.talentGrant.subchoice ? data.divinationTalentSubchoiceValue || null : null);
        const resolution = resolveNamedGrant(data.itemIndex, { name: divEffect.talentGrant.talent, speciality });
        pushGrant(resolution);
    }
    // Divination mental disorder grants.
    for (const disorder of divEffect?.mentalDisorders ?? []) {
        const entry = data.itemIndex.get(normaliseName(disorder.name));
        if (entry) itemBuilds.push(buildGrantedItemData(entry));
        else game.dh.error(`character creation: mental disorder "${disorder.name}" missing from the compendium -- skipped`);
    }

    // Equipment: best-effort, does not block Confirm (see findEquipmentEntry's doc comment).
    for (const { name, found } of data.equipmentSummary) {
        if (found) itemBuilds.push(buildGrantedItemData(found));
    }

    const itemsToCreate = (await Promise.all(itemBuilds)).filter(Boolean);

    // Skill advances: rank 1 (Known) for every resolved fixed/chosen grant, plus the divination
    // skill grant if it applies, plus whatever the player bought with starting XP.
    const systemUpdate = {};
    const setSkillRank = (skillKey, specialityKey, rank) => {
        // No "system." prefix -- systemUpdate itself is nested under `system` exactly once, by
        // the final `actor.update({ system: systemUpdate })` call below.
        const path = specialityKey ? `skills.${skillKey}.specialities.${specialityKey}` : `skills.${skillKey}`;
        const current = foundry.utils.getProperty(systemUpdate, `${path}.advance`) ?? 0;
        foundry.utils.setProperty(systemUpdate, `${path}.advance`, Math.max(current, rank));
        if (specialityKey) foundry.utils.setProperty(systemUpdate, `${path}.taken`, true);
    };
    for (const g of data.resolvedSkillGrants) {
        if (g.resolution.status === 'ok') setSkillRank(g.resolution.skillKey, g.resolution.specialityKey, 1);
    }
    if (divEffect?.skillGrant) {
        const res = resolveSkillGrant({ skill: divEffect.skillGrant.skill }, data.skills);
        if (res.status === 'ok') setSkillRank(res.skillKey, res.specialityKey, divEffect.skillGrant.rank);
    }
    for (const entry of data.xpLedger) {
        if (entry.kind !== 'skill') continue;
        const [skillKey, specialityKey] = entry.key.split('.');
        setSkillRank(skillKey, specialityKey || null, entry.rank);
    }

    // Characteristic base values (rolled/typed at the Characteristics step, already including the
    // home world +5/-5) and, separately, any advance ranks bought with starting XP.
    for (const [key, value] of Object.entries(data.characteristics)) {
        foundry.utils.setProperty(systemUpdate, `characteristics.${key}.base`, Number(value) || 0);
    }
    for (const entry of data.xpLedger) {
        if (entry.kind !== 'characteristic') continue;
        foundry.utils.setProperty(systemUpdate, `characteristics.${entry.key}.advance`, entry.rank);
    }

    // Divination characteristic deltas apply on top of the rolled base value.
    for (const delta of divEffect?.characteristicDeltas ?? []) {
        const key = Object.keys(data.actor.system.characteristics).find((k) => data.actor.system.characteristics[k].label === delta.characteristic);
        if (!key) continue;
        const current = foundry.utils.getProperty(systemUpdate, `characteristics.${key}.base`) ?? (Number(data.characteristics[key]) || 0);
        foundry.utils.setProperty(systemUpdate, `characteristics.${key}.base`, current + delta.amount);
    }

    systemUpdate.bio = {
        homeWorld: data.homeworldName,
        background: data.backgroundName,
        role: data.roleName,
        divination: data.divination?.name ?? '',
    };
    systemUpdate.wounds = { max: data.wounds.max, rolled: true };
    systemUpdate.fate = { max: data.fate.max + (divEffect?.fateThresholdDelta ?? 0), rolled: true };

    const now = Date.now();
    const ledgerWithTimestamps = data.xpLedger.map((e) => ({ ...e, at: e.at ?? now }));
    systemUpdate.experience = { ledger: [...(actor.experience.ledger ?? []), ...ledgerWithTimestamps] };

    await actor.update({ system: systemUpdate });
    if (itemsToCreate.length) await actor.createEmbeddedDocuments('Item', itemsToCreate);
}

/* -------------------------------------------- */
/*  Dialog                                       */
/* -------------------------------------------- */

export class CharacterCreationDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    /**
     * @param data {CharacterCreationData}
     * @param options
     */
    constructor(data, options = {}) {
        super(options);
        this.data = data;
    }

    static DEFAULT_OPTIONS = {
        id: 'dh-character-creation-dialog',
        tag: 'form',
        classes: ['dark-heresy-2nd', 'dh-prompt-app'],
        window: {
            title: 'Character Creation',
            resizable: true,
        },
        position: {
            width: 960,
            height: 760,
        },
        form: {
            handler: CharacterCreationDialog.onSubmitForm,
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            back: CharacterCreationDialog.onBack,
            next: CharacterCreationDialog.onNext,
            cancel: CharacterCreationDialog.onCancel,
            confirm: CharacterCreationDialog.onConfirm,
            rollCharacteristic: CharacterCreationDialog.onRollCharacteristic,
            buyCharacteristic: CharacterCreationDialog.onBuyCharacteristic,
            buySkill: CharacterCreationDialog.onBuySkill,
            buyTalent: CharacterCreationDialog.onBuyTalent,
            rollDivination: CharacterCreationDialog.onRollDivination,
            rollWoundsFate: CharacterCreationDialog.onRollWoundsFate,
        },
    };

    static PARTS = {
        body: {
            template: 'systems/dark-heresy-2nd/templates/prompt/character-creation-prompt.hbs',
            // Explicit, not [''] -- see requisition-prompt.mjs's PARTS comment.
            scrollable: ['.dh-wrapper'],
        },
    };

    async _prepareContext() {
        return this.data;
    }

    /**
     * Handles every plain form-bound field across all eight steps (home world/background/role
     * selects, choice-group selects, characteristic inputs, XP pool/search, divination
     * subchoices) via the standard recursiveUpdate idiom -- see AdvancementDialog.
     */
    static async onSubmitForm(event, form, formData) {
        recursiveUpdate(this.data, formData?.object ?? formData);
        this.render();
    }

    static async onCancel() {
        await this.close();
    }

    /* ---- step navigation ---- */

    static async onBack(event, target) {
        event.preventDefault();
        target.disabled = true;
        this._syncFromForm();
        const idx = this.data.stepIndex;
        if (idx > 0) this.data.step = STEPS[idx - 1];
        this.render();
    }

    static async onNext(event, target) {
        event.preventDefault();
        target.disabled = true;
        this._syncFromForm();
        const idx = this.data.stepIndex;
        if (idx < STEPS.length - 1) {
            const nextStep = STEPS[idx + 1];
            if (nextStep === 'xp' && !this.data.xpTalentCandidates.length) {
                await refreshXpTalentCandidates(this.data);
            }
            this.data.step = nextStep;
        }
        this.render();
    }

    /**
     * Pull the current field values straight off the form before acting on a button click --
     * `submitOnChange` only fires on `change`, which a number input or search box does not emit
     * until it loses focus (see award-prompt.mjs's `_syncFromForm`, same reasoning here).
     */
    _syncFromForm() {
        const form = this.element instanceof HTMLFormElement ? this.element : this.element?.querySelector('form');
        const FormDataClass = foundry.applications?.ux?.FormDataExtended ?? globalThis.FormDataExtended;
        if (!form || !FormDataClass) return;
        recursiveUpdate(this.data, new FormDataClass(form).object);
    }

    static async onRollCharacteristic(event, target) {
        event.preventDefault();
        event.stopPropagation();
        const key = target.dataset.key;
        const roll = new Roll('2d10+25');
        await roll.evaluate();
        this.data.characteristics[key] = applyHomeworldCharacteristicModifier(roll.total, this.data.actor.system.characteristics[key].label, this.data.homeworld);
        this.render();
    }

    static async onRollDivination(event, target) {
        event.preventDefault();
        target.disabled = true;
        const roll = new Roll('1d100');
        await roll.evaluate();
        // A natural 100 does not exist on a d100 roll object the way it does on a d10 chart --
        // Foundry's 1d100 already returns 1-100 inclusive, matching the divination table exactly.
        this.data.divinationRoll = roll.total;
        this.data.divinationCharacteristicChoices = {};
        this.data.divinationTalentSubchoiceValue = '';
        this.render();
    }

    /**
     * Roll starting Wounds and Fate for the summary step -- reuses
     * {@link rollWoundsAndFate} (acolyte-sheet.mjs), the exact same formulas
     * `AcolyteSheet#_onHomeworldChange` uses, so a wizard-created character and one built by hand
     * on the sheet are rolled identically. Re-rollable: clicking again simply overwrites the
     * wizard's own (not-yet-applied) state.
     */
    static async onRollWoundsFate(event, target) {
        event.preventDefault();
        target.disabled = true;
        if (!this.data.homeworld) {
            ui.notifications.warn('Choose a home world before rolling Wounds and Fate.');
            return;
        }
        const { woundsMax, fateMax, fateBlessingRoll } = await rollWoundsAndFate(this.data.homeworld);
        this.data.wounds = { max: woundsMax };
        this.data.fate = { max: fateMax, blessingRoll: fateBlessingRoll };
        this.render();
    }

    /* ---- starting XP purchases: the same pricing as AdvancementDialog's buy handlers, but
     * applied to the wizard's pending state rather than a live actor. Nothing is written until
     * Confirm, so these push onto `xpLedger` instead of calling `actor.update`. ---- */

    static async onBuyCharacteristic(event, target) {
        event.preventDefault();
        target.disabled = true;
        const key = target.dataset.key;
        const step = this.data._xpNextCharacteristicStep(key);
        if (!step || step.cost > this.data.xpAvailable) {
            ui.notifications.warn('Not enough starting experience for that advance.');
            return;
        }
        this.data.xpLedger.push({
            id: foundry.utils.randomID(),
            kind: 'characteristic',
            source: 'purchase',
            cost: step.cost,
            label: `${this.data.actor.system.characteristics[key].label} -- ${step.label}`,
            key,
            rank: step.rank,
            matches: step.matches,
            at: Date.now(),
        });
        this.render();
    }

    static async onBuySkill(event, target) {
        event.preventDefault();
        target.disabled = true;
        const key = target.dataset.key;
        const spKey = target.dataset.spKey || null;
        const step = this.data._xpNextSkillStep(key, spKey);
        if (!step || step.cost > this.data.xpAvailable) {
            ui.notifications.warn('Not enough starting experience for that advance.');
            return;
        }
        const skill = this.data.skills[key];
        const node = spKey ? skill.specialities[spKey] : skill;
        this.data.xpLedger.push({
            id: foundry.utils.randomID(),
            kind: 'skill',
            source: 'purchase',
            cost: step.cost,
            label: spKey ? `${skill.label}: ${node.label} -- ${step.label}` : `${skill.label} -- ${step.label}`,
            key: spKey ? `${key}.${spKey}` : key,
            rank: step.rank,
            matches: step.matches,
            at: Date.now(),
        });
        this.render();
    }

    static async onBuyTalent(event, target) {
        event.preventDefault();
        target.disabled = true;
        const { pack, itemId } = target.dataset;
        const candidate = this.data.xpTalentCandidates.find((c) => c.pack === pack && c.itemId === itemId);
        if (!candidate) return;
        const matches = countMatchingAptitudes(this.data.plannedAptitudeNames, candidate.aptitudes);
        const cost = talentCost(candidate.tier, matches);
        if (cost === null || cost > this.data.xpAvailable) {
            ui.notifications.warn('Not enough starting experience for that talent.');
            return;
        }
        // Re-checked here rather than trusting the button's disabled state, same as the cost
        // check just above -- see AdvancementDialog.onBuyTalent for the live-actor equivalent.
        if (evaluatePrerequisites(candidate.prerequisites, this.data.prerequisiteSnapshot).blocked) {
            ui.notifications.warn(`${candidate.name}'s prerequisites are not met.`);
            return;
        }
        this.data.xpLedger.push({
            id: foundry.utils.randomID(),
            kind: 'talent',
            source: 'purchase',
            cost,
            label: candidate.name,
            talentName: candidate.name,
            matches,
            at: Date.now(),
        });
        this.render();
    }

    static async onConfirm(event, target) {
        event.preventDefault();
        this._syncFromForm();
        const issues = blockingIssues(this.data);
        if (issues.length) {
            ui.notifications.warn(issues[0]);
            game.dh.log('Character creation: blocked on confirm', issues);
            return;
        }
        target.disabled = true;
        try {
            await applyCharacterCreation(this.data);
            ui.notifications.info(`${this.data.actor.name}'s character creation has been applied.`);
            await this.close();
        } catch (err) {
            game.dh.error('Character creation: failed to apply', err);
            ui.notifications.error("Character creation failed partway through applying -- check the actor and the console; some grants may already have been made.");
            target.disabled = false;
        }
    }
}

export async function openCharacterCreationMenu(actor) {
    const data = new CharacterCreationData(actor);
    data.itemIndex = await buildItemIndex();
    const dialog = new CharacterCreationDialog(data);
    dialog.render({ force: true });
}
