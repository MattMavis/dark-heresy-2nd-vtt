import { toggleUIExpanded } from '../../rules/config.mjs';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/**
 * Base ApplicationV2 item sheet for the Dark Heresy 2nd Edition system.
 *
 * Provides the shared render context, active effect CRUD actions and the
 * "hide control" show/hide toggle used throughout the item templates.
 */
export class DarkHeresyItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        classes: ['dark-heresy-2nd', 'item'],
        position: { width: 650, height: 500 },
        window: { resizable: true },
        form: { submitOnChange: true, closeOnSubmit: false },
        actions: {
            effectCreate: DarkHeresyItemSheet.#onEffectCreate,
            effectDelete: DarkHeresyItemSheet.#onEffectDelete,
            effectDisable: DarkHeresyItemSheet.#onEffectDisable,
            effectEdit: DarkHeresyItemSheet.#onEffectEdit,
            effectEnable: DarkHeresyItemSheet.#onEffectEnable,
        },
    };

    /** @inheritDoc */
    static PARTS = {
        main: {
            template: 'systems/dark-heresy-2nd/templates/item/item-sheet.hbs',
            scrollable: [''],
        },
    };

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        context.item = this.item;
        context.flags = this.item.flags;
        context.dh = CONFIG.dh;
        context.effects = this.item.getEmbeddedCollection('ActiveEffect').contents;
        return context;
    }

    /** @inheritDoc */
    async _onFirstRender(context, options) {
        await super._onFirstRender(context, options);
        // The hide/show toggles live in shared partials which are not owned by the item sheets, so they are
        // still class-driven rather than data-action driven. A single delegated listener covers every re-render.
        this.element.addEventListener('click', this.#onClickElement.bind(this));
    }

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    /**
     * Delegated click handling for controls which cannot carry a `data-action` attribute.
     * @param {PointerEvent} event  The originating click event
     */
    #onClickElement(event) {
        const hideControl = event.target.closest('.sheet-control__hide-control');
        if (hideControl && this.element.contains(hideControl)) this._onToggleHideControl(event, hideControl);
    }

    /* -------------------------------------------- */

    /**
     * Toggle the visibility of the elements associated with a hide control.
     * @param {PointerEvent} event  The originating click event
     * @param {HTMLElement} target  The `.sheet-control__hide-control` element which was clicked
     * @protected
     */
    _onToggleHideControl(event, target) {
        event.preventDefault();
        target.querySelector('span')?.classList.toggle('active');
        const toggle = target.dataset.toggle;
        if (!toggle) return;
        for (const element of this.element.querySelectorAll(`.${CSS.escape(toggle)}`)) {
            const hidden = element.style.display === 'none' || getComputedStyle(element).display === 'none';
            element.style.display = hidden ? '' : 'none';
        }
        toggleUIExpanded(toggle);
    }

    /* -------------------------------------------- */

    /**
     * Resolve the ActiveEffect targeted by an action element.
     * @param {HTMLElement} target  The element which defined the action
     * @returns {ActiveEffect|undefined}
     * @protected
     */
    _getEffect(target) {
        const effectId = target.closest('[data-effect-id]')?.dataset.effectId;
        return effectId ? this.item.effects.get(effectId) : undefined;
    }

    /* -------------------------------------------- */

    /**
     * Create a new ActiveEffect on this Item.
     * @this {DarkHeresyItemSheet}
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static async #onEffectCreate(event, target) {
        if (!this.isEditable) return;
        return this.item.createEmbeddedDocuments(
            'ActiveEffect',
            [
                {
                    name: 'New Effect',
                    img: 'icons/svg/aura.svg',
                    origin: this.item.uuid,
                    disabled: true,
                },
            ],
            { renderSheet: true },
        );
    }

    /* -------------------------------------------- */

    /**
     * Delete an ActiveEffect from this Item.
     * @this {DarkHeresyItemSheet}
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static async #onEffectDelete(event, target) {
        if (!this.isEditable) return;
        await this._getEffect(target)?.delete();
    }

    /* -------------------------------------------- */

    /**
     * Render the sheet of an ActiveEffect on this Item.
     * @this {DarkHeresyItemSheet}
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static #onEffectEdit(event, target) {
        this._getEffect(target)?.sheet.render({ force: true });
    }

    /* -------------------------------------------- */

    /**
     * Enable an ActiveEffect on this Item.
     * @this {DarkHeresyItemSheet}
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static async #onEffectEnable(event, target) {
        if (!this.isEditable) return;
        await this._getEffect(target)?.update({ disabled: false });
    }

    /* -------------------------------------------- */

    /**
     * Disable an ActiveEffect on this Item.
     * @this {DarkHeresyItemSheet}
     * @param {PointerEvent} event
     * @param {HTMLElement} target
     */
    static async #onEffectDisable(event, target) {
        if (!this.isEditable) return;
        await this._getEffect(target)?.update({ disabled: true });
    }
}
