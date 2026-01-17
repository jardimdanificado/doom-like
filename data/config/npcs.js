export default {
    VILLAGER: {
        id: 1,
        name: 'Aldeão',
        texture: 'npc',
        width: 0.8,
        height: 1.6,
        interactable: true,
        faction: 'village',
        isHostile: false,
        maxHP: 100,
        dialogue: 'Olá, viajante! Bem-vindo à vila!'
    },
    GUARD: {
        id: 2,
        name: 'Guarda',
        texture: 'npc',
        width: 0.8,
        height: 1.6,
        interactable: true,
        faction: 'guard',
        isHostile: false,
        maxHP: 150,
        dialogue: 'Mantenha a paz por aqui!'
    },
    OUTLAW: {
        id: 3,
        name: 'Bandido',
        texture: 'npc',
        width: 0.8,
        height: 1.6,
        interactable: true,
        faction: 'outlaw',
        isHostile: true,
        maxHP: 80,
        dialogue: 'Fique fora do meu caminho.'
    }
};
