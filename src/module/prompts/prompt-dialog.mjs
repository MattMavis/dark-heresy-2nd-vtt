import { recursiveUpdate } from '../rolls/roll-helpers.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * The shell shared by this system's prompt dialogs -- Spend Experience, Award Experience,
 * Requisition and Character Creation.
 *
 * All four are the same shape: a form-tagged ApplicationV2 wrapped around a plain data bag, which
 * it renders as its context and mutates from form input. They were 41 byte-identical lines each.
 * A subclass now declares only what makes it itself: an `id`, a window title, a position, its own
 * `actions`, and its `PARTS`.
 *
 * This works because ApplicationV2 deep-merges `DEFAULT_OPTIONS` up the prototype chain, so a
 * subclass's `actions` are added to the inherited `cancel` rather than replacing it.
 *
 * The four older dialogs (weapon, psychic-power, force-field, assign-damage) are deliberately not
 * built on this: their submit handlers also call `this.data.update()` and log, and their parts
 * have no scrollable configuration.
 */
export class DhPromptDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    /** @param data {object} the plain state object this dialog renders and mutates */
    constructor(data, options = {}) {
        super(options);
        this.data = data;
    }

    static DEFAULT_OPTIONS = {
        tag: 'form',
        classes: ['dark-heresy-2nd', 'dh-prompt-app'],
        window: {
            resizable: true,
        },
        form: {
            handler: DhPromptDialog.onSubmitForm,
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            cancel: DhPromptDialog.onCancel,
        },
    };

    /**
     * A `PARTS` entry for a prompt body template.
     *
     * `scrollable` is `['.dh-wrapper']` and explicitly not `['']`. `.dh-wrapper`'s CSS is
     * `height: 100%; overflow-y: auto`, which needs a bounded height to resolve against, and
     * marking the part scrollable is what supplies it. In actor and item sheets `.dh-wrapper` is
     * the part's own root element, so `''` -- meaning "the root" -- targets it correctly. In these
     * prompt templates the root is `.dh-prompt` with `.dh-wrapper` nested inside, so `''` would
     * mark the wrong element and the content would overflow the window instead of scrolling.
     */
    static promptPart(template) {
        return { template, scrollable: ['.dh-wrapper'] };
    }

    async _prepareContext() {
        return this.data;
    }

    /**
     * ApplicationV2's form submission handler, invoked with `this` bound to the application.
     * Copies every form-bound field onto the data bag and re-renders, so derived values shown in
     * the window stay in step with what has been typed or selected.
     */
    static async onSubmitForm(event, form, formData) {
        recursiveUpdate(this.data, formData?.object ?? formData);
        this.render();
    }

    static async onCancel() {
        await this.close();
    }

    /**
     * Pull the current field values straight off the form before acting on a button click.
     *
     * `submitOnChange` only fires once a field emits `change`, which a text or number input does
     * not do until it loses focus. Typing a value and clicking a button goes straight from "not
     * reported yet" to the click, so a handler that trusted the data bag would act on stale state.
     * Read the live DOM instead. This is also why these dialogs validate on click rather than
     * disabling their confirm buttons: the state such a button would key off is exactly the state
     * that lags, and a dead button gives no reason for being dead.
     */
    _syncFromForm() {
        const form = this.element instanceof HTMLFormElement ? this.element : this.element?.querySelector('form');
        const FormDataClass = foundry.applications?.ux?.FormDataExtended ?? globalThis.FormDataExtended;
        if (!form || !FormDataClass) return;
        recursiveUpdate(this.data, new FormDataClass(form).object);
    }
}
