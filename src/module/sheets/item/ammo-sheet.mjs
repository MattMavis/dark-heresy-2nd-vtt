import { DarkHeresyItemContainerSheet } from './item-container-sheet.mjs';

export class DarkHeresyAmmoSheet extends DarkHeresyItemContainerSheet {
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        position: { width: 820, height: 575 },
    };

    /** @inheritDoc */
    static PARTS = {
        main: {
            template: 'systems/dark-heresy-2nd/templates/item/item-ammo-sheet.hbs',
            scrollable: [''],
        },
    };

    /** @inheritDoc */
    canAdd(itemData) {
        if (!super.canAdd(itemData)) {
            return false;
        }
        // Every item can only be added once for weapons
        if (this.item.items?.some((i) => i.name === itemData.name)) {
            ui.notifications.info('Ammo can only hold one ' + itemData.name);
            return false;
        }
        return true;
    }
}
