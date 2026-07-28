import { recursiveUpdate } from '../rolls/roll-helpers.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class AssignDamageDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(assignDamageData = {}, options = {}) {
        super(options);
        this.data = assignDamageData;
        this.initialized = false;
    }

    static DEFAULT_OPTIONS = {
        id: 'dh-assign-damage-dialog',
        tag: 'form',
        classes: ['dark-heresy-2nd', 'dh-prompt-app'],
        window: {
            title: 'Assign Damage',
        },
        position: {
            width: 500,
        },
        form: {
            handler: AssignDamageDialog.onSubmitForm,
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            assign: AssignDamageDialog.onAssignDamage,
            cancel: AssignDamageDialog.onCancel,
        },
    };

    static PARTS = {
        body: {
            template: 'systems/dark-heresy-2nd/templates/prompt/assign-damage-prompt.hbs',
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

    static async onAssignDamage() {
        await this.data.finalize();
        await this.data.performActionAndSendToChat();
        await this.close();
    }
}

export async function prepareAssignDamageRoll(assignDamageData) {
    const prompt = new AssignDamageDialog(assignDamageData);
    prompt.render({ force: true });
}
