import { hitDropdown } from '../rules/hit-locations.mjs';
import { getCriticalDamage, resolveCriticalEffects } from '../rules/critical-damage.mjs';
import { damageTypeDropdown } from '../rules/damage-type.mjs';

export class AssignDamageData {
    locations = hitDropdown();
    actor;
    hit;
    damageType = damageTypeDropdown();
    ignoreArmour = false;

    armour = 0;
    tb = 0;

    hasFatigueDamage = false;
    fatigueTaken = 0;

    hasDamage = false;
    damageTaken = 0;
    hasCriticalDamage = false;
    criticalDamageTaken = 0;
    criticalAmount = null;
    criticalEffect = null;
    resolvedCriticalEffect = null;

    constructor(actor, hit) {
        this.actor = actor;
        this.hit = hit;
    }

    async update() {
        this.armour = 0;
        this.tb = 0;
        const location = this.hit?.location;
        if(location) {
            for(const [name, locationArmour] of Object.entries(this.actor.system.armour)) {
                if(location.replace(/\s/g, "").toUpperCase() === name.toUpperCase()) {
                    this.armour = locationArmour.value;
                    this.tb = locationArmour.toughnessBonus;
                }
            }
        }
    }

    async finalize() {
        let totalDamage = Number.parseInt(this.hit.totalDamage);
        let totalPenetration = Number.parseInt(this.hit.totalPenetration);

        // Reduce Armour by Penetration
        let usableArmour = this.armour;
        usableArmour = usableArmour - totalPenetration;
        if (usableArmour < 0) {
            usableArmour = 0;
        }
        if (this.ignoreArmour) {
            usableArmour = 0;
        }

        const reduction = usableArmour + this.tb;
        const reducedDamage = totalDamage - reduction;
        // We have damage to process
        if(reducedDamage > 0) {
            // No Wounds Available
            if(this.actor.system.wounds.value <= 0) {
                // All applied as critical
                this.hasCriticalDamage = true;
                this.criticalDamageTaken = reducedDamage;
            } else {
                //Reduce Wounds First
                if(this.actor.system.wounds.value >= reducedDamage) {
                    // Only Wound Damage
                    this.damageTaken = reducedDamage;
                } else {
                    // Wound and Critical
                    this.damageTaken = this.actor.system.wounds.value;
                    this.hasCriticalDamage = true;
                    this.criticalDamageTaken = reducedDamage - this.damageTaken;
                }
            }
        }

        if(this.criticalDamageTaken > 0) {

            // Handle True Grit Talent
            if(this.actor.hasTalent('True Grit')) {
                // Reduces by Toughness Bonus to minimum of 1
                this.criticalDamageTaken = this.criticalDamageTaken - this.tb < 1 ? 1 : this.criticalDamageTaken - this.tb;
            }

            this.criticalAmount = this.actor.system.wounds.critical + this.criticalDamageTaken;
            this.criticalEffect = getCriticalDamage(this.hit.damageType, this.hit.location, this.criticalAmount);
            if (this.criticalEffect) {
                this.resolvedCriticalEffect = await resolveCriticalEffects(this.criticalEffect.effects);
            }
        }

        if(this.hit.totalFatigue > 0) {
            this.hasFatigueDamage = true;
            this.fatigueTaken = this.hit.totalFatigue;
        }

        if(this.damageTaken > 0){
            this.hasDamage = true;
        }
    }

    async performActionAndSendToChat() {
        // Assign Damage
        this.actor = await this.actor.update({
            system: {
                wounds: {
                    value: this.actor.system.wounds.value - this.damageTaken,
                    critical: this.actor.system.wounds.critical + this.criticalDamageTaken,
                },
                fatigue: {
                    value: this.actor.system.fatigue.value + this.fatigueTaken
                }
            }
        });
        game.dh.log('performActionAndSendToChat', this)

        const html = await foundry.applications.handlebars.renderTemplate('systems/dark-heresy-2nd/templates/chat/assign-damage-chat.hbs', this);
        let chatData = {
            user: game.user.id,
            rollMode: game.settings.get('core', 'messageMode'),
            content: html,
            style: CONST.CHAT_MESSAGE_STYLES.OTHER,
        };
        if (['gm', 'blind'].includes(chatData.rollMode)) {
            chatData.whisper = ChatMessage.getWhisperRecipients('GM');
        } else if (chatData.rollMode === 'self') {
            chatData.whisper = [game.user];
        }
        ChatMessage.create(chatData);
    }
}
