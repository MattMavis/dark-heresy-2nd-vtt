import { recursiveUpdate } from '../rolls/roll-helpers.mjs';
import { WeaponActionData } from '../rolls/action-data.mjs';
import { reloadWeapon } from '../rules/ammo.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class WeaponAttackDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    /**
     * @param weaponActionData {WeaponActionData}
     * @param options
     */
    constructor(weaponActionData = {}, options = {}) {
        super(options);
        this.weaponAttackData = weaponActionData;
        this.data = weaponActionData.rollData;
        this.initialized = false;
    }

    static DEFAULT_OPTIONS = {
        id: 'dh-weapon-attack-dialog',
        tag: 'form',
        classes: ['dark-heresy-2nd', 'dh-prompt-app'],
        window: {
            title: 'Weapon Attack',
        },
        position: {
            width: 500,
        },
        form: {
            handler: WeaponAttackDialog.onSubmitForm,
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            roll: WeaponAttackDialog.onRoll,
            cancel: WeaponAttackDialog.onCancel,
        },
    };

    static PARTS = {
        body: {
            template: 'systems/dark-heresy-2nd/templates/prompt/weapon-roll-prompt.hbs',
        },
    };

    async _prepareContext() {
        // Initial Values
        if (!this.initialized) {
            this.data.initialize();
            this.initialized = true;
        }
        await this.data.update();
        return this.data;
    }

    _onRender(context, options) {
        super._onRender(context, options);
        this.element.setAttribute('autocomplete', 'off');
        for (const input of this.element.querySelectorAll('.weapon-select')) {
            input.addEventListener('change', (event) => this._updateWeapon(event));
        }
    }

    async _updateWeapon(event) {
        this.data.selectWeapon(event.target.name);
        await this.data.update();
        this.render();
    }

    /**
     * ApplicationV2 form submission handler. `this` is bound to the application instance.
     * @param event {SubmitEvent|Event}
     * @param form {HTMLFormElement}
     * @param formData {FormDataExtended}
     */
    static async onSubmitForm(event, form, formData) {
        game.dh.log('onSubmitForm', { event, formData });
        recursiveUpdate(this.data, formData?.object ?? formData);
        game.dh.log('onSubmitForm complete', { 'data': this.data, formData });
        await this.data.update();
        this.render();
    }

    static async onCancel() {
        await this.close();
    }

    static async onRoll() {
        if(this.data.fireRate === 0) {
            /*
             * Offer the reload rather than only naming it. The previous behaviour was a warning
             * reading "Do you need to reload?" with no way to answer it -- the only route to a
             * full clip was editing the item sheet by hand, mid-turn.
             *
             * Reloading does NOT then fire. Reload is an action in its own right in Dark Heresy,
             * and rolling the attack straight afterwards would quietly spend a turn the player
             * did not agree to. The dialog stays open with the clip refilled so they can decide.
             */
            const weapon = this.data.weapon;
            const reload = await foundry.applications.api.DialogV2.confirm({
                window: { title: 'Out of Ammunition' },
                content: `<p><strong>${foundry.utils.escapeHTML(weapon?.name ?? 'This weapon')}</strong> `
                    + `has no ammunition left. Reload it?</p>`
                    + `<p class="notes">Reloading takes ${foundry.utils.escapeHTML(weapon?.system?.reload || 'an action')}. `
                    + `The attack will not be rolled.</p>`,
                yes: { default: true },
                no: { default: false },
                rejectClose: false,
            });

            if (reload) {
                await reloadWeapon(weapon);
                await this.data.update();
                this.render();
            }
            return;
        }

        await this.data.finalize();
        await this.weaponAttackData.performActionAndSendToChat();
        await this.close();
    }
}

/**
 *
 * @param weaponAttackData {WeaponActionData}
 */
export async function prepareWeaponRoll(weaponAttackData) {
    const prompt = new WeaponAttackDialog(weaponAttackData);
    prompt.render({ force: true });
}
