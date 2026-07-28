import { DarkHeresyItemSheet } from './item-sheet.mjs';

export class DarkHeresyCriticalInjurySheet extends DarkHeresyItemSheet {
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        position: { width: 820, height: 575 },
    };

    /** @inheritDoc */
    static PARTS = {
        main: {
            template: 'systems/dark-heresy-2nd/templates/item/item-critical-injury-sheet.hbs',
            scrollable: [''],
        },
    };
}
