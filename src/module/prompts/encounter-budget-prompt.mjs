import { DhPromptDialog } from './prompt-dialog.mjs';
import { partyActors } from './award-prompt.mjs';
import {
    ELITE_MASTER_RANGE,
    compositionAdvice,
    encounterLevel,
    thresholdBand,
    threatThreshold,
} from '../rules/encounter-budget.mjs';

/**
 * State for the Encounter Budget window (Core Rulebook pp.379-382). Report-only: it creates no
 * tokens and modifies no actors. Modelled on AwardData (award-prompt.mjs) -- a plain data bag the
 * dialog renders -- except that everything shown is derived from the live world on each render.
 */
class EncounterBudgetData {
    /** Actor id -> whether that acolyte is in the encounter. Seeded from {@link partyActors}. */
    selection = new Map();
    /** NPC actor id -> how many of them the GM has budgeted. */
    quantities = new Map();

    constructor() {
        const players = new Set(partyActors().map((a) => a.id));
        for (const actor of game.actors.filter((a) => a.type === 'acolyte')) {
            this.selection.set(actor.id, players.has(actor.id));
        }
    }

    /** The shape the template renders. Recomputed per render so it is never stale. */
    build() {
        const acolytes = game.actors
            .filter((a) => a.type === 'acolyte')
            .map((a) => ({
                id: a.id,
                name: a.name,
                // `used` is derived from the XP ledger in prepareDerivedData, so it is always accurate.
                spent: Number(a.system.experience?.used) || 0,
                selected: this.selection.get(a.id) ?? false,
            }));
        const chosen = acolytes.filter((a) => a.selected);
        const level = encounterLevel(chosen.map((a) => a.spent));
        const band = thresholdBand(level);
        const threshold = threatThreshold(level, chosen.length);

        const types = CONFIG.dh.npcTypes;
        const groups = Object.entries(types).map(([key, label]) => ({ key, label, npcs: [] }));
        const other = { key: 'other', label: 'Other / unset type', npcs: [] };
        const unbudgetable = [];
        for (const actor of game.actors.filter((a) => a.type === 'npc' || a.type === 'xenos')) {
            const threat = Number(actor.system.threatLevel) || 0;
            const type = actor.system.type;
            if (threat <= 0) {
                unbudgetable.push({ id: actor.id, name: actor.name, typeLabel: types[type] ?? 'Unset' });
                continue;
            }
            const quantity = this.quantities.get(actor.id) ?? 0;
            const row = { id: actor.id, name: actor.name, threat, quantity, subtotal: threat * quantity };
            (groups.find((g) => g.key === type) ?? other).npcs.push(row);
        }
        const allGroups = [...groups, other].filter((g) => g.npcs.length);
        for (const g of allGroups) g.npcs.sort((a, b) => a.name.localeCompare(b.name));
        unbudgetable.sort((a, b) => a.name.localeCompare(b.name));
        const rows = allGroups.flatMap((g) => g.npcs.map((n) => ({ ...n, type: g.key })));

        const used = rows.reduce((sum, n) => sum + n.subtotal, 0);
        const count = (key) => rows.filter((n) => n.type === key).reduce((s, n) => s + n.quantity, 0);
        const leaders = count('elite') + count('master');

        return {
            acolytes,
            noParty: chosen.length === 0,
            level,
            bandLabel: band.max === null ? `${band.min}+` : `${band.min}-${band.max}`,
            multiplier: band.multiplier,
            pcCount: chosen.length,
            threshold,
            advice: compositionAdvice(threshold),
            guideMin: ELITE_MASTER_RANGE.min,
            guideMax: ELITE_MASTER_RANGE.max,
            groups: allGroups,
            unbudgetable,
            used,
            remaining: threshold - used,
            over: used > threshold,
            overBy: used - threshold,
            leaders,
            troops: count('troop'),
            leadersOutOfRange: used > 0 && (leaders < ELITE_MASTER_RANGE.min || leaders > ELITE_MASTER_RANGE.max),
        };
    }
}

export class EncounterBudgetDialog extends DhPromptDialog {
    static DEFAULT_OPTIONS = {
        id: 'dh-encounter-budget-dialog',
        window: {
            title: 'Encounter Budget',
        },
        position: {
            width: 640,
            height: 720,
        },
    };

    static PARTS = {
        body: DhPromptDialog.promptPart('systems/dark-heresy-2nd/templates/prompt/encounter-budget-prompt.hbs'),
    };

    async _prepareContext() {
        return this.data.build();
    }

    _onRender(context, options) {
        super._onRender(context, options);
        this.element.setAttribute('autocomplete', 'off');
        for (const input of this.element.querySelectorAll('.encounter-pc')) {
            input.addEventListener('change', (event) => {
                // See RequisitionDialog._toggleCandidate: keep the form's own submitOnChange
                // render from racing this one.
                event.stopPropagation();
                this.data.selection.set(event.target.dataset.actorId, event.target.checked);
                this.render();
            });
        }
        for (const input of this.element.querySelectorAll('.encounter-quantity')) {
            input.addEventListener('change', (event) => {
                event.stopPropagation();
                const qty = Math.max(0, Math.floor(Number(event.target.value) || 0));
                this.data.quantities.set(event.target.dataset.actorId, qty);
                this.render();
            });
        }
    }
}

export function openEncounterBudget() {
    // Re-checked here as well as at the sheet button's isGM gate (same pattern as openAwardMenu).
    if (!game.user.isGM) {
        ui.notifications.warn('Only a GM may use the Encounter Budget.');
        return;
    }
    new EncounterBudgetDialog(new EncounterBudgetData()).render({ force: true });
}
