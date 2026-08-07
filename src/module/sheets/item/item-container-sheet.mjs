/**
 * An item sheet that can accept other items within it --
 * e.g. weapons with associated weapon mods
 */
import { DarkHeresyItemSheet } from './item-sheet.mjs';
import { DH_CONTAINED_BY } from '../../documents/item-container.mjs';
import { SYSTEM_ID } from '../../hooks-manager.mjs';

const { DialogV2 } = foundry.applications.api;

export class DarkHeresyItemContainerSheet extends DarkHeresyItemSheet {
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        actions: {
            itemCreate: DarkHeresyItemContainerSheet.#onItemCreate,
            itemDelete: DarkHeresyItemContainerSheet.#onItemDelete,
            itemEdit: DarkHeresyItemContainerSheet.#onItemEdit,
            itemRelease: DarkHeresyItemContainerSheet.#onItemRelease,
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

        let item;
        try {
            const data = JSON.parse(event.dataTransfer.getData('text/plain'));
            if (data.type !== 'Item') {
                game.dh.log('ItemContainer | Containers only accept items', data);
                return false;
            }
            // Contained items are ordinary documents now, so every drop resolves by uuid --
            // there is no longer a raw-data payload for things dragged out of a container.
            item = data.uuid ? await fromUuid(data.uuid) : null;
        } catch (err) {
            game.dh.log('Item Container | drop error', err);
            return false;
        }
        if (!item) return false;

        if (this.item.items.get(item.id)) {
            game.dh.log('Item already in this container -- ignoring');
            return false;
        }

        // Refuse a drop that would put a container inside itself or its own contents.
        if (this.#wouldCycle(item)) {
            ui.notifications.warn('Cannot place an item inside itself.');
            return false;
        }

        if (this.canAdd(item)) {
            // Same collection (usually the same actor): containment is just a flag change, so
            // the document keeps its id, its effects and any other references to it.
            if (item.parent === this.item.parent) {
                await item.setFlag(SYSTEM_ID, DH_CONTAINED_BY, this.item.id);
            } else {
                await this.item.createNestedDocuments([item]);
                if (item.parent) await item.delete();
            }
            this.render();
            return false;
        }

        ui.notifications.info(`${this.item.name} cannot hold a ${item.type}.`);
        return false;
    }

    /** True if placing `item` into this container would create a containment loop. */
    #wouldCycle(item) {
        if (item.id === this.item.id) return true;
        let container = this.item.containerItem;
        let depth = 0;
        while (container && depth++ < 10) {
            if (container.id === item.id) return true;
            container = container.containerItem;
        }
        return false;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _onDragStart(event) {
        event.stopPropagation();

        const element = event.currentTarget;
        const itemId = element.dataset?.itemId;
        if (!itemId) {
            // Not a contained item -- let the core ItemSheetV2 handler deal with it (e.g. ActiveEffects).
            return super._onDragStart(event);
        }

        const item = this.item.items.get(itemId);
        if (!item) {
            game.dh.log('No item found on container - cancelling drag');
            return;
        }

        // Non-destructive: the item is a real document with a uuid, so it stays put until
        // something actually accepts it. The old implementation deleted it here and rebuilt it
        // on drop, which lost the item outright if the drag was cancelled.
        event.dataTransfer.setData('text/plain', JSON.stringify(item.toDragData()));
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
     * Take a contained item out of this container, leaving it in the owner's inventory.
     * Dragging it out to the actor sheet does the same thing, but that means having both
     * windows open and lined up -- this is the reliable way to get something back off a
     * weapon without deleting it.
     * @this {DarkHeresyItemContainerSheet}
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static async #onItemRelease(event, target) {
        if (!this.isEditable) return;
        const itemId = target.closest('[data-item-id]')?.dataset.itemId;
        if (!itemId) return;
        const name = this.item.items.get(itemId)?.name ?? 'Item';
        await this.item.releaseNestedDocuments([itemId]);
        ui.notifications.info(`${name} removed from ${this.item.name}.`);
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
