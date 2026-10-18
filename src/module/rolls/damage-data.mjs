import { additionalHitLocations, getHitLocationForRoll } from '../rules/hit-locations.mjs';
import { calculateAmmoDamageBonuses, calculateAmmoPenetrationBonuses, calculateAmmoSpecials } from '../rules/ammo.mjs';
import { getCriticalDamage, resolveCriticalEffects } from '../rules/critical-damage.mjs';
import {
    calculateWeaponModifiersDamageBonuses,
    calculateWeaponModifiersPenetrationBonuses,
} from '../rules/weapon-modifiers.mjs';

export class DamageData {
    template = '';
    sourceActor;
    targetActor;

    additionalHits = 0;
    hits = [];

    reset() {
        this.hits = [];
        this.additionalHits = 0;
    }
}

/** Are there live dice at or below `threshold` still available to re-roll? */
export function rollHasDiceBelow(roll, threshold) {
    if (!roll?.terms) return false;
    return roll.terms.some(
        (term) => term instanceof foundry.dice.terms.Die
            && term.results.some((r) => r.active && !r.discarded && r.result <= threshold),
    );
}

/**
 * Every damage re-roll this character could use on this hit.
 *
 * Built as a LIST rather than a flag per ability. Three of these exist already and they differ
 * only in which dice qualify and what has to be true to offer them, so a flag each would be
 * three copies of the same machinery in the data, the template and the handler.
 *
 * All of them are offered AFTER the roll, per hit. "May re-roll" is a decision made once the
 * dice are visible, and with burst fire each hit has its own dice -- a pre-roll toggle would
 * force a blind commitment across all of them.
 *
 * `condition` is prose, not enforcement: where the rule depends on something the system cannot
 * see -- whether an ally has already attacked this target, whether the character is genuinely
 * unarmed -- it is stated in the tooltip and left to the player. Guessing would be worse than
 * asking.
 *
 * @returns {Array<{key, label, threshold, condition, used}>}
 */
export function availableDamageRerolls(actor, weapon, roll) {
    if (!actor) return [];
    const options = [];

    // Imperial Guard background: re-roll damage results of 1 or 2.
    if (actor.bio?.background === 'Imperial Guard') {
        options.push({
            key: 'hammer',
            label: 'Hammer of the Emperor',
            threshold: 2,
            condition: 'Needs an ally to have attacked this target since your last turn',
        });
    }

    // Cleanse with Fire: re-roll damage below Willpower bonus, with a Flame weapon.
    // The Flame condition IS checkable, so this one carries no caveat.
    if (actor.hasTalent?.('Cleanse with Fire') && weaponHasFlame(weapon)) {
        options.push({
            key: 'cleanse',
            label: 'Cleanse with Fire',
            threshold: actor.getCharacteristicFuzzy?.('Willpower')?.bonus ?? 0,
            condition: null,
        });
    }

    // Unarmed Specialist: re-roll damage when fighting unarmed. The whole roll, not selected
    // dice, so the threshold is the die size -- every result qualifies.
    if (actor.hasTalent?.('Unarmed Specialist') && weapon?.isMelee) {
        options.push({
            key: 'unarmed',
            label: 'Unarmed Specialist',
            threshold: Infinity,
            condition: 'Only when fighting unarmed',
        });
    }

    return options
        .filter((o) => o.threshold > 0 && rollHasDiceBelow(roll, o.threshold))
        .map((o) => ({ ...o, used: false }));
}

/** Does this weapon have the Flame quality? */
function weaponHasFlame(weapon) {
    if (!weapon) return false;
    if (String(weapon.system?.type ?? '').toLowerCase() === 'flame') return true;
    return [...(weapon.items ?? [])].some((i) => i.name === 'Flame');
}

export class Hit {
    location = 'Body';

    totalFatigue = 0;

    damage = 0;
    damageRoll;
    damageType = 'Impact';
    modifiers = {};
    totalDamage = 0;

    dos = 0;

    penetration = 0;
    hasPenetrationRoll = false;
    penetrationRoll;
    penetrationModifiers = {};
    totalPenetration = 0;

    specials = [];
    effects = [];
    righteousFury = [];
    scatter = {};

    /*
     * Hammer of the Emperor (Imperial Guard background): re-roll damage results of 1 or 2.
     *
     * Offered per hit on the chat card AFTER the roll, not as a checkbox before it. "May
     * re-roll" is a decision made once you can see the dice, and with burst fire each hit is its
     * own damage roll with its own 1s and 2s -- a single pre-roll toggle would apply to all of
     * them indiscriminately and force the player to commit while knowing nothing.
     */
    /** Damage re-rolls offered on this hit; see `availableDamageRerolls`. */
    rerolls = [];
    righteousFuryThreshold = 10;

    /**
     * @param attackData
     * @param hitNumber
     * @returns {Promise<Hit>}
     */
    static async createHit(attackData, hitNumber) {
        const hit = new Hit();
        await hit._calculateDamage(attackData);
        hit._totalDamage();
        await hit._calculatePenetration(attackData);
        hit._totalPenetration();
        await hit._calculateSpecials(attackData);

        if (attackData.rollData.isCalledShot) {
            hit.location = attackData.rollData.calledShotLocation;
        } else {
            const initialHit = getHitLocationForRoll(attackData.rollData.roll.total);
            hit.location = additionalHitLocations()[initialHit][hitNumber <= 5 ? hitNumber : 5];
        }

        // Determine Righteous Fury Effects
        for(const righteousFury of hit.righteousFury) {
            righteousFury.effect = getCriticalDamage(hit.damageType, hit.location, righteousFury.roll.total);
            righteousFury.resolved = righteousFury.effect ? await resolveCriticalEffects(righteousFury.effect.effects) : null;
        }

        return hit;
    }

    _totalDamage() {
        this.totalDamage = this.damage + Object.values(this.modifiers).reduce((a, b) => a + b, 0);
    }

    _totalPenetration() {
        this.totalPenetration = this.penetration + Object.values(this.penetrationModifiers).reduce((a, b) => a + b, 0);
    }

    /**
     * @param attackData {AttackData}
     * @returns {Promise<void>}
     */
    async _calculateDamage(attackData) {
        let actionItem = attackData.rollData.weapon ?? attackData.rollData.power;
        if (!actionItem) return;
        const sourceActor = attackData.rollData.sourceActor;

        let righteousFuryThreshold = 10;
        if (attackData.rollData.hasAttackSpecial('Vengeful')) {
            righteousFuryThreshold = attackData.rollData.getAttackSpecial('Vengeful').level ?? 10;
            game.dh.log('_calculateDamage has vengeful: ', righteousFuryThreshold);
        }

        let rollFormula = actionItem.system.damage;
        if(!rollFormula || rollFormula === '') {
            rollFormula = '0';
        }
        this.damageRoll = new Roll(rollFormula, attackData.rollData);

        if (attackData.rollData.hasAttackSpecial('Tearing')) {
            game.dh.log('Modifying dice due to tearing');
            this.damageRoll.terms.filter(term => term instanceof foundry.dice.terms.Die).forEach(die => {
                if (die.modifiers.includes('kh')) return;
                die.modifiers.push('kh' + die.number);
                die.number += 1;
            });
        }

        await this.damageRoll.evaluate();
        game.dh.log('Damage Roll', this.damageRoll);

        this.damage = this.damageRoll.total;

        for (const term of this.damageRoll.terms) {
            if (!term.results) continue;
            for (const result of term.results) {
                game.dh.log('_calculateDamage result:', result);
                if (result.discarded || !result.active) continue;
                if (result.result >= righteousFuryThreshold) {
                    // Righteous fury hit
                    const righteousFuryRoll = new Roll('1d5', {});
                    await righteousFuryRoll.evaluate();
                    this.righteousFury.push({roll: righteousFuryRoll, effect: null, resolved: null});

                    // DeathDealer
                    if (actionItem.isMelee) {
                        if (sourceActor.hasTalentFuzzyWords('Deathdealer', 'Melee')) {
                            this.modifiers['deathdealer'] = sourceActor.getCharacteristicFuzzy('Perception').bonus;
                        }
                    } else if (actionItem.isRanged) {
                        if (sourceActor.hasTalentFuzzyWords('Deathdealer', 'Ranged')) {
                            this.modifiers['deathdealer'] = sourceActor.getCharacteristicFuzzy('Perception').bonus;
                        }
                    }
                }

                if (attackData.rollData.hasAttackSpecial('Primitive')) {
                    const primitive = attackData.rollData.getAttackSpecial('Primitive');
                    if (result.result > primitive.level) {
                        this.modifiers['primitive'] = primitive.level - result.result;
                    }
                }

                if (attackData.rollData.hasAttackSpecial('Proven')) {
                    const proven = attackData.rollData.getAttackSpecial('Proven');
                    if (result.result < proven.level) {
                        this.modifiers['proven'] = proven.level - result.result;
                    }
                }
            }
        }

        this.righteousFuryThreshold = righteousFuryThreshold;
        this.rerolls = availableDamageRerolls(sourceActor, actionItem, this.damageRoll);

        if (actionItem.isMelee) {
            this.modifiers['strength bonus'] = sourceActor.getCharacteristicFuzzy('Strength').bonus;

            // Crushing Blow
            if (sourceActor.hasTalent('Crushing Blow')) {
                const wsBonus = sourceActor.getCharacteristicFuzzy('WeaponSkill').bonus;
                this.modifiers['crushing blow'] = Math.ceil(wsBonus / 2);
            }

            // Deathdealer
            if (sourceActor.hasTalentFuzzyWords(['Deathdealer', 'Melee'])) {
                const perBonus = sourceActor.getCharacteristicFuzzy('Perception').bonus;
                this.modifiers['deathdealer melee'] = Math.ceil(perBonus / 2);
            }

        } else if (actionItem.isRanged) {
            // Scatter
            if (attackData.rollData.hasAttackSpecial('Scatter')) {
                if (attackData.rollData.rangeName === 'Point Blank') {
                    this.modifiers['scatter'] = 3;
                } else if (attackData.rollData.rangeName !== 'Short Range') {
                    this.modifiers['scatter'] = -3;
                }
            }

            // Add Accurate
            if (attackData.rollData.action === 'Standard Attack' || attackData.rollData.action === 'Called Shot') {
                if (attackData.rollData.hasAttackSpecial('Accurate')) {
                    if (attackData.rollData.dos >= 3) {
                        const accurateRoll = new Roll('1d10', {});
                        await accurateRoll.evaluate();
                        this.modifiers['accurate'] = accurateRoll.total;
                    }
                    if (attackData.rollData.dos >= 5) {
                        const accurateRoll = new Roll('1d10', {});
                        await accurateRoll.evaluate();
                        this.modifiers['accurate x 2'] = accurateRoll.total;
                    }
                }
            }

            // Eye of Vengeance
            if (attackData.rollData.eyeOfVengeance) {
                this.modifiers['eye of vengeance'] = attackData.rollData.dos;
            }

            // Las Modes
            if (attackData.rollData.hasAttackSpecial('Overcharge')) {
                this.modifiers['overcharge'] = 1;
            } else if (attackData.rollData.hasAttackSpecial('Overload')) {
                this.modifiers['overload'] = 2;
            }

            // Maximal
            if (attackData.rollData.hasAttackSpecial('Maximal')) {
                const maximalRoll = new Roll('1d10', {});
                await maximalRoll.evaluate();
                this.modifiers['maximal'] = maximalRoll.total;
            }

            // Mighty Shot
            if (sourceActor.hasTalent('Mighty Shot')) {
                const bsBonus = sourceActor.getCharacteristicFuzzy('ballisticSkill').bonus;
                this.modifiers['mighty shot'] = Math.ceil(bsBonus / 2);
            }

            // Deathdealer
            if (sourceActor.hasTalentFuzzyWords(['Deathdealer', 'Ranged'])) {
                const perBonus = sourceActor.getCharacteristicFuzzy('Perception').bonus;
                this.modifiers['deathdealer ranged'] = Math.ceil(perBonus / 2);
            }

            // Ammo
            await calculateAmmoDamageBonuses(attackData, this);
        }

        await calculateWeaponModifiersDamageBonuses(attackData, this);
    }

    async _calculatePenetration(attackData) {
        let actionItem = attackData.rollData.weapon ?? attackData.rollData.power;
        if (!actionItem) return;
        const sourceActor = attackData.rollData.sourceActor;

        const rollFormula = actionItem.system.penetration;
        if (Number.isInteger(rollFormula)) {
            this.penetration = rollFormula;
        } else if (rollFormula === '') {
            this.penetration = 0;
        }  else {
            this.hasPenetrationRoll = true;
            try {
                this.penetrationRoll = new Roll(rollFormula, attackData.rollData);
                await this.penetrationRoll.evaluate();
                this.penetration = this.penetrationRoll.total;
            } catch (error) {
                ui.notifications.warn('Penetration formula failed - setting to 0');
                this.penetration = 0;
            }
        }

        if (actionItem.isMelee) {
            if (this.penetration && attackData.rollData.hasAttackSpecial('Lance')) {
                this.penetrationModifiers['lance'] = this.penetration * attackData.rollData.dos;
            }

            if (attackData.rollData.dos > 2 && attackData.rollData.hasAttackSpecial('Razer Sharp')) {
                this.penetrationModifiers['razer sharp'] = this.penetration;
            }

            if (attackData.rollData.action === 'All Out Attack' && sourceActor.hasTalent('Hammer Blow')) {
                const strBonus = sourceActor.getCharacteristicFuzzy('strength').bonus;
                this.penetrationModifiers['hammer blow'] = Math.ceil(strBonus / 2);
            }
        } else if (actionItem.isRanged) {
            if (attackData.rollData.hasAttackSpecial('Maximal')) {
                this.penetrationModifiers['maximal'] = 2;
            }

            // Las Modes
            if (attackData.rollData.hasAttackSpecial('Overload')) {
                this.penetrationModifiers['overload'] = 2;
            }

            // Ammo
            await calculateAmmoPenetrationBonuses(attackData, this);
        }

        if (attackData.rollData.eyeOfVengeance) {
            this.penetrationModifiers['eye of vengeance'] = attackData.rollData.dos;
        }

        if (attackData.rollData.rangeName === 'Short Range' || attackData.rollData.rangeName === 'Point Blank') {
            if (attackData.rollData.hasAttackSpecial('Melta')) {
                this.penetrationModifiers['melta'] = this.penetration;
            }
        }

        await calculateWeaponModifiersPenetrationBonuses(attackData, this);
    }

    async _calculateSpecials(attackData) {
        let actionItem = attackData.rollData.weapon ?? attackData.rollData.power;
        if (!actionItem) return;
        const sourceActor = attackData.rollData.sourceActor;

        this.damageType = actionItem.system.damageType;

        if (attackData.rollData.action === 'All Out Attack' && sourceActor.hasTalent('Hammer Blow')) {
            if(!attackData.rollData.attackSpecials.find(s => s.name === 'Concussive')) {
                attackData.rollData.attackSpecials.push({
                    name: 'Concussive',
                    level: 2
                });
            }
        }

        if (actionItem.isRanged) {
            await calculateAmmoSpecials(attackData, this);
        }

        for (const special of attackData.rollData.attackSpecials) {
            switch(special.name.toLowerCase()) {
                case 'blast':
                    this.addEffect(special.name, `Everyone within ${special.level}m of the location is hit!`);
                    break;
                case 'concussive':
                    this.addEffect(special.name, `Target must pass Toughness test with ${special.level * -10} or be Stunned for 1 round per DoF. If the attack did more damage than the targets Strength Bonus, it is knocked Prone!`);
                    break;
                case 'corrosive':
                    this.addEffect(special.name, `The targets armor melts with [[1d10]] of armour being destroyed! Additional damage is dealt as wounds and not reduced by toughness.`);
                    break;
                case 'crippling':
                    this.addEffect(special.name, `If the target suffers a wound it is considered crippled. If they take more than a half action on a turn, they suffer ${special.level} damage not reduced by Armour or Toughness!`);
                    break;
                case 'felling':
                    this.addEffect(special.name, `The targets unnatural toughness is reduced by ${special.level} while calculating wounds!`);
                    break;
                case 'flame':
                    this.addEffect(special.name, `The target must make an Agility test or be set on fire!`);
                    break;
                case 'graviton':
                    this.addEffect(special.name, `This attack deals additional damage equal to the targets Armour points on the struck location!`);
                    break;
                case 'hallucinogenic':
                    this.addEffect(special.name, `A creature stuck by this much make a toughness test with ${special.level * -10} or suffer a delusion!`);
                    break;
                case 'haywire':
                    this.addEffect(special.name, `Everything within ${special.level * -10}m suffers the Haywire Field at strength [[1d10]]!`);
                    break;
                case 'indirect':
                    const bs = sourceActor.getCharacteristicFuzzy('ballisticSkill').bonus;
                    this.addEffect(special.name, `The attack deviates [[ 1d10 - ${bs}]]m (minimum of 0m) off course to the ${scatterDirection()}!`);
                    break;
                case 'shocking':
                    this.addEffect(special.name, `Target must pass a Challenging (+0) Toughness test. If he fails, he suffers 1 level of Fatigue and is Stunned for a number of rounds equal to half of his degrees of failure (rounding up).`);
                    break;
                case 'snare':
                    this.addEffect(special.name, `Target must pass Agility test with ${special.level * -10} or become immobilised. An immobilised target can attempt no actions other than trying to escape. As a Full Action, they can make a Strength or Agility test with ${special.level * -10} to burst free or wriggle out.`);
                    break;
                case 'toxic':
                    this.addEffect(special.name, `Target must pass Toughness test with ${special.level * -10} or suffer [[1d10]] ${actionItem.system.damageType} damage.`);
                    break;
                case 'warp':
                    this.addEffect(special.name, `Ignores mundane armor and cover! Holy armor negates this.`);
                    break;

            }
        }
    }

    addEffect(name, effect) {
        this.effects.push({
            name: name,
            effect: effect
        })
    }
}

export class WeaponDamageData extends DamageData {}

export class PsychicDamageData extends DamageData {}

export function scatterDirection() {
    let direction = '';
    const directionInt = Math.floor(Math.random() * 10) + 1;
    if (directionInt === 1) direction = 'north west';
    if (directionInt === 2) direction = 'north';
    if (directionInt === 3) direction = 'north east';
    if (directionInt === 4) direction = 'west';
    if (directionInt === 5) direction = 'east';
    if (directionInt === 6 || directionInt === 7) direction = 'south west';
    if (directionInt === 8) direction = 'south';
    if (directionInt === 9 || directionInt === 10) direction = 'south east';
    return direction;
}
