import { ActorContainerSheet } from './actor-container-sheet.mjs';
import { DHBasicActionManager } from '../../actions/basic-action-manager.mjs';
import { DHTargetedActionManager } from '../../actions/targeted-action-manager.mjs';
import { Hit } from '../../rolls/damage-data.mjs';
import { AssignDamageData } from '../../rolls/assign-damage-data.mjs';
import { prepareAssignDamageRoll } from '../../prompts/assign-damage-prompt.mjs';
import { openRequisitionMenu } from '../../prompts/requisition-prompt.mjs';
import { openAdvancementMenu } from '../../prompts/advancement-prompt.mjs';
import { openAwardMenu } from '../../prompts/award-prompt.mjs';
import { openCharacterCreationMenu } from '../../prompts/character-creation-prompt.mjs';
import { RequisitionRollData } from '../../rolls/roll-data.mjs';
import { buildRequisitionCandidates, getWarbandTracker } from '../../rules/requisition.mjs';
import { DarkHeresySettings } from '../../dark-heresy-settings.mjs';
import { SYSTEM_ID } from '../../hooks-manager.mjs';

/**
 * Roll a freshly-chosen home world's starting Wounds (its own dice formula) and Fate (its
 * threshold, +1 if a 1d10 roll meets or beats its Emperor's Blessing number) -- the two rolls
 * Table 2-3 prescribes. Exported so the character-creation wizard (character-creation-prompt.mjs)
 * can reuse the exact same formulas rather than re-deriving them, instead of only
 * {@link AcolyteSheet#_onHomeworldChange} being able to roll them.
 */
export async function rollWoundsAndFate(homeworld) {
    const woundRoll = new Roll(homeworld.wounds);
    await woundRoll.evaluate();
    const fateRoll = new Roll('1d10');
    await fateRoll.evaluate();
    const fateMax = parseInt(homeworld.fate_threshold, 10) + (fateRoll.total >= homeworld.emperors_blessing ? 1 : 0);
    return { woundsMax: woundRoll.total, fateMax, fateBlessingRoll: fateRoll.total };
}

export class AcolyteSheet extends ActorContainerSheet {
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        classes: ['acolyte'],
        actions: {
            assignDamage(event, target) {
                return this._combatControls(event, target);
            },
            attack(event, target) {
                return this._combatControls(event, target);
            },
            bonusVocalize(event, target) {
                return this._onBonusVocalize(event, target);
            },
            dodge(event, target) {
                return this._combatControls(event, target);
            },
            parry(event, target) {
                return this._combatControls(event, target);
            },
            rollCharacteristic(event, target) {
                return this._prepareRollCharacteristic(event, target);
            },
            rollSkill(event, target) {
                return this._prepareRollSkill(event, target);
            },
            requisition(event, target) {
                return this._prepareRequisition(event, target);
            },
            advancement(event, target) {
                return this._prepareAdvancement(event, target);
            },
            characterCreation(event, target) {
                return this._prepareCharacterCreation(event, target);
            },
            deleteLedgerEntry(event, target) {
                return this._deleteLedgerEntry(event, target);
            },
            award(event, target) {
                return this._prepareAward(event, target);
            },
            deleteAwardEntry(event, target) {
                return this._deleteAwardEntry(event, target);
            },
        },
    };

    /** @inheritDoc */
    static PARTS = {
        main: {
            template: 'systems/dark-heresy-2nd/templates/actor/actor-acolyte-sheet.hbs',
            scrollable: [''],
        },
    };

    /** @inheritDoc */
    static TABS = {
        primary: {
            initial: 'main',
            tabs: [
                { id: 'combat', label: 'combat' },
                { id: 'main', label: 'main' },
                { id: 'bio', label: 'bio' },
                { id: 'gear', label: 'gear' },
                { id: 'psychic', label: 'psychic powers' },
                { id: 'advances', label: 'advances' },
                { id: 'social', label: 'social' },
            ],
        },
    };

    /* -------------------------------------------- */

    /**
     * The homeworld `<select>` fires `change`, not `click`, so it cannot be expressed as a
     * `data-action`. Bind it manually on every render.
     * @inheritDoc
     */
    async _onRender(context, options) {
        await super._onRender(context, options);
        if (!this.isEditable) return;
        this.element
            .querySelector('.acolyte-homeWorld')
            ?.addEventListener('change', (event) => this._onHomeworldChange(event));
    }

    /* -------------------------------------------- */

    async _combatControls(event, target) {
        event.preventDefault();

        switch (target.dataset.action) {
            case 'attack':
                await DHTargetedActionManager.performWeaponAttack(this.actor);
                break;
            case 'assignDamage': {
                const hitData = new Hit();
                const assignData = new AssignDamageData(this.actor, hitData);
                await prepareAssignDamageRoll(assignData);
                break;
            }
            case 'dodge':
                await this.actor.rollSkill('dodge');
                break;
            case 'parry':
                await this.actor.rollSkill('parry');
                break;
        }
    }

    async _onBonusVocalize(event, target) {
        event.preventDefault();
        const bonus = this.actor.backgroundEffects.abilities.find((a) => a.name === target.dataset.bonusName);
        if (bonus) {
            await DHBasicActionManager.sendItemVocalizeChat({
                actor: this.actor.name,
                name: bonus.name,
                type: bonus.source,
                description: bonus.benefit,
            });
        }
    }

    async _prepareRollCharacteristic(event, target) {
        event.preventDefault();
        await this.actor.rollCharacteristic(target.dataset.characteristic);
    }

    async _prepareRollSkill(event, target) {
        event.preventDefault();
        await this.actor.rollSkill(target.dataset.skill, target.dataset.specialty);
    }

    async _prepareRequisition(event, target) {
        event.preventDefault();
        const rollData = new RequisitionRollData();
        rollData.sourceActor = this.actor;
        rollData.warbandActor = getWarbandTracker();
        rollData.maxAvailability = game.settings.get(SYSTEM_ID, DarkHeresySettings.SETTINGS.requisitionMaxAvailability);
        rollData.availabilityFilter = rollData.maxAvailability;
        rollData.updateBaseTarget();
        rollData.candidates = await buildRequisitionCandidates(rollData.maxAvailability);
        await openRequisitionMenu(rollData);
    }

    /** Only the actor's owner (or a GM, who Foundry always treats as an owner) may spend XP. */
    async _prepareAdvancement(event, target) {
        event.preventDefault();
        if (!this.isEditable) return;
        await openAdvancementMenu(this.actor);
    }

    /** Same ownership gate as Spend Experience -- the wizard writes to this actor only on its
     * own final confirm, but nothing here should be reachable by someone who couldn't otherwise
     * edit the sheet. */
    async _prepareCharacterCreation(event, target) {
        event.preventDefault();
        if (!this.isEditable) return;
        await openCharacterCreationMenu(this.actor);
    }

    /** GM-only: the template already hides this control from non-GMs (see experience-panel.hbs's
     * `isGM` gate), but the handler checks again rather than trusting the client wasn't tampered
     * with -- Foundry would refuse the resulting actor update anyway, but fail with a clear
     * notification instead of a silent server-side rejection. */
    async _deleteLedgerEntry(event, target) {
        event.preventDefault();
        if (!game.user.isGM) {
            ui.notifications.warn('Only a GM may delete an experience ledger entry.');
            return;
        }
        const entryId = target.dataset.entryId;
        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: 'Confirm Delete' },
            content: '<p>Remove this experience ledger entry? This cannot be undone.</p>',
            modal: true,
        });
        if (!confirmed) return;
        const ledger = this.actor.experience.ledger ?? [];
        await this.actor.update({ 'system.experience.ledger': ledger.filter((e) => e.id !== entryId) });
    }

    /** GM-only: awarding is a GM action rather than something an owner does to their own
     * character, unlike Spend Experience above. Re-checked as in _deleteLedgerEntry. */
    async _prepareAward(event, target) {
        event.preventDefault();
        if (!game.user.isGM) {
            ui.notifications.warn('Only a GM may award experience.');
            return;
        }
        await openAwardMenu(this.actor);
    }

    /** GM-only, re-checked as in _deleteLedgerEntry. */
    async _deleteAwardEntry(event, target) {
        event.preventDefault();
        if (!game.user.isGM) {
            ui.notifications.warn('Only a GM may delete an experience award entry.');
            return;
        }
        const entryId = target.dataset.entryId;
        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: 'Confirm Delete' },
            content: '<p>Remove this experience award entry? This cannot be undone.</p>',
            modal: true,
        });
        if (!confirmed) return;
        const awards = this.actor.experience.awards ?? [];
        await this.actor.update({ 'system.experience.awards': awards.filter((e) => e.id !== entryId) });
    }

    async _onHomeworldChange(event) {
        event.preventDefault();
        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: 'Roll Characteristics?' },
            content: '<p>Would you like to roll Wounds and Fate for this homeworld?</p>',
            modal: true,
        });
        if (!confirmed) return;

        // Something is probably wrong -- we will skip this
        if (!this.actor.backgroundEffects?.homeworld) return;

        // Roll Wounds and Fate, and persist them -- a bare `this.actor.wounds.max = ...` mutates
        // the live in-memory document but is never written to the database, so the roll silently
        // reverted to 0 on the next reload. Route it through actor.update() instead.
        const { woundsMax, fateMax } = await rollWoundsAndFate(this.actor.backgroundEffects.homeworld);
        await this.actor.update({ 'system.wounds.max': woundsMax, 'system.fate.max': fateMax });
    }
}
