export default {
    STONE: {
        id: 1,
        name: 'Pedra',
        solid: true,
        hasGravity: false,
        maxHP: 100,
        breakDamage: 20,
        isFloor: false,
        textures: {
            all: 'stone'
        }
    },
    GRASS: {
        id: 2,
        name: 'Grama',
        solid: true,
        hasGravity: false,
        maxHP: 50,
        breakDamage: 30,
        isFloor: false,
        textures: {
            top: 'grass',
            side: 'dirt',
            bottom: 'dirt'
        }
    },
    WOOD: {
        id: 3,
        name: 'Madeira',
        solid: true,
        hasGravity: false,
        maxHP: 75,
        breakDamage: 25,
        isFloor: false,
        textures: {
            all: 'wood'
        }
    },
    GOLD: {
        id: 4,
        name: 'Ouro',
        solid: true,
        hasGravity: false,
        maxHP: 150,
        breakDamage: 40,
        isFloor: false,
        textures: {
            all: 'gold'
        },
        onUse: function(world, block, creature) {
            console.log('Bloco de ouro ativado!');
            block.material.forEach(mat => {
                mat.emissive = new THREE.Color(0xFFD700);
                mat.emissiveIntensity = 0.5;
            });
            setTimeout(() => {
                block.material.forEach(mat => {
                    mat.emissiveIntensity = 0;
                });
            }, 1000);
        }
    },
    DOOR: {
        id: 5,
        name: 'Porta',
        solid: true,
        hasGravity: false,
        maxHP: 60,
        breakDamage: 22,
        isFloor: false,
        textures: {
            all: 'door'
        },
        onUse: function(world, block, creature) {
            if (block.userData.solid) {
                block.userData.solid = false;
                block.material.forEach(mat => {
                    mat.opacity = 0.3;
                });
                console.log('Porta aberta!');
            } else {
                block.userData.solid = true;
                block.material.forEach(mat => {
                    mat.opacity = 0.8;
                });
                console.log('Porta fechada!');
            }
        }
    },
    SAND: {
        id: 6,
        name: 'Areia',
        solid: true,
        hasGravity: true,
        maxHP: 40,
        breakDamage: 35,
        isFloor: false,
        textures: {
            all: 'sand'
        }
    }
};
