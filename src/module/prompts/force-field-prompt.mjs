import { recursiveUpdate } from '../rolls/roll-helpers.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class ForceFieldDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(forceFieldData = {}, options = {}) {
        super(options);
        this.data = forceFieldData;
        this.initialized = false;
    }

    static DEFAULT_OPTIONS = {
        id: 'dh-force-field-dialog',
        tag: 'form',
        classes: ['dark-heresy-2nd', 'dh-prompt-app'],
        window: {
            title: 'Force Field',
        },
        position: {
            width: 500,
        },
        form: {
            handler: ForceFieldDialog.onSubmitForm,
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            roll: ForceFieldDialog.onRoll,
            cancel: ForceFieldDialog.onCancel,
        },
    };

    static PARTS = {
        body: {
            template: 'systems/dark-heresy-2nd/templates/prompt/force-field-prompt.hbs',
        },
    };

    async _prepareContext() {
        await this.data.update();
        return this.data;
    }

    _onRender(context, options) {
        super._onRender(context, options);
        this.element.setAttribute('autocomplete', 'off');
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
        if(!this.data.forceField.system.activated) {
            ui.notifications.warn(`Force Field not activated!`);
            return;
        }

        if(this.data.forceField.system.overloaded) {
            ui.notifications.warn(`Force Field currently overloaded!`);
            return;
        }

        await this.data.finalize();
        await this.data.performActionAndSendToChat();
        await this.close();
    }
}

export async function prepareForceFieldRoll(forceFieldData) {
    const prompt = new ForceFieldDialog(forceFieldData);
    prompt.render({ force: true });
}
