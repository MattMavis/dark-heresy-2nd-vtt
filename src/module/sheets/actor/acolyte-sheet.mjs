import { ActorContainerSheet } from './actor-container-sheet.mjs';
import { DHBasicActionManager } from '../../actions/basic-action-manager.mjs';
import { DHTargetedActionManager } from '../../actions/targeted-action-manager.mjs';
import { Hit } from '../../rolls/damage-data.mjs';
import { AssignDamageData } from '../../rolls/assign-damage-data.mjs';
import { prepareAssignDamageRoll } from '../../prompts/assign-damage-prompt.mjs';

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

        // Roll Wounds
        const woundRoll = new Roll(this.actor.backgroundEffects.homeworld.wounds);
        await woundRoll.evaluate();
        this.actor.wounds.max = woundRoll.total;

        // Roll Fate
        const fateRoll = new Roll('1d10');
        await fateRoll.evaluate();
        this.actor.fate.max =
            parseInt(this.actor.backgroundEffects.homeworld.fate_threshold) +
            (fateRoll.total >= this.actor.backgroundEffects.homeworld.emperors_blessing ? 1 : 0);
        await this.render({ force: true });
    }
}
