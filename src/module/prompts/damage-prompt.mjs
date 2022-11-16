import { sendAttackDataToChat } from '../rolls/roll-helpers.mjs';
import { AttackData } from '../rolls/attack-data.mjs';

export async function prepareDamageRoll(rollData) {
    rollData.dh = CONFIG.dh;
    const html = await renderTemplate('systems/dark-heresy-2nd/templates/prompt/damage-roll-prompt.hbs', rollData);
    let dialog = new Dialog(
        {
            title: 'Damage Roll',
            content: html,
            buttons: {
                roll: {
                    icon: "<i class='dh-material'>casino</i>",
                    label: 'Roll',
                    callback: async (html) => {
                        rollData.damage = html.find('#damage')[0].value;
                        rollData.penetration = html.find('#penetration')[0].value;
                        rollData.damageType = html.find('[name=damageType] :selected').val();
                        rollData.pr = html.find('#pr')[0]?.value;
                        rollData.template = 'systems/dark-heresy-2nd/templates/chat/damage-roll-chat.hbs';
                        rollData.roll = new Roll(rollData.damage, rollData);
                        const attackData = new AttackData();
                        attackData.rollData = rollData;
                        await sendAttackDataToChat(attackData);
                    },
                },
                cancel: {
                    icon: "<i class='dh-material'>close</i>",
                    label: 'Cancel',
                    callback: () => {},
                },
            },
            default: 'roll',
            close: () => {},
        },
        {
            width: 300,
        },
    );
    dialog.render(true);
}
