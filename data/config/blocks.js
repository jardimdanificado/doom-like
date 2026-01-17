export default {
    STONE: {
        id: 1,
        name: 'Pedra',
        solid: true,
        maxHP: 100,
        breakDamage: 14,
        bulletSpeed: 0.3,
        bulletLifetime: 50,
        isFloor: false,
        opacity: 1,
        droppable: true,
        textures: {
            all: 'stone'
        }
    },
    GRASS: {
        id: 2,
        name: 'Grama',
        solid: true,
        maxHP: 50,
        breakDamage: 3,
        bulletSpeed: 0.18,
        bulletLifetime: 20,
        isFloor: false,
        opacity: 1,
        droppable: true,
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
        maxHP: 75,
        breakDamage: 10,
        bulletSpeed: 0.25,
        bulletLifetime: 35,
        isFloor: false,
        opacity: 1,
        droppable: true,
        textures: {
            all: 'wood'
        }
    },
    GOLD: {
        id: 4,
        name: 'Ouro',
        solid: true,
        maxHP: 150,
        breakDamage: 20,
        bulletSpeed: 0.32,
        bulletLifetime: 55,
        isFloor: false,
        opacity: 1,
        droppable: true,
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
        maxHP: 60,
        breakDamage: 8,
        bulletSpeed: 0.18,
        bulletLifetime: 16,
        isFloor: false,
        opacity: 1,
        droppable: false,
        textures: {
            all: 'door'
        },
        onUse: function(world, block, creature) {
            const isOpening = block.userData.solid;
            const targetSolid = !isOpening;
            const visited = new Set();
            const queue = [{ x: block.userData.x, y: block.userData.y, z: block.userData.z }];
            
            while (queue.length > 0) {
                const current = queue.shift();
                const key = `${current.x},${current.y},${current.z}`;
                if (visited.has(key)) continue;
                visited.add(key);
                
                const targetBlock = world.blocks.find((b) =>
                    Math.abs(b.x - current.x) < 0.01 &&
                    Math.abs(b.y - current.y) < 0.01 &&
                    Math.abs(b.z - current.z) < 0.01 &&
                    b.type.id === 5
                );
                if (!targetBlock) continue;
                
                targetBlock.solid = targetSolid;
                if (block.userData &&
                    Math.abs(block.userData.x - current.x) < 0.01 &&
                    Math.abs(block.userData.y - current.y) < 0.01 &&
                    Math.abs(block.userData.z - current.z) < 0.01) {
                    block.userData.solid = targetSolid;
                }
                if (targetBlock.mesh && Array.isArray(targetBlock.mesh.material)) {
                    targetBlock.mesh.material.forEach(mat => {
                        mat.opacity = targetSolid ? (targetBlock.type.opacity ?? 1) : 0.35;
                        mat.transparent = mat.opacity < 1;
                    });
                }
                
                const neighbors = [
                    { x: current.x + 1, y: current.y, z: current.z },
                    { x: current.x - 1, y: current.y, z: current.z },
                    { x: current.x, y: current.y, z: current.z + 1 },
                    { x: current.x, y: current.y, z: current.z - 1 },
                    { x: current.x, y: current.y + 1, z: current.z },
                    { x: current.x, y: current.y - 1, z: current.z }
                ];
                queue.push(...neighbors);
            }
        }
    },
    SAND: {
        id: 6,
        name: 'Areia',
        solid: true,
        maxHP: 40,
        breakDamage: 2,
        bulletSpeed: 0.18,
        bulletLifetime: 18,
        isFloor: false,
        opacity: 1,
        droppable: true,
        textures: {
            all: 'sand'
        }
    },
    PLAYER_SPAWN: {
        id: 7,
        name: 'Spawn Player',
        solid: false,
        maxHP: 99999999,
        breakDamage: 0,
        bulletSpeed: 0.22,
        bulletLifetime: 26,
        isFloor: false,
        opacity: 1,
        droppable: false,
        render: 'cross',
        editorOnly: true,
        textures: {
            all: 'gold'
        }
    },
    PLANT: {
        id: 8,
        name: 'Planta',
        solid: false,
        maxHP: 10,
        breakDamage: 4,
        bulletSpeed: 0.25,
        bulletLifetime: 30,
        isFloor: false,
        opacity: 1,
        droppable: true,
        render: 'cross',
        textures: {
            all: 'grass'
        }
    },
    
    
};
