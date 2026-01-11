// ============================================================
// CONSTANTES E CONFIGURAÇÃO
// ============================================================
const CONFIG = {
    MOVE_SPEED: 0.1,
    LOOK_SPEED: 0.002,
    JUMP_FORCE: 0.15,
    GRAVITY: 0.008,
    ENTITY_HEIGHT: 1.7,
    ENTITY_RADIUS: 0.3,
    BLOCK_SIZE: 1,
    INTERACTION_RANGE: 3,
    PLACEMENT_RANGE: 5
};

import NPC_TYPES from "./npcs.js"
import BLOCK_TYPES from "./blocks.js"
import texturesToLoad from "./textures.js"

// ============================================================
// OBJETO WORLD - TUDO CENTRALIZADO
// ============================================================
const world = {
    // Dados públicos do mundo
    entities: [],
    blocks: [],
    projectiles: [],
    
    // Índice da entidade controlada pelo jogador
    playerEntityIndex: 0,
    
    // Mapa do mundo
    mapData: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,2,0,0,0,3,3,0,0,0,2,0,0,1],
        [1,0,0,0,0,0,5,0,0,0,0,0,0,0,1],
        [1,0,0,0,2,2,0,0,0,3,3,0,6,0,1],
        [1,0,3,0,2,2,0,0,0,3,3,0,6,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,4,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,2,0,0,3,3,0,0,0,2,2,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    
    // Estado da UI
    ui: {
        interactionTarget: null,
        targetBlockPosition: null
    },
    
    // Internos (Three.js, texturas, etc)
    _internal: {
        scene: null,
        camera: null,
        renderer: null,
        raycaster: new THREE.Raycaster(),
        blockTextures: {},
        texturesLoaded: false,
        keys: {},
        fallingBlocks: []
    },
    
    // Métodos públicos
    getPlayerEntity() {
        return this.entities[this.playerEntityIndex];
    },
    
    switchPlayerControl(entityIndex) {
        if (entityIndex >= 0 && entityIndex < this.entities.length) {
            this.playerEntityIndex = entityIndex;
            console.log(`Agora controlando: ${this.entities[entityIndex].name}`);
        }
    },
    
    addEntity(entityData) {
        const entity = {
            // Identificação
            id: this.entities.length,
            name: entityData.name || 'Entity',
            type: entityData.type || 'generic',
            
            // Posição e física
            x: entityData.x || 0,
            y: entityData.y || 2,
            z: entityData.z || 0,
            velocityY: 0,
            onGround: false,
            
            // Rotação (apenas para entidades controláveis)
            yaw: entityData.yaw || 0,
            pitch: entityData.pitch || 0,
            
            // Atributos
            hp: entityData.hp || 100,
            maxHP: entityData.maxHP || 100,
            
            // Flags
            isControllable: entityData.isControllable !== false,
            isInteractable: entityData.isInteractable !== false,
            
            // Inventário (apenas se necessário)
            inventory: entityData.inventory || null,
            selectedBlockType: entityData.selectedBlockType || BLOCK_TYPES.GRASS,
            
            // Referências Three.js
            mesh: entityData.mesh || null,
            
            // Comportamento customizado
            onInteract: entityData.onInteract || null,
            onUpdate: entityData.onUpdate || null,
            
            // Dados do NPC original (se aplicável)
            npcData: entityData.npcData || null
        };
        
        this.entities.push(entity);
        return entity;
    },
    
    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index > -1) {
            if (entity.mesh) {
                this._internal.scene.remove(entity.mesh);
            }
            this.entities.splice(index, 1);
            
            // Ajusta o índice do player se necessário
            if (this.playerEntityIndex > index) {
                // Se o player estava depois da entidade removida, ajusta o índice
                this.playerEntityIndex--;
            } else if (this.playerEntityIndex === index) {
                // Se removeu a entidade controlada, volta para o índice 0 (geralmente o player original)
                this.playerEntityIndex = 0;
                console.log(`Voltando controle para: ${this.entities[0].name}`);
                updateInventoryDisplay();
            }
        }
    },
    
    addBlock(x, y, z, blockType, isFloorBlock = false) {
        if (this.isPositionOccupied(x, y, z)) {
            return null;
        }
        
        const geometry = new THREE.BoxGeometry(CONFIG.BLOCK_SIZE, CONFIG.BLOCK_SIZE, CONFIG.BLOCK_SIZE);
        const materials = this.createBlockMaterials(blockType);
        const mesh = new THREE.Mesh(geometry, materials);
        
        mesh.position.set(x, y, z);
        
        const block = {
            mesh: mesh,
            x: x,
            y: y,
            z: z,
            type: blockType,
            solid: blockType.solid,
            hasGravity: blockType.hasGravity || false,
            velocityY: 0,
            hp: blockType.maxHP,
            maxHP: blockType.maxHP,
            isFloor: isFloorBlock,
            hasUseFunction: typeof blockType.onUse === 'function'
        };
        
        mesh.userData = block;
        
        this._internal.scene.add(mesh);
        this.blocks.push(block);
        
        if (blockType.hasGravity) {
            this._internal.fallingBlocks.push(block);
        }
        
        return block;
    },
    
    removeBlock(block) {
        const index = this.blocks.indexOf(block);
        if (index > -1) {
            this._internal.scene.remove(block.mesh);
            this.blocks.splice(index, 1);
            this._internal.fallingBlocks = this._internal.fallingBlocks.filter(b => b !== block);
        }
    },
    
    isPositionOccupied(x, y, z) {
        for (let block of this.blocks) {
            const dx = Math.abs(block.x - x);
            const dy = Math.abs(block.y - y);
            const dz = Math.abs(block.z - z);
            
            if (dx < 0.01 && dy < 0.01 && dz < 0.01) {
                return true;
            }
        }
        return false;
    },
    
    createBlockMaterials(blockType) {
        const textures = this._internal.blockTextures;
        
        if (blockType.textures.all) {
            const mat = new THREE.MeshLambertMaterial({ 
                map: textures[blockType.textures.all],
                flatShading: true,
                transparent: blockType.id === BLOCK_TYPES.DOOR.id,
                opacity: blockType.id === BLOCK_TYPES.DOOR.id ? 0.8 : 1
            });
            return [mat, mat, mat, mat, mat, mat];
        } else if (blockType.textures.top) {
            const topMat = new THREE.MeshLambertMaterial({ 
                map: textures[blockType.textures.top],
                flatShading: true
            });
            const sideMat = new THREE.MeshLambertMaterial({ 
                map: textures[blockType.textures.side],
                flatShading: true
            });
            const bottomMat = new THREE.MeshLambertMaterial({ 
                map: textures[blockType.textures.bottom],
                flatShading: true
            });
            return [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];
        }
    },
    
    checkCollision(x, y, z, entity) {
        const entityBox = {
            minX: x - CONFIG.ENTITY_RADIUS,
            maxX: x + CONFIG.ENTITY_RADIUS,
            minY: y,
            maxY: y + CONFIG.ENTITY_HEIGHT,
            minZ: z - CONFIG.ENTITY_RADIUS,
            maxZ: z + CONFIG.ENTITY_RADIUS
        };
        
        for (let block of this.blocks) {
            if (!block.solid) continue;
            
            const half = CONFIG.BLOCK_SIZE / 2;
            
            const blockBox = {
                minX: block.x - half,
                maxX: block.x + half,
                minY: block.y - half,
                maxY: block.y + half,
                minZ: block.z - half,
                maxZ: block.z + half
            };
            
            if (entityBox.maxX > blockBox.minX && entityBox.minX < blockBox.maxX &&
                entityBox.maxY > blockBox.minY && entityBox.minY < blockBox.maxY &&
                entityBox.maxZ > blockBox.minZ && entityBox.minZ < blockBox.maxZ) {
                return { collides: true, block: block };
            }
        }
        
        return { collides: false };
    }
};

// ============================================================
// INICIALIZAÇÃO
// ============================================================
function init() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 1, 50);
    
    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(1);
    document.body.appendChild(renderer.domElement);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);
    
    world._internal.scene = scene;
    world._internal.camera = camera;
    world._internal.renderer = renderer;
    
    loadTextures();
    createInventoryUI();
    
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', (e) => world._internal.keys[e.code] = false);
    
    document.addEventListener('click', () => {
        document.body.requestPointerLock();
    });
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    animate();
}

// ============================================================
// CARREGAMENTO DE TEXTURAS
// ============================================================
function loadTextures() {
    const loader = new THREE.TextureLoader();
    let loaded = 0;
    const total = texturesToLoad.length;
    
    function checkLoaded() {
        loaded++;
        if (loaded === total) {
            world._internal.texturesLoaded = true;
            createWorld();
            createEntities();
            updateInventoryDisplay();
        }
    }
    
    texturesToLoad.forEach(({ key, url }) => {
        loader.load(url, (tex) => {
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            world._internal.blockTextures[key] = tex;
            checkLoaded();
        }, undefined, () => {
            const canvas = document.createElement('canvas');
            canvas.width = 16;
            canvas.height = 16;
            const ctx = canvas.getContext('2d');
            
            const colors = {
                'stone': '#808080',
                'grass': '#228B22',
                'wood': '#8B4513',
                'dirt': '#654321',
                'gold': '#FFD700',
                'door': '#654321',
                'sand': '#C2B280'
            };
            
            ctx.fillStyle = colors[key] || '#888888';
            ctx.fillRect(0, 0, 16, 16);
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            world._internal.blockTextures[key] = texture;
            checkLoaded();
        });
    });
}

// ============================================================
// CRIAÇÃO DO MUNDO E ENTIDADES
// ============================================================
function createWorld() {
    const MAP_W = world.mapData[0].length;
    const MAP_H = world.mapData.length;
    
    for (let z = 0; z < MAP_H; z++) {
        for (let x = 0; x < MAP_W; x++) {
            const typeId = world.mapData[z][x];
            
            world.addBlock(x, -0.5, z, BLOCK_TYPES.STONE, false);
            
            if (typeId > 0) {
                const blockType = Object.values(BLOCK_TYPES).find(bt => bt.id === typeId);
                if (blockType) {
                    world.addBlock(x, 0.5, z, blockType, false);
                    
                    if (typeId === 1 || Math.random() < 0.2) {
                        world.addBlock(x, 1.5, z, blockType, false);
                    }
                }
            }
        }
    }
}

function createEntities() {
    // Cria o PLAYER como primeira entidade (SEM mesh visível)
    world.addEntity({
        name: 'Player',
        type: 'player',
        x: 7.5,
        y: 2,
        z: 5.5,
        isControllable: true,
        isInteractable: false,
        inventory: {
            [BLOCK_TYPES.STONE.id]: 20,
            [BLOCK_TYPES.GRASS.id]: 30,
            [BLOCK_TYPES.WOOD.id]: 25,
            [BLOCK_TYPES.GOLD.id]: 10,
            [BLOCK_TYPES.DOOR.id]: 15,
            [BLOCK_TYPES.SAND.id]: 20
        },
        selectedBlockType: BLOCK_TYPES.GRASS,
        npcData: NPC_TYPES.VILLAGER // Para ter textura quando não controlado
    });
    
    // Cria NPCs como entidades
    const npcSpawns = [
        { x: 3.5, z: 3.5, type: NPC_TYPES.VILLAGER },
        { x: 10.5, z: 5.5, type: NPC_TYPES.GUARD },
        { x: 7.5, z: 8.5, type: NPC_TYPES.MERCHANT },
        { x: 5.0, z: 2.5, type: NPC_TYPES.VILLAGER }
    ];
    
    npcSpawns.forEach(spawn => {
        world.addEntity({
            name: spawn.type.name,
            type: 'npc',
            x: spawn.x,
            y: 2,
            z: spawn.z,
            hp: spawn.type.maxHP,
            maxHP: spawn.type.maxHP,
            isControllable: true,
            isInteractable: true,
            npcData: spawn.type,
            inventory: {
                [BLOCK_TYPES.STONE.id]: 10,
                [BLOCK_TYPES.GRASS.id]: 10,
                [BLOCK_TYPES.WOOD.id]: 10
            },
            onInteract: (entity) => {
                const dialogue = entity.npcData.dialogue;
                alert(`${entity.name}: ${dialogue}`);
            }
        });
    });
}

// ============================================================
// UI E INVENTÁRIO
// ============================================================
function createInventoryUI() {
    const inventoryDiv = document.getElementById('inventory');
    
    Object.values(BLOCK_TYPES).forEach((blockType, index) => {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        slot.id = `slot-${blockType.id}`;
        slot.innerHTML = `
            <div>${blockType.name}</div>
            <div class="count" id="count-${blockType.id}">0</div>
        `;
        slot.onclick = () => selectBlockType(blockType);
        inventoryDiv.appendChild(slot);
    });
}

function updateInventoryDisplay() {
    const player = world.getPlayerEntity();
    if (!player || !player.inventory) {
        // Esconde inventário se não houver player com inventário
        Object.values(BLOCK_TYPES).forEach(blockType => {
            const countEl = document.getElementById(`count-${blockType.id}`);
            if (countEl) countEl.textContent = '0';
            
            const slotEl = document.getElementById(`slot-${blockType.id}`);
            if (slotEl) slotEl.classList.remove('selected');
        });
        return;
    }
    
    Object.values(BLOCK_TYPES).forEach(blockType => {
        const countEl = document.getElementById(`count-${blockType.id}`);
        if (countEl) {
            countEl.textContent = player.inventory[blockType.id] || 0;
        }
        
        const slotEl = document.getElementById(`slot-${blockType.id}`);
        if (slotEl) {
            if (player.selectedBlockType && player.selectedBlockType.id === blockType.id) {
                slotEl.classList.add('selected');
            } else {
                slotEl.classList.remove('selected');
            }
        }
    });
}

function selectBlockType(blockType) {
    const player = world.getPlayerEntity();
    if (player && player.inventory) {
        player.selectedBlockType = blockType;
        updateInventoryDisplay();
    }
}

// ============================================================
// INPUT
// ============================================================
function onKeyDown(e) {
    world._internal.keys[e.code] = true;
    const player = world.getPlayerEntity();
    
    if (e.code === 'Space' && player.onGround) {
        player.velocityY = CONFIG.JUMP_FORCE;
        player.onGround = false;
    }
    
    if (e.code === 'KeyE' && world.ui.interactionTarget) {
        handleInteraction(world.ui.interactionTarget);
    }
    
    // Troca de controle de entidades
    if (e.code === 'Tab') {
        e.preventDefault();
        const nextIndex = (world.playerEntityIndex + 1) % world.entities.length;
        world.switchPlayerControl(nextIndex);
        updateInventoryDisplay(); // Atualiza UI ao trocar
    }
    
    if (e.code === 'Digit1') selectBlockType(BLOCK_TYPES.STONE);
    if (e.code === 'Digit2') selectBlockType(BLOCK_TYPES.GRASS);
    if (e.code === 'Digit3') selectBlockType(BLOCK_TYPES.WOOD);
    if (e.code === 'Digit4') selectBlockType(BLOCK_TYPES.GOLD);
    if (e.code === 'Digit5') selectBlockType(BLOCK_TYPES.DOOR);
    if (e.code === 'Digit6') selectBlockType(BLOCK_TYPES.SAND);
}

function onMouseMove(event) {
    if (document.pointerLockElement !== document.body) return;
    
    const player = world.getPlayerEntity();
    if (player) {
        player.yaw -= event.movementX * CONFIG.LOOK_SPEED;
        player.pitch -= event.movementY * CONFIG.LOOK_SPEED;
        player.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.pitch));
    }
}

function onMouseDown(event) {
    if (document.pointerLockElement !== document.body) return;
    
    if (event.button === 0) {
        createProjectile();
    } else if (event.button === 2) {
        placeBlock();
    }
}

function onWindowResize() {
    world._internal.camera.aspect = window.innerWidth / window.innerHeight;
    world._internal.camera.updateProjectionMatrix();
    world._internal.renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================================
// INTERAÇÃO
// ============================================================
function handleInteraction(target) {
    // Se for um bloco
    if (target.type && target.hasUseFunction && target.type.onUse) {
        // Adaptador: converte estrutura nova para antiga esperada pelo blocks.js
        const blockAdapter = {
            userData: {
                x: target.x,
                y: target.y,
                z: target.z,
                type: target.type,
                solid: target.solid,
                isFloor: target.isFloor
            },
            material: target.mesh.material,
            position: {
                set: (x, y, z) => {
                    target.mesh.position.set(x, y, z);
                    target.x = x;
                    target.y = y;
                    target.z = z;
                }
            }
        };
        
        // Executa a função onUse
        target.type.onUse(blockAdapter);
        
        // Sincroniza o estado de volta
        target.solid = blockAdapter.userData.solid;
    } 
    // Se for uma entidade
    else if (target.onInteract) {
        target.onInteract(target);
    } else {
        console.log(`${target.name || 'Objeto'} não tem função de uso.`);
    }
}

function checkInteractionTarget() {
    const camera = world._internal.camera;
    const raycaster = world._internal.raycaster;
    
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    const blockMeshes = world.blocks.map(b => b.mesh);
    const entityMeshes = world.entities.filter(e => e.mesh).map(e => e.mesh);
    const allObjects = [...blockMeshes, ...entityMeshes];
    
    const intersects = raycaster.intersectObjects(allObjects);
    
    const interactionDiv = document.getElementById('interaction');
    const outlineDiv = document.getElementById('block-outline');
    
    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const distance = intersects[0].distance;
        
        // Verifica se é um bloco
        const block = world.blocks.find(b => b.mesh === hitMesh);
        if (block && distance < CONFIG.PLACEMENT_RANGE) {
            const normal = intersects[0].face.normal;
            
            let newX = block.x + Math.round(normal.x);
            let newY = block.y + Math.round(normal.y);
            let newZ = block.z + Math.round(normal.z);
            
            world.ui.targetBlockPosition = { x: newX, y: newY, z: newZ };
            outlineDiv.style.display = 'block';
            
            if (distance < CONFIG.INTERACTION_RANGE && block.hasUseFunction) {
                world.ui.interactionTarget = block;
                interactionDiv.textContent = `Pressione E para usar ${block.type.name}`;
                interactionDiv.style.display = 'block';
                return;
            }
        } else {
            world.ui.targetBlockPosition = null;
            outlineDiv.style.display = 'none';
        }
        
        // Verifica se é uma entidade
        const entity = world.entities.find(e => e.mesh === hitMesh);
        if (entity && distance < CONFIG.INTERACTION_RANGE && entity.isInteractable) {
            world.ui.interactionTarget = entity;
            interactionDiv.textContent = `Pressione E para interagir com ${entity.name}`;
            interactionDiv.style.display = 'block';
            return;
        }
    } else {
        world.ui.targetBlockPosition = null;
        outlineDiv.style.display = 'none';
    }
    
    world.ui.interactionTarget = null;
    interactionDiv.style.display = 'none';
}

// ============================================================
// SISTEMA DE PROJÉTEIS
// ============================================================
function createProjectile() {
    const player = world.getPlayerEntity();
    if (!player || !player.inventory) return;
    
    const ammoCount = player.inventory[player.selectedBlockType.id] || 0;
    
    if (ammoCount <= 0) {
        console.log(`Sem munição de ${player.selectedBlockType.name}!`);
        return;
    }
    
    player.inventory[player.selectedBlockType.id] = (player.inventory[player.selectedBlockType.id] || 0) - 1;
    updateInventoryDisplay();
    
    const damage = player.selectedBlockType.breakDamage;
    
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.position.copy(world._internal.camera.position);
    
    const direction = new THREE.Vector3();
    world._internal.camera.getWorldDirection(direction);
    
    const projectile = {
        mesh: mesh,
        velocity: direction.multiplyScalar(0.5),
        damage: damage,
        lifeTime: 100
    };
    
    world._internal.scene.add(mesh);
    world.projectiles.push(projectile);
}

function placeBlock() {
    const player = world.getPlayerEntity();
    if (!player || !player.inventory) return;
    if (!world.ui.targetBlockPosition) return;
    
    const ammoCount = player.inventory[player.selectedBlockType.id] || 0;
    
    if (ammoCount <= 0) {
        console.log(`Sem blocos de ${player.selectedBlockType.name}!`);
        return;
    }
    
    const { x, y, z } = world.ui.targetBlockPosition;
    
    const newBlock = world.addBlock(x, y, z, player.selectedBlockType, false);
    if (newBlock) {
        player.inventory[player.selectedBlockType.id] = (player.inventory[player.selectedBlockType.id] || 0) - 1;
        updateInventoryDisplay();
        console.log(`Bloco de ${player.selectedBlockType.name} colocado!`);
    } else {
        console.log('Posição já ocupada!');
    }
}

function updateProjectiles() {
    const playerEntity = world.getPlayerEntity();
    
    for (let i = world.projectiles.length - 1; i >= 0; i--) {
        const proj = world.projectiles[i];
        
        proj.mesh.position.add(proj.velocity);
        proj.lifeTime--;
        
        // Verifica colisão com entidades
        let hitEntity = false;
        for (let entity of world.entities) {
            // Não atira em si mesmo
            if (entity === playerEntity) continue;
            if (!entity.mesh) continue;
            
            const distance = proj.mesh.position.distanceTo(entity.mesh.position);
            if (distance < 0.5) {
                entity.hp -= proj.damage;
                console.log(`${entity.name} HP: ${entity.hp}/${entity.maxHP}`);
                
                entity.mesh.material.color.setHex(0xff0000);
                setTimeout(() => {
                    if (entity.mesh) entity.mesh.material.color.setHex(0xffffff);
                }, 100);
                
                if (entity.hp <= 0) {
                    console.log(`${entity.name} foi derrotado!`);
                    world.removeEntity(entity);
                }
                
                world._internal.scene.remove(proj.mesh);
                world.projectiles.splice(i, 1);
                hitEntity = true;
                break;
            }
        }
        
        if (hitEntity) continue;
        
        // Verifica colisão com blocos
        let hitBlock = false;
        for (let block of world.blocks) {
            const distance = Math.sqrt(
                Math.pow(proj.mesh.position.x - block.x, 2) +
                Math.pow(proj.mesh.position.y - block.y, 2) +
                Math.pow(proj.mesh.position.z - block.z, 2)
            );
            
            if (distance < 0.5) {
                block.hp -= proj.damage;
                
                const player = world.getPlayerEntity();
                
                if (Array.isArray(block.mesh.material)) {
                    const originalColors = [];
                    block.mesh.material.forEach((mat, idx) => {
                        originalColors[idx] = mat.color.clone();
                        mat.color.setHex(0xffffff);
                    });
                    setTimeout(() => {
                        if (block.mesh.material) {
                            block.mesh.material.forEach((mat, idx) => {
                                mat.color.copy(originalColors[idx]);
                            });
                        }
                    }, 50);
                }
                
                console.log(`${block.type.name} HP: ${block.hp}/${block.maxHP}`);
                
                if (block.hp <= 0) {
                    console.log(`${block.type.name} destruído!`);
                    
                    if (player && player.inventory) {
                        player.inventory[block.type.id] = (player.inventory[block.type.id] || 0) + 2;
                        updateInventoryDisplay();
                    }
                    
                    world.removeBlock(block);
                }
                
                world._internal.scene.remove(proj.mesh);
                world.projectiles.splice(i, 1);
                hitBlock = true;
                break;
            }
        }
        
        if (hitBlock) continue;
        
        if (proj.lifeTime <= 0) {
            world._internal.scene.remove(proj.mesh);
            world.projectiles.splice(i, 1);
        }
    }
}

// ============================================================
// UPDATE
// ============================================================
function updateEntity(entity) {
    if (!entity.isControllable) return;
    
    const isPlayerControlled = (world.getPlayerEntity() === entity);
    
    // GRAVIDADE para TODAS as entidades
    entity.velocityY -= CONFIG.GRAVITY;
    
    if (isPlayerControlled) {
        const keys = world._internal.keys;
        
        const forward = {
            x: -Math.sin(entity.yaw),
            z: -Math.cos(entity.yaw)
        };
        
        const right = {
            x: Math.cos(entity.yaw),
            z: -Math.sin(entity.yaw)
        };
        
        let moveX = 0;
        let moveZ = 0;
        
        if (keys['KeyW']) {
            moveX += forward.x * CONFIG.MOVE_SPEED;
            moveZ += forward.z * CONFIG.MOVE_SPEED;
        }
        if (keys['KeyS']) {
            moveX -= forward.x * CONFIG.MOVE_SPEED;
            moveZ -= forward.z * CONFIG.MOVE_SPEED;
        }
        if (keys['KeyA']) {
            moveX -= right.x * CONFIG.MOVE_SPEED;
            moveZ -= right.z * CONFIG.MOVE_SPEED;
        }
        if (keys['KeyD']) {
            moveX += right.x * CONFIG.MOVE_SPEED;
            moveZ += right.z * CONFIG.MOVE_SPEED;
        }
        
        let newX = entity.x + moveX;
        if (!world.checkCollision(newX, entity.y, entity.z, entity).collides) {
            entity.x = newX;
        }
        
        let newZ = entity.z + moveZ;
        if (!world.checkCollision(entity.x, entity.y, newZ, entity).collides) {
            entity.z = newZ;
        }
    }
    
    // Física Y para TODAS as entidades
    let newY = entity.y + entity.velocityY;
    const yCollision = world.checkCollision(entity.x, newY, entity.z, entity);
    
    if (yCollision.collides) {
        if (entity.velocityY < 0) {
            entity.y = yCollision.block.y + CONFIG.BLOCK_SIZE / 2;
            entity.velocityY = 0;
            entity.onGround = true;
        } else {
            entity.velocityY = 0;
        }
    } else {
        entity.y = newY;
        entity.onGround = false;
    }
    
    // Gerencia visibilidade do mesh
    if (isPlayerControlled) {
        // Entidade controlada: ESCONDE mesh
        if (entity.mesh && entity.mesh.visible) {
            entity.mesh.visible = false;
        }
        
        // Atualiza câmera
        const camera = world._internal.camera;
        camera.position.set(entity.x, entity.y + CONFIG.ENTITY_HEIGHT * 0.8, entity.z);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = entity.yaw;
        camera.rotation.x = entity.pitch;
    } else {
        // Entidade NÃO controlada: MOSTRA mesh
        if (!entity.mesh && entity.npcData) {
            // Cria mesh se não existir
            const geometry = new THREE.PlaneGeometry(entity.npcData.width, entity.npcData.height);
            const material = new THREE.MeshBasicMaterial({
                map: world._internal.blockTextures[entity.npcData.texture],
                transparent: true,
                alphaTest: 0.5,
                side: THREE.DoubleSide
            });
            
            entity.mesh = new THREE.Mesh(geometry, material);
            world._internal.scene.add(entity.mesh);
        }
        
        if (entity.mesh) {
            entity.mesh.visible = true;
            entity.mesh.position.set(entity.x, entity.y + entity.npcData.height / 2, entity.z);
            // NPCs olham para a câmera
            entity.mesh.lookAt(world._internal.camera.position);
        }
    }
    
    // Comportamento customizado
    if (entity.onUpdate) {
        entity.onUpdate(entity);
    }
}

function updateFallingBlocks() {
    world._internal.fallingBlocks.forEach(block => {
        if (!block.hasGravity) return;
        
        block.velocityY -= CONFIG.GRAVITY;
        
        const newY = block.mesh.position.y + block.velocityY;
        
        let onGround = false;
        for (let otherBlock of world.blocks) {
            if (otherBlock === block) continue;
            if (!otherBlock.solid) continue;
            
            const distance = Math.abs(block.x - otherBlock.x) +
                           Math.abs(block.z - otherBlock.z);
            
            if (distance < 0.1 && newY - CONFIG.BLOCK_SIZE/2 <= otherBlock.y + CONFIG.BLOCK_SIZE/2 &&
                block.velocityY < 0) {
                onGround = true;
                block.mesh.position.y = otherBlock.y + CONFIG.BLOCK_SIZE;
                block.y = block.mesh.position.y;
                block.velocityY = 0;
                break;
            }
        }
        
        if (!onGround && newY > -0.5) {
            block.mesh.position.y = newY;
            block.y = newY;
        } else if (newY <= -0.5) {
            block.mesh.position.y = 0;
            block.y = 0;
            block.velocityY = 0;
        }
    });
}

// ============================================================
// LOOP DE ANIMAÇÃO
// ============================================================
function animate() {
    requestAnimationFrame(animate);
    
    if (world._internal.texturesLoaded) {
        // Atualiza todas as entidades
        world.entities.forEach(entity => updateEntity(entity));
        
        updateFallingBlocks();
        updateProjectiles();
        checkInteractionTarget();
    }
    
    world._internal.renderer.render(world._internal.scene, world._internal.camera);
}

init();