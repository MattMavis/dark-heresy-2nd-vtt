export function getHitLocationForRoll(roll) {
    game.dh.log('getHitLocationForRoll', roll);
    // Percentile digits must be reversed as a two-digit pair: 05 reverses to 50, not 5,
    // and 100 is read as '00', which reverses to itself and counts as 100.
    const rollString = (roll % 100).toString().padStart(2, '0').split('');
    const reverseArray = rollString.reverse();
    const joinArray = reverseArray.join('');
    const reverseInt = parseInt(joinArray) || 100;
    return creatureHitLocations().find((i) => (reverseInt >= i.min) && (reverseInt <= i.max))?.name;
}

export function hitDropdown() {
    const dropdown = {};
    creatureHitLocations().forEach((i) => {
        dropdown[i.name] = i.name;
    });
    return dropdown;
}

export function hitLocationNames() {
    return creatureHitLocations().map((i) => i.name);
}

export function additionalHitLocations() {
    return {
        'Head': [
            'Head',
            'Head',
            'Right Arm',
            'Body',
            'Left Arm',
            'Body'
        ],
        'Right Arm': [
            'Right Arm',
            'Right Arm',
            'Body',
            'Head',
            'Body',
            'Right Arm'
        ],
        'Left Arm': [
            'Left Arm',
            'Left Arm',
            'Body',
            'Head',
            'Body',
            'Left Arm'
        ],
        'Body': [
            'Body',
            'Body',
            'Left Arm',
            'Head',
            'Right Arm',
            'Body'
        ],
        'Right Leg': [
            'Right Leg',
            'Right Leg',
            'Body',
            'Right Arm',
            'Head',
            'Body'
        ],
        'Left Leg': [
            'Left Leg',
            'Left Leg',
            'Body',
            'Left Arm',
            'Head',
            'Body'
        ]
    }
}

export function creatureHitLocations() {
    return [
        {
            name: 'Head',
            min: 0,
            max: 10,
        },
        {
            name: 'Right Arm',
            min: 11,
            max: 20,
        },
        {
            name: 'Left Arm',
            min: 21,
            max: 30,
        },
        {
            name: 'Body',
            min: 31,
            max: 70,
        },
        {
            name: 'Right Leg',
            min: 71,
            max: 85,
        },
        {
            name: 'Left Leg',
            min: 86,
            max: 100,
        },
    ];
}
