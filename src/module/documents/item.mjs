import { DarkHeresyItemContainer } from './item-container.mjs';
import { capitalize } from '../handlebars/handlebars-helpers.mjs';
import { DarkHeresy } from '../rules/config.mjs';

export class DarkHeresyItem extends DarkHeresyItemContainer {
    get totalWeight() {
        // A stack of N carries N times the weight; nested contents are counted once for the
        // container itself, not multiplied per copy of it.
        let weight = (this.system.weight || 0) * this.quantity;
        if (this.items && this.items.size > 0) {
            this.items.forEach((item) => (weight += item.totalWeight));
        }
        return weight;
    }

    /** Stack size. Non-physical items have no quantity field and always count as one. */
    get quantity() {
        const q = Number(this.system.quantity ?? 1);
        return Number.isFinite(q) && q > 0 ? q : 1;
    }

    get equipped() {
        return !!this.system.equipped;
    }

    get isMentalDisorder() {
        return this.type === 'mentalDisorder';
    }

    get isMalignancy() {
        return this.type === 'malignancy';
    }

    get isMutation() {
        return this.type === 'mutation';
    }

    get isTalent() {
        return this.type === 'talent';
    }

    get isTrait() {
        return this.type === 'trait';
    }

    get isAptitude() {
        return this.type === 'aptitude';
    }

    get isSpecialAbility() {
        return this.type === 'specialAbility';
    }

    get isPsychicPower() {
        return this.type === 'psychicPower';
    }

    get isPsychicBarrage() {
        return this.type === 'psychicPower' && this.system.attackType === 'Psychic Barrage';
    }

    get isPsychicStorm() {
        return this.type === 'psychicPower' && this.system.attackType === 'Psychic Storm';
    }

    get isCriticalInjury() {
        return this.type === 'criticalInjury';
    }

    get isWeapon() {
        return this.type === 'weapon';
    }

    get isRanged() {
        return this.type === 'weapon' && this.system.class.toLowerCase() !== 'melee';
    }

    get isThrown() {
        return this.type === 'weapon' && this.system.class.toLowerCase() === 'thrown';
    }

    get usesAmmo() {
        return this.isRanged && this.system.reload && this.system.reload !== 'N/A';
    }

    get isMelee() {
        return this.type === 'weapon' && this.system.class.toLowerCase() === 'melee';
    }

    get isArmour() {
        return this.type === 'armour';
    }

    get isArmourModification() {
        return this.type === 'armourModification';
    }

    get isGear() {
        return this.type === 'gear' || this.isConsumable || this.isDrug || this.isAmmunition || this.isTool;
    }

    get isDrug() {
        return this.type === 'drug';
    }

    get isConsumable() {
        return this.type === 'consumable';
    }

    /** Types that are spent by an explicit Use action rather than worn or wielded. */
    get isUsable() {
        return this.isConsumable || this.isDrug;
    }

    /**
     * Options a specialisable talent/trait may choose from, always normalised to value -> label
     * so templates can hand it straight to selectOptions. Config lists are arrays where the
     * stored value is its own label, and objects where the value is a data key that needs
     * translating (characteristics, so the stored value matches the actor's data path).
     */
    get choiceOptions() {
        const list = this.system?.choice?.list;
        if (!list) return {};
        const opts = DarkHeresy.choices?.[list];
        if (!opts) return {};
        return Array.isArray(opts) ? Object.fromEntries(opts.map((o) => [o, o])) : opts;
    }

    get hasChoice() {
        return Object.keys(this.choiceOptions).length > 0;
    }

    /** The chosen specialisation as it should read to a player. */
    get choiceLabel() {
        const selected = this.system?.choice?.selected;
        if (!selected) return '';
        return this.choiceOptions[selected] ?? selected;
    }

    /**
     * Name qualified by its specialisation and/or rating, so a sheet shows "Hatred (Mutants)"
     * or "Fear (3)" rather than every copy reading the same. The underlying name is untouched.
     */
    get displayName() {
        const parts = [];
        if (this.choiceLabel) parts.push(this.choiceLabel);
        if (Number(this.system?.level)) parts.push(Number(this.system.level));
        return parts.length ? `${this.name} (${parts.join(' ')})` : this.name;
    }

    get isTool() {
        return this.type === 'tool';
    }

    get isCybernetic() {
        return this.type === 'cybernetic';
    }

    get isWeaponModification() {
        return this.type === 'weaponModification';
    }

    get isAmmunition() {
        return this.type === 'ammunition';
    }

    get isForceField() {
        return this.type === 'forceField';
    }

    get isAttackSpecial() {
        return this.type === 'attackSpecial';
    }

    get isStorageLocation() {
        return this.type === 'storageLocation';
    }

    get isBackpack() {
        return this.type === 'backpack';
    }

    get isInBackpack() {
        return this.system.backpack?.inBackpack || false;
    }

    get isJournalEntry() {
        return this.type === 'journalEntry';
    }

    get isEnemy() {
        return this.type === 'enemy';
    }

    get isPeer() {
        return this.type === 'peer';
    }

    async _onCreate(data, options, user) {
        game.dh.log('Determining nested items for', this);
        await this._determineNestedItems();
        await this._expandLegacyContents();
        return super._onCreate(data, options, user);
    }

    /**
     * A container from the world directory or a compendium carries its contents as flag data,
     * because unowned containers have no character to affect. The moment it belongs to an
     * actor those contents have to become real items, or a weapon dragged onto a character
     * would arrive stripped of its qualities and modifications.
     *
     * The legacy flag is left alone so the source item is unchanged and the data stays
     * recoverable.
     */
    async _expandLegacyContents() {
        if (!this.parent) return;
        if (this.items?.size) return;
        const legacy = this.getNested();
        if (!legacy.length) return;
        game.dh.log(`Expanding ${legacy.length} contained item(s) onto ${this.parent.name}`, this.name);
        await this.createNestedDocuments(legacy);
    }

    /**
     * A contained item is a sibling of its container, not a child of it, so Foundry's own
     * "redraw the changed document and its ancestors" pass reaches this item's sheet and the
     * actor's, but never the container's. Equipping a weapon mod therefore left the weapon
     * sheet showing the old state until something else forced it to redraw -- switching tabs,
     * or reopening the sheet.
     */
    _onUpdate(changed, options, userId) {
        super._onUpdate(changed, options, userId);
        this._renderContainerSheets();
    }

    /** Same staleness on removal: the container must be read before the item leaves the collection. */
    _onDelete(options, userId) {
        const container = this.containerItem;
        super._onDelete(options, userId);
        this._renderContainerSheets(container);
    }

    /**
     * Redraw any open sheet up the containment chain, not just the immediate container: a
     * container's displayed weight includes its contents, so a change deep inside one is visible
     * several levels above it. Only sheets already on screen are touched, and the seen-set stops
     * a corrupt containerId loop from hanging the client.
     */
    _renderContainerSheets(from = this.containerItem) {
        const seen = new Set();
        for (let c = from; c && !seen.has(c.id); c = c.containerItem) {
            seen.add(c.id);
            if (c.sheet?.rendered) c.sheet.render();
        }
    }

    /**
     * Contents are siblings rather than data held inside this item, so they have to be removed
     * deliberately. This preserves the old behaviour, where a weapon's mods and loaded clip
     * disappeared along with it -- the difference is that the sheet now says so first.
     */
    async _preDelete(options, user) {
        const ids = [...(this.items ?? [])].map((i) => i.id);
        if (ids.length) await this.deleteNestedDocuments(ids);
        return super._preDelete(options, user);
    }

    prepareData() {
        super.prepareData();
        game.dh.log('Item prepare data', this);

        if (this.isPsychicPower) {
            if(!this.system.damage || this.system.damage === '') {
                this.system.damage = 0;
            }
            if(!this.system.penetration || this.system.penetration === '') {
                this.system.penetration = 0;
            }
        }

        // Fix Broken Selects
        if(!this.system.craftsmanship || this.system.craftsmanship === '') {
            this.system.craftsmanship = 'Common';
        }
        if(!this.system.availability || this.system.availability === '') {
            this.system.availability = 'Common';
        }
    }

    /**
     * This unlocks and loads nested items dynamically from the adjacent compendium.
     * I tried to find another way to do this but couldn't find anything online - I made my own hack.
     */
    async _determineNestedItems() {
        // Already has items just skip
        if ((this.items && this.items.size > 0) || this.hasNested()) return;

        // Check for specials
        if (this.system.special) {
            game.dh.log('Performing first time nested item configuration for item: ' + this.name + ' with specials: ', this.system.special);
            if (this.isWeapon) await this._updateSpecialsFromPack('dark-heresy-2nd.weapons', this.system.special);
            if (this.isAmmunition) await this._updateSpecialsFromPack('dark-heresy-2nd.ammo', this.system.special);
            game.dh.log('Special migrated for item: ' + this.name, this.system.special);
            this.system.special = undefined;
        }
    }

    async _updateSpecialsFromPack(pack, data) {
        const compendium = game.packs.find((p) => p.collection === pack);
        if (!compendium) return;
        // try/finally so a failure part way through can't leave the compendium unlocked.
        await compendium.configure({ locked: false });
        try {
            const attackSpecials = await this._getAttackSpecials(data);
            if (attackSpecials?.length > 0) {
                await this.createNestedDocuments(attackSpecials);
            }
        } finally {
            await compendium.configure({ locked: true });
        }
    }

    async _getAttackSpecials(specialData) {
        const attackSpecialPack = game.packs.find((p) => p.collection === 'dark-heresy-2nd.attack-specials');
        if (!attackSpecialPack) return;
        const index = await attackSpecialPack.getIndex({ fields: ['name', 'img', 'type', 'system'] });
        const specials = [];
        for (const special of Object.keys(specialData)) {
            const specialName = capitalize(special);
            const attackSpecial = index.find((n) => n.name === specialName);
            if (attackSpecial) {
                if (attackSpecial.system.hasLevel) {
                    attackSpecial.system.level = specialData[special];
                } else {
                    attackSpecial.system.enabled = specialData[special];
                }
                specials.push(attackSpecial);
            }
        }
        return specials;
    }
}
