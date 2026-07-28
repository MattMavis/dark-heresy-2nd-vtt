import { recursiveUpdate } from '../rolls/roll-helpers.mjs';
import { PsychicRollData } from '../rolls/roll-data.mjs';
import { PsychicActionData } from '../rolls/action-data.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class PsychicPowerDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    /**
     * @param psychicAttackData {PsychicActionData}
     * @param options
     */
    constructor(psychicAttackData = {}, options = {}) {
        super(options);
        this.psychicAttackData = psychicAttackData;
        this.data = psychicAttackData.rollData;
        this.initialized = false;
    }

    static DEFAULT_OPTIONS = {
        id: 'dh-psychic-power-dialog',
        tag: 'form',
        classes: ['dark-heresy-2nd', 'dh-prompt-app'],
        window: {
            title: 'Psychic Power',
        },
        position: {
            width: 500,
        },
        form: {
            handler: PsychicPowerDialog.onSubmitForm,
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            roll: PsychicPowerDialog.onRoll,
            cancel: PsychicPowerDialog.onCancel,
        },
    };

    static PARTS = {
        body: {
            template: 'systems/dark-heresy-2nd/templates/prompt/psychic-power-roll-prompt.hbs',
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
        // NOTE: the template renders the power checkboxes with the `weapon-select` class, so this
        // selector has never matched anything. Preserved as-is to avoid changing runtime behaviour
        // during the V12 -> V14 migration; see the WP-3B report for the follow-up.
        for (const input of this.element.querySelectorAll('.power-select')) {
            input.addEventListener('change', (event) => this._updatePower(event));
        }
    }

    async _updatePower(event) {
        this.data.selectPower(event.target.name);
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
        await this.data.update();
        this.render();
    }

    static async onCancel() {
        await this.close();
    }

    static async onRoll() {
        await this.data.finalize();
        await this.psychicAttackData.performActionAndSendToChat();
        await this.close();
    }
}

/**
 * @param psychicAttackData {PsychicActionData}
 */
export async function preparePsychicPowerRoll(psychicAttackData) {
    const prompt = new PsychicPowerDialog(psychicAttackData);
    prompt.render({ force: true });
}
