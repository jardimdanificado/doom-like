function createMessageMesh(text) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = 28;
    const padding = 12;
    ctx.font = `${fontSize}px "Courier New", monospace`;
    const metrics = ctx.measureText(text);
    const textWidth = Math.ceil(metrics.width);
    canvas.width = Math.max(220, textWidth + padding * 2);
    canvas.height = 96;
    ctx.font = `${fontSize}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillText(text, canvas.width / 2 + 2, canvas.height / 2 + 2);
    ctx.fillStyle = 'white';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true
    });
    const aspect = canvas.width / canvas.height;
    const height = 0.7;
    const width = height * aspect;
    const geometry = new THREE.PlaneGeometry(width, height);
    const mesh = new THREE.Mesh(geometry, material);
    return { mesh, texture, width: canvas.width, height: canvas.height };
}

export function spawnMessage(world, text, { position = null, relative = null, offset = null, duration = 2000 } = {}) {
    const { mesh } = createMessageMesh(text);
    const baseOffset = offset ? { x: offset.x, y: offset.y, z: offset.z } : { x: 0, y: 0, z: 0 };
    const now = performance.now();
    
    if (position) {
        mesh.position.set(position.x + baseOffset.x, position.y + baseOffset.y, position.z + baseOffset.z);
    }
    
    world._internal.scene.add(mesh);
    const message = {
        text,
        mesh,
        relative,
        offset: baseOffset,
        duration,
        startTime: now
    };
    world.messages.push(message);
    return message;
}

export function updateMessages(world) {
    const camera = world._internal.camera;
    const now = performance.now();
    for (let i = world.messages.length - 1; i >= 0; i--) {
        const message = world.messages[i];
        if (message.relative) {
            const base = typeof message.relative === 'function'
                ? message.relative()
                : message.relative;
            if (base) {
                message.mesh.position.set(
                    base.x + message.offset.x,
                    base.y + message.offset.y,
                    base.z + message.offset.z
                );
            }
        }
        message.mesh.lookAt(camera.position);
        
        if (now - message.startTime >= message.duration) {
            world._internal.scene.remove(message.mesh);
            if (message.mesh.material && message.mesh.material.map) {
                message.mesh.material.map.dispose();
            }
            if (message.mesh.material) {
                message.mesh.material.dispose();
            }
            if (message.mesh.geometry) {
                message.mesh.geometry.dispose();
            }
            world.messages.splice(i, 1);
        }
    }
}
