import { DarkHeresyBaseActor } from './base-actor.mjs';

export class DarkHeresyWarband extends DarkHeresyBaseActor {
    get subtlety() {
        return this.system.subtlety;
    }
}
