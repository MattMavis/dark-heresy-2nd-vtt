import { openEncounterBudget } from '../../prompts/encounter-budget-prompt.mjs';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Minimal sheet for the singleton Warband Tracker actor -- just the shared party
 * Subtlety value/max, plus the GM's Encounter Budget button. Deliberately not an ActorContainerSheet: this actor never
 * holds embedded items, so none of that class's drag/drop or item-action wiring
 * applies here.
 */
export class WarbandSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        classes: ['dark-heresy-2nd', 'warband'],
        position: {
            width: 400,
            height: 260,
        },
        form: {
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            // GM-only; the template hides the button for players and openEncounterBudget
            // re-checks, as the Award button does.
            encounterBudget() {
                return openEncounterBudget();
            },
        },
    };

    /** @inheritDoc */
    static PARTS = {
        main: {
            template: 'systems/dark-heresy-2nd/templates/actor/actor-warband-sheet.hbs',
        },
    };

    /** @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.actor = this.actor;
        context.isGM = game.user.isGM;
        return context;
    }
}
