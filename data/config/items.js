export default {
    MEDKIT: {
        id: 'medkit',
        name: 'Kit Medico',
        placeable: false,
        textureKey: 'wood',
        isConsumable: true,
        use: (world, entity, amount) => {
            const heal = 25 * amount;
            entity.hp = Math.min(entity.maxHP || 100, (entity.hp || 0) + heal);
        }
    }
};
