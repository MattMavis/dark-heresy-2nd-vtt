import { recursiveUpdate } from '../rolls/roll-helpers.mjs';
import { WeaponActionData } from '../rolls/action-data.mjs';

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
            ui.notifications.warn(`Not enough ammo to perform action. Do you need to reload?`);
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
