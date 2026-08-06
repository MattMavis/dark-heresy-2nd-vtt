import { DarkHeresyItemSheet } from './item-sheet.mjs';

export class DarkHeresyGearSheet extends DarkHeresyItemSheet {
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        position: { width: 820, height: 575 },
    };

    /** @inheritDoc */
    static PARTS = {
        main: {
            template: 'systems/dark-heresy-2nd/templates/item/item-gear-sheet.hbs',
            templates: ['systems/dark-heresy-2nd/templates/item/panel/active-effects-panel.hbs'],
            scrollable: [''],
        },
    };
}
