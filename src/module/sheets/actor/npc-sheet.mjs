import { AcolyteSheet } from './acolyte-sheet.mjs';

export class NpcSheet extends AcolyteSheet {
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        classes: ['npc'],
    };

    /** @inheritDoc */
    static PARTS = {
        main: {
            template: 'systems/dark-heresy-2nd/templates/actor/actor-npc-sheet.hbs',
            scrollable: [''],
        },
    };

    /** @inheritDoc */
    static TABS = {
        primary: {
            initial: 'main',
            tabs: [
                { id: 'combat', label: 'combat' },
                { id: 'main', label: 'main' },
                { id: 'gear', label: 'gear' },
                { id: 'psychic', label: 'psychic powers' },
            ],
        },
    };
}
