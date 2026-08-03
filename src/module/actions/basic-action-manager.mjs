import { refundAmmo } from '../rules/ammo.mjs';
import { uuid } from '../rolls/roll-helpers.mjs';
import { AssignDamageData } from '../rolls/assign-damage-data.mjs';
import { prepareAssignDamageRoll } from '../prompts/assign-damage-prompt.mjs';
import { DHTargetedActionManager } from './targeted-action-manager.mjs';
import { Hit } from '../rolls/damage-data.mjs';
import { DarkHeresySettings } from '../dark-heresy-settings.mjs';
import { SYSTEM_ID } from '../hooks-manager.mjs';
import { getCriticalDamage } from '../rules/critical-damage.mjs';

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
        bind('.roll-control__apply-critical-effect', async (ev) => await this._applyCriticalEffect(ev));
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

    /**
     * Apply the mechanically unambiguous half of a critical-damage result (Fatigue,
     * Stunned/Prone/Blinded/Deafened durations, Blood Loss, catching fire, death) with a
     * single click, instead of the GM reading the prose and updating everything by hand.
     * Deliberately only handles the fields `resolveCriticalEffects()` (critical-damage.mjs)
     * populates from unconditional/guaranteed clauses -- conditional/branching effects stay
     * prose-only by design, see the design rule in the critical-damage-effects plan.
     *
     * `CONFIG.statusEffects` ids verified live against this project's actual Foundry 14.365.0
     * client (2026-08-01): dead/prone/blind/deaf/stun all exist as core defaults -- note it's
     * `stun`, not `stunned`. Custom ActiveEffects created below (Bleeding/Burning/Blinded-
     * medical/Deafened-medical) must set BOTH `name` (required by this Foundry version's
     * ActiveEffect schema on creation) and `label` (this codebase's existing convention for
     * reading effects back, e.g. `effect.label === 'Burning'` in combat-action-manager.mjs --
     * `label` is a deprecated read-compatibility getter on constructed documents, but does NOT
     * satisfy schema validation when passed as raw creation data on its own).
     */
    async _applyCriticalEffect(event) {
        event.preventDefault();
        const dataset = event.currentTarget.dataset;
        game.dh.log('roll-control-apply-critical-effect', { dataset });

        const resolved = await fromUuid(dataset.uuid);
        const actor = resolved?.documentName === 'Actor' ? resolved : resolved?.actor;
        if (!actor) {
            ui.notifications.warn(`Cannot determine actor to apply critical effect.`);
            return;
        }

        const combat = game.combat;

        // Each effect is independent -- one failing (e.g. an invalid status ID on this
        // Foundry version) must not prevent the others on the same click from applying.
        const applied = [];
        const failed = [];
        // `fn` may return `false` to mean "correctly determined there was nothing to do" (e.g.
        // Blinded/Deafened when neither field was populated on this crit result) -- that must
        // NOT be reported as applied just because nothing threw. Anything else (including
        // undefined, the common case for fire-and-forget effects) counts as a real application.
        const attempt = async (label, fn) => {
            try {
                const result = await fn();
                if (result !== false) {
                    applied.push(label);
                }
            } catch (err) {
                console.error(`_applyCriticalEffect: failed to apply ${label}`, err);
                failed.push(`${label} (${err.message})`);
            }
        };

        // Always log a permanent, readable record on the actor's Critical Injuries panel
        // (a real, purpose-built Item type in this system -- `criticalInjury`, with Type/Part/
        // Description fields -- that already exists on every actor sheet but had never been
        // populated by anything in this codebase) regardless of whether any of the specific
        // mechanical effects below were extractable from this particular result.
        //
        // The description text is re-fetched fresh from critical-damage.mjs by (damage type,
        // location, amount) rather than round-tripped through a data-* attribute: the text
        // contains `[[XdY]]` inline-roll syntax, and Foundry's chat-message enrichment pass
        // rewrites that pattern anywhere it appears in the rendered HTML -- including inside
        // attribute values -- which corrupts the attribute (an injected `<a class="...">` tag
        // with its own unescaped quote prematurely closes the attribute it was injected into).
        const damageType = dataset.damageType || 'Unknown';
        const location = dataset.location || 'Unknown';
        const amount = this._datasetNumber(dataset.amount);
        const description = amount ? (getCriticalDamage(damageType, location, amount)?.text ?? '') : '';
        await attempt('Injury Logged', () => actor.createEmbeddedDocuments('Item', [
            {
                name: `${damageType} Critical (${location})`,
                type: 'criticalInjury',
                system: { type: damageType, part: location, description, source: '' },
            },
        ]));

        const fatigue = this._datasetNumber(dataset.fatigue);
        if (fatigue) {
            await attempt('Fatigue', () =>
                actor.update({ system: { fatigue: { value: actor.system.fatigue.value + fatigue } } }));
        }

        const stunnedRounds = this._datasetNumber(dataset.stunnedRounds);
        if (stunnedRounds) {
            await attempt('Stunned', () => this._applyTimedStatus(actor, 'stun', stunnedRounds, combat));
        }

        if (this._datasetBoolean(dataset.prone)) {
            await attempt('Prone', () => actor.toggleStatusEffect('prone', { active: true }));
        }

        await attempt('Blinded', () => this._applyDurationField(actor, combat, 'blind', 'Blinded', {
            rounds: this._datasetNumber(dataset.blindedRounds),
            hours: this._datasetNumber(dataset.blindedHours),
            permanent: this._datasetBoolean(dataset.blindedPermanent),
            medical: this._datasetBoolean(dataset.blindedMedical),
        }));

        await attempt('Deafened', () => this._applyDurationField(actor, combat, 'deaf', 'Deafened', {
            rounds: this._datasetNumber(dataset.deafenedRounds),
            hours: this._datasetNumber(dataset.deafenedHours),
            permanent: this._datasetBoolean(dataset.deafenedPermanent),
            medical: this._datasetBoolean(dataset.deafenedMedical),
        }));

        if (this._datasetBoolean(dataset.bloodLoss)) {
            await attempt('Blood Loss', () => actor.createEmbeddedDocuments('ActiveEffect', [
                { name: 'Bleeding', label: 'Bleeding', icon: 'icons/svg/blood.svg', origin: actor.uuid },
            ]));
        }

        if (this._datasetBoolean(dataset.onFire)) {
            await attempt('On Fire', () => actor.createEmbeddedDocuments('ActiveEffect', [
                { name: 'Burning', label: 'Burning', icon: 'icons/svg/fire.svg', origin: actor.uuid },
            ]));
        }

        if (this._datasetBoolean(dataset.death)) {
            await attempt('Dead', () => actor.toggleStatusEffect('dead', { active: true }));
        }

        if (applied.length) {
            ui.notifications.info(`Applied to ${actor.name}: ${applied.join(', ')}.`);
        }
        if (failed.length) {
            ui.notifications.error(`Failed to apply to ${actor.name}: ${failed.join('; ')}.`);
        }
        if (!applied.length && !failed.length) {
            ui.notifications.info(`No automatable effects on this result for ${actor.name} -- read the text and apply manually.`);
        }
    }

    /**
     * Blinded/Deafened share the same rounds/hours/permanent/medical shape. Rounds-based
     * durations use a real (guessed-id, see _applyCriticalEffect's note) status effect via
     * _applyTimedStatus; hours-based, permanent, and "until medical attention" durations
     * don't map onto Foundry's combat-round expiry at all, so they're applied as a plain
     * custom-labeled ActiveEffect the GM clears manually -- same convention already used for
     * Bleeding/Burning, and the same "one click to apply, no further automation" ceiling
     * this whole feature is designed around.
     */
    async _applyDurationField(actor, combat, statusId, label, { rounds, hours, permanent, medical }) {
        if (rounds) {
            await this._applyTimedStatus(actor, statusId, rounds, combat);
            return true;
        } else if (hours || permanent || medical) {
            await actor.createEmbeddedDocuments('ActiveEffect', [
                { name: label, label, icon: 'icons/svg/aura.svg', origin: actor.uuid },
            ]);
            return true;
        }
        return false;
    }

    /**
     * Toggle a status effect on and, if combat is active, set its duration so Foundry's own
     * combat tracker expires it automatically after the given number of rounds. Falls back to
     * a plain (manually-cleared) toggle outside of combat, since there's no round counter to
     * attach a duration to.
     */
    async _applyTimedStatus(actor, statusId, rounds, combat) {
        if (!combat) {
            await actor.toggleStatusEffect(statusId, { active: true });
            ui.notifications.warn(`No active combat -- ${statusId} applied without an auto-expiring duration. Remove it manually when appropriate.`);
            return;
        }
        await actor.toggleStatusEffect(statusId, { active: true });
        const effect = actor.effects.find((e) => e.statuses?.has(statusId));
        if (effect) {
            await effect.update({
                duration: { rounds, startRound: combat.round, startTurn: combat.turn, combat: combat.id },
            });
        }
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
            rollMode: game.settings.get('core', 'messageMode'),
            // V12+ renamed the numeric ChatMessage `type` field to `style`, backed by
            // CONST.CHAT_MESSAGE_STYLES (CONST.CHAT_MESSAGE_TYPES is now the document sub-type).
            style: CONST.CHAT_MESSAGE_STYLES.IC,
        };
        if (['gm', 'blind'].includes(chatData.rollMode)) {
            chatData.whisper = ChatMessage.getWhisperRecipients('GM');
        } else if (chatData.rollMode === 'self') {
            chatData.whisper = [game.user];
        }
        ChatMessage.create(chatData);
    }
}

export const DHBasicActionManager = new BasicActionManager();
