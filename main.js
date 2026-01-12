// ============================================================
// CONSTANTES E CONFIGURAÇÃO
// ============================================================
import CONFIG from "./data/config.js"
import NPC_TYPES from "./data/npcs.js"
import BLOCK_TYPES from "./data/blocks.js"
import texturesToLoad from "./data/textures.js"
import world from "./src/world.js"
import { updateEntity, updateHostileAI, checkInteractionTarget } from "./src/entity.js"
import { handleInteraction } from './src/entity.js';
import { createProjectile, placeBlock } from './src/bullet.js';

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
            //updateInventoryDisplay(world);
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
            
            world.addBlock( x, -0.5, z, BLOCK_TYPES.STONE, false);
            
            if (typeId > 0) {
                const blockType = Object.values(BLOCK_TYPES).find(bt => bt.id === typeId);
                if (blockType) {
                    world.addBlock( x, 0.5, z, blockType, false);
                    
                    if (typeId === 1 || Math.random() < 0.2) {
                        world.addBlock( x, 1.5, z, blockType, false);
                    }
                }
            }
        }
    }
}

function createEntities(world) {
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
        npcData: NPC_TYPES.VILLAGER
    });
    
    const npcSpawns = [
        { x: 3.5, z: 3.5, type: NPC_TYPES.VILLAGER },
        { x: 10.5, z: 5.5, type: NPC_TYPES.GUARD },
        { x: 7.5, z: 8.5, type: NPC_TYPES.MERCHANT }
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
        world.addEntity({
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
// INPUT
// ============================================================

export function selectBlockType(world, blockType) {
    const player = world.getPlayerEntity();
    if (player && player.inventory) {
        player.selectedBlockType = blockType;
    }
}

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
        //updateInventoryDisplay(world);
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
// SISTEMA DE PROJÉTEIS
// ============================================================
import { updateProjectiles } from './src/bullet.js';

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