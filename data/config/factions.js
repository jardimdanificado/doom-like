export const FACTIONS = {
    PLAYER: { id: 'player', name: 'Jogador' },
    VILLAGE: { id: 'village', name: 'Vila' },
    GUARD: { id: 'guard', name: 'Guarda' },
    OUTLAW: { id: 'outlaw', name: 'Bandidos' },
    ANIMAL_FRIENDLY: { id: 'animal_friendly', name: 'Animais dóceis' },
    ANIMAL_PREY: { id: 'animal_prey', name: 'Animais presa' },
    ANIMAL_PREDATOR: { id: 'animal_predator', name: 'Predadores' },
    BEAST: { id: 'beast', name: 'Feras' },
    AQUATIC: { id: 'aquatic', name: 'Aquáticos' },
    UNDEAD: { id: 'undead', name: 'Mortos-Vivos' },
    DEMON: { id: 'demon', name: 'Demônios' },
    ABYSS: { id: 'abyss', name: 'Abismo' },
    INFERNAL: { id: 'infernal', name: 'Infernais' },
    PLANT: { id: 'plant', name: 'Plantas vibrantes' },
    INFESTED_PLANT: { id: 'infested_plant', name: 'Plantas corrompidas' },
    CONSTRUCT: { id: 'construct', name: 'Constructos' },
    SPIRIT: { id: 'spirit', name: 'Espíritos da floresta' },
    ELEMENTAL: { id: 'elemental', name: 'Elementais' },
    CULT: { id: 'cult', name: 'Culto sombrio' },
    HUNTER: { id: 'hunter', name: 'Caçadores' }
};

const FRIENDLY_GROUPS = {
    player: ['plant', 'player', 'village', 'guard', 'animal_friendly', 'animal_prey', 'spirit'],
    village: ['plant', 'player', 'village', 'guard', 'animal_friendly', 'animal_prey', 'spirit'],
    guard: ['plant', 'player', 'village', 'guard', 'animal_friendly', 'animal_prey', 'hunter'],
    outlaw: ['outlaw', 'animal_predator'],
    animal_friendly: ['animal_friendly', 'animal_prey', 'player', 'village', 'guard', 'spirit'],
    animal_prey: ['animal_prey', 'animal_friendly', 'spirit', 'player', 'village', 'guard'],
    animal_predator: ['animal_predator', 'abyss', 'infernal', 'cult'],
    beast: ['beast', 'animal_predator'],
    hunter: ['hunter', 'guard', 'village', 'player'],
    aquatic: ['aquatic'],
    undead: ['undead', 'demon', 'abyss', 'infested_plant'],
    demon: ['undead', 'demon', 'abyss', 'infernal', 'cult'],
    abyss: ['abyss', 'demon', 'undead', 'animal_predator', 'infested_plant', 'cult'],
    infernal: ['infernal', 'demon', 'abyss'],
    plant: ['plant', 'player', 'village', 'guard', 'animal_friendly', 'spirit'],
    infested_plant: ['infested_plant', 'abyss', 'infernal', 'demon'],
    construct: ['construct', 'player', 'guard'],
    spirit: ['spirit', 'plant', 'animal_friendly', 'animal_prey'],
    elemental: ['elemental', 'spirit'],
    cult: ['cult', 'demon', 'abyss', 'infernal']
};

export const FACTION_RELATIONS = Object.values(FACTIONS).reduce((acc, faction) => {
    const id = faction.id;
    acc[id] = {};
    const friends = FRIENDLY_GROUPS[id] || [id];
    for (const other of Object.values(FACTIONS)) {
        acc[id][other.id] = friends.includes(other.id) ? 'friendly' : 'hostile';
    }
    return acc;
}, {});

export function getFactionRelation(a, b) {
    if (a === b) return 'friendly';
    const row = FACTION_RELATIONS[a];
    if (row && row[b]) return row[b];
    return 'hostile';
}

export const FACTION_ORDER = [
    FACTIONS.VILLAGE.id,
    FACTIONS.GUARD.id,
    FACTIONS.PLAYER.id,
    FACTIONS.ANIMAL_FRIENDLY.id,
    FACTIONS.ANIMAL_PREY.id,
    FACTIONS.ANIMAL_PREDATOR.id,
    FACTIONS.BEAST.id,
    FACTIONS.HUNTER.id,
    FACTIONS.PLANT.id,
    FACTIONS.INFESTED_PLANT.id,
    FACTIONS.SPIRIT.id,
    FACTIONS.ELEMENTAL.id,
    FACTIONS.OUTLAW.id,
    FACTIONS.AQUATIC.id,
    FACTIONS.UNDEAD.id,
    FACTIONS.ABYSS.id,
    FACTIONS.DEMON.id,
    FACTIONS.INFERNAL.id,
    FACTIONS.CULT.id,
    FACTIONS.CONSTRUCT.id
];
