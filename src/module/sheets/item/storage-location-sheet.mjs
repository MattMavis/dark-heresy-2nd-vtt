import { DarkHeresyItemContainerSheet } from './item-container-sheet.mjs';

export class DarkHeresyStorageLocationSheet extends DarkHeresyItemContainerSheet {
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        position: { width: 800, height: 400 },
    };

    /** @inheritDoc */
    static PARTS = {
        main: {
            template: 'systems/dark-heresy-2nd/templates/item/item-storage-location-sheet.hbs',
            templates: [
                'systems/dark-heresy-2nd/templates/actor/partial/trait-toggle.hbs',
            ],
            scrollable: [''],
        },
    };

    /** @inheritDoc */
    static TABS = {
        primary: {
            tabs: [{ id: 'items' }, { id: 'description' }],
            initial: 'items',
        },
    };
}
