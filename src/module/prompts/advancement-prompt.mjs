import { DhPromptDialog } from './prompt-dialog.mjs';
import {
    fetchGrantData,
    grantItems,
    grantSourceKey,
    loadTalentCandidates,
    sourceFlagPath,
} from '../rules/compendium-grants.mjs';
import {
    CHARACTERISTIC_APTITUDES,
    SKILL_APTITUDES,
    talentCost,
    countMatchingAptitudes,
    purchaseEntry,
    advanceRow,
    talentRow,
    nextCharacteristicStep as characteristicStep,
    nextSkillStep as skillStep,
} from '../rules/advancement.mjs';
import { evaluatePrerequisites } from '../rules/talent-prerequisites.mjs';

/** A character's aptitudes are the `aptitude` Items it owns -- `system.aptitudes` is dead schema
 * with no readers or writers left in this codebase, so it is never consulted here. */
function ownedAptitudeNames(actor) {
    return actor.items.filter((i) => i.type === 'aptitude').map((i) => i.name);
}

/**
 * A plain, Foundry-free snapshot of `actor` for `evaluatePrerequisites` (rules/talent-prerequisites.mjs).
 * `displayName` (not `name`) is what supplies a specialised talent's owned form ("Resistance (Fear)"),
 * so a prerequisite naming a specific specialisation can actually be checked against it -- a bare
 * `name` would read back just "Resistance" regardless of which one was taken.
 */
function buildPrerequisiteSnapshot(actor) {
    const characteristics = {};
    for (const [key, c] of Object.entries(actor.system.characteristics)) characteristics[key] = c.total;
    return {
        characteristics,
        skills: actor.system.skills,
        talents: actor.items.filter((i) => i.isTalent).map((i) => i.displayName),
        psyRating: actor.psy?.rating ?? 0,
        corruption: actor.corruption ?? 0,
        insanity: actor.insanity ?? 0,
        eliteAdvance: actor.bio?.elite || null,
    };
}

/**
 * The single next step for a characteristic, or null if it is already at Expert. Shared by the
 * row-building getters (for display) and the buy handlers (for the actual purchase) so the two
 * can never disagree about what the next step is or what it costs.
 */
function nextCharacteristicStep(actor, key) {
    const rank = Number(actor.system.characteristics[key]?.advance) || 0;
    const matches = countMatchingAptitudes(ownedAptitudeNames(actor), CHARACTERISTIC_APTITUDES[key]);
    return characteristicStep(rank, matches);
}

/** Same shape as {@link nextCharacteristicStep}, for a skill or one of its specialities. */
function nextSkillStep(actor, key, spKey) {
    const skill = actor.system.skills[key];
    const node = spKey ? skill?.specialities?.[spKey] : skill;
    if (!node) return null;
    const matches = countMatchingAptitudes(ownedAptitudeNames(actor), SKILL_APTITUDES[key]);
    return skillStep(Number(node.advance) || 0, matches);
}

/**
 * Plain state object for the Spend Experience window. Modelled on RequisitionRollData
 * (rolls/roll-data.mjs) in shape -- a data bag the dialog renders and mutates -- but it does not
 * extend RollData: nothing here rolls dice, so inheriting the difficulty/modifier/opposed-roll
 * machinery would just be dead weight.
 */
class AdvancementData {
    actor;
    /** Narrows the talent list by name. Bound to form data like requisition-prompt's search box. */
    search = '';
    /** Talents this actor doesn't already own, tier 1-3, loaded once (async compendium fetch) by
     * {@link openAdvancementMenu} before the dialog renders -- see buildTalentCandidates. */
    talentCandidates = [];

    /** GM-only house-rule escape hatch: tables house-rule prerequisites constantly, and a GM must
     * not be stuck behind this parser's judgement. Defaults off; a non-GM never sees the toggle
     * (see `isGM`) and `buyTalent` re-checks `game.user.isGM` itself rather than trusting this
     * flag. */
    ignorePrerequisites = false;

    constructor(actor) {
        this.actor = actor;
    }

    get isGM() {
        return game.user.isGM;
    }

    get available() {
        return this.actor.experience.available;
    }

    /** One row per Table 2-3 characteristic (Influence excluded -- it is never advanced this way). */
    get characteristicRows() {
        const aptitudes = ownedAptitudeNames(this.actor);
        return Object.entries(CHARACTERISTIC_APTITUDES).map(([key, required]) => {
            const characteristic = this.actor.system.characteristics[key];
            return advanceRow('characteristic', {
                key,
                label: characteristic.label,
                rank: characteristic.advance,
                matches: countMatchingAptitudes(aptitudes, required),
                available: this.available,
            });
        });
    }

    /** One row per skill, plus one additional row per *taken* speciality of a specialist skill --
     * an untaken speciality isn't a real feature of the character yet (see skills-specialist-panel,
     * which gates the advance-editing UI on the same `taken` flag), so it has nothing to advance. */
    get skillRows() {
        const rows = [];
        for (const [key, required] of Object.entries(SKILL_APTITUDES)) {
            const skill = this.actor.system.skills[key];
            const matches = countMatchingAptitudes(ownedAptitudeNames(this.actor), required);
            if (skill.isSpecialist) {
                for (const [spKey, speciality] of Object.entries(skill.specialities ?? {})) {
                    if (!speciality.taken) continue;
                    rows.push(this._skillRow(`${skill.label}: ${speciality.label}`, key, spKey, speciality, matches));
                }
            } else {
                rows.push(this._skillRow(skill.label, key, null, skill, matches));
            }
        }
        return rows;
    }

    _skillRow(label, key, spKey, node, matches) {
        return advanceRow('skill', { key, spKey, label, rank: node.advance, matches, available: this.available });
    }

    /** Talent candidates filtered by the search box and annotated with this actor's live price
     * and prerequisite state. The snapshot is rebuilt once per render (not once per row) since
     * every row is evaluated against the exact same actor state. */
    get visibleTalents() {
        const search = this.search.trim().toLowerCase();
        const aptitudes = ownedAptitudeNames(this.actor);
        const snapshot = buildPrerequisiteSnapshot(this.actor);
        return this.talentCandidates
            .filter((t) => !search || t.name.toLowerCase().includes(search))
            .map((t) =>
                talentRow(t, {
                    aptitudes,
                    available: this.available,
                    snapshot,
                    ignorePrerequisites: this.ignorePrerequisites,
                }),
            );
    }
}

/** Every buyable talent this actor doesn't already own. */
function buildTalentCandidates(actor) {
    return loadTalentCandidates({
        excludeNames: new Set(actor.items.filter((i) => i.isTalent).map((i) => i.name)),
    });
}

/* -------------------------------------------- */
/*  Purchases                                    */
/* -------------------------------------------- */

/**
 * Every purchase appends exactly one ledger entry in the shape `migrateExperienceLedger`
 * (dark-heresy-migrations.mjs) already established: `{ id, kind, source: 'purchase', cost, label,
 * at }` plus whatever extra fields are useful for this kind. Appending the entry is what spends
 * the XP -- `_computeExperience` derives `used` from the ledger, so `system.experience.used` is
 * never written directly.
 *
 * The step is always recomputed here from the actor's live data rather than trusting a value
 * captured earlier in the render, so a stale row (e.g. from a second click queued before the
 * first purchase's re-render lands) can't charge or grant the wrong thing.
 */
async function buyCharacteristic(actor, key) {
    const step = nextCharacteristicStep(actor, key);
    if (!step) return;
    if (step.cost > actor.experience.available) {
        ui.notifications.warn('Not enough experience for that advance.');
        return;
    }
    const characteristic = actor.system.characteristics[key];
    const entry = purchaseEntry('characteristic', {
        id: foundry.utils.randomID(),
        cost: step.cost,
        label: `${characteristic.label} -- ${step.label}`,
        key,
        rank: step.rank,
        matches: step.matches,
    });
    await actor.update({
        [`system.characteristics.${key}.advance`]: step.rank,
        'system.experience.ledger': [...(actor.experience.ledger ?? []), entry],
    });
}

async function buySkill(actor, key, spKey) {
    const step = nextSkillStep(actor, key, spKey);
    if (!step) return;
    if (step.cost > actor.experience.available) {
        ui.notifications.warn('Not enough experience for that advance.');
        return;
    }
    const skill = actor.system.skills[key];
    const node = spKey ? skill.specialities[spKey] : skill;
    const label = spKey ? `${skill.label}: ${node.label} -- ${step.label}` : `${skill.label} -- ${step.label}`;
    const path = spKey ? `system.skills.${key}.specialities.${spKey}.advance` : `system.skills.${key}.advance`;
    const entry = purchaseEntry('skill', {
        id: foundry.utils.randomID(),
        cost: step.cost,
        label,
        key: spKey ? `${key}.${spKey}` : key,
        rank: step.rank,
        matches: step.matches,
    });
    await actor.update({
        [path]: step.rank,
        'system.experience.ledger': [...(actor.experience.ledger ?? []), entry],
    });
}

/**
 * The grant is a document creation (one operation), distinct from the actor's own data update the
 * ledger entry needs (a second operation) -- Foundry has no single call that does both, so a
 * talent purchase is unavoidably two actor-level operations rather than one.
 *
 * Deliberately not `grantRequisitionedItem`: that path writes a `system.quantity` and merges
 * repeat grants by it, and a talent has no such field. Bought talents are granted plainly, with
 * the source flag kept purely as a record of where the item came from.
 */
async function buyTalent(actor, candidate, ignorePrerequisites) {
    const matches = countMatchingAptitudes(ownedAptitudeNames(actor), candidate.aptitudes);
    const cost = talentCost(candidate.tier, matches);
    if (cost === null) {
        ui.notifications.warn(`${candidate.name} has no valid tier and cannot be priced.`);
        return;
    }
    if (cost > actor.experience.available) {
        ui.notifications.warn('Not enough experience for that talent.');
        return;
    }
    // Re-checked here rather than trusting the button's disabled state, the same "don't trust the
    // client" posture as the cost check just above -- and the override itself only takes effect
    // for an actual GM, regardless of what a tampered client claims `ignorePrerequisites` is.
    const blocked = evaluatePrerequisites(candidate.prerequisites, buildPrerequisiteSnapshot(actor)).blocked;
    if (blocked && !(ignorePrerequisites && game.user.isGM)) {
        ui.notifications.warn(`${candidate.name}'s prerequisites are not met.`);
        return;
    }
    const itemData = await fetchGrantData(candidate.pack, candidate.itemId, {
        [sourceFlagPath()]: grantSourceKey(candidate.pack, candidate.itemId),
    });
    const granted = await grantItems(actor, [itemData]);
    if (!granted.length) return;

    const entry = purchaseEntry('talent', {
        id: foundry.utils.randomID(),
        cost,
        label: candidate.name,
        key: `${candidate.pack}.${candidate.itemId}`,
        matches,
    });
    await actor.update({ 'system.experience.ledger': [...(actor.experience.ledger ?? []), entry] });
}

/* -------------------------------------------- */
/*  Dialog                                       */
/* -------------------------------------------- */

export class AdvancementDialog extends DhPromptDialog {
    static DEFAULT_OPTIONS = {
        id: 'dh-advancement-dialog',
        window: {
            title: 'Spend Experience',
        },
        position: {
            width: 900,
            height: 700,
        },
        actions: {
            buyCharacteristic: AdvancementDialog.onBuyCharacteristic,
            buySkill: AdvancementDialog.onBuySkill,
            buyTalent: AdvancementDialog.onBuyTalent,
        },
    };

    static PARTS = {
        body: DhPromptDialog.promptPart('systems/dark-heresy-2nd/templates/prompt/advancement-prompt.hbs'),
    };

    static async onBuyCharacteristic(event, target) {
        event.preventDefault();
        target.disabled = true;
        await buyCharacteristic(this.data.actor, target.dataset.key);
        this.render();
    }

    static async onBuySkill(event, target) {
        event.preventDefault();
        target.disabled = true;
        await buySkill(this.data.actor, target.dataset.key, target.dataset.spKey || null);
        this.render();
    }

    static async onBuyTalent(event, target) {
        event.preventDefault();
        target.disabled = true;
        const { pack, itemId } = target.dataset;
        const candidate = this.data.talentCandidates.find((c) => c.pack === pack && c.itemId === itemId);
        if (!candidate) return;
        await buyTalent(this.data.actor, candidate, this.data.ignorePrerequisites);
        // The candidate is now owned -- rebuild the list so it drops out rather than lingering
        // with a stale Buy button until the sheet is reopened.
        this.data.talentCandidates = await buildTalentCandidates(this.data.actor);
        this.render();
    }
}

export async function openAdvancementMenu(actor) {
    const data = new AdvancementData(actor);
    data.talentCandidates = await buildTalentCandidates(actor);
    const dialog = new AdvancementDialog(data);
    dialog.render({ force: true });
}
