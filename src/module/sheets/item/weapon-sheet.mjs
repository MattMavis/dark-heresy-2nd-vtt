import { DarkHeresyItemContainerSheet } from './item-container-sheet.mjs';

export class DarkHeresyWeaponSheet extends DarkHeresyItemContainerSheet {
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        position: { width: 820, height: 575 },
    };

    /** @inheritDoc */
    static PARTS = {
        main: {
            template: 'systems/dark-heresy-2nd/templates/item/item-weapon-sheet.hbs',
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

    /** @inheritDoc */
    canAdd(itemData) {
        if (!super.canAdd(itemData)) {
            return false;
        }
        // Every item can only be added once for weapons
        if (this.item.items.some((i) => i.name === itemData.name)) {
            ui.notifications.info('Weapon can only hold one ' + itemData.name);
            return false;
        }

        // Only one ammo can be loaded
        if (itemData.type === 'ammunition' && this.item.items.some((i) => i.type === 'ammunition')) {
            ui.notifications.info('Only one type of ammunition can be loaded.');
            return false;
        }

        return true;
    }
}
