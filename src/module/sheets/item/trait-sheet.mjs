import { DarkHeresyItemSheet } from './item-sheet.mjs';

export class DarkHeresyTraitSheet extends DarkHeresyItemSheet {
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        position: { width: 650, height: 500 },
    };

    /** @inheritDoc */
    static PARTS = {
        main: {
            template: 'systems/dark-heresy-2nd/templates/item/item-trait-sheet.hbs',
            scrollable: [''],
        },
    };
}
