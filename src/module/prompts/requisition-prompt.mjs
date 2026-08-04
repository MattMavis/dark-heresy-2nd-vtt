import { recursiveUpdate, roll1d100, getDegree } from '../rolls/roll-helpers.mjs';
import { grantRequisitionedItem } from '../rules/requisition.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class RequisitionDialog extends HandlebarsApplicationMixin(ApplicationV2) {
    /**
     * @param requisitionRollData {RequisitionRollData}
     * @param options
     */
    constructor(requisitionRollData, options = {}) {
        super(options);
        this.data = requisitionRollData;
    }

    static DEFAULT_OPTIONS = {
        id: 'dh-requisition-dialog',
        tag: 'form',
        classes: ['dark-heresy-2nd', 'dh-prompt-app'],
        window: {
            title: 'Requisition',
            resizable: true,
        },
        position: {
            width: 900,
            height: 700,
        },
        form: {
            handler: RequisitionDialog.onSubmitForm,
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            roll: RequisitionDialog.onRoll,
            cancel: RequisitionDialog.onCancel,
        },
    };

    static PARTS = {
        body: {
            template: 'systems/dark-heresy-2nd/templates/prompt/requisition-prompt.hbs',
        },
    };

    async _prepareContext() {
        await this.data.calculateTotalModifiers();
        return this.data;
    }

    _onRender(context, options) {
        super._onRender(context, options);
        this.element.setAttribute('autocomplete', 'off');
        for (const input of this.element.querySelectorAll('.requisition-select')) {
            input.addEventListener('change', (event) => this._toggleCandidate(event));
        }
        for (const input of this.element.querySelectorAll('.requisition-quantity')) {
            input.addEventListener('change', (event) => this._updateQuantity(event));
        }
    }

    _toggleCandidate(event) {
        // Stop this `change` event from also reaching ApplicationV2's own
        // submitOnChange listener on the form root -- these checkboxes carry no
        // `name` (selection is tracked in selectedCandidates, not form data), so
        // that second handler's own `this.render()` call has nothing useful to do,
        // but it still fires and can race this handler's own render, occasionally
        // losing the just-applied selection when both renders overlap.
        event.stopPropagation();
        const { pack, itemId } = event.target.dataset;
        const candidate = this.data.candidates.find((c) => c.pack === pack && c.itemId === itemId);
        if (candidate) {
            this.data.toggleCandidate(candidate);
        }
        this.render();
    }

    _updateQuantity(event) {
        event.stopPropagation();
        const { pack, itemId } = event.target.dataset;
        this.data.setQuantity(pack, itemId, event.target.value);
    }

    /**
     * ApplicationV2 form submission handler. `this` is bound to the application instance.
     * Handles the search box and availability-filter dropdown -- simple scalar fields,
     * synced via the standard recursiveUpdate idiom rather than a bespoke listener.
     */
    static async onSubmitForm(event, form, formData) {
        recursiveUpdate(this.data, formData?.object ?? formData);
        this.render();
    }

    static async onCancel() {
        await this.close();
    }

    static async onRoll() {
        if (this.data.selectedCandidates.length === 0) {
            ui.notifications.warn('Select at least one item to requisition.');
            return;
        }
        await prepareRequisitionRoll(this.data);
        await this.close();
    }
}

export async function openRequisitionMenu(requisitionRollData) {
    const dialog = new RequisitionDialog(requisitionRollData);
    dialog.render({ force: true });
}

/**
 * Resolve and send the combined Requisition Test to chat: one roll covering every
 * selected candidate, modifiers already summed onto `rollData.modifiers.requisition`
 * by RequisitionRollData.toggleCandidate(). Modelled on ForceFieldData's inline
 * chat-sending shape (force-field-data.mjs) rather than the shared
 * ActionData.performActionAndSendToChat() pipeline -- RequisitionRollData isn't an
 * ActionData and has no damage/attack-special/opposed-roll machinery to inherit.
 * @param rollData {RequisitionRollData}
 */
export async function prepareRequisitionRoll(rollData) {
    await rollData.finalize();

    rollData.roll = await roll1d100();
    const total = rollData.roll.total;
    const target = rollData.modifiedTarget;
    rollData.success = total === 1 || (total <= target && total !== 100);
    if (rollData.success) {
        rollData.dof = 0;
        rollData.dos = 1 + getDegree(target, total);
    } else {
        rollData.dos = 0;
        rollData.dof = 1 + getDegree(total, target);
    }

    // Subtlety is paid regardless of success/failure, per RAW -- summed across every
    // individually-negative-modifier selected candidate (this system's own
    // extrapolation of the single-item RAW rule onto a combined-basket test).
    const subtletyCost = rollData.subtletyCost;
    let subtletyError = false;
    if (subtletyCost > 0 && rollData.warbandActor) {
        try {
            const currentValue = rollData.warbandActor.system.subtlety.value;
            await rollData.warbandActor.update({ system: { subtlety: { value: Math.max(0, currentValue - subtletyCost) } } });
        } catch (err) {
            console.error('prepareRequisitionRoll: failed to update Warband Subtlety', err);
            subtletyError = true;
            ui.notifications.warn('Failed to update the Warband Tracker\'s Subtlety -- you may not have permission to edit it.');
        }
    }

    const granted = [];
    if (rollData.success) {
        for (const candidate of rollData.selectedCandidates) {
            const items = await grantRequisitionedItem(rollData.sourceActor, candidate.pack, candidate.itemId, candidate.quantity);
            granted.push(...items);
        }
    }

    rollData.render = await rollData.roll.render();
    const html = await foundry.applications.handlebars.renderTemplate('systems/dark-heresy-2nd/templates/chat/requisition-roll-chat.hbs', {
        rollData,
        granted,
        subtletyCost,
        subtletyError,
    });
    const chatData = {
        user: game.user.id,
        rollMode: game.settings.get('core', 'messageMode'),
        content: html,
        style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    };
    if (['gm', 'blind'].includes(chatData.rollMode)) {
        chatData.whisper = ChatMessage.getWhisperRecipients('GM');
    } else if (chatData.rollMode === 'self') {
        chatData.whisper = [game.user];
    }
    ChatMessage.create(chatData);
}
