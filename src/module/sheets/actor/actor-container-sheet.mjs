import { toggleUIExpanded } from '../../rules/config.mjs';
import { DHBasicActionManager } from '../../actions/basic-action-manager.mjs';
import { prepareCreateSpecialistSkillPrompt } from '../../prompts/simple-prompt.mjs';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

/**
 * Shared Actor functions for Actor that contains embedded items.
 *
 * ApplicationV2 base class for every Dark Heresy actor sheet. All click behaviour is declarative:
 * markup carries `data-action="<name>"` and the handler is resolved from `DEFAULT_OPTIONS.actions`.
 * Handlers are invoked with `this` bound to the sheet instance and the signature `(event, target)`
 * where `target` is the element which carried the `data-action` attribute.
 */
export class ActorContainerSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        classes: ['dark-heresy-2nd', 'actor'],
        position: {
            width: 1000,
            height: 750,
        },
        window: {
            resizable: true,
        },
        form: {
            // `handler` is inherited from DocumentSheetV2 (the standard document update handler).
            submitOnChange: true,
            closeOnSubmit: false,
        },
        actions: {
            addSkill(event, target) {
                return this._addSpecialistSkill(event, target);
            },
            effectCreate(event, target) {
                return this._effectCreate(event, target);
            },
            effectDelete(event, target) {
                return this._effectDelete(event, target);
            },
            effectDisable(event, target) {
                return this._effectDisable(event, target);
            },
            effectEdit(event, target) {
                return this._effectEdit(event, target);
            },
            effectEnable(event, target) {
                return this._effectEnable(event, target);
            },
            itemCreate(event, target) {
                return this._onItemCreate(event, target);
            },
            itemDamage(event, target) {
                return this._onItemDamage(event, target);
            },
            itemDelete(event, target) {
                return this._onItemDelete(event, target);
            },
            itemEdit(event, target) {
                return this._onItemEdit(event, target);
            },
            itemRoll(event, target) {
                return this._onItemRoll(event, target);
            },
            itemVocalize(event, target) {
                return this._onItemVocalize(event, target);
            },
            sheetControlHideToggle(event, target) {
                return this._sheetControlHideToggle(event, target);
            },
        },
    };

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.actor = this.actor;
        context.dh = CONFIG.dh;
        context.effects = this.actor.getEmbeddedCollection('ActiveEffect').contents;
        return context;
    }

    /* -------------------------------------------- */
    /*  Drag and Drop                               */
    /* -------------------------------------------- */

    /**
     * The system uses two distinct drag sources: `.item-drag` for embedded Items and `.actor-drag`
     * for synthetic payloads (characteristics / skills). Replace the core single-selector DragDrop
     * with one that watches both, then dispatch in {@link ActorContainerSheet#_onDragStart}.
     * @type {DragDrop}
     * @override
     */
    get _dragDrop() {
        return (this.#dragDrop ??= new foundry.applications.ux.DragDrop.implementation({
            dragSelector: '.item-drag, .actor-drag',
            permissions: {
                dragstart: this._canDragStart.bind(this),
                drop: this._canDragDrop.bind(this),
            },
            callbacks: {
                dragstart: this._onDragStart.bind(this),
                dragover: this._onDragOver.bind(this),
                drop: this._onDrop.bind(this),
            },
        }));
    }

    /** @type {DragDrop|null} */
    #dragDrop = null;

    /** @inheritDoc */
    async _onDragStart(event) {
        const element = event.currentTarget;
        if (element?.classList.contains('item-drag')) return this._onItemDragStart(event);
        if (element?.classList.contains('actor-drag')) return this._onActorDragStart(event);
        return super._onDragStart(event);
    }

    /** @inheritDoc */
    async _onDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        game.dh.log('Actor _onDrop', event);

        try {
            const data = JSON.parse(event.dataTransfer.getData('text/plain'));
            if (data.type === 'Item' || data.type === 'item') {
                game.dh.log('Checking if item already exists', data);
                // Check if Item already Exists
                if (this.actor.items.find((i) => i._id === data?.data?._id)) {
                    game.dh.log('Item already exists on Actor -- ignoring');
                    return false;
                } else {
                    return super._onDrop(event);
                }
            }
        } catch (err) {
            game.dh.log('Actor Container | drop error', err);
            return false;
        }
    }

    async _onItemDragStart(event) {
        event.stopPropagation();
        game.dh.log('Actor:_onItemDragStart', event);

        const element = event.currentTarget;
        if (!element.dataset?.itemId) {
            game.dh.warn('No Item Id - Cancelling Drag');
            return;
        }

        const itemId = element.dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (!item) {
            // Cannot find item on actor? Just let foundry handle it...
            game.dh.log('Default Foundry Handler');
            return super._onDragStart(event);
        }

        // Create drag data
        const dragData = {
            actorId: this.actor.id,
            uuid: this.actor.uuid,
            actorName: this.actor.name,
            sceneId: this.actor.isToken ? canvas.scene?.id : null,
            tokenId: this.actor.isToken ? this.actor.token?.id : null,
            type: 'Item',
            data: item,
        };
        event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
    }

    async _onActorDragStart(event) {
        event.stopPropagation();
        game.dh.log('_onActorDragStart', event);
        const element = event.currentTarget;
        if (!element.dataset?.itemType) {
            game.dh.warn('No Drag Type - Cancelling Drag');
            return;
        }

        // Create drag data
        const dragType = element.dataset.itemType;
        const dragData = {
            actorId: this.actor.id,
            uuid: this.actor.uuid,
            actorName: this.actor.name,
            sceneId: this.actor.isToken ? canvas.scene?.id : null,
            tokenId: this.actor.isToken ? this.actor.token?.id : null,
            type: dragType,
            data: {},
        };

        switch (dragType) {
            case 'characteristic': {
                const characteristic = this.actor.characteristics[element.dataset.itemId];
                dragData.data = {
                    name: characteristic.label,
                    characteristic: element.dataset.itemId,
                };
                event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
                return;
            }
            case 'skill': {
                const skill = this.actor.skills[element.dataset.itemId];
                let name = skill.label;
                if (element.dataset.speciality) {
                    const speciality = skill.specialities[element.dataset.speciality];
                    name = `${name}: ${speciality.label}`;
                }
                dragData.data = {
                    name,
                    skill: element.dataset.itemId,
                    speciality: element.dataset.speciality,
                };
                event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
                return;
            }
            default:
                // Let default Foundry handler deal with default drag cases.
                game.dh.warn('No handler for drag type: ' + dragType + ' Using default foundry handler.');
                return super._onDragStart(event);
        }
    }

    /* -------------------------------------------- */
    /*  Action Handlers                             */
    /* -------------------------------------------- */

    async _addSpecialistSkill(event, target) {
        event.preventDefault();
        const specialistSkill = target.dataset.skill;
        const skill = this.actor.system.skills[specialistSkill];
        if (!skill) {
            ui.notifications.warn(`Skill not specified -- unexpected error.`);
            return;
        }
        await prepareCreateSpecialistSkillPrompt({
            actor: this.actor,
            skill: skill,
            skillName: specialistSkill,
        });
    }

    async _onItemDamage(event, target) {
        event.preventDefault();
        await this.actor.damageItem(target.dataset.itemId);
    }

    async _onItemRoll(event, target) {
        event.preventDefault();
        await this.actor.rollItem(target.dataset.itemId);
    }

    async _onItemCreate(event, target) {
        event.preventDefault();
        const type = target.dataset.type;
        const data = {
            name: `New ${type.capitalize()}`,
            type: type,
        };
        await this.actor.createEmbeddedDocuments('Item', [data], { renderSheet: true });
    }

    _onItemEdit(event, target) {
        event.preventDefault();
        const item = this.actor.items.get(target.dataset.itemId);
        item.sheet.render({ force: true });
    }

    async _onItemDelete(event, target) {
        event.preventDefault();
        const itemId = target.dataset.itemId;
        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: 'Confirm Delete' },
            content: '<p>Are you sure you would like to delete this?</p>',
            modal: true,
        });
        if (!confirmed) return;
        await this.actor.deleteEmbeddedDocuments('Item', [itemId]);
        await this.render();
    }

    async _onItemVocalize(event, target) {
        event.preventDefault();
        const item = this.actor.items.get(target.dataset.itemId);
        await DHBasicActionManager.sendItemVocalizeChat({
            actor: this.actor.name,
            name: item.name,
            type: item.type?.toUpperCase(),
            description: await foundry.applications.ux.TextEditor.enrichHTML(item.system.benefit ?? item.system.description, {
                rollData: { actor: this.actor, item: this, pr: this.actor.psy.rating },
            }),
        });
    }

    /**
     * Generic Sheet Hide/Show option for all embedded fields
     */
    async _sheetControlHideToggle(event, target) {
        event.preventDefault();
        target.querySelector('span')?.classList.toggle('active');
        const toggle = target.dataset.toggle;
        for (const element of this.element.querySelectorAll(`.${CSS.escape(toggle)}`)) {
            element.style.display = element.style.display === 'none' ? '' : 'none';
        }
        toggleUIExpanded(toggle);
    }

    async _effectDisable(event, target) {
        event.preventDefault();
        const effect = this.actor.effects.get(target.dataset.effectId);
        await effect.update({ disabled: true });
    }

    async _effectEnable(event, target) {
        event.preventDefault();
        const effect = this.actor.effects.get(target.dataset.effectId);
        await effect.update({ disabled: false });
    }

    async _effectDelete(event, target) {
        event.preventDefault();
        const effect = this.actor.effects.get(target.dataset.effectId);
        await effect.delete();
    }

    async _effectEdit(event, target) {
        event.preventDefault();
        const effect = this.actor.effects.get(target.dataset.effectId);
        effect.sheet.render({ force: true });
    }

    async _effectCreate(event) {
        event.preventDefault();
        return this.actor.createEmbeddedDocuments(
            'ActiveEffect',
            [
                {
                    name: 'New Effect',
                    label: 'New Effect',
                    icon: 'icons/svg/aura.svg',
                    origin: this.actor.uuid,
                    disabled: true,
                },
            ],
            { renderSheet: true },
        );
    }
}
