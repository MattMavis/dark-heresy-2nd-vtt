/**
 * An item sheet that can accept other items within it --
 * e.g. weapons with associated weapon mods
 */
import { DarkHeresyItemSheet } from './item-sheet.mjs';

const { DialogV2 } = foundry.applications.api;

export class DarkHeresyItemContainerSheet extends DarkHeresyItemSheet {
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        actions: {
            itemCreate: DarkHeresyItemContainerSheet.#onItemCreate,
            itemDelete: DarkHeresyItemContainerSheet.#onItemDelete,
            itemEdit: DarkHeresyItemContainerSheet.#onItemEdit,
        },
    };

    /**
     * Set when the sheet is rendered for an Item which is not actually a container. Such a sheet is
     * forced read-only, mirroring the legacy behaviour of clearing the `editable` option.
     * @type {boolean}
     */
    #notAContainer = false;

    /* -------------------------------------------- */

    /** @inheritDoc */
    get isEditable() {
        return super.isEditable && !this.#notAContainer;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        this.#notAContainer = !this.item.system.container;
        if (this.#notAContainer) {
            game.dh.warn('Unexpected Sheet Type: Item has container sheet but is not container?', context);
            context.editable = false;
        }
        return context;
    }

    /* -------------------------------------------- */
    /*  Drag and Drop                               */
    /* -------------------------------------------- */

    /** @inheritDoc */
    _canDragStart(selector) {
        return this.isEditable && this.item.system.container;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    _canDragDrop(selector) {
        return this.isEditable && this.item.system.container;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _onDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        let data;
        let item;
        let actor;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
            if (data.type !== 'Item') {
                game.dh.log('ItemCollection | Containers only accept items', data);
                return false;
            } else {
                game.dh.log('_onDrop data: ', data);
                // Drags originating from within a container carry the item data directly rather than a uuid.
                item = data.uuid ? fromUuidSync(data.uuid) : data.data;

                if (data.actor) {
                    actor = data.actor;
                } else if (data.uuid && data.uuid.startsWith('Actor.')) {
                    actor = await fromUuid(data.uuid);
                }

                // Check if Item already Exists
                if (this.item.items.find((i) => i._id === item._id)) {
                    game.dh.log('Item already exists in container -- ignoring');
                    return false;
                }
            }
        } catch (err) {
            game.dh.log('Item Container | drop error', err);
            return false;
        }

        if (item) {
            // Check up the chain that we are not dropping one of our parents onto us.
            let canAdd = this.item.id !== item._id;
            let ancestor = this.item.parent;
            let count = 0;
            while (ancestor && count < 10) {
                // Don't allow drops of anything in the parent chain or the item will disappear.
                count += 1;
                canAdd = canAdd && ancestor.id !== item._id;
                ancestor = ancestor.parent;
            }
            if (!canAdd) {
                game.dh.log('ItemCollection | Cant drop on yourself');
                ui.notifications.info('Cannot drop item into itself');
                throw new Error('Dragging bag onto itself or ancestor opens a planar vortex and you are sucked into it');
            }
            // drop from player characters or another bag.
            if (this.canAdd(item)) {
                await this.item.createNestedDocuments([item]);
                if (actor && (actor.type === 'acolyte' || actor.isToken)) await actor.deleteEmbeddedDocuments('Item', [item._id]);
                return false;
            }
            // Item is not accepted by this container -- place back onto actor
            else if (this.item.parent) {
                // this bag is owned by an actor - drop into the inventory instead.
                if (actor && actor.type === 'acolyte') await actor.deleteEmbeddedDocuments('Item', [item._id]);
                await this.item.parent.createNestedDocuments([item]);
                ui.notifications.info('Item dropped back into actor.');
                return false;
            }
        }
        return false;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _onDragStart(event) {
        event.stopPropagation();
        game.dh.log('Item:_onDragStart', event);

        const element = event.currentTarget;
        if (!element.dataset?.itemId) {
            // Not a nested item -- let the core ItemSheetV2 handler deal with it (e.g. ActiveEffects).
            game.dh.log('Default Foundry Handler');
            return super._onDragStart(event);
        }

        const itemId = element.dataset.itemId;
        const item = this.item.items.get(itemId);
        if (!item) {
            game.dh.log('No Item found on container - Cancelling Drag');
            return;
        }

        // Create drag data
        const dragData = {
            parentId: this.item.id,
            type: 'Item',
            data: item,
        };
        event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
        await this.item.deleteNestedDocuments([itemId]);
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Resolve the nested Item targeted by an action element.
     * @param {HTMLElement} target  The element which defined the action
     * @returns {Item|undefined}
     * @protected
     */
    _getNestedItem(target) {
        const itemId = target.closest('[data-item-id]')?.dataset.itemId;
        return itemId ? this.item.items.get(itemId) : undefined;
    }

    /* -------------------------------------------- */

    /**
     * Create a new nested Item of the type declared by the action element.
     * @this {DarkHeresyItemContainerSheet}
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static async #onItemCreate(event, target) {
        if (!this.isEditable) return;
        const type = target.closest('[data-type]')?.dataset.type;
        if (!type) return;
        await this.item.createNestedDocuments([{ name: `New ${type.capitalize()}`, type }]);
        this.render();
    }

    /* -------------------------------------------- */

    /**
     * Render the sheet of a nested Item.
     * @this {DarkHeresyItemContainerSheet}
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static #onItemEdit(event, target) {
        this._getNestedItem(target)?.sheet.render({ force: true });
    }

    /* -------------------------------------------- */

    /**
     * Delete a nested Item after confirmation.
     * @this {DarkHeresyItemContainerSheet}
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static async #onItemDelete(event, target) {
        if (!this.isEditable) return;
        const itemId = target.closest('[data-item-id]')?.dataset.itemId;
        if (!itemId) return;
        const confirmed = await DialogV2.confirm({
            window: { title: 'Confirm Delete' },
            content: '<p>Are you sure you would like to delete this?</p>',
            modal: true,
        });
        if (!confirmed) return;
        await this.item.deleteNestedDocuments([itemId]);
        this.render();
    }

    /* -------------------------------------------- */

    /**
     * Can the provided item be placed into this container?
     * @param {object|Item} itemData
     * @returns {boolean}
     */
    canAdd(itemData) {
        return this.item.system.containerTypes.includes(itemData.type);
    }
}
