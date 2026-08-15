import { DarkHeresySettings } from './dark-heresy-settings.mjs';
import { SYSTEM_ID } from './hooks-manager.mjs';
import { DH_CONTAINED_BY, DH_CONTAINER_ID } from './documents/item-container.mjs';


/**
 * The 63 icon paths every pack document shared before each item was given its own art. An item
 * still pointing at one of these has never had art chosen for it, so it is safe to re-point.
 * Anything else is a deliberate choice and is left untouched.
 */
const PLACEHOLDER_ICONS = new Set([
    'systems/dark-heresy-2nd/icons/items/pistols/pistols_09.png',
    'systems/dark-heresy-2nd/icons/psykana/beam-blue-1.jpg',
    'systems/dark-heresy-2nd/icons/talents/blue/b_18.png',
    'systems/dark-heresy-2nd/icons/talents/red/gr_08.png',
    'systems/dark-heresy-2nd/icons/talents/red/r_01.png',
    'systems/dark-heresy-2nd/icons/talents/blue/b_33.png',
    'systems/dark-heresy-2nd/icons/items/armor/armor_s09.png',
    'systems/dark-heresy-2nd/icons/items/ammo/ammo_13.png',
    'systems/dark-heresy-2nd/icons/talents/blue/b_35.png',
    'systems/dark-heresy-2nd/icons/items/ammo/ammo_06.PNG',
    'systems/dark-heresy-2nd/icons/talents/violet/p_04.png',
    'systems/dark-heresy-2nd/icons/talents/red/r_02.png',
    'systems/dark-heresy-2nd/icons/talents/green/g_13.PNG',
    'systems/dark-heresy-2nd/icons/talents/violet/p_01.png',
    'icons/svg/mystery-man.svg',
    'systems/dark-heresy-2nd/icons/talents/red/r_08.png',
    'systems/dark-heresy-2nd/icons/talents/blue/b_02.png',
    'systems/dark-heresy-2nd/icons/talents/blue/b_32.png',
    'systems/dark-heresy-2nd/icons/psykana/beam-acid-1.jpg',
    'systems/dark-heresy-2nd/icons/psykana/beam-acid-3.jpg',
    'systems/dark-heresy-2nd/icons/items/swords/swords_01_b.png',
    'systems/dark-heresy-2nd/icons/items/armor/helmet_s05.png',
    'systems/dark-heresy-2nd/icons/psykana/wind-grasp-magenta-1.jpg',
    'systems/dark-heresy-2nd/icons/items/armor/gloves_s08.png',
    'systems/dark-heresy-2nd/icons/talents/violet/p_29.PNG',
    'systems/dark-heresy-2nd/icons/talents/violet/p_21.PNG',
    'systems/dark-heresy-2nd/icons/items/flail/flail_03_t.PNG',
    'systems/dark-heresy-2nd/icons/items/grenade/grenade_04.png',
    'systems/dark-heresy-2nd/icons/psykana/evil-eye-eerie-2.jpg',
    'systems/dark-heresy-2nd/icons/items/pistols/pistols_18.png',
    'systems/dark-heresy-2nd/icons/talents/blue/b_21.png',
    'systems/dark-heresy-2nd/icons/psykana/evil-eye-eerie-3.jpg',
    'systems/dark-heresy-2nd/icons/talents/blue/b_07.png',
    'systems/dark-heresy-2nd/icons/psykana/evil-eye-red-1.jpg',
    'systems/dark-heresy-2nd/icons/psykana/haste-sky-3.jpg',
    'systems/dark-heresy-2nd/icons/items/armor/helmet_s10.png',
    'systems/dark-heresy-2nd/icons/psykana/evil-eye-eerie-1.jpg',
    'systems/dark-heresy-2nd/icons/talents/red/r_36.png',
    'systems/dark-heresy-2nd/icons/talents/red/r_29.png',
    'systems/dark-heresy-2nd/icons/psykana/haste-royal-2.jpg',
    'systems/dark-heresy-2nd/icons/items/pistols/pistols_13.png',
    'systems/dark-heresy-2nd/icons/items/spear/stave_04_b.png',
    'systems/dark-heresy-2nd/icons/talents/green/g_11.png',
    'systems/dark-heresy-2nd/icons/psykana/lighting-eerie-2.jpg',
    'systems/dark-heresy-2nd/icons/items/rifles/rifle_03.png',
    'systems/dark-heresy-2nd/icons/talents/red/r_27.png',
    'systems/dark-heresy-2nd/icons/psykana/horror-red-3.jpg',
    'systems/dark-heresy-2nd/icons/talents/violet/p_06.png',
    'systems/dark-heresy-2nd/icons/psykana/link-eerie-1.jpg',
    'systems/dark-heresy-2nd/icons/talents/blue/gr_10.PNG',
    'systems/dark-heresy-2nd/icons/psykana/protect-blue-2.jpg',
    'systems/dark-heresy-2nd/icons/items/swords/swords_06_b.PNG',
    'systems/dark-heresy-2nd/icons/items/maces/mace_09_b.png',
    'systems/dark-heresy-2nd/icons/talents/violet/p_19.PNG',
    'systems/dark-heresy-2nd/icons/items/rifles/rifle_06.png',
    'systems/dark-heresy-2nd/icons/psykana/heal-sky-3.jpg',
    'systems/dark-heresy-2nd/icons/psykana/evil-eye-red-3.jpg',
    'systems/dark-heresy-2nd/icons/talents/green/g_23.PNG',
    'systems/dark-heresy-2nd/icons/items/maces/mace_02_b.png',
    'systems/dark-heresy-2nd/icons/psykana/enchant-sky-2.jpg',
    'systems/dark-heresy-2nd/icons/psykana/lighting-eerie-3.jpg',
    'systems/dark-heresy-2nd/icons/talents/blue/b_19.PNG',
    'systems/dark-heresy-2nd/icons/psykana/lighting-acid-2.jpg',
]);

export async function checkAndMigrateWorld() {
    const worldVersion = 188;

    const currentVersion = game.settings.get(SYSTEM_ID, DarkHeresySettings.SETTINGS.worldVersion);
    if (worldVersion !== currentVersion && game.user.isGM) {
        ui.notifications.info('Upgrading the world, please wait...');

        // Update Actors
        for (let actor of game.actors.contents) {
            try {
                await migrateActorData(actor, currentVersion);
            } catch (e) {
                console.error(e);
            }
        }

        // Update Items
        for (let item of game.items.contents) {
            try {
                await migrateItemData(item, currentVersion);
            } catch (e) {
                console.error(e);
            }
        }

        // Update Compendium Permissions
        await updateCompendiumPermissions(currentVersion);

        // Ensure the shared Warband Subtlety tracker exists
        await ensureWarbandTracker(currentVersion);

        // Convert flag-stored container contents into real items
        await migrateContainment(currentVersion);

        // Remove contained items that an earlier build wrongly created in the world directory
        await cleanupStrayContainedWorldItems(currentVersion);

        // Rebuild XP spend history for characters who predate the ledger
        await migrateExperienceLedger(currentVersion);

        // ...and the award history on the other side of the account
        await migrateExperienceAwards(currentVersion);

        // Give existing items the new per-item artwork
        await migrateItemArtwork(currentVersion);

        // Display Release Notes
        await displayReleaseNotes(worldVersion);

        game.settings.set(SYSTEM_ID, DarkHeresySettings.SETTINGS.worldVersion, worldVersion);
        ui.notifications.info('Upgrade complete!');
    }

    async function updateCompendiumPermissions(currentVersion) {
        if (currentVersion < 181) {
            // Every compendium in our system should be owned by everyone and have full owner permissions.
            // Otherwise, issues will occur when trying to create items from the compendium.
            const compendiums = game.packs.filter((p) => p.metadata.packageName === SYSTEM_ID);

            // Print all Pack details
            game.packs.forEach((pack) => {
                console.log('Pack', pack);
            });

            for (let compendium of compendiums) {
                console.log(`Updating permissions for compendium ${compendium.metadata.id}`);

                await compendium.configure({
                    ownership: {
                        "PLAYER": "OWNER",
                        "TRUSTED": "OWNER",
                        "ASSISTANT": "OWNER",
                        "GAMEMASTER": "OWNER",
                    },
                });
            }
        }
    }

    async function ensureWarbandTracker(currentVersion) {
        if (currentVersion < 182) {
            // Every table needs exactly one shared, GM-owned Subtlety tracker for the
            // Requisition Menu to read/write. Auto-create it, pre-permissioned, so a GM
            // can't forget the ownership step and silently break player writes.
            const existing = game.actors.find((a) => a.getFlag(SYSTEM_ID, 'isWarbandTracker'));
            if (!existing) {
                console.log('Creating Warband Tracker actor');
                await Actor.create({
                    name: 'Warband Tracker',
                    type: 'warband',
                    flags: { [SYSTEM_ID]: { isWarbandTracker: true } },
                    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
                });
            }
        }
    }

    /**
     * Containment used to be raw source data inside the container's own `nested` flag, which
     * meant contained items were invisible to anything walking an actor's items. Convert each
     * one into a real sibling item pointing back at its container.
     *
     * The legacy flag is deliberately NOT cleared: it costs a little dead data and leaves the
     * original contents recoverable if this mis-handles an edge case in a world we have never
     * seen. A later version can drop it.
     *
     * Idempotent -- a container that already has real contents is skipped -- so it is safe to
     * re-run against a world that was partially converted.
     */
    async function migrateContainment(currentVersion) {
        if (currentVersion >= 184) return;

        let containers = 0;
        let contents = 0;
        let failures = 0;

        const convert = async (collection, create, label) => {
            for (const container of [...collection]) {
                const nested = container.getFlag?.(SYSTEM_ID, DH_CONTAINER_ID) ?? [];
                if (!nested.length) continue;

                // Already converted? Leave it alone.
                const existing = [...collection].filter(
                    (i) => i.getFlag?.(SYSTEM_ID, DH_CONTAINED_BY) === container.id,
                );
                if (existing.length) continue;

                const toCreate = nested.map((data) => {
                    const clone = foundry.utils.deepClone(data);
                    foundry.utils.setProperty(clone, `flags.${SYSTEM_ID}.${DH_CONTAINED_BY}`, container.id);
                    return clone;
                });

                try {
                    // keepId so anything already referencing a contained item still resolves.
                    await create(toCreate);
                    containers += 1;
                    contents += toCreate.length;
                } catch (err) {
                    failures += 1;
                    console.error(`Containment migration failed for ${label} / ${container.name}`, err);
                }
            }
        };

        for (const actor of game.actors.contents) {
            await convert(actor.items, (data) => actor.createEmbeddedDocuments('Item', data, { keepId: true }), `Actor:${actor.name}`);
        }

        // Deliberately NOT the world Items directory. An unowned container has no character
        // for its contents' effects to reach, so converting them buys nothing and would put
        // every weapon quality in the sidebar as a loose item. Unowned containers keep their
        // contents as flag data, and it is expanded when the item is placed on an actor.

        // Unlinked tokens carry their own item data, which game.actors never sees.
        for (const scene of game.scenes.contents) {
            for (const token of scene.tokens.contents) {
                if (token.actorLink || !token.actor) continue;
                const a = token.actor;
                await convert(a.items, (data) => a.createEmbeddedDocuments('Item', data, { keepId: true }), `Token:${scene.name}/${token.name}`);
            }
        }

        console.log(`Containment migration: ${contents} items across ${containers} containers, ${failures} failures`);
        if (failures) {
            ui.notifications.warn(`${failures} container(s) could not be converted -- see the console. Original data is retained.`);
        }
    }

    /**
     * An earlier build of the containment migration also converted the world Items directory,
     * which dumped every weapon quality into the sidebar as a loose item for no benefit. Those
     * strays are identifiable by carrying a container reference while living in the world
     * directory, and their originals are still intact in each container's legacy flag, so
     * removing them restores exactly the previous state.
     */
    async function cleanupStrayContainedWorldItems(currentVersion) {
        if (currentVersion >= 185) return;
        const strays = game.items.filter((i) => !!i.getFlag?.(SYSTEM_ID, DH_CONTAINED_BY));
        if (!strays.length) return;
        console.log(`Removing ${strays.length} contained items wrongly created in the world directory`);
        await Item.deleteDocuments(strays.map((i) => i.id));
    }

    /**
     * Give characters who predate the ledger a single opening entry for what they had already
     * spent, so their history starts from today rather than being invented.
     *
     * Spend history cannot be reconstructed by pricing what a character owns: home world,
     * background and role give a great deal away free at creation, and nothing on the sheet
     * distinguishes a granted advance from a bought one, so pricing the sheet measures chargen
     * rather than spending. The opening entry therefore records only the number the character
     * actually has, and real history accumulates from the next purchase onwards. Available XP
     * cannot move: the entry equals `used`, which `_computeExperience` derives back from the
     * ledger.
     *
     * Only `acolyte` actors are considered. NPCs are a separate type, statted directly rather
     * than bought with experience, and record no XP at all.
     *
     * Awards are seeded by a SEPARATE migration step gated at 187, not here. Worlds that
     * upgraded on an intermediate build are already stamped 186, so the awards seeding needs its
     * own 187 gate or they will never run it.
     */
    async function migrateExperienceLedger(currentVersion) {
        if (currentVersion >= 186) return;

        const report = [];
        for (const actor of game.actors.contents) {
            if (actor.type !== 'acolyte') continue;

            const xp = actor.system?.experience ?? {};
            if (Array.isArray(xp.ledger) && xp.ledger.length) continue; // already has one
            const used = Number(xp.used) || 0;
            if (!used) continue; // nothing spent yet: let the ledger start empty

            await actor.update({
                'system.experience.ledger': [
                    {
                        id: foundry.utils.randomID(),
                        kind: 'adjustment',
                        source: 'legacy',
                        cost: used,
                        at: Date.now(),
                        label: 'Experience spent before spending was recorded as a history',
                    },
                ],
            });
            report.push({ actor: actor.name, used });
        }

        if (report.length) {
            console.log('XP ledger opening balances:');
            for (const r of report) console.log(`  ${r.actor}: ${r.used} xp spent`);
        }
    }

    /**
     * Give characters an opening award equal to whatever total they already had.
     *
     * The mirror of the ledger seeding above: there is no record of which grants were awarded on
     * which date, only what the character has now, so one opening entry carries it and real
     * history accrues from the next award. Available XP cannot move: the entry equals `total`,
     * which `_computeExperience` derives back from the awards.
     *
     * Gated at 187 deliberately -- see the note on the ledger migration above.
     */
    async function migrateExperienceAwards(currentVersion) {
        if (currentVersion >= 187) return;

        const report = [];
        for (const actor of game.actors.contents) {
            if (actor.type !== 'acolyte') continue;

            const xp = actor.system?.experience ?? {};
            if (Array.isArray(xp.awards) && xp.awards.length) continue; // already has one
            const total = Number(xp.total) || 0;
            if (!total) continue; // never awarded anything: let the history start empty

            await actor.update({
                'system.experience.awards': [
                    {
                        id: foundry.utils.randomID(),
                        amount: total,
                        reason: 'Experience awarded before awards were recorded as a history',
                        at: Date.now(),
                        by: 'System',
                    },
                ],
            });
            report.push({ actor: actor.name, total });
        }

        if (report.length) {
            console.log('XP award opening balances:');
            for (const r of report) console.log(`  ${r.actor}: ${r.total} xp total`);
        }
    }

    /**
     * Re-point items at the artwork their compendium entry now carries.
     *
     * Matches by name and type against the system's own compendiums, and only overwrites an `img`
     * that is one of {@link PLACEHOLDER_ICONS}. Items a GM gave their own art, and homebrew with no
     * compendium entry, are both left exactly as they are.
     */
    async function migrateItemArtwork(currentVersion) {
        if (currentVersion >= 188) return;

        // name+type -> img, built once from every Item compendium this system ships.
        const art = new Map();
        for (const pack of game.packs.filter((p) => p.metadata.packageName === SYSTEM_ID && p.metadata.type === 'Item')) {
            try {
                const index = await pack.getIndex({ fields: ['type', 'name', 'img'] });
                for (const entry of index) {
                    if (entry.img) art.set(`${entry.type}::${entry.name.toLowerCase().trim()}`, entry.img);
                }
            } catch (e) {
                console.warn(`Dark Heresy | could not index ${pack.collection} for artwork: ${e.message}`);
            }
        }
        if (!art.size) return;

        const repoint = (item) => {
            if (!PLACEHOLDER_ICONS.has(item.img)) return null;
            const img = art.get(`${item.type}::${item.name.toLowerCase().trim()}`);
            return img && img !== item.img ? { _id: item.id, img } : null;
        };

        let count = 0;
        for (const actor of game.actors.contents) {
            const updates = actor.items.contents.map(repoint).filter(Boolean);
            if (!updates.length) continue;
            try {
                await actor.updateEmbeddedDocuments('Item', updates);
                count += updates.length;
            } catch (e) {
                console.error(`Dark Heresy | artwork migration failed for ${actor.name}: ${e.message}`);
            }
        }

        const worldUpdates = game.items.contents.map(repoint).filter(Boolean);
        if (worldUpdates.length) {
            try {
                await Item.updateDocuments(worldUpdates);
                count += worldUpdates.length;
            } catch (e) {
                console.error(`Dark Heresy | artwork migration failed for world items: ${e.message}`);
            }
        }

        if (count) console.log(`Dark Heresy | gave ${count} item(s) their new artwork`);
    }

    async function migrateItemData(item, currentVersion) {
        if (currentVersion < 180) {
            // Get itemcollection.contentsData flag
            const itemCollection = item.flags['itemcollection'];
            if (itemCollection && itemCollection.contentsData) {
                await item.createNestedDocuments(itemCollection.contentsData);
            }
        }
    }

    async function migrateActorData(actor, currentVersion) {
        if (currentVersion < 1) {
            // Update Storage Locations to Hold Consumables
            for (const location of actor.items.filter((i) => i.isStorageLocation)) {
                await location.update({
                    system: {
                        containerTypes: [
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
                        ],
                    },
                });
            }
        }

        if (currentVersion < 180) {
            // Update User Items to be Nested
            for (const item of actor.items) {
                // Get itemcollection.contentsData flag
                const itemCollection = item.flags['itemcollection'];
                if (itemCollection && itemCollection.contentsData) {
                    await item.createNestedDocuments(itemCollection.contentsData);
                }
            }
        }
    }

    async function displayReleaseNotes(version) {
        switch (version) {
            case 157:
                await releaseNotes({
                    version: '1.5.7',
                    notes: [
                        'Fixed duplication bug when dropping the same item on an actor.',
                        'Added missing plentiful availability.',
                        'Added Drugs and Consumables compendium with information from the core book.',
                        'Added support for creating new specialist skills.',
                    ],
                });
                break;
            case 161:
                await releaseNotes({
                    version: '1.6.1',
                    notes: [
                        'Added Game Settings -> Configure Settings -> Options to enable simple attack and psychic rolls if preferred.',
                        'Added support for Knockdown, Feint, Suppressing Fire, and Stun attack actions.',
                        'Added Fluid Action, Forearm Weapon Mounting, Pistol Grip, Compact, Modified-Stock, and Motion Predictor automation.',
                        'Added active effect support for weapons and armour.',
                        'Added Eye of Vengeance support for attacks.',
                        'Added target size to automated modifiers for attacks.',
                    ],
                });
                break;
            case 180:
                await releaseNotes({
                    version: '1.8.0',
                    notes: [
                        'Added Foundry 12 support. Nested items (like ammunition or weapon specials on items) were drastically changed. I have done my best to migrate the data, but please check your items and actors for any issues.',
                        'Added True Grit talent support when assigning critical damage.',
                    ],
                });
                break;
            case 181:
                await releaseNotes({
                    version: '1.8.1',
                    notes: [
                        'Updated compendium permissions to fix permissions issues for players without ownership permissions.',
                        'Fixed issue with nested items not working: weapon specials and ammunition should now work correctly.',
                    ],
                });
                break;
            case 182:
                await releaseNotes({
                    version: '1.8.2',
                    notes: [
                        'Added the Requisition Menu: browse available gear, roll a Requisition test automatically, and receive items on success.',
                        'Added a shared Warband Tracker actor for the party\'s Subtlety value, spent automatically by Requisition tests for scarce items.',
                    ],
                });
                break;
            case 183:
                await releaseNotes({
                    version: '1.8.3',
                    notes: [
                        'Items can now carry Active Effects that really change your character. Equip a Medi-kit and your Medicae goes up; take it off and it goes back down.',
                        'IMPORTANT: effects on weapons, armour, cybernetics, force fields, gear and tools now only apply while the item is Equipped. If you hand-authored effects on a weapon or armour before this update, tick Equipped to keep them working.',
                        'Consumables and drugs now have a quantity and a Use button on the Gear tab. Using one rolls its duration, applies its effects for that long, and spends a dose.',
                        'All physical items now have a Quantity. Carry weight counts the whole stack, and requisitioning something you already own adds to that stack instead of making a second row.',
                        'Fixed carry weight ignoring anything loaded inside a weapon -- ammunition and modifications now count toward encumbrance, so some characters will weigh slightly more than before.',
                    ],
                });
                break;
            case 185:
                await releaseNotes({
                    version: '1.8.4',
                    notes: [
                        'On a character, ammunition, weapon modifications and weapon qualities are now real items rather than data hidden inside the weapon. They behave the same on your sheet, but they can now carry Active Effects that actually reach your character.',
                        'You can take a modification back off a weapon again: use the eject button on the weapon sheet, or drag it onto your character sheet. Previously the only way out was to delete it.',
                        'Dragging something out of a weapon no longer destroys it if you change your mind mid-drag, and moving a modification between two weapons keeps the same item rather than making a copy.',
                        'Deleting a weapon still removes whatever was loaded or installed in it, and now tells you what is going first.',
                        'Weapons in the Items sidebar are unchanged and keep their qualities as before -- they are only expanded into real items once the weapon is on a character.',
                        'Your characters were converted automatically. The old data is kept as a hidden backup for now, so nothing is lost if anything looks wrong -- please report it rather than re-adding things by hand.',
                    ],
                });
                break;
            case 186:
                await releaseNotes({
                    version: '1.8.5',
                    notes: [
                        'Experience spending is now tracked as a history rather than a single number you edit by hand, so the sheet can no longer drift out of step with what you have actually bought.',
                        'Whatever your characters had already spent is carried over as a single opening entry, and history builds up from your next purchase. Available XP is unchanged. Earlier spending is not itemised, because a character is given so much for free at creation that there is no way to tell a granted advance from a bought one after the fact.',
                        'Only player characters were touched. NPCs are statted directly rather than bought with experience, so they were left alone.',
                    ],
                });
                break;
            // The only notes a 1.8.5 upgrade shows: displayReleaseNotes is called once with the
            // target worldVersion, not once per version in between, so this case has to cover
            // everything in the release rather than only what the 187 migration step does.
            case 187:
                await releaseNotes({
                    version: '1.8.5',
                    notes: [
                        'Experience is now tracked as a history on both sides of the account rather than two numbers you edit by hand, so the sheet cannot drift out of step with what you have actually been given or bought.',
                        'The GM can now award experience to a single character or to the whole party at once, with a reason recorded, from a new Award Experience button on the Experience panel.',
                        'Players can spend experience from a new Spend Experience button, which prices every advance against the character\'s own aptitudes and will not let them skip a rank.',
                        'New Character Creation button on the Bio tab walks you through building an acolyte: home world, background, role, characteristics, aptitudes, starting experience and divination. It writes nothing to your character until you press Confirm on the last step, so you can back out at any point or change an earlier answer.',
                        'Character creation grants what your choices entitle you to -- aptitudes, skills, talents, traits and starting equipment -- rather than leaving you to add each one by hand. Anything it cannot find in the compendiums is listed on the summary step for you to add yourself instead of being dropped silently.',
                        'Talent prerequisites are now read from the talent and checked against your character, so the buy list shows what you qualify for at a glance. A prerequisite the system cannot make sense of never blocks a purchase, and the GM can override the check entirely with a tickbox.',
                        'Whatever your characters had already earned and spent is carried over as one opening award and one opening spend entry. Available XP is unchanged for everyone; earlier history is not itemised, because a character is given so much for free at creation that there is no way to tell a granted advance from a bought one after the fact.',
                        'Only player characters were touched. NPCs are statted directly rather than bought with experience, so they were left alone.',
                    ],
                });
                break;
            case 188:
                await releaseNotes({
                    version: '1.8.6',
                    notes: [
                        'Every item in the compendiums now has its own artwork. Previously 842 items shared 62 pictures between them, so all 178 weapons looked like the same pistol and every psychic power like the same blue beam.',
                        'Items already on your characters have been given the new art too, but only where they were still using one of the old shared placeholders. Anything you picked art for yourself has been left exactly as it was.',
                        'Added the five mechadendrite patterns (utility, manipulator, medicae, optical and ballistic) as their own items rather than one generic entry, along with Lho-Stubs and a Dark Soul trait.',
                    ],
                });
                break;
            default:
                break;
        }
    }

    async function releaseNotes(data) {
        const html = await foundry.applications.handlebars.renderTemplate('systems/dark-heresy-2nd/templates/prompt/release-notes-prompt.hbs', data);
        let dialog = new Dialog(
            {
                title: 'Release Notes',
                content: html,
                buttons: {
                    ok: {
                        icon: "<i class='dh-material'>close</i>",
                        label: 'Ok',
                        callback: () => {},
                    },
                },
                default: 'ok',
                close: () => {},
            },
            {
                width: 300,
            },
        );
        dialog.render(true);
    }
}
