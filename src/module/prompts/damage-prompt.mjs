import { sendActionDataToChat } from '../rolls/roll-helpers.mjs';
import { ActionData } from '../rolls/action-data.mjs';

const { DialogV2 } = foundry.applications.api;

export async function prepareDamageRoll(rollData) {
    rollData.dh = CONFIG.dh;
    const content = await foundry.applications.handlebars.renderTemplate(
        'systems/dark-heresy-2nd/templates/prompt/damage-roll-prompt.hbs',
        rollData,
    );

    await DialogV2.wait({
        window: { title: 'Damage Roll' },
        position: { width: 300 },
        content,
        buttons: [
            {
                action: 'roll',
                label: 'Roll',
                icon: 'fa-solid fa-dice-d20',
                default: true,
                callback: async (event, button) => {
                    // DialogV2 renders `content` inside its own <form>; `button.form.elements`
                    // is keyed by the name/id of each control in that form.
                    const fields = button.form.elements;

                    const actionData = new ActionData();
                    actionData.template = 'systems/dark-heresy-2nd/templates/chat/damage-roll-chat.hbs';

                    rollData.damage = fields.damage.value;
                    rollData.penetration = fields.penetration.value;
                    rollData.damageType = fields.damageType.value;
                    rollData.pr = fields.pr?.value;
                    rollData.template = 'systems/dark-heresy-2nd/templates/chat/damage-roll-chat.hbs';
                    rollData.roll = new Roll(rollData.damage, rollData);
                    await rollData.roll.evaluate();

                    actionData.rollData = rollData;
                    await sendActionDataToChat(actionData);
                },
            },
            {
                action: 'cancel',
                label: 'Cancel',
                icon: 'fa-solid fa-xmark',
            },
        ],
        rejectClose: false,
    });
}
