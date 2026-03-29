import { CONFIG } from '../../config.js';

export const drawBackgroundSystem = (engine) => {
    const startX = Math.floor(engine.camera.x / engine.tileSize) - CONFIG.ENGINE.RENDER.TILE_PAD_START;
    const startY = Math.floor(engine.camera.y / engine.tileSize) - CONFIG.ENGINE.RENDER.TILE_PAD_START;
    const endX = startX + Math.ceil((engine.canvas.width / engine.zoom) / engine.tileSize) + CONFIG.ENGINE.RENDER.TILE_PAD_END;
    const endY = startY + Math.ceil((engine.canvas.height / engine.zoom) / engine.tileSize) + CONFIG.ENGINE.RENDER.TILE_PAD_END;
    for (let x = startX; x < endX; x++) {
        for (let y = startY; y < endY; y++) drawTileSystem(engine, x, y);
    }
};

export const drawTileSystem = (engine, tx, ty) => {
    const x = tx * engine.tileSize - engine.camera.x;
    const y = ty * engine.tileSize - engine.camera.y;
    const hash = (Math.sin(tx * CONFIG.ENGINE.RENDER.TILE_SEED_A + ty * CONFIG.ENGINE.RENDER.TILE_SEED_B) * CONFIG.ENGINE.RENDER.TILE_SEED_MUL) % 1;
    const val = Math.abs(hash);
    let color = CONFIG.COLORS.GRASS_1;
    if (val > CONFIG.ENGINE.RENDER.TILE_BLEND_1) color = CONFIG.COLORS.GRASS_2;
    if (val > CONFIG.ENGINE.RENDER.TILE_BLEND_2) color = CONFIG.COLORS.GRASS_3;
    engine.ctx.fillStyle = color;
    engine.ctx.fillRect(Math.floor(x), Math.floor(y), engine.tileSize + 1, engine.tileSize + 1);
    if (val < CONFIG.ENGINE.RENDER.BLOCK_CHANCE) {
        engine.ctx.fillStyle = CONFIG.COLORS.BLOCK;
        const size = Math.floor(engine.tileSize * CONFIG.ENGINE.RENDER.BLOCK_SIZE_MULT);
        const offset = Math.floor(engine.tileSize * CONFIG.ENGINE.RENDER.BLOCK_OFFSET_MULT);
        engine.ctx.fillRect(x + offset, y + offset, size, size);
    }
};
