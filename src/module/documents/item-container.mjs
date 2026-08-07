import { SYSTEM_ID } from '../hooks-manager.mjs';

/**
 * Legacy flag that used to hold a container's contents as raw source data. Nothing reads it
 * for gameplay any more -- the worldVersion 184 migration converts it into real items and then
 * deliberately leaves it in place as a recoverable backup.
 */
export const DH_CONTAINER_ID = 'nested';

/** Flag on a contained item naming the id of the item it sits inside. */
export const DH_CONTAINED_BY = 'containerId';

/**
 * Containment model: a contained item is an ordinary sibling of its container, living in the
 * same collection and pointing at it with the containerId flag. It used to be raw data stashed
 * in a flag and rebuilt into fake documents whose parent was the containing Item, which meant
 * nothing that walks an actor's items -- ActiveEffects above all -- could ever see it.
 *
 * `this.items` keeps the same name and Collection shape it always had, so the rules layer and
 * every template that iterates it are unaffected by the change underneath.
 */
export class DarkHeresyItemContainer extends Item {
    /**
     * The collection a container's contents live in: the owning actor's items, or the world
     * items directory for a container that isn't on an actor.
     */
    get contentsCollection() {
        return this.parent?.items ?? game?.items ?? null;
    }

    /** Id of the item containing this one, or null when it is loose. */
    get containerId() {
        return this.getFlag(SYSTEM_ID, DH_CONTAINED_BY) ?? null;
    }

    /** True when this item is inside another. Inventory and encumbrance must skip these. */
    get isContained() {
        return !!this.containerId;
    }

    /** Inverse of isContained, so templates can filter without needing a "not" helper. */
    get isLoose() {
        return !this.containerId;
    }

    /** The item this one is inside, if any. */
    get containerItem() {
        const id = this.containerId;
        return id ? (this.contentsCollection?.get(id) ?? null) : null;
    }

    /* -------------------------------------------- */
    /*  Legacy backup flag -- read only by migration */
    /* -------------------------------------------- */

    getNested() {
        return this.getFlag(SYSTEM_ID, DH_CONTAINER_ID) ?? [];
    }

    hasNested() {
        return this.getNested().length > 0;
    }

    /* -------------------------------------------- */

    hasWeaponModification(mod) {
        return this.hasItemByType(mod, 'weaponModification');
    }

    hasItemByType(item, type) {
        if (!this.system.container) return false;
        return !!this.items.find((i) => i.name === item && i.type === type && (i.system.equipped || i.system.enabled));
    }

    getWeaponModification(mod) {
        return this.getItemByName(mod, 'weaponModification');
    }

    getItemByName(item, type) {
        if (!this.system.container) return;
        return this.items.find((i) => i.name === item && i.type === type);
    }

    /* -------------------------------------------- */
    /*  Contents management                         */
    /* -------------------------------------------- */

    /** Persist contents for an unowned container (world directory or compendium). */
    async setNested(data) {
        if (!Array.isArray(data)) data = [data];
        return this.setFlag(SYSTEM_ID, DH_CONTAINER_ID, data);
    }

    /**
     * Place items inside this one. Accepts documents or raw source data.
     *
     * On an actor the contents become real sibling documents, which is the whole point of the
     * containment model -- only then can their effects reach the character. An unowned
     * container has no character to affect, so its contents stay as inert data in the legacy
     * flag: creating real documents for them would flood the Items sidebar with hundreds of
     * loose weapon qualities for no benefit.
     */
    async createNestedDocuments(data) {
        if (!Array.isArray(data)) data = [data];
        if (!data.length) return [];

        const toCreate = data.map((itemData) => {
            const clone = itemData?.toObject ? itemData.toObject() : foundry.utils.deepClone(itemData);
            foundry.utils.setProperty(clone, `flags.${SYSTEM_ID}.${DH_CONTAINED_BY}`, this.id);
            return clone;
        });

        game.dh.log('ItemContainer: ' + this.name + ' createNestedDocuments', toCreate);

        if (!this.parent) {
            const stored = toCreate.map((c) => {
                const copy = foundry.utils.deepClone(c);
                copy._id ??= foundry.utils.randomID();
                return copy;
            });
            return this.setNested([...this.getNested(), ...stored]);
        }

        for (const c of toCreate) delete c._id;
        return this.parent.createEmbeddedDocuments('Item', toCreate);
    }

    /** Remove items from this container entirely. */
    async deleteNestedDocuments(ids = []) {
        if (!Array.isArray(ids)) ids = [ids];
        if (!ids.length) return [];

        if (!this.parent) {
            const remaining = this.getNested().filter((d) => !ids.includes(d._id));
            return this.setNested(remaining);
        }

        const present = ids.filter((id) => this.parent.items?.get(id));
        if (!present.length) return [];
        game.dh.log('ItemContainer: ' + this.name + ' deleteNestedDocuments', present);
        return this.parent.deleteEmbeddedDocuments('Item', present);
    }

    /**
     * Take items out of this container without deleting them -- they stay on the actor as
     * ordinary inventory. Only meaningful for an actor-owned container; an unowned one holds
     * its contents as data with nowhere to release them to.
     */
    async releaseNestedDocuments(ids = []) {
        if (!Array.isArray(ids)) ids = [ids];
        if (!this.parent) return [];
        const updates = ids
            .filter((id) => this.parent.items?.get(id))
            .map((id) => ({ _id: id, [`flags.${SYSTEM_ID}.-=${DH_CONTAINED_BY}`]: null }));
        if (!updates.length) return [];
        return this.parent.updateEmbeddedDocuments('Item', updates);
    }

    /**
     * Gather contents by their container flag rather than rebuilding them from stored data.
     * Guarded on system.container so this stays cheap for the great majority of items, which
     * hold nothing.
     */
    prepareEmbeddedDocuments() {
        super.prepareEmbeddedDocuments();
        this.items = new foundry.utils.Collection();
        if (!this.system?.container) return;

        // Owned by an actor: contents are real sibling documents, so effects on them are
        // reachable by everything that walks the actor's items.
        if (this.parent) {
            for (const item of this.parent.items) {
                if (item.id === this.id) continue;
                if (item.getFlag?.(SYSTEM_ID, DH_CONTAINED_BY) === this.id) this.items.set(item.id, item);
            }
            return;
        }

        // Unowned (world directory or compendium): contents remain inert flag data and are
        // rebuilt only so the sheet can show them. Nothing here can affect a character, and
        // making them real documents would litter the Items sidebar.
        for (const data of this.getNested()) {
            if (!data?._id) continue;
            this.items.set(data._id, new CONFIG.Item.documentClass(data, { parent: this }));
        }
    }
}
