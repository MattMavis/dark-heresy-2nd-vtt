import { DarkHeresyItemContainerSheet } from './item-container-sheet.mjs';

export class DarkHeresyArmourSheet extends DarkHeresyItemContainerSheet {
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        position: { width: 820, height: 575 },
    };

    /** @inheritDoc */
    static PARTS = {
        main: {
            template: 'systems/dark-heresy-2nd/templates/item/item-armour-sheet.hbs',
            templates: [
                'systems/dark-heresy-2nd/templates/item/panel/active-effects-panel.hbs',
                'systems/dark-heresy-2nd/templates/actor/partial/trait-toggle.hbs',
            ],
            scrollable: [''],
        },
    };

    /** @inheritDoc */
    static TABS = {
        primary: {
            tabs: [{ id: 'active-effects' }, { id: 'stats' }, { id: 'description' }],
            initial: 'stats',
        },
    };
}
