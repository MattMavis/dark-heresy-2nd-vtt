import { recursiveUpdate } from '../rolls/roll-helpers.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * "The whole party" is every `acolyte` actor with at least one non-GM user holding at least
 * OWNER permission on it -- checked via `testUserPermission` (which honours both per-user
 * overrides and the `default` ownership level) rather than the built-in `hasPlayerOwner` flag, so
 * this stays correct even if a future Foundry version changes what that convenience getter
 * actually inspects. Recomputed on every call rather than cached, so the recipient list in the
 * dialog is always live against the current world state.
 */
function partyActors() {
    return game.actors.filter(
        (actor) =>
            actor.type === 'acolyte' &&
            game.users.some((user) => !user.isGM && actor.testUserPermission(user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER)),
    );
}

/**
 * Plain state object for the Award Experience window. Modelled on AdvancementData
 * (advancement-prompt.mjs) in shape -- a data bag the dialog renders and mutates.
 */
class AwardData {
    actor;
    amount = 0;
    reason = '';
    /** Off: award only `actor`. On: award the whole party (see {@link partyActors}). */
    toParty = false;

    constructor(actor) {
        this.actor = actor;
    }

    /** Who will actually receive this award if confirmed right now -- named up front in the
     * dialog so a GM awarding to "the whole party" never fires blind. */
    get recipients() {
        return this.toParty ? partyActors() : [this.actor];
    }

    get partyEmpty() {
        return this.toParty && this.recipients.length === 0;
    }

    get canConfirm() {
        return Number(this.amount) > 0 && this.reason.trim().length > 0 && this.recipients.length > 0;
    }
}

/**
 * Appends one award entry in the shape `migrateExperienceLedger` (dark-heresy-migrations.mjs)
 * establishes for the opening award: `{ id, amount, reason, at, by }`. Appending the entry is what
 * grants the XP -- `_computeExperience` derives `total` from the awards once any exist, so
 * `system.experience.total` is never written directly once that happens.
 */
async function awardExperience(actor, amount, reason) {
    const entry = {
        id: foundry.utils.randomID(),
        amount,
        reason,
        at: Date.now(),
        by: game.user.name,
    };
    await actor.update({ 'system.experience.awards': [...(actor.experience.awards ?? []), entry] });
}

/* -------------------------------------------- */
/*  Dialog                                       */
/* -------------------------------------------- */

export class AwardDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    /**
     * @param awardData {AwardData}
     * @param options
     */
    constructor(awardData, options = {}) {
        super(options);
        this.data = awardData;
    }

    static DEFAULT_OPTIONS = {
        id: 'dh-award-dialog',
        tag: 'form',
        classes: ['dark-heresy-2nd', 'dh-prompt-app'],
        window: {
            title: 'Award Experience',
            resizable: true,
        },
        position: {
            width: 500,
            height: 'auto',
        },
        form: {
            handler: AwardDialog.onSubmitForm,
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            award: AwardDialog.onAward,
            cancel: AwardDialog.onCancel,
        },
    };

    static PARTS = {
        body: {
            template: 'systems/dark-heresy-2nd/templates/prompt/award-prompt.hbs',
            // Same gotcha as requisition-prompt.mjs/advancement-prompt.mjs (see their comments):
            // this template's root is .dh-prompt with .dh-wrapper nested inside, so
            // scrollable: [''] would target the wrong element.
            scrollable: ['.dh-wrapper'],
        },
    };

    async _prepareContext() {
        return this.data;
    }

    /**
     * ApplicationV2 form submission handler. Handles the amount, reason and "award to whole
     * party" fields -- all real form-bound fields, via the standard recursiveUpdate idiom (see
     * AdvancementDialog). The party toggle re-renders on every change so the recipient list
     * updates live.
     */
    static async onSubmitForm(event, form, formData) {
        recursiveUpdate(this.data, formData?.object ?? formData);
        this.render();
    }

    static async onCancel() {
        await this.close();
    }

    /**
     * Pull the current field values straight off the form.
     *
     * `submitOnChange` only fires once a field emits `change`, which a text box does not do until
     * it loses focus. Typing a reason and clicking Award goes straight from "reason not recorded
     * yet" to the click, so without this the award would be rejected as having no reason. Read
     * the live DOM instead of trusting that every field has already reported in.
     */
    _syncFromForm() {
        const form = this.element instanceof HTMLFormElement ? this.element : this.element?.querySelector('form');
        const FormDataClass = foundry.applications?.ux?.FormDataExtended ?? globalThis.FormDataExtended;
        if (!form || !FormDataClass) return;
        recursiveUpdate(this.data, new FormDataClass(form).object);
    }

    static async onAward(event, target) {
        event.preventDefault();
        // Re-checked here, not just trusted from the template's isGM gate (acolyte-sheet.mjs's
        // _prepareAward already checks before this dialog is even opened) -- same double-check
        // pattern as _deleteLedgerEntry.
        if (!game.user.isGM) {
            ui.notifications.warn('Only a GM may award experience.');
            return;
        }
        this._syncFromForm();
        // The button is deliberately never disabled: a disabled control gives no reason for
        // being dead, and the state it would key off is exactly the state that lags behind
        // what the GM has typed. Say what is missing instead.
        if (!this.data.canConfirm) {
            if (this.data.partyEmpty) ui.notifications.warn('No player-owned characters were found to award.');
            else if (!(Number(this.data.amount) > 0)) ui.notifications.warn('Enter an amount greater than zero.');
            else ui.notifications.warn('Enter a reason for this award.');
            return;
        }
        target.disabled = true;
        const recipients = this.data.recipients;
        const amount = Number(this.data.amount);
        const reason = this.data.reason.trim();
        for (const actor of recipients) {
            await awardExperience(actor, amount, reason);
        }
        ui.notifications.info(`Awarded ${amount} XP to ${recipients.map((a) => a.name).join(', ')}.`);
        await this.close();
    }
}

export function openAwardMenu(actor) {
    const data = new AwardData(actor);
    const dialog = new AwardDialog(data);
    dialog.render({ force: true });
}
