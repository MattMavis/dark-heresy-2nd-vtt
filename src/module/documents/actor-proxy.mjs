import { DarkHeresyAcolyte } from './acolyte.mjs';
import { DarkHeresyVehicle } from './vehicle.mjs';
import { DarkHeresyNPC } from './npc.mjs';

const actorMappings = {
    'acolyte': DarkHeresyAcolyte,
    'npc': DarkHeresyNPC,
    'vehicle': DarkHeresyVehicle
}

export const DarkHeresyActorProxy = new Proxy(function () {}, {
    //Will intercept calls to the "new" operator
    construct: function (target, args) {
        const [data] = args;

        //Handle missing mapping entries
        if (!actorMappings.hasOwnProperty(data.type))
            throw new Error("Unsupported Entity type for create(): " + data.type);

        //Return the appropriate, actual object from the right class
        return new actorMappings[data.type](...args);
    },
    //Property access on this weird, dirty proxy object
    get: function (target, prop, receiver) {
        switch (prop) {
            case "create":
            case "createDocuments":
                //Calling the class' create() static function
                return function (data, options) {
                    if (data.constructor === Array) {
                        //Array of data, this happens when creating Actors imported from a compendium
                        return data.map(i => DarkHeresyAcolyte.create(i, options));
                    }

                    if (!actorMappings.hasOwnProperty(data.type))
                        throw new Error("Unsupported Entity type for create(): " + data.type);

                    return actorMappings[data.type].create(data, options);
                };

            case Symbol.hasInstance:
                //Applying the "instanceof" operator on the instance object
                return function (instance) {
                    return Object.values(actorMappings).some(i => instance instanceof i);
                };

            default:
                //Just forward any requested properties to the base Actor class
                return Actor[prop];
        }
    },
});
