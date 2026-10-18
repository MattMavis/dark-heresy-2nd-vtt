import { handleBleeding, handleOnFire } from '../rules/active-effects.mjs';
import { reloadWeapon } from '../rules/ammo.mjs';

export class CombatActionManager {
    combatTurnHook;
    combatRoundHook;

    initializeHooks() {
        // Initialize Combat Hooks
        this.combatTurnHook = Hooks.on('combatTurn', async (combat, data) => await this.updateCombat(combat, data));
        this.combatRoundHook = Hooks.on('combatRound', async (combat, data) => await this.updateCombat(combat, data));
    }

    disableHooks() {
        game.dh.log('Disabling Hooks', {'cth': this.combatTurnHook, 'crh': this.combatRoundHook})
        Hooks.off('combatTurn', this.combatTurnHook);
        Hooks.off('combatRound', this.combatRoundHook);
    }

    async updateCombat(combat, data) {
        console.log(combat);
        console.log(data);
        // Only Run on the first GM -- so it will only run once
        if(game.userId === this.getFirstGM()) {
            game.dh.log('updateCombat - this should only be running on first GM');
            this.processCombatActiveEffects(combat, data);
            this.processReloads(combat, data);
        }
    }

    async processCombatActiveEffects(combat, data) {
        const currentCombatant = combat.turns[data.turn];
        game.dh.log('processCombatActiveEffects', currentCombatant);

        if (currentCombatant) {
            // Handle Actor Effects
            if(currentCombatant.actor && currentCombatant.actor.effects) {
                for(const effect of currentCombatant.actor.effects.contents) {
                    // On Fire!
                    if(effect.name === 'Burning') {
                        await handleOnFire(currentCombatant.actor);
                    } else if (effect.name === 'Bleeding') {
                        await handleBleeding(currentCombatant.actor);
                    }
                }
            }
        }
    }

    /**
     * Advance any multi-action reload belonging to the combatant whose turn just started.
     *
     * A Full Action is effectively one turn, so a weapon listed as "2 Full Actions" finishes at
     * the start of the reloader's NEXT turn rather than needing the button pressed again. Half
     * and Free Actions complete immediately on the click and never reach here -- they fit inside
     * a turn the character is taking anyway.
     *
     * Progress advances on its own because a character who began reloading is assumed to carry
     * on. Firing the weapon cancels it (see `cancelReload`), which is the one interruption the
     * system can detect reliably; the rest is left to the GM, as it was before any of this.
     */
    async processReloads(combat, data) {
        const combatant = combat.turns?.[data.turn];
        const actor = combatant?.actor;
        if (!actor) return;

        for (const item of actor.items) {
            if (!item.isReloading) continue;
            await reloadWeapon(item);
        }
    }

    getFirstGM() {
        for(const user of game.users.contents) {
            if (user.active && user.isGM) return user.id;
        }
    }
}



export const DHCombatActionManager = new CombatActionManager();
