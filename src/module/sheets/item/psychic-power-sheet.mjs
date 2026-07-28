import { DarkHeresyItemContainerSheet } from './item-container-sheet.mjs';

export class DarkHeresyPsychicPowerSheet extends DarkHeresyItemContainerSheet {
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        position: { width: 820, height: 575 },
    };

    /** @inheritDoc */
    static PARTS = {
        main: {
            template: 'systems/dark-heresy-2nd/templates/item/item-psychic-power-sheet.hbs',
            templates: [
                'systems/dark-heresy-2nd/templates/actor/partial/trait-toggle.hbs',
            ],
            scrollable: [''],
        },
    };

    /** @inheritDoc */
    static TABS = {
        primary: {
            tabs: [{ id: 'stats' }, { id: 'description' }],
            initial: 'stats',
        },
    };
}
