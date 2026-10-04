import { homeworlds } from '../rules/homeworlds.mjs';
import { backgrounds } from '../rules/backgrounds.mjs';
import { divinations } from '../rules/divinations.mjs';
import { roles } from '../rules/roles.mjs';
import { eliteAdvances } from '../rules/elite-advances.mjs';
import { fieldMatch } from '../rules/config.mjs';
import { prepareSimpleRoll } from '../prompts/simple-prompt.mjs';
import { DHTargetedActionManager } from '../actions/targeted-action-manager.mjs';
import { prepareDamageRoll } from '../prompts/damage-prompt.mjs';
import { SimpleSkillData } from '../rolls/action-data.mjs';
import { DarkHeresyBaseActor } from './base-actor.mjs';
import { ForceFieldData } from '../rolls/force-field-data.mjs';
import { prepareForceFieldRoll } from '../prompts/force-field-prompt.mjs';
import { DHBasicActionManager } from '../actions/basic-action-manager.mjs';
import { getDegree, roll1d100 } from '../rolls/roll-helpers.mjs';
import { SYSTEM_ID } from '../hooks-manager.mjs';
import { DarkHeresySettings } from '../dark-heresy-settings.mjs';
import { collectConditionalBonuses, conditionalBonusKey } from '../rules/conditional-bonuses.mjs';
import { ledgerTotal, ledgerByKind, ledgerSorted, awardsTotal } from '../rules/advancement.mjs';
import { PSYKER_GRANTED_FLAG, planPsykerGrantApplication } from '../rules/psyker-grant.mjs';
import { fetchGrantData, grantItems, scanItemPackIndexes } from '../rules/compendium-grants.mjs';
import { normaliseName } from '../rules/grant-resolution.mjs';

export class DarkHeresyAcolyte extends DarkHeresyBaseActor {

    get backpack() {
        return this.system.backpack;
    }

    get skills() {
        return this.system.skills;
    }

    get fatigue() {
        return this.system.fatigue;
    }

    get fate() {
        return this.system.fate;
    }

    get psy() {
        return this.system.psy;
    }

    get bio() {
        return this.system.bio;
    }

    get experience() {
        return this.system.experience;
    }

    get insanity() {
        return this.system.insanity;
    }

    get corruption() {
        return this.system.corruption;
    }

    get armour() {
        return this.system.armour;
    }

    get encumbrance() {
        return this.system.encumbrance;
    }

    get backgroundEffects() {
        return this.system.backgroundEffects;
    }

    /**
     * Fires on every actor update; the only thing it acts on is `bio.elite` reading "Psyker" once
     * `super._onUpdate()` has applied this update's changes to `this` -- the Bio tab dropdown
     * (actor-acolyte-sheet.hbs) and character creation's Mystic-role grant
     * (character-creation-prompt.mjs) both set it through an ordinary `actor.update()`, so this
     * one hook point covers both without either caller needing to know about the grant.
     *
     * Checked against `this.bio.elite` (the actor's current state) rather than diffed out of
     * `changed` deliberately: Foundry does not document `changed`'s exact shape (flattened dotted
     * keys vs. an expanded nested object) closely enough to parse reliably, and reading current
     * state sidesteps the question entirely. This does mean `applyPsykerElite` gets called on
     * every later update to an already-granted psyker (a wounds change, a name edit, ...), not
     * just the one that set `bio.elite` -- cheap, because `applyPsykerElite` starts with a single
     * flag check and returns immediately once granted (see rules/psyker-grant.mjs).
     *
     * `_onUpdate` runs on every connected client once the change is broadcast, not just the one
     * that made it -- guarding on `userId === game.user.id` keeps only the initiating client
     * granting the items, so a table full of players watching someone else's sheet does not all
     * race to create the same trait/aptitude. `applyPsykerElite` is itself idempotent, so this
     * guard is a race-avoidance optimisation, not the only thing standing between this and a
     * duplicate grant.
     * @inheritDoc
     */
    _onUpdate(changed, options, userId) {
        super._onUpdate(changed, options, userId);
        // The flag check is hoisted here (not left to applyPsykerElite alone) so an already-granted
        // psyker does not spawn a throwaway async grant on every unrelated update -- a wounds tick, a
        // token move. applyPsykerElite re-checks the flag anyway; this is the cheap early-out.
        if (userId === game.user.id && this.bio?.elite === 'Psyker' && !this.getFlag(SYSTEM_ID, PSYKER_GRANTED_FLAG)) {
            this.applyPsykerElite().catch((err) => game.dh.error(`Psyker elite advance grant failed for ${this.name}`, err));
        }
    }

    /**
     * Apply the Psyker elite advance's mechanical grants (elite-advances.mjs): Psy Rating 1, the
     * Psyker trait, the Psyker aptitude, and -- unless the character already has the Sanctioned
     * trait -- 1d10+3 Corruption. A deliberate write, not something `prepareDerivedData` could do:
     * creating embedded items and rolling dice are side effects, and Foundry re-runs data
     * preparation far too often for either to live there safely.
     *
     * Idempotent via `flags.dark-heresy-2nd.psykerGranted` (see rules/psyker-grant.mjs, which owns
     * the actual decision logic): once set, re-opening the sheet, re-preparing data, or flipping
     * `bio.elite` away from and back to "Psyker" can never re-grant the trait/aptitude/rating or
     * re-roll corruption.
     *
     * Two Foundry writes, not one transaction -- the same limitation
     * character-creation-prompt.mjs's `applyCharacterCreation` documents: `this.update()` sets the
     * flag/rating/corruption first, then `grantItems` creates the trait/aptitude. If the second
     * call fails, the actor is left flagged as granted with the rating/corruption already applied
     * but missing an item; the error is logged via `game.dh.error` rather than swallowed; because
     * the flag is already set, re-triggering (re-saving the sheet) will not retry it, so a failure
     * here needs the item added by hand.
     */
    async applyPsykerElite() {
        const alreadyGranted = !!this.getFlag(SYSTEM_ID, PSYKER_GRANTED_FLAG);
        const result = await planPsykerGrantApplication(this, {
            alreadyGranted,
            flagPath: `flags.${SYSTEM_ID}.${PSYKER_GRANTED_FLAG}`,
            rollCorruption: async () => (await new Roll('1d10+3').evaluate()).total,
        });
        if (!result) return null;
        const { plan, corruptionGained } = result;

        await this.update(result.update);

        // What we set out to create, so a fetch or create failure can be reported specifically
        // rather than swallowed. The flag is already set above, so a failure here is NOT retried on
        // the next update -- the GM must add the missing item by hand, and needs telling so.
        const wanted = [];
        if (plan.grantTrait) wanted.push('trait');
        if (plan.grantAptitude) wanted.push('aptitude');
        const itemsToCreate = (await Promise.all(wanted.map((type) => this._fetchNamedCompendiumItem(type, 'Psyker')))).filter(Boolean);
        let grantedCount = 0;
        if (itemsToCreate.length) {
            try {
                grantedCount = (await grantItems(this, itemsToCreate)).length;
            } catch (err) {
                game.dh.error(`Psyker elite advance: granting the Psyker trait/aptitude to ${this.name} failed`, err);
            }
        }
        const missing = wanted.length - grantedCount;
        if (missing > 0) {
            ui.notifications?.error(
                `${this.name} became a psyker, but the Psyker ${wanted.slice(grantedCount).join(' and ')} could not be added automatically -- add ${missing > 1 ? 'them' : 'it'} by hand.`,
            );
        }

        ui.notifications?.info(
            corruptionGained
                ? `${this.name} gains the Psyker elite advance and ${corruptionGained} Corruption (not Sanctioned).`
                : `${this.name} gains the Psyker elite advance.`,
        );

        return { plan, corruptionGained };
    }

    /** The first compendium item of `type` named `name` across every system Item pack, ready for
     * `createEmbeddedDocuments`, or null if no pack has one -- logged rather than thrown, the same
     * best-effort contract `compendium-grants.mjs`'s other loaders use, so a missing pack entry
     * costs this one grant rather than the whole update. */
    async _fetchNamedCompendiumItem(type, name) {
        const target = normaliseName(name);
        let found = null;
        await scanItemPackIndexes(['name', 'type'], (entry, pack) => {
            if (found || entry.type !== type || normaliseName(entry.name) !== target) return;
            found = { pack: pack.metadata.id, itemId: entry._id };
        });
        if (!found) {
            game.dh.error(`Psyker elite advance: ${type} "${name}" not found in any compendium pack -- not granted`);
            return null;
        }
        return fetchGrantData(found.pack, found.itemId);
    }

    /**
     * super.prepareBaseData() is not optional: Actor#prepareBaseData clears the completed
     * ActiveEffect phase set, and skipping it makes applyActiveEffects throw "phase has already
     * completed" on every cycle after the first. Background fields belong here rather than in
     * derived data because they are a static lookup off bio.* that nothing else depends on, and
     * because _computeBackgroundFields pushes into abilities -- it must run exactly once per
     * cycle, paired with the reset above it.
     */
    prepareBaseData() {
        super.prepareBaseData();
        this.system.backgroundEffects = {
            abilities: [],
        };
        this._computeBackgroundFields();
    }

    prepareDerivedData() {
        // super computes characteristics and movement; the rest depend on those being done.
        super.prepareDerivedData();
        this._computeSkills();
        this._computeExperience();
        this._computeArmour();
        this._computeEncumbrance();
    }

    async rollWeaponDamage(weapon) {
        if (!weapon.system.equipped) {
            ui.notifications.warn('Actor must have weapon equipped!');
            return;
        }
        await prepareDamageRoll({
            name: weapon.name,
            damage: weapon.system.damage,
            damageType: weapon.system.damageType,
            penetration: weapon.system.penetration,
            targetActor: () => {
                const targetedObjects = game.user.targets;
                if (targetedObjects && targetedObjects.size > 0) {
                    const target = targetedObjects.values().next().value;
                    return target.actor;
                }
            }
        });
    }

    async rollPsychicPowerDamage(power) {
        await prepareDamageRoll({
            psychicPower: true,
            pr: this.psy.currentRating,
            name: power.name,
            damage: power.system.damage,
            damageType: power.system.damageType,
            penetration: power.system.penetration,
        });
    }

    async rollSkill(skillName, specialityName) {
        let skill = this.skills[skillName];
        let label = skill.label;
        if (specialityName) {
            skill = skill.specialities[specialityName];
            label = `${label}: ${skill.label}`;
        }

        // Dodge/Parry are Evasion reactions -- Stunned characters cannot attempt them at
        // all (RAW: no Actions or Reactions while Stunned), and Prone imposes a flat -20.
        const isEvasion = skillName === 'dodge' || skillName === 'parry';
        if (isEvasion && this.statuses.has('stun')) {
            ui.notifications.warn(`${this.name} is Stunned and cannot attempt Evasion reactions!`);
            return;
        }

        const simpleSkillData = new SimpleSkillData();
        const rollData = simpleSkillData.rollData;
        rollData.actor = this;
        rollData.sourceActor = this;
        rollData.nameOverride = label;
        rollData.type = 'Skill';
        rollData.baseTarget = skill.current;
        rollData.modifiers.modifier = 0;
        rollData.conditionalBonuses = collectConditionalBonuses(this, conditionalBonusKey(skillName, specialityName));
        if (isEvasion && this.statuses.has('prone')) {
            rollData.modifiers['self-prone'] = -20;
        }
        await prepareSimpleRoll(simpleSkillData);
    }

    async rollItem(itemId) {
        game.dh.log('RollItem', itemId);
        const item = this.items.get(itemId);
        switch (item.type) {
            case 'weapon':
                if (!item.system.equipped) {
                    ui.notifications.warn('Actor must have weapon equipped!');
                    return;
                }
                // Gate here, before the Simple-Attack-Rolls/targeted split, so a Stunned
                // actor is blocked either way -- the targeted path's own internal check
                // in performWeaponAttack() only covers itself, not the simple-rolls path.
                if (DHTargetedActionManager._blockIfStunned(this)) return;
                if(game.settings.get(SYSTEM_ID, DarkHeresySettings.SETTINGS.simpleAttackRolls)) {
                    if(item.isRanged) {
                        await this.rollCharacteristic('ballisticSkill', item.name);
                    } else {
                        await this.rollCharacteristic('weaponSkill',  item.name);
                    }
                } else {
                    await DHTargetedActionManager.performWeaponAttack(this, null, item);
                }
                return;
            case 'psychicPower':
                if (DHTargetedActionManager._blockIfStunned(this)) return;
                if(game.settings.get(SYSTEM_ID, DarkHeresySettings.SETTINGS.simplePsychicRolls)) {
                    await this.rollCharacteristic('willpower',  item.name)
                } else {
                    await DHTargetedActionManager.performPsychicAttack(this, null, item);
                }
                return;
            case 'forceField':
                if (!item.system.equipped || !item.system.activated) {
                    ui.notifications.warn('Actor must have force field equipped and activated!');
                    return;
                }
                await prepareForceFieldRoll(new ForceFieldData(this, item));
                return;
            default:
                await DHBasicActionManager.sendItemVocalizeChat({
                    actor: this.name,
                    name: item.name,
                    type: item.type?.toUpperCase(),
                    description: await foundry.applications.ux.TextEditor.enrichHTML(item.system.benefit ?? item.system.description, {
                        rollData: {
                            actor: this,
                            item: item,
                            pr: this.psy.rating
                        }
                    }),
                });
        }
    }

    /**
     * Spend one dose of a consumable or drug: roll its duration, copy its effect templates onto
     * this actor as real timed effects, decrement the stack, and announce it in chat.
     */
    async useConsumable(itemId) {
        const item = this.items.get(itemId);
        if (!item?.isUsable) {
            ui.notifications.warn('Only consumables and drugs can be used.');
            return;
        }
        if (item.quantity <= 0) {
            ui.notifications.warn(`${item.name} has none remaining.`);
            return;
        }

        // Book durations are dice expressions ("3d10 rounds"), so this is rolled per dose at the
        // moment of use rather than baked into the item.
        const formula = (item.system.onUse?.durationFormula ?? '').trim();
        const units = item.system.onUse?.durationUnit || 'rounds';
        let durationValue = null;
        if (formula) {
            try {
                const roll = await new Roll(formula).evaluate();
                durationValue = Math.max(0, Math.floor(roll.total));
            } catch (err) {
                game.dh.error(`useConsumable: bad duration formula "${formula}" on ${item.name}`, err);
            }
        }

        // The item's own effects are permanently suppressed while they sit on a consumable, so
        // they are only ever templates. Copy them onto the actor to actually take hold.
        const uuid = item.uuid;
        const effectData = item.effects.contents.map((effect) => {
            const data = effect.toObject();
            delete data._id;
            data.transfer = false;
            data.disabled = false;
            data.origin = uuid;
            if (durationValue !== null) data.duration = { value: durationValue, units };
            return data;
        });
        let applied = [];
        if (effectData.length) {
            applied = await this.createEmbeddedDocuments('ActiveEffect', effectData);
        }

        const remaining = item.quantity - 1;
        const depleted = remaining <= 0;
        if (depleted) await item.delete();
        else await item.update({ 'system.quantity': remaining });

        await DHBasicActionManager.sendConsumableUseChat({
            actor: this.name,
            name: item.name,
            type: item.type?.toUpperCase(),
            effectName: applied.map((e) => e.name).join(', '),
            // Resolved integer, never the formula -- chat enrichment rewrites [[XdY]] syntax.
            durationText: durationValue === null ? '' : `${durationValue} ${units}`,
            remaining: Math.max(0, remaining),
            depleted,
            description: await foundry.applications.ux.TextEditor.enrichHTML(item.system.description ?? '', {
                rollData: { actor: this, item: item },
            }),
        });
    }

    async damageItem(itemId) {
        const item = this.items.get(itemId);
        switch (item.type) {
            case 'weapon':
                await this.rollWeaponDamage(item);
                return;
            case 'psychicPower':
                await this.rollPsychicPowerDamage(item);
                return;
            default:
                return ui.notifications.warn(`No actions implemented for item type: ${item.type}`);
        }
    }

    _computeBackgroundFields() {
        if (this.bio?.homeWorld) {
            this.backgroundEffects.homeworld = homeworlds().find((h) => h.name === this.bio.homeWorld);
            if (this.backgroundEffects.homeworld) {
                this.backgroundEffects.abilities.push({
                    source: 'Homeworld',
                    ...this.backgroundEffects.homeworld.home_world_bonus,
                });
            }
        }
        if (this.bio?.background) {
            this.backgroundEffects.background = backgrounds().find((h) => h.name === this.bio.background);
            if (this.backgroundEffects.background) {
                this.backgroundEffects.abilities.push({
                    source: 'Background',
                    ...this.backgroundEffects.background.background_bonus,
                });
            }
        }
        if (this.bio?.role) {
            this.backgroundEffects.role = roles().find((h) => h.name === this.bio.role);
            if (this.backgroundEffects.role) {
                this.backgroundEffects.abilities.push({
                    source: 'Role',
                    ...this.backgroundEffects.role.role_bonus,
                });
            }
        }
        if (this.bio?.divination) {
            this.backgroundEffects.divination = divinations().find((h) => h.name === this.bio.divination);
            if (this.backgroundEffects.divination) {
                this.backgroundEffects.abilities.push({
                    source: 'Divination',
                    name: this.backgroundEffects.divination.name,
                    benefit: this.backgroundEffects.divination.effect,
                });
            }
        }
        if (this.bio?.elite) {
            this.backgroundEffects.eliteAdvance = eliteAdvances().find((h) => h.name === this.bio.elite);
        }
    }

    /**
     * An Unnatural Characteristic trait raises the unnatural rating of whichever characteristic
     * it was taken for, by its level. Added on top of anything typed into the sheet by hand
     * rather than replacing it, and recomputed from source data every cycle, so repeated
     * preparation cannot make it creep upwards.
     */
    _applyUnnaturalTraits() {
        for (const trait of this.items) {
            if (trait.type !== 'trait') continue;
            if (trait.system?.choice?.list !== 'characteristic') continue;
            const key = trait.system.choice.selected;
            const level = Number(trait.system.level) || 0;
            if (!key || level <= 0) continue;
            const characteristic = this.characteristics?.[key];
            if (characteristic) {
                characteristic.unnatural = (Number(characteristic.unnatural) || 0) + level;
            }
        }
    }

    _computeCharacteristics() {
        this._applyUnnaturalTraits();
        for (const [name, characteristic] of Object.entries(this.characteristics)) {
            characteristic.total = characteristic.base + characteristic.advance * 5 + characteristic.modifier;
            characteristic.bonus = Math.floor(characteristic.total / 10) + characteristic.unnatural;

            // Homeworld Bonus or Negative
            if (this.backgroundEffects.homeworld) {
                if (this.backgroundEffects.homeworld.bonus_characteristics.some((c) => fieldMatch(c, name))) {
                    characteristic.has_bonus = true;
                } else if (fieldMatch(this.backgroundEffects.homeworld.negative_characteristic, name)) {
                    characteristic.has_negative = true;
                }
            }

            if (this.fatigue.value > characteristic.bonus) {
                characteristic.total = Math.ceil(characteristic.total / 2);
                characteristic.bonus = Math.floor(characteristic.total / 10) + characteristic.unnatural;
            }
        }

        this.system.insanityBonus = Math.floor(this.insanity / 10);
        this.system.corruptionBonus = Math.floor(this.corruption / 10);
        this.psy.currentRating = this.psy.rating - this.psy.sustained;
        this.initiative.bonus = this.characteristics[this.initiative.characteristic].bonus;
        this.fatigue.max = this.characteristics.toughness.bonus + this.characteristics.willpower.bonus;
    }

    _computeSkills() {
        for (let skill of Object.values(this.skills)) {
            let short = !skill.characteristic || skill.characteristic === '' ? skill.characteristics[0] : skill.characteristic;
            let characteristic = this._findCharacteristic(short);
            skill.current = characteristic.total + this._skillAdvanceToValue(skill.advance) + (skill.modifier ?? 0);

            if (skill.isSpecialist) {
                for (let speciality of Object.values(skill.specialities)) {
                    speciality.current =
                        characteristic.total + this._skillAdvanceToValue(speciality.advance) + (speciality.modifier ?? 0);
                }
            }
        }
    }

    getSkillFuzzy(skillName) {
        for (const [name, skill] of Object.entries(this.skills)) {
            if (skillName.toUpperCase() === name.toUpperCase()) {
                return skill;
            }
        }
    }

    _skillAdvanceToValue(adv) {
        let advance = 1 * adv;
        let training = -20;
        if (advance === 1) {
            training = 0;
        } else if (advance === 2) {
            training = 10;
        } else if (advance === 3) {
            training = 20;
        } else if (advance >= 4) {
            training = 30;
        }
        return training;
    }

    /**
     * A non-empty ledger or award list is the only account of what a character has spent or been
     * given, so the sheet cannot drift from a hand-typed number. Characters with neither keep
     * their typed values until the migration seeds them.
     */
    _computeExperience() {
        if (!this.experience) return;

        const ledger = this.experience.ledger;
        if (Array.isArray(ledger) && ledger.length) this.experience.used = ledgerTotal(ledger);

        const awards = this.experience.awards;
        if (Array.isArray(awards) && awards.length) this.experience.total = awardsTotal(awards);

        this.experience.available = this.experience.total - this.experience.used;

        // Always computed, unlike `used` and `total` above, so the experience panel can rely on
        // these being real objects. The breakdown partitions the same ledger `used` is summed
        // from, so its buckets always add up to `used`. `ledgerSorted` only reads `at`, so it
        // serves the awards side unchanged.
        this.experience.ledgerByKind = ledgerByKind(ledger);
        this.experience.ledgerSorted = ledgerSorted(ledger);
        this.experience.awardsSorted = ledgerSorted(awards);
    }

    _computeArmour() {
        let locations = [
            'body',
            'head',
            'leftArm',
            'rightArm',
            'leftLeg',
            'rightLeg'
        ]
        let toughness = this.characteristics.toughness;
        let traitBonus = 0;

        // Compute Top Trait Bonus
        const traits = this.items.filter((item) => item.type === 'trait');
        for (const trait of traits) {
            switch(trait.name) {
                case 'Machine':
                    if(trait.system.level > traitBonus) {
                        traitBonus = trait.system.level;
                    }
                    break;
                case 'Natural Armor':
                    if(trait.system.level > traitBonus) {
                        traitBonus = trait.system.level;
                    }
                    break;
            }
        }

        // Create Basic Armour Point Object
        this.system.armour = locations.reduce(
            (accumulator, location) =>
                Object.assign(accumulator, {
                    [location]: {
                        total: toughness.bonus + traitBonus,
                        toughnessBonus: toughness.bonus,
                        traitBonus: traitBonus,
                        value: 0,
                    },
                }),
            {},
        );

        // Add Cybernetics -- these are cumulative?
        // Deliberately not filtered on system.hasArmourPoints: that flag only controls whether
        // the sheet shows the armour fields, and no compendium cybernetic has ever set it, so
        // gating the maths on it silently discarded every implant's protection. The points
        // themselves are the source of truth, and they are zero for implants without armour.
        this.items
            .filter((item) => item.type === 'cybernetic' )
            .filter((item) => item.system.equipped)
            .forEach((cybernetic) => {
                locations.forEach((location) => {
                    let armourVal = cybernetic.system.armourPoints[location] || 0;
                    this.armour[location].total += Number(armourVal);
                });
            });

        // object for storing the max armour
        let maxArmour = locations.reduce((acc, location) => Object.assign(acc, { [location]: 0 }), {});

        // for each item, find the maximum armour val per location
        this.items
            .filter((item) => item.type === 'armour' )
            .filter((item) => item.system.equipped)
            .reduce((acc, armour) => {
                locations.forEach((location) => {
                    let armourVal = armour.system.armourPoints[location] || 0;
                    // Coerce -- sometimes this is a string??
                    armourVal = Number(armourVal);
                    if (armourVal > acc[location]) {
                        acc[location] = armourVal;
                    }
                });
                return acc;
            }, maxArmour);

        this.armour.head.value = maxArmour['head'];
        this.armour.leftArm.value = maxArmour['leftArm'];
        this.armour.rightArm.value = maxArmour['rightArm'];
        this.armour.body.value = maxArmour['body'];
        this.armour.leftLeg.value = maxArmour['leftLeg'];
        this.armour.rightLeg.value = maxArmour['rightLeg'];

        this.armour.head.total += this.armour.head.value;
        this.armour.leftArm.total += this.armour.leftArm.value;
        this.armour.rightArm.total += this.armour.rightArm.value;
        this.armour.body.total += this.armour.body.value;
        this.armour.leftLeg.total += this.armour.leftLeg.value;
        this.armour.rightLeg.total += this.armour.rightLeg.value;

        // Effect-granted armour points. Folded in last so they stack on top of the best worn
        // armour rather than competing inside the max-per-location reduction above.
        locations.forEach((location) => {
            this.armour[location].total += Number(this.system.armourBonus?.[location] ?? 0);
        });
    }

    _computeEncumbrance() {
        // Current Weight
        let currentWeight = 0;

        // Backpack
        let backpackCurrentWeight = 0;
        let backpackMaxWeight = 0;
        if (this.backpack.hasBackpack) {
            backpackMaxWeight = this.backpack.weight.max;
            this.items.filter((item) => !item.isStorageLocation && !item.isContained).forEach((item) => {
                if (item.system.backpack?.inBackpack) {
                    backpackCurrentWeight += item.totalWeight;
                } else {
                    currentWeight += item.totalWeight;
                }
            });

            if (this.backpack.isCombatVest) {
                currentWeight += backpackCurrentWeight;
            }
        } else {
            // No backpack -- add everything
            this.items.filter((item) => !item.isStorageLocation && !item.isContained).forEach((item) => (currentWeight += item.totalWeight));
        }

        const attributeBonus = this.characteristics.strength.bonus + this.characteristics.toughness.bonus;
        this.system.encumbrance = {
            max: 0,
            value: currentWeight,
            encumbered: false,
            backpack_max: backpackMaxWeight,
            backpack_value: backpackCurrentWeight,
            backpack_encumbered: false,
        };
        switch (attributeBonus) {
            case 0:
                this.encumbrance.max = 0.9;
                break;
            case 1:
                this.encumbrance.max = 2.25;
                break;
            case 2:
                this.encumbrance.max = 4.5;
                break;
            case 3:
                this.encumbrance.max = 9;
                break;
            case 4:
                this.encumbrance.max = 18;
                break;
            case 5:
                this.encumbrance.max = 27;
                break;
            case 6:
                this.encumbrance.max = 36;
                break;
            case 7:
                this.encumbrance.max = 45;
                break;
            case 8:
                this.encumbrance.max = 56;
                break;
            case 9:
                this.encumbrance.max = 67;
                break;
            case 10:
                this.encumbrance.max = 78;
                break;
            case 11:
                this.encumbrance.max = 90;
                break;
            case 12:
                this.encumbrance.max = 112;
                break;
            case 13:
                this.encumbrance.max = 225;
                break;
            case 14:
                this.encumbrance.max = 337;
                break;
            case 15:
                this.encumbrance.max = 450;
                break;
            case 16:
                this.encumbrance.max = 675;
                break;
            case 17:
                this.encumbrance.max = 900;
                break;
            case 18:
                this.encumbrance.max = 1350;
                break;
            case 19:
                this.encumbrance.max = 1800;
                break;
            case 20:
                this.encumbrance.max = 2250;
                break;
            default:
                this.encumbrance.max = 2250;
                break;
        }

        if (this.encumbrance.value > this.encumbrance.max) {
            this.encumbrance.encumbered = true;
        }
        if (this.encumbrance.backpack_value > this.encumbrance.backpack_max) {
            this.encumbrance.backpack_encumbered = true;
        }
    }

    hasTalent(talent) {
        return !!this.items.filter((i) => i.type === 'talent').find((t) => t.name === talent);
    }

    hasTalentFuzzyWords(words) {
        return !!this.items.filter((i) => i.type === 'talent').find((t) => {
            for(const word of words) {
                if (!t.name.includes(word)) return false;
            }
            return true;
        });
    }

    async spendFate() {
        await this.update({
            system: {
                fate: {
                    value: this.system.fate.value - 1
                }
            }
        });
    }

    async rollCharacteristicCheck(characteristic) {
        const char = this.getCharacteristicFuzzy(characteristic);
        if(!char) {
            game.dh.error('Unable to perform characteristic test. Could now find provided characteristic.', char);
            return null;
        }
        return await this.rollCheck(char.total);
    }

    async opposedCharacteristicTest(targetActor, characteristic) {
        const sourceRoll = await this.rollCharacteristicCheck(characteristic);
        const targetRoll = targetActor ? await targetActor.rollCharacteristicCheck(characteristic) : null;
        return await this.opposedTest(sourceRoll, targetRoll);
    }

    async rollCheck(targetNumber) {
        const roll = await roll1d100();
        const success = roll.total === 1 || (roll.total <= targetNumber && roll.total !== 100);
        let dos = 0;
        let dof = 0;

        if(success) {
            dos = 1 + getDegree(targetNumber, roll.total);
        } else {
            dof = 1 + getDegree(roll.total, targetNumber);
        }

        return {
            roll: roll,
            target: targetNumber,
            success: success,
            dos: dos,
            dof: dof
        }
    }

    async opposedTest(rollCheckSource, rollCheckTarget) {
        if(!rollCheckSource) {
            return null;
        }
        if(rollCheckTarget) {
            let success = false;
            if(rollCheckSource.success) {
                if(!rollCheckTarget.success) {
                    success = true;
                } else {
                    success = rollCheckSource.dos >= rollCheckTarget.dos;
                }
            }
            return {
                source: rollCheckSource,
                target: rollCheckTarget,
                success: success
            }
        } else {
            return {
                source: rollCheckSource,
                success: true
            };
        }
    }
}
