// ============================================================
// CONSTANTES E CONFIGURAÇÃO
// ============================================================
const CONFIG = {
    MOVE_SPEED: 0.1,
    CROUCH_SPEED_MULTIPLIER: 0.5,
    LOOK_SPEED: 0.002,
    JUMP_FORCE: 0.15,
    GRAVITY: 0.008,
    ENTITY_HEIGHT: 1.7,
    ENTITY_HEIGHT_CROUCHED: 1.0,
    ENTITY_RADIUS: 0.3,
    BLOCK_SIZE: 1,
    INTERACTION_RANGE: 3,
    PLACEMENT_RANGE: 5,
    MAX_JUMP_HEIGHT: 1,
    MAX_JUMP_DISTANCE: 2,
    PATH_UPDATE_INTERVAL: 60,
    MAX_PATH_ITERATIONS: 200,
    HOSTILE_DETECTION_RANGE: 10,
    HOSTILE_ATTACK_RANGE: 8,
    HOSTILE_SHOOT_COOLDOWN: 60 // frames entre disparos
};

import NPC_TYPES from "./npcs.js"
import BLOCK_TYPES from "./blocks.js"
import texturesToLoad from "./textures.js"

// ============================================================
// OBJETO WORLD - TUDO CENTRALIZADO
// ============================================================
const world = {
    entities: [],
    blocks: [],
    projectiles: [],
    playerEntityIndex: 0,
    
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
    
    ui: {
        interactionTarget: null,
        targetBlockPosition: null
    },
    
    _internal: {
        scene: null,
        camera: null,
        renderer: null,
        raycaster: new THREE.Raycaster(),
        blockTextures: {},
        texturesLoaded: false,
        keys: {}
    },
    
    getPlayerEntity() {
        return this.entities[this.playerEntityIndex];
    },
    
    switchPlayerControl(entityIndex) {
        if (entityIndex >= 0 && entityIndex < this.entities.length) {
            this.playerEntityIndex = entityIndex;
            console.log(`Agora controlando: ${this.entities[entityIndex].name}`);
        }
    }
};

// ============================================================
// SISTEMA DE ENTIDADES
// ============================================================
function addEntity(world, entityData) {
    const entity = {
        id: world.entities.length,
        name: entityData.name || 'Entity',
        type: entityData.type || 'generic',
        
        x: entityData.x || 0,
        y: entityData.y || 2,
        z: entityData.z || 0,
        velocityY: 0,
        onGround: false,
        
        yaw: entityData.yaw || 0,
        pitch: entityData.pitch || 0,
        
        hp: entityData.hp || 100,
        maxHP: entityData.maxHP || 100,
        
        isCrouching: false,
        
        isControllable: entityData.isControllable !== false,
        isInteractable: entityData.isInteractable !== false,
        
        inventory: entityData.inventory || null,
        selectedBlockType: entityData.selectedBlockType || BLOCK_TYPES.GRASS,
        
        mesh: entityData.mesh || null,
        
        onInteract: entityData.onInteract || null,
        onUpdate: entityData.onUpdate || null,
        
        npcData: entityData.npcData || null,
        
        // Sistema de pathfinding
        target: entityData.target || null,
        path: [],
        pathIndex: 0,
        pathUpdateCounter: 0,
        
        // Sistema de combate
        isHostile: entityData.isHostile || false,
        shootCooldown: 0,
        targetEntity: null // Entidade alvo para hostis
    };
    
    world.entities.push(entity);
    return entity;
}

function removeEntity(world, entity, updateInventoryDisplayFn) {
    const index = world.entities.indexOf(entity);
    if (index > -1) {
        if (entity.mesh) {
            world._internal.scene.remove(entity.mesh);
        }
        world.entities.splice(index, 1);
        
        if (world.playerEntityIndex > index) {
            world.playerEntityIndex--;
        } else if (world.playerEntityIndex === index) {
            world.playerEntityIndex = 0;
            console.log(`Voltando controle para: ${world.entities[0].name}`);
            if (updateInventoryDisplayFn) updateInventoryDisplayFn(world);
        }
    }
}

// ============================================================
// SISTEMA DE BLOCOS
// ============================================================
function addBlock(world, x, y, z, blockType, isFloorBlock = false) {
    if (isPositionOccupied(world, x, y, z)) {
        return null;
    }
    
    const geometry = new THREE.BoxGeometry(CONFIG.BLOCK_SIZE, CONFIG.BLOCK_SIZE, CONFIG.BLOCK_SIZE);
    const materials = createBlockMaterials(world, blockType);
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
    
    world._internal.scene.add(mesh);
    world.blocks.push(block);
    
    return block;
}

function removeBlock(world, block) {
    const index = world.blocks.indexOf(block);
    if (index > -1) {
        world._internal.scene.remove(block.mesh);
        world.blocks.splice(index, 1);
    }
}

function isPositionOccupied(world, x, y, z) {
    for (let block of world.blocks) {
        const dx = Math.abs(block.x - x);
        const dy = Math.abs(block.y - y);
        const dz = Math.abs(block.z - z);
        
        if (dx < 0.01 && dy < 0.01 && dz < 0.01) {
            return true;
        }
    }
    return false;
}

function createBlockMaterials(world, blockType) {
    const textures = world._internal.blockTextures;
    
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
}

// ============================================================
// SISTEMA DE COLISÃO
// ============================================================
function checkCollision(world, x, y, z, entity) {
    const height = entity.isCrouching ? CONFIG.ENTITY_HEIGHT_CROUCHED : CONFIG.ENTITY_HEIGHT;
    
    const entityBox = {
        minX: x - CONFIG.ENTITY_RADIUS,
        maxX: x + CONFIG.ENTITY_RADIUS,
        minY: y,
        maxY: y + height,
        minZ: z - CONFIG.ENTITY_RADIUS,
        maxZ: z + CONFIG.ENTITY_RADIUS
    };
    
    for (let block of world.blocks) {
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

function getGroundLevel(world, x, z) {
    let maxY = -Infinity;
    
    for (let block of world.blocks) {
        if (!block.solid) continue;
        
        const dx = Math.abs(block.x - x);
        const dz = Math.abs(block.z - z);
        
        if (dx < 0.5 && dz < 0.5) {
            const blockTop = block.y + CONFIG.BLOCK_SIZE / 2;
            if (blockTop > maxY) {
                maxY = blockTop;
            }
        }
    }
    
    return maxY === -Infinity ? 0 : maxY;
}

// ============================================================
// PATHFINDING (A* SIMPLIFICADO COM PULOS E CROUCH)
// ============================================================
function findPath(world, entity, targetPos) {
    // Só calcula path se a entidade NÃO está sendo controlada pelo player
    const isPlayerControlled = (world.getPlayerEntity() === entity);
    if (isPlayerControlled) return [];
    
    const start = {
        x: Math.round(entity.x),
        y: Math.round(entity.y),
        z: Math.round(entity.z)
    };
    
    const end = {
        x: Math.round(targetPos.x),
        y: Math.round(targetPos.y),
        z: Math.round(targetPos.z)
    };
    
    // Se já está perto do alvo, não precisa calcular
    const dist = Math.abs(start.x - end.x) + Math.abs(start.z - end.z);
    if (dist < 2) return [];
    
    const openSet = [];
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();
    
    const startKey = `${start.x},${start.y},${start.z}`;
    openSet.push(startKey);
    gScore.set(startKey, 0);
    fScore.set(startKey, heuristic(start, end));
    
    let iterations = 0;
    
    while (openSet.length > 0 && iterations < CONFIG.MAX_PATH_ITERATIONS) {
        iterations++;
        
        openSet.sort((a, b) => fScore.get(a) - fScore.get(b));
        const current = openSet.shift();
        
        const [cx, cy, cz] = current.split(',').map(Number);
        
        if (cx === end.x && cy === end.y && cz === end.z) {
            return reconstructPath(cameFrom, current);
        }
        
        closedSet.add(current);
        
        const neighbors = getNeighbors(world, entity, cx, cy, cz);
        
        for (let neighbor of neighbors) {
            const neighborKey = `${neighbor.x},${neighbor.y},${neighbor.z}`;
            
            if (closedSet.has(neighborKey)) continue;
            
            const tentativeG = gScore.get(current) + neighbor.cost;
            
            if (!openSet.includes(neighborKey)) {
                openSet.push(neighborKey);
            } else if (tentativeG >= gScore.get(neighborKey)) {
                continue;
            }
            
            cameFrom.set(neighborKey, current);
            gScore.set(neighborKey, tentativeG);
            fScore.set(neighborKey, tentativeG + heuristic(neighbor, end));
        }
    }
    
    return []; // Sem caminho
}

function getNeighbors(world, entity, x, y, z) {
    const neighbors = [];
    const directions = [
        {dx: 1, dz: 0},
        {dx: -1, dz: 0},
        {dx: 0, dz: 1},
        {dx: 0, dz: -1}
    ];
    
    for (let dir of directions) {
        const nx = x + dir.dx;
        const nz = z + dir.dz;
        
        // Movimento normal (mesmo nível)
        if (canWalkTo(world, entity, nx, y, nz, false)) {
            neighbors.push({x: nx, y: y, z: nz, cost: 1, needsCrouch: false});
        }
        // Movimento com crouch (passar por espaço de 1 bloco)
        else if (canWalkTo(world, entity, nx, y, nz, true)) {
            neighbors.push({x: nx, y: y, z: nz, cost: 1.5, needsCrouch: true});
        }
        
        // Pulo para cima (1 bloco) - apenas direções cardeais
        if (Math.abs(dir.dx) + Math.abs(dir.dz) === 1) {
            if (canJumpTo(world, entity, nx, y + 1, nz)) {
                neighbors.push({x: nx, y: y + 1, z: nz, cost: 2, needsCrouch: false});
            }
        }
        
        // Queda para baixo
        const groundLevel = getGroundLevel(world, nx, nz);
        if (groundLevel < y && groundLevel >= y - 3) {
            if (canWalkTo(world, entity, nx, groundLevel, nz, false)) {
                neighbors.push({x: nx, y: groundLevel, z: nz, cost: 1.2, needsCrouch: false});
            }
        }
    }
    
    return neighbors;
}

function canWalkTo(world, entity, x, y, z, crouching) {
    const height = crouching ? CONFIG.ENTITY_HEIGHT_CROUCHED : CONFIG.ENTITY_HEIGHT;
    
    // Verifica se há chão
    const hasGround = getGroundLevel(world, x, z) >= y - 0.1;
    if (!hasGround) return false;
    
    // Verifica colisão
    const collision = checkCollision(world, x, y, z, {...entity, isCrouching: crouching});
    return !collision.collides;
}

function canJumpTo(world, entity, x, y, z) {
    // Verifica se pode pousar
    if (!canWalkTo(world, entity, x, y, z, false)) return false;
    
    // Verifica altura do pulo
    const startGround = getGroundLevel(world, entity.x, entity.z);
    const endGround = getGroundLevel(world, x, z);
    
    if (endGround - startGround > CONFIG.MAX_JUMP_HEIGHT) return false;
    
    // Verifica distância
    const dx = x - entity.x;
    const dz = z - entity.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance > CONFIG.MAX_JUMP_DISTANCE) return false;
    
    return true;
}

function heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
}

function reconstructPath(cameFrom, current) {
    const path = [];
    while (cameFrom.has(current)) {
        const [x, y, z] = current.split(',').map(Number);
        path.unshift({x, y, z});
        current = cameFrom.get(current);
    }
    return path;
}

// ============================================================
// UPDATE DE ENTIDADES
// ============================================================
function updateEntity(world, entity) {
    const isPlayerControlled = (world.getPlayerEntity() === entity);
    
    // GRAVIDADE para TODAS as entidades (controláveis e hostis)
    entity.velocityY -= CONFIG.GRAVITY;
    
    if (isPlayerControlled) {
        updatePlayerControlled(world, entity);
    } else if (entity.isHostile) {
        // Hostis precisam de movimento mesmo não sendo controláveis
        updateHostileMovement(world, entity);
    } else if (entity.isControllable) {
        updateAIControlled(world, entity);
    }
    
    // Física Y para TODAS as entidades
    applyPhysics(world, entity);
    
    // Gerencia visibilidade do mesh
    updateEntityMesh(world, entity, isPlayerControlled);
    
    // Comportamento customizado (IA hostil roda aqui)
    if (entity.onUpdate) {
        entity.onUpdate(world, entity);
    }
}

function canStandUp(world, entity, x, y, z) {
    // Verifica se há espaço para ficar em pé
    const standingHeight = CONFIG.ENTITY_HEIGHT;
    const checkY = y + standingHeight;
    
    for (let block of world.blocks) {
        if (!block.solid) continue;
        
        const dx = Math.abs(block.x - x);
        const dz = Math.abs(block.z - z);
        
        if (dx < CONFIG.ENTITY_RADIUS + 0.5 && dz < CONFIG.ENTITY_RADIUS + 0.5) {
            const blockBottom = block.y - CONFIG.BLOCK_SIZE / 2;
            const blockTop = block.y + CONFIG.BLOCK_SIZE / 2;
            
            // Se tem um bloco na altura da cabeça quando em pé
            if (blockBottom < checkY && blockTop > y) {
                return false;
            }
        }
    }
    
    return true;
}

function updatePlayerControlled(world, entity) {
    const keys = world._internal.keys;
    
    // Crouch - só pode levantar se tiver espaço
    const wantsCrouch = keys['ControlLeft'] || keys['ControlRight'];
    
    if (wantsCrouch) {
        entity.isCrouching = true;
    } else if (entity.isCrouching) {
        // Tenta levantar
        if (canStandUp(world, entity, entity.x, entity.y, entity.z)) {
            entity.isCrouching = false;
        }
        // Se não pode levantar, continua agachado
    }
    
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
    
    const speed = entity.isCrouching 
        ? CONFIG.MOVE_SPEED * CONFIG.CROUCH_SPEED_MULTIPLIER 
        : CONFIG.MOVE_SPEED;
    
    if (keys['KeyW']) {
        moveX += forward.x * speed;
        moveZ += forward.z * speed;
    }
    if (keys['KeyS']) {
        moveX -= forward.x * speed;
        moveZ -= forward.z * speed;
    }
    if (keys['KeyA']) {
        moveX -= right.x * speed;
        moveZ -= right.z * speed;
    }
    if (keys['KeyD']) {
        moveX += right.x * speed;
        moveZ += right.z * speed;
    }
    
    let newX = entity.x + moveX;
    if (!checkCollision(world, newX, entity.y, entity.z, entity).collides) {
        entity.x = newX;
    }
    
    let newZ = entity.z + moveZ;
    if (!checkCollision(world, entity.x, entity.y, newZ, entity).collides) {
        entity.z = newZ;
    }
    
    // Atualiza câmera
    const camera = world._internal.camera;
    const eyeHeight = entity.isCrouching 
        ? CONFIG.ENTITY_HEIGHT_CROUCHED * 0.8 
        : CONFIG.ENTITY_HEIGHT * 0.8;
    camera.position.set(entity.x, entity.y + eyeHeight, entity.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = entity.yaw;
    camera.rotation.x = entity.pitch;
}

function updateAIControlled(world, entity) {
    if (!entity.target) return;
    
    entity.pathUpdateCounter++;
    
    // Recalcula path periodicamente
    if (entity.pathUpdateCounter >= CONFIG.PATH_UPDATE_INTERVAL || entity.path.length === 0) {
        entity.path = findPath(world, entity, entity.target);
        entity.pathIndex = 0;
        entity.pathUpdateCounter = 0;
        
        // Se não encontrou caminho, desiste do alvo
        if (entity.path.length === 0) {
            entity.target = null;
            entity.isCrouching = false;
            return;
        }
    }
    
    if (entity.path.length === 0) return;
    
    // Chegou no destino
    const target = entity.path[entity.pathIndex];
    if (!target) return;
    
    const dx = target.x - entity.x;
    const dz = target.z - entity.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance < 0.3) {
        entity.pathIndex++;
        if (entity.pathIndex >= entity.path.length) {
            entity.target = null;
            entity.path = [];
            entity.isCrouching = false;
        }
        return;
    }
    
    // Verifica se precisa crouch
    const nextPos = entity.path[entity.pathIndex];
    const needsCrouch = !canWalkTo(world, entity, nextPos.x, nextPos.y, nextPos.z, false) &&
                        canWalkTo(world, entity, nextPos.x, nextPos.y, nextPos.z, true);
    
    if (needsCrouch) {
        entity.isCrouching = true;
    } else if (entity.isCrouching) {
        // Tenta levantar
        if (canStandUp(world, entity, entity.x, entity.y, entity.z)) {
            entity.isCrouching = false;
        }
    }
    
    // Move em direção ao alvo
    const speed = entity.isCrouching 
        ? CONFIG.MOVE_SPEED * CONFIG.CROUCH_SPEED_MULTIPLIER 
        : CONFIG.MOVE_SPEED;
    
    const moveX = (dx / distance) * speed;
    const moveZ = (dz / distance) * speed;
    
    let newX = entity.x + moveX;
    if (!checkCollision(world, newX, entity.y, entity.z, entity).collides) {
        entity.x = newX;
    }
    
    let newZ = entity.z + moveZ;
    if (!checkCollision(world, entity.x, entity.y, newZ, entity).collides) {
        entity.z = newZ;
    }
    
    // Pulo se necessário
    if (target.y > entity.y && entity.onGround) {
        entity.velocityY = CONFIG.JUMP_FORCE;
        entity.onGround = false;
    }
}

// ============================================================
// IA HOSTIL
// ============================================================
function updateHostileAI(world, entity) {
    if (entity.shootCooldown > 0) {
        entity.shootCooldown--;
    }
    
    const player = world.getPlayerEntity();
    if (!player) return;
    
    const dx = player.x - entity.x;
    const dy = player.y - entity.y;
    const dz = player.z - entity.z;
    const distanceToPlayer = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Detectou o player
    if (distanceToPlayer <= CONFIG.HOSTILE_DETECTION_RANGE) {
        entity.targetEntity = player;
        
        // Se está no range de ataque, atira
        if (distanceToPlayer <= CONFIG.HOSTILE_ATTACK_RANGE) {
            if (entity.shootCooldown === 0) {
                shootProjectileFromEntity(world, entity, player);
                entity.shootCooldown = CONFIG.HOSTILE_SHOOT_COOLDOWN;
            }
            
            // Para de se mover quando está atirando (limpa o target de movimento)
            entity.target = null;
            entity.path = [];
        } else {
            // Move em direção ao player
            entity.target = { x: player.x, y: player.y, z: player.z };
        }
        
        // Olha na direção do player
        entity.yaw = Math.atan2(-dx, -dz);
    } else {
        // Perdeu o player de vista
        entity.targetEntity = null;
        entity.target = null;
        entity.path = [];
    }
}

function updateHostileMovement(world, entity) {
    if (!entity.target) return;
    
    entity.pathUpdateCounter = (entity.pathUpdateCounter || 0) + 1;
    
    // Recalcula path periodicamente
    if (entity.pathUpdateCounter >= CONFIG.PATH_UPDATE_INTERVAL || entity.path.length === 0) {
        entity.path = findPath(world, entity, entity.target);
        entity.pathIndex = 0;
        entity.pathUpdateCounter = 0;
        
        if (entity.path.length === 0) {
            return; // Não limpa o target, tenta de novo depois
        }
    }
    
    if (entity.path.length === 0) return;
    
    const target = entity.path[entity.pathIndex];
    if (!target) return;
    
    const dx = target.x - entity.x;
    const dz = target.z - entity.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance < 0.3) {
        entity.pathIndex++;
        if (entity.pathIndex >= entity.path.length) {
            entity.path = [];
        }
        return;
    }
    
    // Verifica se precisa crouch
    const nextPos = entity.path[entity.pathIndex];
    const needsCrouch = !canWalkTo(world, entity, nextPos.x, nextPos.y, nextPos.z, false) &&
                        canWalkTo(world, entity, nextPos.x, nextPos.y, nextPos.z, true);
    
    if (needsCrouch) {
        entity.isCrouching = true;
    } else if (entity.isCrouching) {
        if (canStandUp(world, entity, entity.x, entity.y, entity.z)) {
            entity.isCrouching = false;
        }
    }
    
    // Move em direção ao alvo
    const speed = entity.isCrouching 
        ? CONFIG.MOVE_SPEED * CONFIG.CROUCH_SPEED_MULTIPLIER 
        : CONFIG.MOVE_SPEED;
    
    const moveX = (dx / distance) * speed;
    const moveZ = (dz / distance) * speed;
    
    let newX = entity.x + moveX;
    if (!checkCollision(world, newX, entity.y, entity.z, entity).collides) {
        entity.x = newX;
    }
    
    let newZ = entity.z + moveZ;
    if (!checkCollision(world, entity.x, entity.y, newZ, entity).collides) {
        entity.z = newZ;
    }
    
    // Pulo se necessário
    if (target.y > entity.y && entity.onGround) {
        entity.velocityY = CONFIG.JUMP_FORCE;
        entity.onGround = false;
    }
}

function shootProjectileFromEntity(world, shooter, target) {
    if (!shooter.inventory || !shooter.selectedBlockType) return;
    
    const ammoCount = shooter.inventory[shooter.selectedBlockType.id] || 0;
    if (ammoCount <= 0) return;
    
    // Só decrementa se não for munição infinita
    if (ammoCount < 999) {
        shooter.inventory[shooter.selectedBlockType.id]--;
    }
    
    const damage = shooter.selectedBlockType.breakDamage;
    
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xff4400 }); // Cor diferente para NPCs
    const mesh = new THREE.Mesh(geometry, material);
    
    // Posição inicial do projétil
    const shooterHeight = shooter.isCrouching 
        ? CONFIG.ENTITY_HEIGHT_CROUCHED * 0.8 
        : CONFIG.ENTITY_HEIGHT * 0.8;
    mesh.position.set(shooter.x, shooter.y + shooterHeight, shooter.z);
    
    // Direção para o alvo
    const direction = new THREE.Vector3(
        target.x - shooter.x,
        target.y + CONFIG.ENTITY_HEIGHT * 0.5 - (shooter.y + shooterHeight),
        target.z - shooter.z
    );
    direction.normalize();
    
    const projectile = {
        mesh: mesh,
        velocity: direction.multiplyScalar(0.5),
        damage: damage,
        lifeTime: 100,
        shooter: shooter // Guarda referência de quem atirou
    };
    
    world._internal.scene.add(mesh);
    world.projectiles.push(projectile);
    
    console.log(`${shooter.name} atirou!`);
}

function applyPhysics(world, entity) {
    let newY = entity.y + entity.velocityY;
    const yCollision = checkCollision(world, entity.x, newY, entity.z, entity);
    
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
}

function updateEntityMesh(world, entity, isPlayerControlled) {
    if (isPlayerControlled) {
        if (entity.mesh && entity.mesh.visible) {
            entity.mesh.visible = false;
        }
    } else {
        if (!entity.mesh && entity.npcData) {
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
            const meshHeight = entity.isCrouching 
                ? entity.npcData.height * 0.6 
                : entity.npcData.height / 2;
            entity.mesh.position.set(entity.x, entity.y + meshHeight, entity.z);
            
            // Hostis olham para o alvo, outros olham para a câmera
            if (entity.isHostile && entity.targetEntity) {
                entity.mesh.lookAt(
                    new THREE.Vector3(
                        entity.targetEntity.x,
                        entity.targetEntity.y + CONFIG.ENTITY_HEIGHT * 0.5,
                        entity.targetEntity.z
                    )
                );
            } else {
                entity.mesh.lookAt(world._internal.camera.position);
            }
        }
    }
}

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
    
    loadTextures(world);
    createInventoryUI();
    
    window.addEventListener('resize', () => onWindowResize(world));
    document.addEventListener('keydown', (e) => onKeyDown(world, e));
    document.addEventListener('keyup', (e) => world._internal.keys[e.code] = false);
    
    document.addEventListener('click', () => {
        document.body.requestPointerLock();
    });
    
    document.addEventListener('mousemove', (e) => onMouseMove(world, e));
    document.addEventListener('mousedown', (e) => onMouseDown(world, e));
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    
    animate(world);
}

// ============================================================
// CARREGAMENTO DE TEXTURAS
// ============================================================
function loadTextures(world) {
    const loader = new THREE.TextureLoader();
    let loaded = 0;
    const total = texturesToLoad.length;
    
    function checkLoaded() {
        loaded++;
        if (loaded === total) {
            world._internal.texturesLoaded = true;
            createWorld(world);
            createEntities(world);
            updateInventoryDisplay(world);
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
function createWorld(world) {
    const MAP_W = world.mapData[0].length;
    const MAP_H = world.mapData.length;
    
    for (let z = 0; z < MAP_H; z++) {
        for (let x = 0; x < MAP_W; x++) {
            const typeId = world.mapData[z][x];
            
            addBlock(world, x, -0.5, z, BLOCK_TYPES.STONE, false);
            
            if (typeId > 0) {
                const blockType = Object.values(BLOCK_TYPES).find(bt => bt.id === typeId);
                if (blockType) {
                    addBlock(world, x, 0.5, z, blockType, false);
                    
                    if (typeId === 1 || Math.random() < 0.2) {
                        addBlock(world, x, 1.5, z, blockType, false);
                    }
                }
            }
        }
    }
}

function createEntities(world) {
    addEntity(world, {
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
        npcData: NPC_TYPES.VILLAGER
    });
    
    const npcSpawns = [
        { x: 3.5, z: 3.5, type: NPC_TYPES.VILLAGER },
        { x: 10.5, z: 5.5, type: NPC_TYPES.GUARD },
        { x: 7.5, z: 8.5, type: NPC_TYPES.MERCHANT }
    ];
    
    npcSpawns.forEach(spawn => {
        addEntity(world, {
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
                [BLOCK_TYPES.STONE.id]: 50,
                [BLOCK_TYPES.GRASS.id]: 10,
                [BLOCK_TYPES.WOOD.id]: 10
            },
            selectedBlockType: BLOCK_TYPES.STONE,
            target: { x: spawn.x + 3, y: 2, z: spawn.z + 3 },
            onInteract: (world, entity) => {
                const dialogue = entity.npcData.dialogue;
                alert(`${entity.name}: ${dialogue}`);
            }
        });
    });
    
    // NPCs Hostis
    const hostileSpawns = [
        { x: 5.0, z: 2.5, name: 'Esqueleto' },
        { x: 12.5, z: 9.5, name: 'Zumbi' }
    ];
    
    hostileSpawns.forEach(spawn => {
        addEntity(world, {
            name: spawn.name,
            type: 'hostile',
            x: spawn.x,
            y: 2,
            z: spawn.z,
            hp: 80,
            maxHP: 80,
            isControllable: false,
            isInteractable: false,
            isHostile: true,
            npcData: NPC_TYPES.GUARD, // Usa textura de guard
            inventory: {
                [BLOCK_TYPES.STONE.id]: 999
            },
            selectedBlockType: BLOCK_TYPES.STONE,
            onUpdate: (world, entity) => updateHostileAI(world, entity)
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
        slot.onclick = () => selectBlockType(world, blockType);
        inventoryDiv.appendChild(slot);
    });
}

function updateInventoryDisplay(world) {
    const player = world.getPlayerEntity();
    if (!player || !player.inventory) {
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

function selectBlockType(world, blockType) {
    const player = world.getPlayerEntity();
    if (player && player.inventory) {
        player.selectedBlockType = blockType;
        updateInventoryDisplay(world);
    }
}

// ============================================================
// INPUT
// ============================================================
function onKeyDown(world, e) {
    world._internal.keys[e.code] = true;
    const player = world.getPlayerEntity();
    
    if (e.code === 'Space' && player.onGround) {
        player.velocityY = CONFIG.JUMP_FORCE;
        player.onGround = false;
    }
    
    if (e.code === 'KeyE' && world.ui.interactionTarget) {
        handleInteraction(world, world.ui.interactionTarget);
    }
    
    if (e.code === 'Tab') {
        e.preventDefault();
        const nextIndex = (world.playerEntityIndex + 1) % world.entities.length;
        world.switchPlayerControl(nextIndex);
        updateInventoryDisplay(world);
    }
    
    if (e.code === 'Digit1') selectBlockType(world, BLOCK_TYPES.STONE);
    if (e.code === 'Digit2') selectBlockType(world, BLOCK_TYPES.GRASS);
    if (e.code === 'Digit3') selectBlockType(world, BLOCK_TYPES.WOOD);
    if (e.code === 'Digit4') selectBlockType(world, BLOCK_TYPES.GOLD);
    if (e.code === 'Digit5') selectBlockType(world, BLOCK_TYPES.DOOR);
    if (e.code === 'Digit6') selectBlockType(world, BLOCK_TYPES.SAND);
}

function onMouseMove(world, event) {
    if (document.pointerLockElement !== document.body) return;
    
    const player = world.getPlayerEntity();
    if (player) {
        player.yaw -= event.movementX * CONFIG.LOOK_SPEED;
        player.pitch -= event.movementY * CONFIG.LOOK_SPEED;
        player.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.pitch));
    }
}

function onMouseDown(world, event) {
    if (document.pointerLockElement !== document.body) return;
    
    if (event.button === 0) {
        createProjectile(world);
    } else if (event.button === 2) {
        placeBlock(world);
    }
}

function onWindowResize(world) {
    world._internal.camera.aspect = window.innerWidth / window.innerHeight;
    world._internal.camera.updateProjectionMatrix();
    world._internal.renderer.setSize(window.innerWidth, window.innerHeight);
}

// ============================================================
// INTERAÇÃO
// ============================================================
function handleInteraction(world, target) {
    const player = world.getPlayerEntity();
    
    if (target.type && target.hasUseFunction && target.type.onUse) {
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
        
        // Passa world, block e entity que ativou
        target.type.onUse(world, blockAdapter, player);
        target.solid = blockAdapter.userData.solid;
    } 
    else if (target.onInteract) {
        target.onInteract(world, target);
    } else {
        console.log(`${target.name || 'Objeto'} não tem função de uso.`);
    }
}

function checkInteractionTarget(world) {
    const camera = world._internal.camera;
    const raycaster = world._internal.raycaster;
    
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    
    const blockMeshes = world.blocks.map(b => b.mesh);
    const entityMeshes = world.entities.filter(e => e.mesh && e.mesh.visible).map(e => e.mesh);
    const allObjects = [...blockMeshes, ...entityMeshes];
    
    const intersects = raycaster.intersectObjects(allObjects);
    
    const interactionDiv = document.getElementById('interaction');
    const outlineDiv = document.getElementById('block-outline');
    
    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const distance = intersects[0].distance;
        
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
function createProjectile(world) {
    const player = world.getPlayerEntity();
    if (!player || !player.inventory) return;
    
    const ammoCount = player.inventory[player.selectedBlockType.id] || 0;
    
    if (ammoCount <= 0) {
        console.log(`Sem munição de ${player.selectedBlockType.name}!`);
        return;
    }
    
    player.inventory[player.selectedBlockType.id] = (player.inventory[player.selectedBlockType.id] || 0) - 1;
    updateInventoryDisplay(world);
    
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

function placeBlock(world) {
    const player = world.getPlayerEntity();
    if (!player || !player.inventory) return;
    if (!world.ui.targetBlockPosition) return;
    
    const ammoCount = player.inventory[player.selectedBlockType.id] || 0;
    
    if (ammoCount <= 0) {
        console.log(`Sem blocos de ${player.selectedBlockType.name}!`);
        return;
    }
    
    const { x, y, z } = world.ui.targetBlockPosition;
    
    const newBlock = addBlock(world, x, y, z, player.selectedBlockType, false);
    if (newBlock) {
        player.inventory[player.selectedBlockType.id] = (player.inventory[player.selectedBlockType.id] || 0) - 1;
        updateInventoryDisplay(world);
        console.log(`Bloco de ${player.selectedBlockType.name} colocado!`);
    } else {
        console.log('Posição já ocupada!');
    }
}

function updateProjectiles(world) {
    for (let i = world.projectiles.length - 1; i >= 0; i--) {
        const proj = world.projectiles[i];
        
        proj.mesh.position.add(proj.velocity);
        proj.lifeTime--;
        
        let hitSomething = false;
        
        // Verifica colisão com TODAS as entidades (exceto quem atirou)
        for (let entity of world.entities) {
            // Não atira em quem atirou
            if (proj.shooter && entity === proj.shooter) continue;
            
            // Verifica distância (funciona mesmo sem mesh visível)
            const dx = proj.mesh.position.x - entity.x;
            const dy = proj.mesh.position.y - (entity.y + CONFIG.ENTITY_HEIGHT * 0.5);
            const dz = proj.mesh.position.z - entity.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            if (distance < 0.5) {
                entity.hp -= proj.damage;
                console.log(`${entity.name} levou ${proj.damage} de dano! HP: ${entity.hp}/${entity.maxHP}`);
                
                // Feedback visual
                if (entity.mesh && entity.mesh.material) {
                    const originalColor = entity.mesh.material.color.getHex();
                    entity.mesh.material.color.setHex(0xff0000);
                    setTimeout(() => {
                        if (entity.mesh && entity.mesh.material) {
                            entity.mesh.material.color.setHex(originalColor);
                        }
                    }, 100);
                }
                
                if (entity.hp <= 0) {
                    console.log(`${entity.name} foi derrotado!`);
                    
                    // Se derrotar um hostil, dropar itens
                    const playerEntity = world.getPlayerEntity();
                    if (entity.isHostile && playerEntity && playerEntity.inventory) {
                        playerEntity.inventory[BLOCK_TYPES.STONE.id] = 
                            (playerEntity.inventory[BLOCK_TYPES.STONE.id] || 0) + 10;
                        updateInventoryDisplay(world);
                        console.log('Você ganhou 10 pedras!');
                    }
                    
                    removeEntity(world, entity, updateInventoryDisplay);
                }
                
                world._internal.scene.remove(proj.mesh);
                world.projectiles.splice(i, 1);
                hitSomething = true;
                break;
            }
        }
        
        if (hitSomething) continue;
        
        // Verifica colisão com blocos
        for (let block of world.blocks) {
            const distance = Math.sqrt(
                Math.pow(proj.mesh.position.x - block.x, 2) +
                Math.pow(proj.mesh.position.y - block.y, 2) +
                Math.pow(proj.mesh.position.z - block.z, 2)
            );
            
            if (distance < 0.5) {
                block.hp -= proj.damage;
                
                if (Array.isArray(block.mesh.material)) {
                    const originalColors = [];
                    block.mesh.material.forEach((mat, idx) => {
                        originalColors[idx] = mat.color.clone();
                        mat.color.setHex(0xffffff);
                    });
                    setTimeout(() => {
                        if (block.mesh && block.mesh.material) {
                            block.mesh.material.forEach((mat, idx) => {
                                mat.color.copy(originalColors[idx]);
                            });
                        }
                    }, 50);
                }
                
                console.log(`${block.type.name} HP: ${block.hp}/${block.maxHP}`);
                
                if (block.hp <= 0) {
                    console.log(`${block.type.name} destruído!`);
                    
                    const playerEntity = world.getPlayerEntity();
                    if (playerEntity && playerEntity.inventory) {
                        playerEntity.inventory[block.type.id] = 
                            (playerEntity.inventory[block.type.id] || 0) + 2;
                        updateInventoryDisplay(world);
                    }
                    
                    removeBlock(world, block);
                }
                
                world._internal.scene.remove(proj.mesh);
                world.projectiles.splice(i, 1);
                hitSomething = true;
                break;
            }
        }
        
        if (hitSomething) continue;
        
        // Remove projétil se acabou o tempo
        if (proj.lifeTime <= 0) {
            world._internal.scene.remove(proj.mesh);
            world.projectiles.splice(i, 1);
        }
    }
}

// ============================================================
// LOOP DE ANIMAÇÃO
// ============================================================
function animate(world) {
    requestAnimationFrame(() => animate(world));
    
    if (world._internal.texturesLoaded) {
        world.entities.forEach(entity => updateEntity(world, entity));
        updateProjectiles(world);
        checkInteractionTarget(world);
    }
    
    world._internal.renderer.render(world._internal.scene, world._internal.camera);
}

init();