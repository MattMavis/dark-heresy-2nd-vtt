/**
 * Reading from, and granting out of, this system's item compendia.
 *
 * Three places used to do this each in their own way -- the requisition roll, the advancement
 * window's talent purchase, and the character creation wizard -- sharing the same four lines of
 * "fetch the Document, strip its `_id`, adjust a field or two, create it on the actor" and
 * diverging in ways that were real but undocumented. They now differ only in the arguments they
 * pass here.
 *
 * The one difference that genuinely matters is whether a repeat grant stacks. Requisitioning a
 * second lasgun should bump the first stack's quantity; being granted Weapon Training twice at
 * character creation must produce two items, because the two carry different specialisations.
 * That is `mergeBySourceFlag`, and it is off unless a caller asks for it.
 */
import { SYSTEM_ID } from '../hooks-manager.mjs';

/** Every Item compendium this system ships. */
export function systemItemPacks() {
    return game.packs.filter((p) => p.metadata.packageName === SYSTEM_ID && p.metadata.type === 'Item');
}

/**
 * Walk the index of every system item pack, calling `onEntry(entry, pack)` for each row.
 *
 * A pack that cannot be indexed is logged and skipped rather than allowed to throw: one damaged
 * or unreadable pack should cost the player the items in that pack, not the entire list. (The
 * requisition candidate build previously had no such guard and would have failed outright.)
 */
export async function scanItemPackIndexes(fields, onEntry) {
    for (const pack of systemItemPacks()) {
        let entries;
        try {
            entries = await pack.getIndex({ fields });
        } catch (err) {
            game.dh.error(`compendium scan: failed to index pack ${pack.metadata.id} -- skipping it`, err);
            continue;
        }
        for (const entry of entries) onEntry(entry, pack);
    }
}

/** Flag recording which compendium entry a granted item came from, so repeat grants can stack. */
export const REQUISITION_SOURCE_FLAG = 'requisitionSourceId';

/**
 * The `foundry.utils.setProperty` path for the flag above, for building override maps.
 *
 * A function rather than a const because `hooks-manager.mjs` is part of an import cycle with this
 * module's callers: reading `SYSTEM_ID` while this file is still evaluating hits its temporal
 * dead zone and throws. Read at call time it is always initialised.
 */
export function sourceFlagPath() {
    return `flags.${SYSTEM_ID}.${REQUISITION_SOURCE_FLAG}`;
}

/** `${packId}.${itemId}` -- what {@link SOURCE_FLAG_PATH} holds, and what merging matches on. */
export function grantSourceKey(packId, itemId) {
    return `${packId}.${itemId}`;
}

/**
 * A compendium item's full data, ready for `createEmbeddedDocuments`, or null if it cannot be
 * found. Fetches the whole Document rather than the index entry so nested ammo and attack-special
 * flags (DarkHeresyItemContainer) travel with it via `.toObject()`; a granted weapon arrives with
 * the full clip its pack data bakes in.
 *
 * `overrides` maps property paths to values -- `{ 'system.quantity': 2 }`. A null or undefined
 * value is skipped rather than written, so a caller can pass an optional field through unguarded.
 */
export async function fetchGrantData(packId, itemId, overrides = {}) {
    const pack = game.packs.get(packId);
    if (!pack) {
        game.dh.error(`fetchGrantData: pack ${packId} not found`);
        return null;
    }
    const doc = await pack.getDocument(itemId);
    if (!doc) {
        game.dh.error(`fetchGrantData: item ${itemId} not found in ${packId}`);
        return null;
    }
    const data = doc.toObject();
    delete data._id;
    for (const [path, value] of Object.entries(overrides)) {
        if (value !== null && value !== undefined) foundry.utils.setProperty(data, path, value);
    }
    return data;
}

/**
 * Create prepared item data on `actor`, in one batch. Nulls are dropped, so an array of
 * {@link fetchGrantData} results can be passed straight in.
 *
 * With `mergeBySourceFlag`, anything the actor already holds from the same compendium entry has
 * its quantity increased instead of a second row being added. Matching is by source id and not by
 * name, because two items can share a name and differ in craftsmanship, and merging those would
 * silently upgrade or downgrade one of them. Only pass it for types that actually have a
 * `system.quantity` -- a talent does not, and merging one would add `undefined` to a count.
 */
export async function grantItems(actor, itemData, { mergeBySourceFlag = false } = {}) {
    const prepared = (Array.isArray(itemData) ? itemData : [itemData]).filter(Boolean);
    if (!prepared.length) return [];
    if (!mergeBySourceFlag) return actor.createEmbeddedDocuments('Item', prepared);

    const granted = [];
    const toCreate = [];
    for (const data of prepared) {
        const sourceKey = foundry.utils.getProperty(data, sourceFlagPath());
        const existing = sourceKey
            ? actor.items.find((i) => i.getFlag(SYSTEM_ID, REQUISITION_SOURCE_FLAG) === sourceKey)
            : null;
        if (!existing) {
            toCreate.push(data);
            continue;
        }
        const added = Number(foundry.utils.getProperty(data, 'system.quantity')) || 1;
        await existing.update({ 'system.quantity': existing.quantity + added });
        granted.push(existing);
    }
    if (toCreate.length) granted.push(...(await actor.createEmbeddedDocuments('Item', toCreate)));
    return granted;
}

/**
 * Every tier 1-3 talent in the talents pack, priced-ready for the spend window and the creation
 * wizard. Tier 1-3 because Table 2-6 has no column for anything else, so pricing one would mean
 * guessing rather than reading it off the book.
 *
 * `excludeNames` drops talents by name: the spend window passes the ones the actor already owns
 * (a talent granted free at chargen has no source flag to match on, so name is the only ownership
 * test that works). The wizard passes nothing here and filters its own planned talents at render
 * time, because that set changes with every click.
 */
export async function loadTalentCandidates({ excludeNames = new Set() } = {}) {
    const pack = game.packs.get(`${SYSTEM_ID}.talents`);
    if (!pack) {
        game.dh.error('loadTalentCandidates: talents pack not found');
        return [];
    }
    let index;
    try {
        index = await pack.getIndex({ fields: ['name', 'img', 'system.tier', 'system.aptitudes', 'system.prerequisites'] });
    } catch (err) {
        game.dh.error('loadTalentCandidates: failed to index the talents pack', err);
        return [];
    }

    const candidates = [];
    for (const entry of index) {
        if (excludeNames.has(entry.name)) continue;
        const tier = Number(entry.system?.tier);
        if (!Number.isInteger(tier) || tier < 1 || tier > 3) continue;
        candidates.push({
            pack: pack.metadata.id,
            itemId: entry._id,
            name: entry.name,
            img: entry.img,
            tier,
            aptitudes: entry.system?.aptitudes ?? '',
            prerequisites: entry.system?.prerequisites ?? '',
        });
    }
    return candidates;
}

/**
 * Every psychic power in the psychic-powers pack, priced-ready for the spend window. Unlike
 * {@link loadTalentCandidates} there is no tier filter -- powers have no tier -- and the price is
 * read straight off the power's own `system.cost` rather than looked up in an aptitude table (see
 * `advancement.mjs`'s `psychicPowerRow`).
 *
 * Note the field name: the pack stores the prerequisite text under `system.prerequisite`
 * (singular), not `system.prerequisites` like a talent -- see the fix to
 * item-psychic-power-sheet.hbs, which read the wrong (plural) field and rendered blank.
 *
 * `excludeNames` drops powers by name, the same "a granted power has no source flag to match
 * against" reasoning {@link loadTalentCandidates} documents for talents.
 */
export async function loadPsychicPowerCandidates({ excludeNames = new Set() } = {}) {
    const pack = game.packs.get(`${SYSTEM_ID}.psychic-powers`);
    if (!pack) {
        game.dh.error('loadPsychicPowerCandidates: psychic-powers pack not found');
        return [];
    }
    let index;
    try {
        index = await pack.getIndex({ fields: ['name', 'img', 'system.cost', 'system.discipline', 'system.prerequisite'] });
    } catch (err) {
        game.dh.error('loadPsychicPowerCandidates: failed to index the psychic-powers pack', err);
        return [];
    }

    const candidates = [];
    for (const entry of index) {
        if (excludeNames.has(entry.name)) continue;
        candidates.push({
            pack: pack.metadata.id,
            itemId: entry._id,
            name: entry.name,
            img: entry.img,
            cost: Number(entry.system?.cost) || 0,
            discipline: entry.system?.discipline ?? '',
            prerequisite: entry.system?.prerequisite ?? '',
        });
    }
    return candidates;
}

/**
 * Every talent and psychic-power NAME this system ships, as raw strings. Feeds the prerequisite
 * parser's `knownAdvanceNames` set (see rules/talent-prerequisites.mjs) so a bare-name prerequisite
 * clause naming an advance the character doesn't own is a definite block only when the advance is
 * real -- an unrecognised name is advisory instead of a hard refusal. Returns whatever it can read;
 * a missing pack costs coverage, not a throw, matching the other loaders here.
 */
export async function loadAdvanceNames() {
    const names = [];
    for (const collection of [`${SYSTEM_ID}.talents`, `${SYSTEM_ID}.psychic-powers`]) {
        const pack = game.packs.get(collection);
        if (!pack) continue;
        try {
            for (const entry of await pack.getIndex({ fields: ['name'] })) names.push(entry.name);
        } catch (err) {
            game.dh.error(`loadAdvanceNames: failed to index ${collection}`, err);
        }
    }
    return names;
}
