import { sendActionDataToChat } from '../rolls/roll-helpers.mjs';

const { DialogV2 } = foundry.applications.api;

/**
 *
 * @param simpleSkillData {SimpleSkillData}
 * @returns {Promise<void>}
 */
export async function prepareSimpleRoll(simpleSkillData) {
    const content = await foundry.applications.handlebars.renderTemplate(
        'systems/dark-heresy-2nd/templates/prompt/simple-roll-prompt.hbs',
        simpleSkillData,
    );

    await DialogV2.wait({
        window: { title: 'Roll Modifier' },
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
                    const rollData = simpleSkillData.rollData;
                    rollData.modifiers['difficulty'] = parseInt(fields['modifiers.difficulty'].value);
                    rollData.modifiers['modifier'] = fields['modifiers.modifier'].value;
                    await rollData.calculateTotalModifiers();
                    await simpleSkillData.calculateSuccessOrFailure();
                    await sendActionDataToChat(simpleSkillData);
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

export async function prepareCreateSpecialistSkillPrompt(simpleSkillData) {
    const content = await foundry.applications.handlebars.renderTemplate(
        'systems/dark-heresy-2nd/templates/prompt/add-speciality-prompt.hbs',
        simpleSkillData,
    );

    await DialogV2.wait({
        window: { title: 'Create Specialist Skill' },
        position: { width: 300 },
        content,
        buttons: [
            {
                action: 'add',
                label: 'Add',
                icon: 'fa-solid fa-plus',
                default: true,
                callback: async (event, button) => {
                    const speciality = button.form.elements.specialityName.value;
                    await simpleSkillData.actor.addSpecialitySkill(simpleSkillData.skillName, speciality);
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
