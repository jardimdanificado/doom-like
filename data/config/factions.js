export const FACTIONS = {
    PLAYER: { id: 'player', name: 'Jogador' },
    VILLAGE: { id: 'village', name: 'Vila' },
    GUARD: { id: 'guard', name: 'Guarda' },
    OUTLAW: { id: 'outlaw', name: 'Bandidos' }
};

export const FACTION_RELATIONS = {
    player: { player: 'friendly', village: 'friendly', guard: 'friendly', outlaw: 'hostile' },
    village: { player: 'friendly', village: 'friendly', guard: 'friendly', outlaw: 'hostile' },
    guard: { player: 'friendly', village: 'friendly', guard: 'friendly', outlaw: 'hostile' },
    outlaw: { player: 'hostile', village: 'hostile', guard: 'hostile', outlaw: 'friendly' }
};

export function getFactionRelation(a, b) {
    if (a === b) return 'friendly';
    const row = FACTION_RELATIONS[a];
    if (row && row[b]) return row[b];
    return 'hostile';
}

export const FACTION_ORDER = [
    FACTIONS.VILLAGE.id,
    FACTIONS.GUARD.id,
    FACTIONS.OUTLAW.id,
    FACTIONS.PLAYER.id
];
