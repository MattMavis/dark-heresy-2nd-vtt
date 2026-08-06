import { SYSTEM_ID } from '../hooks-manager.mjs';
import { DarkHeresy } from './config.mjs';

// Core Rulebook p.140, Table 5-1: Availability Modifiers.
// Ubiquitous is RAW "Automatic" (no test needed) -- modelled here as a flat 0 rather
// than a special-cased auto-grant path, so a Ubiquitous item selected alongside
// others in a combined test neither helps nor hurts the roll, and still needs the
// group's combined test to succeed like everything else selected with it.
export const AVAILABILITY_MODIFIERS = {
    Ubiquitous: 0,
    Abundant: 30,
    Plentiful: 20,
    Common: 10,
    Average: 0,
    // Core Rulebook inconsistency: Table 5-1 lists Scarce as -10, but the book's own
    // worked-example prose (p.141) says "the Scarce (-20) availability modifier."
    // Defaulting to the TABLE value since tables are normally the authoritative
    // reference -- change ONLY this line if a future ruling favors the prose instead.
    Scarce: -10,
    Rare: -20,
    'Very Rare': -30,
    'Extremely Rare': -40,
    'Near Unique': -50,
    Unique: -60,
};

// Core Rulebook p.141, Table 5-2: Craftsmanship, Requisition, and Repair.
export const CRAFTSMANSHIP_MODIFIERS = {
    Poor: 10,
    Common: 0,
    Good: -20,
    Best: -30,
};

// The 11 Item types composing the shared `physicalItem` template (template.json),
// i.e. the types that carry an `availability` field and are requisitionable at all.
export const PHYSICAL_ITEM_TYPES = [
    'ammunition',
    'armour',
    'armourModification',
    'cybernetic',
    'consumable',
    'drug',
    'forceField',
    'gear',
    'tool',
    'weapon',
    'weaponModification',
];

/**
 * `template.json`'s `physicalItem` template defaults `availability`/`craftsmanship`
 * to lowercase `"common"`, but every pack entry that sets them explicitly does so
 * capitalized ("Common", "Poor", ...) -- items relying on the schema default would
 * otherwise silently fail a case-sensitive lookup. Matches case-insensitively
 * against the canonical list and returns the canonical (correctly-cased) form.
 */
function normalizeTier(value, canonicalValues, fallback) {
    const match = canonicalValues.find((v) => v.toLowerCase() === String(value ?? '').toLowerCase());
    return match ?? fallback;
}

/**
 * The Requisition modifier a single candidate item contributes: its own
 * Availability modifier plus its own Craftsmanship modifier.
 */
export function requisitionItemModifier(availability, craftsmanship) {
    const availabilityMod = AVAILABILITY_MODIFIERS[availability] ?? AVAILABILITY_MODIFIERS.Average;
    const craftsmanshipMod = CRAFTSMANSHIP_MODIFIERS[craftsmanship] ?? CRAFTSMANSHIP_MODIFIERS.Common;
    return availabilityMod + craftsmanshipMod;
}

/**
 * Build the list of requisitionable items across every physical-item compendium
 * pack in this system, filtered to at most `maxAvailability` (inclusive), using
 * `CONFIG.dh.items.availability`'s ordinal order (config.mjs) as the tier ranking.
 * Uses `getIndex` rather than fetching full Documents -- cheap even across the
 * hundreds of candidate rows this can produce.
 */
export async function buildRequisitionCandidates(maxAvailability) {
    const tiers = DarkHeresy.items.availability;
    const maxIndex = tiers.indexOf(maxAvailability);
    const candidates = [];

    const packs = game.packs.filter((p) => p.metadata.packageName === SYSTEM_ID && p.metadata.type === 'Item');
    for (const pack of packs) {
        const index = await pack.getIndex({
            fields: ['name', 'img', 'type', 'system.availability', 'system.craftsmanship'],
        });
        for (const entry of index) {
            if (!PHYSICAL_ITEM_TYPES.includes(entry.type)) continue;

            const availability = normalizeTier(entry.system?.availability, tiers, 'Common');
            const tierIndex = tiers.indexOf(availability);
            if (tierIndex < 0 || tierIndex > maxIndex) continue;

            const craftsmanship = normalizeTier(entry.system?.craftsmanship, Object.keys(CRAFTSMANSHIP_MODIFIERS), 'Common');
            candidates.push({
                pack: pack.metadata.id,
                itemId: entry._id,
                name: entry.name,
                img: entry.img,
                type: entry.type,
                availability,
                craftsmanship,
                modifier: requisitionItemModifier(availability, craftsmanship),
            });
        }
    }
    return candidates;
}

/**
 * The single shared, GM-owned Warband Tracker actor -- created once by the
 * `ensureWarbandTracker` migration step (dark-heresy-migrations.mjs). "First
 * flagged match wins"; not hard-uniqueness-enforced.
 */
export function getWarbandTracker() {
    return game.actors.find((a) => a.getFlag(SYSTEM_ID, 'isWarbandTracker'));
}

/** Flag recording which compendium entry a granted item came from, so repeat grants can stack. */
export const REQUISITION_SOURCE_FLAG = 'requisitionSourceId';

/**
 * Grant `quantity` of a compendium item onto `actor`. Fetches the full
 * compendium Document (not the index entry) so nested ammo/attack-special flags
 * (DarkHeresyItemContainer) travel with it via `.toObject()`; weapons already carry
 * a full clip baked into their pack data, so a granted weapon is ready to use.
 * No RAW DoS-based bonus-quantity granting -- exactly `quantity`, no more.
 *
 * Requisitioning something the actor already has bumps that stack's quantity rather than
 * adding a second row. Matching is by source-compendium id, not by name: two items can share
 * a name but differ in craftsmanship, and merging those would silently upgrade or downgrade
 * one of them.
 */
export async function grantRequisitionedItem(actor, packId, itemId, quantity = 1) {
    const pack = game.packs.get(packId);
    if (!pack) {
        game.dh.error(`grantRequisitionedItem: pack ${packId} not found`);
        return [];
    }
    const doc = await pack.getDocument(itemId);
    if (!doc) {
        game.dh.error(`grantRequisitionedItem: item ${itemId} not found in ${packId}`);
        return [];
    }

    const count = Math.max(1, quantity);
    const sourceKey = `${packId}.${itemId}`;

    const existing = actor.items.find((i) => i.getFlag(SYSTEM_ID, REQUISITION_SOURCE_FLAG) === sourceKey);
    if (existing) {
        await existing.update({ 'system.quantity': existing.quantity + count });
        return [existing];
    }

    const itemData = doc.toObject();
    delete itemData._id;
    itemData.system = itemData.system ?? {};
    itemData.system.quantity = count;
    foundry.utils.setProperty(itemData, `flags.${SYSTEM_ID}.${REQUISITION_SOURCE_FLAG}`, sourceKey);
    return actor.createEmbeddedDocuments('Item', [itemData]);
}
