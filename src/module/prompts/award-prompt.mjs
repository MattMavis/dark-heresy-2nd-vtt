import { DhPromptDialog } from './prompt-dialog.mjs';

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

export class AwardDialog extends DhPromptDialog {
    static DEFAULT_OPTIONS = {
        id: 'dh-award-dialog',
        window: {
            title: 'Award Experience',
        },
        position: {
            width: 500,
            height: 'auto',
        },
        actions: {
            award: AwardDialog.onAward,
        },
    };

    static PARTS = {
        body: DhPromptDialog.promptPart('systems/dark-heresy-2nd/templates/prompt/award-prompt.hbs'),
    };

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
