/**
 * Item types whose effects only apply while the item is actually equipped. Foundry's own
 * `transfer` flag only means "this item is embedded on an actor", so without this gate a
 * suit of armour would keep granting its bonuses while stuffed in a backpack.
 */
const EQUIP_GATED_TYPES = ['armour', 'cybernetic', 'forceField', 'weapon', 'gear', 'tool'];

/**
 * Consumables and drugs carry their effects as templates for the Use action to copy onto the
 * actor. Merely owning a stimm must never apply it, so they are always suppressed in place.
 */
const USE_ONLY_TYPES = ['consumable', 'drug'];

/**
 * Note for anyone extending this: effects authored on a NESTED item (a weapon modification or
 * a loaded ammunition inside a weapon) can never reach the actor at all. Nested items live in
 * a flag-backed collection with the weapon as their parent, and Actor#allApplicableEffects
 * only walks the actor's own effects and its real embedded items. Those two types get their
 * bonuses from the name-switch tables in rules/weapon-modifiers.mjs and rules/ammo.mjs instead.
 */
export class DarkHeresyActiveEffect extends ActiveEffect {
    get isSuppressed() {
        // Preserve the core behaviour first: expired durations suppress themselves.
        if (super.isSuppressed) return true;

        const item = this.parent;
        // Effects created straight onto an actor (statuses, drug effects applied by Use) have
        // no owning item to gate against.
        if (!(item instanceof Item)) return false;

        if (USE_ONLY_TYPES.includes(item.type)) return true;
        // Talents, traits, mutations and the like have no equipped concept -- always on.
        if (!EQUIP_GATED_TYPES.includes(item.type)) return false;

        return !item.system.equipped;
    }
}
