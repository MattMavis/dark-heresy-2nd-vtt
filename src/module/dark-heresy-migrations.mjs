import { DarkHeresySettings } from './dark-heresy-settings.mjs';
import { SYSTEM_ID } from './hooks-manager.mjs';
import { DH_CONTAINED_BY, DH_CONTAINER_ID } from './documents/item-container.mjs';

export async function checkAndMigrateWorld() {
    const worldVersion = 185;

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
