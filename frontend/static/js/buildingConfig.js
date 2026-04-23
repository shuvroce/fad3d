// ============================
// Building Config - Shared State Only
// Minimal module for building dimensions (no Three.js)
// ============================

const DEFAULT_CONFIG = {
    width: 15,
    depth: 10,
    height: 12,
    floorHeight: 3.2,
    numFloors: 4,
};

let config = { ...DEFAULT_CONFIG };
let subscribers = [];

export function getConfig() {
    return { ...config };
}

export function updateConfig(updates) {
    const oldConfig = { ...config };
    let changed = false;

    if (updates.width !== undefined && updates.width > 0) {
        config.width = updates.width;
        changed = true;
    }
    if (updates.depth !== undefined && updates.depth > 0) {
        config.depth = updates.depth;
        changed = true;
    }
    if (updates.height !== undefined && updates.height > 0) {
        config.height = updates.height;
        changed = true;
    }
    if (updates.floorHeight !== undefined && updates.floorHeight > 0) {
        config.floorHeight = updates.floorHeight;
        changed = true;
    }
    if (updates.numFloors !== undefined && updates.numFloors > 0) {
        config.numFloors = updates.numFloors;
        changed = true;
    }

    if (updates.numFloors !== undefined || updates.floorHeight !== undefined) {
        config.height = config.numFloors * config.floorHeight;
        changed = true;
    }

    if (changed && oldConfig.height !== config.height) {
        notifySubscribers(config, oldConfig);
    }

    return changed;
}

export function subscribe(callback) {
    subscribers.push(callback);
    return () => {
        subscribers = subscribers.filter(cb => cb !== callback);
    };
}

function notifySubscribers(newConfig, oldConfig) {
    subscribers.forEach(cb => {
        try {
            cb(newConfig, oldConfig);
        } catch (e) {
            console.error('[buildingConfig] Subscriber error:', e);
        }
    });
}

export function resetConfig() {
    config = { ...DEFAULT_CONFIG };
}