import { refundAmmo } from '../rules/ammo.mjs';
import { uuid } from '../rolls/roll-helpers.mjs';
import { AssignDamageData } from '../rolls/assign-damage-data.mjs';
import { prepareAssignDamageRoll } from '../prompts/assign-damage-prompt.mjs';
import { DHTargetedActionManager } from './targeted-action-manager.mjs';
import { Hit } from '../rolls/damage-data.mjs';
import { DarkHeresySettings } from '../dark-heresy-settings.mjs';
import { SYSTEM_ID } from '../hooks-manager.mjs';

export class BasicActionManager {
    // This is stored rolls for allowing re-rolls, ammo refund, etc.
    storedRolls = {};

    initializeHooks() {
        // Add show/hide support for chat messages
        // V13+ replaces the jQuery-based `renderChatMessage` hook with `renderChatMessageHTML`,
        // which supplies a plain HTMLElement instead of a jQuery object.
        Hooks.on('renderChatMessageHTML', (message, element, context) => {
            game.dh.log('renderChatMessageHTML', { message, element, context });
            this.activateChatListeners(element);
        });

        // Initialize Scene Control Buttons
        // V13+ shape: `controls` is a Record<string, SceneControl> keyed by control name,
        // and `SceneControl.tools` is a Record<string, SceneControlTool> keyed by tool name.
        // `order` is required, and `onClick` was replaced by `onChange`.
        Hooks.on('getSceneControlButtons', (controls) => {
            const tokenControls = controls.tokens;
            if (!tokenControls?.tools) return;
            tokenControls.tools.assignDamage = {
                name: 'assignDamage',
                title: 'Assign Damage',
                icon: 'fas fa-shield',
                order: Object.keys(tokenControls.tools).length,
                visible: true,
                button: true,
                onChange: async () => DHBasicActionManager.assignDamageTool(),
            };
        });
    }

    /**
     * Wire up the chat-card controls for a single rendered chat message.
     * @param {HTMLElement} element The rendered chat message element.
     */
    activateChatListeners(element) {
        const bind = (selector, handler) => {
            for (const control of element.querySelectorAll(selector)) {
                control.addEventListener('click', handler);
            }
        };
        bind('.roll-control__hide-control', async (ev) => await this._toggleExpandChatMessage(ev));
        bind('.roll-control__refund', async (ev) => await this._refundResources(ev));
        bind('.roll-control__fate-reroll', async (ev) => await this._fateReroll(ev));
        bind('.roll-control__assign-damage', async (ev) => await this._assignDamage(ev));
        bind('.roll-control__apply-damage', async (ev) => await this._applyDamage(ev));
    }

    /**
     * `element.dataset` values are always strings, whereas the jQuery `.data()` API this
     * replaced coerced numeric looking values automatically. Restore that coercion.
     * @param {string|undefined} value
     * @returns {number|undefined}
     */
    _datasetNumber(value) {
        if (value === undefined || value === null || value === '') return undefined;
        const parsed = Number(value);
        return Number.isNaN(parsed) ? undefined : parsed;
    }

    /**
     * @param {string|boolean|undefined} value
     * @returns {boolean}
     */
    _datasetBoolean(value) {
        if (typeof value === 'boolean') return value;
        return typeof value === 'string' && value.toLowerCase() === 'true';
    }

    async _toggleExpandChatMessage(event) {
        game.dh.log('roll-control-toggle');
        event.preventDefault();
        const displayToggle = event.currentTarget;
        for (const span of displayToggle.querySelectorAll('span')) {
            span.classList.toggle('active');
        }
        const target = displayToggle.dataset.toggle;
        const panel = target ? document.getElementById(target) : null;
        if (!panel) return;
        const isHidden = panel.style.display === 'none' || getComputedStyle(panel).display === 'none';
        panel.style.display = isHidden ? '' : 'none';
    }

    async _refundResources(event) {
        event.preventDefault();
        const rollId = event.currentTarget.dataset.rollId;
        const actionData = this.getActionData(rollId);

        if (!actionData) {
            ui.notifications.warn(`Action data expired. Unable to perform action.`);
            return;
        }

        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: 'Confirm Refund' },
            content: '<p>Are you sure you would like to refund ammo, fate, etc for this action?</p>',
            yes: { default: false },
            no: { default: true },
            rejectClose: false,
        });
        if (!confirmed) return;

        await actionData.refundResources();
        ui.notifications.info(`Resources refunded`);
    }

    async _fateReroll(event) {
        event.preventDefault();
        const rollId = event.currentTarget.dataset.rollId;
        const actionData = this.getActionData(rollId);

        if (!actionData) {
            ui.notifications.warn(`Action data expired. Unable to perform action.`);
            return;
        }

        if (actionData.rollData?.sourceActor?.system?.fate?.value <= 0) {
            ui.notifications.warn(`Actor does not have enough fate points!`);
            return;
        }

        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: 'Confirm Re-Roll' },
            content: '<p>Are you sure you would like to use a fate point to re-roll action?</p>',
            yes: { default: false },
            no: { default: true },
            rejectClose: false,
        });
        if (!confirmed) return;

        // Generate new ID for action data
        actionData.id = uuid();
        // Use a FP
        await actionData.rollData.sourceActor.spendFate();
        // Refund Initial Resources
        await actionData.refundResources();
        // Reset
        actionData.reset();
        // Run it back
        await actionData.performActionAndSendToChat();
    }

    async _assignDamage(event) {
        event.preventDefault();
        const dataset = event.currentTarget.dataset;

        const location = dataset.location;
        const totalDamage = this._datasetNumber(dataset.totalDamage);
        const totalPenetration = this._datasetNumber(dataset.totalPenetration);
        const totalFatigue = this._datasetNumber(dataset.totalFatigue);
        const damageType = dataset.damageType;

        const hitData = new Hit();
        hitData.location = location;
        hitData.totalDamage = totalDamage;
        hitData.totalPenetration = totalPenetration;
        hitData.totalFatigue = totalFatigue;
        hitData.damageType = damageType;

        const targetUuid = dataset.targetUuid;

        let targetActor;
        if (targetUuid) {
            targetActor = await fromUuid(targetUuid);
            if (targetActor.actor != undefined) {
                targetActor = targetActor.actor;
            }
        } else {
            const targetedObjects = game.user.targets;
            if (targetedObjects && targetedObjects.size > 0) {
                const target = targetedObjects.values().next().value;
                targetActor = target.actor;
            }
        }
        if (!targetActor) {
            ui.notifications.warn(`Cannot determine target actor to assign hit.`);
            return;
        }

        const assignData = new AssignDamageData(targetActor, hitData);
        await prepareAssignDamageRoll(assignData);
    }

    async _applyDamage(event) {
        event.preventDefault();
        const dataset = event.currentTarget.dataset;
        game.dh.log('roll-control-apply-damage', { dataset });

        const actorUuid = dataset.uuid;
        const damageType = dataset.type;
        const ignoreArmour = this._datasetBoolean(dataset.ignoreArmour);
        const location = dataset.location;
        const damage = this._datasetNumber(dataset.damage);
        const penetration = this._datasetNumber(dataset.penetration);
        const fatigue = this._datasetNumber(dataset.fatigue);

        const actor = (await fromUuid(actorUuid))?.actor;
        if (!actor) {
            ui.notifications.warn(`Cannot determine actor to assign hit.`);
            return;
        }
        for(const field of [damage, penetration, fatigue]) {
            if(field !== undefined && !Number.isInteger(field)) {
                ui.notifications.warn(`Unable to determine damage/penetration/fatigue to assign.`);
                return;
            }
        }

        const assignDamageData = new AssignDamageData();
        assignDamageData.actor = actor;
        if(ignoreArmour) {
            assignDamageData.ignoreArmour = true;
        }

        const hit = new Hit();
        if(location) {
            hit.location = location;
        }
        if(damage) {
            hit.totalDamage = damage;
        }
        if(penetration) {
            hit.totalPenetration = penetration;
        }
        if(fatigue) {
            hit.totalFatigue = fatigue;
        }
        if(damageType) {
            hit.damageType = damageType;
        }

        assignDamageData.hit = hit;

        await assignDamageData.update();
        await assignDamageData.finalize();
        await assignDamageData.performActionAndSendToChat();
    }

    async assignDamageTool() {
        const sourceToken = DHTargetedActionManager.getSourceToken();
        const sourceActorData = sourceToken ? sourceToken.actor : source;
        if(!sourceActorData) return;

        const hitData = new Hit();
        const assignData = new AssignDamageData(sourceActorData, hitData);
        await prepareAssignDamageRoll(assignData);
    }

    getActionData(id) {
        return this.storedRolls[id];
    }

    storeActionData(actionData) {
        //TODO: Cleanup all rolls older than ? minutes
        this.storedRolls[actionData.id] = actionData;
    }

    /**
     * Data Expected to vocalize item:
     * actor, name, type description
     * @param data
     * @returns {Promise<void>}
     */
    async sendItemVocalizeChat(data) {
        const html = await foundry.applications.handlebars.renderTemplate('systems/dark-heresy-2nd/templates/chat/item-vocalize-chat.hbs', data);
        let chatData = {
            user: game.user.id,
            content: html,
            rollMode: game.settings.get('core', 'rollMode'),
            // V12+ renamed the numeric ChatMessage `type` field to `style`, backed by
            // CONST.CHAT_MESSAGE_STYLES (CONST.CHAT_MESSAGE_TYPES is now the document sub-type).
            style: CONST.CHAT_MESSAGE_STYLES.IC,
        };
        if (['gmroll', 'blindroll'].includes(chatData.rollMode)) {
            chatData.whisper = ChatMessage.getWhisperRecipients('GM');
        } else if (chatData.rollMode === 'selfroll') {
            chatData.whisper = [game.user];
        }
        ChatMessage.create(chatData);
    }
}

export const DHBasicActionManager = new BasicActionManager();
