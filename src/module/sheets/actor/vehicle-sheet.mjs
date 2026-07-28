import { ActorContainerSheet } from './actor-container-sheet.mjs';

export class VehicleSheet extends ActorContainerSheet {
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        classes: ['vehicle'],
    };

    /** @inheritDoc */
    static PARTS = {
        main: {
            template: 'systems/dark-heresy-2nd/templates/actor/actor-vehicle-sheet.hbs',
            scrollable: [''],
        },
    };

    /** @inheritDoc */
    async _onItemDamage(event) {
        event.preventDefault();
        game.dh.warn('Not Implemented for Vehicles Yet');
    }
}
