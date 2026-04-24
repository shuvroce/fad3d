// ============================
// Wind View - 3D Wind Visualization
// Building dimensions from wind inputs + ASCE 7 C&C Zone visualization
// Each view has its own Three.js environment (scene, camera, renderer, controls, nav cube)
// ============================

import * as THREE from 'three';
import { createViewBase, getViewInstance } from './viewBase.js';
import { getConfig, updateConfig } from './buildingConfig.js';

let _view = null;
let windShellGroup, labelsGroup;
let _zoneMeshes = [];
let _ccData = null;
let _windDir = null;
let _windArrow = null;
let _pressurePerimeterGroup = null;
let _initialized = false;
let _windCameraState = null;

function _saveCameraState() {
    if (!_view) return;
    const pos = _view.camera.position.toArray();
    const target = _view.controls.target.toArray();
    _windCameraState = { pos, target };
}

function _restoreCameraState() {
    if (_windCameraState && _windCameraState.pos && _windCameraState.target) {
        _view.setCameraPosition(_windCameraState.pos, _windCameraState.target);
    }
}

const ZONE = {
    z4: { color: 0xf3f5d5, label: 'Zone 4', opacity: 0.4 },
    z5: { color: 0xa4bbe0, label: 'Zone 5', opacity: 0.7 },
    z1: { color: 0xc4c1c0, label: 'Zone 1', opacity: 0.75 },
    z2: { color: 0xeab8ff, label: 'Zone 2', opacity: 0.7 },
    z3: { color: 0xf59099, label: 'Zone 3', opacity: 0.8 },
};

const _WIND_VECTORS = {
    '+X': new THREE.Vector3( 1, 0, 0),
    '-X': new THREE.Vector3(-1, 0, 0),
    '+Y': new THREE.Vector3( 0, 1, 0),
    '-Y': new THREE.Vector3( 0,-1, 0),
};

const _WALL_NORMALS = {
    front: new THREE.Vector3( 0,-1, 0),
    back:  new THREE.Vector3( 0, 1, 0),
    left:  new THREE.Vector3(-1, 0, 0),
    right: new THREE.Vector3( 1, 0, 0),
};

// ============================
// Public API
// ============================

function initWindView() {
    if (_initialized) return;

    _view = createViewBase('wind', '#viewport-3d', '#nav-cube-wind');
    if (!_view) {
        console.warn('[WindView] Failed to create view base');
        return;
    }

    const { scene } = _view;

    // Set initial camera position for wind view
    _view.camera.position.set(-25, -30, 15);
    _view.camera.lookAt(0, 0, _view.controls.target.z);
    _view.controls.update();

    windShellGroup = new THREE.Group();
    windShellGroup.name = 'windShell';
    windShellGroup.visible = false;

    labelsGroup = new THREE.Group();
    labelsGroup.name = 'windShellLabels';
    windShellGroup.add(labelsGroup);

    scene.add(windShellGroup);

    _view.setAnimationCallback(_tickWindShell);
    _view.fitCameraToBuilding();

    _rebuildWindShell();
    _setupDynamicInputListeners();
    _handleInitialState();

    window.addEventListener('wind-cc-updated', (e) => {
        updateWindCCData(e.detail);
    });

    _initialized = true;
}

function showWindView() {
    if (!_view || !windShellGroup) return;
    _view.setVisible(true);
    windShellGroup.visible = true;

    _windDir = _windDir || '+X';
    _syncDirButtons();
    _updateFaceAppearance();
    requestAnimationFrame(() => {
        _updateLabels();
        _updateWindArrow();
        _updatePressurePerimeterAndLabels();
    });

    if (_windCameraState) {
        _restoreCameraState();
    } else {
        _view.fitCameraToBuilding();
    }

    const legend = document.getElementById('wind-zone-legend');
    if (legend) legend.classList.add('visible');
    const windSection = document.getElementById('filter-wind-section');
    if (windSection) windSection.classList.add('visible');
}

function hideWindView() {
    if (!_view || !windShellGroup) return;

    _saveCameraState();

    windShellGroup.visible = false;
    _windDir = null;
    _syncDirButtons();
    _updateFaceAppearance();
    _updateWindArrow();
    _updatePressurePerimeterAndLabels();

    const legend = document.getElementById('wind-zone-legend');
    if (legend) legend.classList.remove('visible');
    const windSection = document.getElementById('filter-wind-section');
    if (windSection) windSection.classList.remove('visible');
}

function refreshWindShell() {
    if (!_initialized) return;

    if (_windCameraState) {
        _restoreCameraState();
    } else {
        _view?.fitCameraToBuilding();
    }

    _rebuildWindShell();
    if (windShellGroup.visible) {
        _updateFaceAppearance();
        _updateLabels();
        _updateWindArrow();
        _updatePressurePerimeterAndLabels();
    }
}

function updateWindBuilding(config = {}) {
    const changed = updateConfig(config);

    if (changed) {
        _rebuildWindShell();
        _view?.fitCameraToBuilding();
    }
}

function updateWindCCData(ccData) {
    _ccData = ccData;
    if (windShellGroup?.visible) {
        _updateLabels();
        _updatePressurePerimeterAndLabels();
    }
}

function setWindDirection(dir) {
    _windDir = dir;
    if (windShellGroup?.visible) {
        _syncDirButtons();
        _updateFaceAppearance();
        _updateLabels();
        _updateWindArrow();
        _updatePressurePerimeterAndLabels();
    }
}

// ============================
// Event Listeners
// ============================

function _handleInitialState() {
    const currentModeEl = document.querySelector('.topbar__btn-mode.active');
    const currentMode = currentModeEl?.textContent?.trim().toLowerCase();

    if (currentMode === 'wind') {
        showWindView();
    }
}

// ============================
// Dynamic Input Listeners
// ============================

function _setupDynamicInputListeners() {
    let debounceTimer = null;

    const updateFromInputs = () => {
        const bLength = document.getElementById('b_length');
        const bWidth = document.getElementById('b_width');
        const bHeight = document.getElementById('b_height');
        const bFloorHeights = document.getElementById('b_floor_heights');

        const safeParseFloat = (val) => {
            if (!val) return null;
            const n = parseFloat(val);
            return isNaN(n) || n <= 0 ? null : n;
        };

        const newConfig = {};
        const config = getConfig();

        const length = safeParseFloat(bLength?.value);
        if (length) newConfig.width = length;

        const width = safeParseFloat(bWidth?.value);
        if (width) newConfig.depth = width;

        if (bFloorHeights?.value?.trim()) {
            const heights = bFloorHeights.value.trim().split(/\s+/).map(safeParseFloat).filter(h => h !== null);
            if (heights.length > 0) {
                newConfig.numFloors = heights.length;
                const avgFloorHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
                newConfig.floorHeight = avgFloorHeight;
            }
        } else {
            const height = safeParseFloat(bHeight?.value);
            if (height) {
                newConfig.height = height;
                newConfig.numFloors = Math.max(1, Math.round(height / config.floorHeight));
            }
        }

        if (Object.keys(newConfig).length > 0) {
            updateWindBuilding(newConfig);
        }
    };

    const debouncedUpdate = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(updateFromInputs, 300);
    };

    document.addEventListener('change', (e) => {
        if (e.target.closest('.wind__panel')) {
            debouncedUpdate();
        }
    });

    document.addEventListener('input', (e) => {
        if (e.target.closest('.wind__panel')) {
            debouncedUpdate();
        }
    });

    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('wind-dir-radio')) {
            setWindDirection(e.target.value);
        }
    });

    updateFromInputs();
}

// ============================
// Wind Shell Rebuild
// ============================

function _rebuildWindShell() {
    _zoneMeshes = [];
    _windArrow = null;

    if (!windShellGroup) return;

    if (!_view) return;
    const scene = _view.scene;

    const toRemove = [];
    windShellGroup.children.forEach(c => { if (c !== labelsGroup) toRemove.push(c); });
    toRemove.forEach(c => { _disposeObject(c); windShellGroup.remove(c); });

    const config = getConfig();
    const { width: L, depth: B, height: H } = config;
    if (L <= 0.1 || B <= 0.1 || H <= 0.1) return;

    const a = _zoneA(L, B, H);
    const halfW = L / 2;
    const halfD = B / 2;
    const ax = Math.min(a, halfW - 0.01);
    const ay = Math.min(a, halfD - 0.01);

    _buildWalls(halfW, halfD, H, ax, ay);
    _buildRoof(halfW, halfD, H, ax, ay);
    _buildZoneEdgeLines(halfW, halfD, H, ax, ay);
    _buildFloorLines(halfW, halfD, H);
    _buildGroundShadow(halfW, halfD, H);
    _buildDimensionLines(halfW, halfD, H);
    _updateWindArrow();
    _updateFaceAppearance();
    _updateLabels();
    _updatePressurePerimeterAndLabels();
}

function _zoneA(L, B, H) {
    const minDim = Math.min(L, B);
    const candidate = Math.min(0.1 * minDim, 0.6 * H);
    return Math.max(candidate, Math.max(0.06 * minDim, 0.91));
}

// ============================
// Wind Shell Geometry
// ============================

function _buildWalls(halfW, halfD, H, ax, ay) {
    const rotFB = [Math.PI / 2, 0, 0];
    const rotLR = [Math.PI / 2, Math.PI / 2, 0];

    const innerX = 2 * halfW - 2 * ax;
    const innerY = 2 * halfD - 2 * ay;

    _addZone('z5', ax, H, [-halfW + ax / 2, -halfD, H / 2], rotFB, 'front-left');
    if (innerX > 0.01) _addZone('z4', innerX, H, [0, -halfD, H / 2], rotFB, 'front-mid');
    _addZone('z5', ax, H, [halfW - ax / 2, -halfD, H / 2], rotFB, 'front-right');

    _addZone('z5', ax, H, [-halfW + ax / 2, halfD, H / 2], rotFB, 'back-left');
    if (innerX > 0.01) _addZone('z4', innerX, H, [0, halfD, H / 2], rotFB, 'back-mid');
    _addZone('z5', ax, H, [halfW - ax / 2, halfD, H / 2], rotFB, 'back-right');

    _addZone('z5', ay, H, [-halfW, -halfD + ay / 2, H / 2], rotLR, 'left-front');
    if (innerY > 0.01) _addZone('z4', innerY, H, [-halfW, 0, H / 2], rotLR, 'left-mid');
    _addZone('z5', ay, H, [-halfW, halfD - ay / 2, H / 2], rotLR, 'left-back');

    _addZone('z5', ay, H, [halfW, -halfD + ay / 2, H / 2], rotLR, 'right-front');
    if (innerY > 0.01) _addZone('z4', innerY, H, [halfW, 0, H / 2], rotLR, 'right-mid');
    _addZone('z5', ay, H, [halfW, halfD - ay / 2, H / 2], rotLR, 'right-back');
}

function _buildRoof(halfW, halfD, H, ax, ay) {
    const innerX = 2 * halfW - 2 * ax;
    const innerY = 2 * halfD - 2 * ay;
    const zRoof = H + 0.02;
    const rot = [0, 0, 0];

    if (innerX > 0.01 && innerY > 0.01) {
        _addZone('z1', innerX, innerY, [0, 0, zRoof], rot, 'roof-interior', true);
    }

    if (innerX > 0.01) {
        _addZone('z2', innerX, ay, [0, -halfD + ay / 2, zRoof], rot, 'roof-edge-front', true);
        _addZone('z2', innerX, ay, [0, halfD - ay / 2, zRoof], rot, 'roof-edge-back', true);
    }
    if (innerY > 0.01) {
        _addZone('z2', ax, innerY, [-halfW + ax / 2, 0, zRoof], rot, 'roof-edge-left', true);
        _addZone('z2', ax, innerY, [halfW - ax / 2, 0, zRoof], rot, 'roof-edge-right', true);
    }

    _addZone('z3', ax, ay, [-halfW + ax / 2, -halfD + ay / 2, zRoof], rot, 'roof-corner-fl', true);
    _addZone('z3', ax, ay, [halfW - ax / 2, -halfD + ay / 2, zRoof], rot, 'roof-corner-fr', true);
    _addZone('z3', ax, ay, [-halfW + ax / 2, halfD - ay / 2, zRoof], rot, 'roof-corner-bl', true);
    _addZone('z3', ax, ay, [halfW - ax / 2, halfD - ay / 2, zRoof], rot, 'roof-corner-br', true);
}

function _addZone(zoneId, w, d, pos, rot, faceId, isRoof = false) {
    const cfg = ZONE[zoneId];
    const geo = new THREE.PlaneGeometry(w, d);
    const mat = new THREE.MeshPhongMaterial({
        color: cfg.color,
        transparent: true,
        opacity: cfg.opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    mesh.userData = { zoneId, faceId, isRoof, w, d, baseOpacity: cfg.opacity };
    mesh.renderOrder = 1;
    windShellGroup.add(mesh);
    _zoneMeshes.push(mesh);
}

function _buildZoneEdgeLines(halfW, halfD, H, ax, ay) {
    const lineMat = new THREE.LineBasicMaterial({ color: 0x999999 });

    const wallLineSegs = [
        [[-halfW + ax, -halfD, 0], [-halfW + ax, -halfD, H]],
        [[halfW - ax, -halfD, 0], [halfW - ax, -halfD, H]],
        [[-halfW + ax, halfD, 0], [-halfW + ax, halfD, H]],
        [[halfW - ax, halfD, 0], [halfW - ax, halfD, H]],
        [[-halfW, -halfD + ay, 0], [-halfW, -halfD + ay, H]],
        [[-halfW, halfD - ay, 0], [-halfW, halfD - ay, H]],
        [[halfW, -halfD + ay, 0], [halfW, -halfD + ay, H]],
        [[halfW, halfD - ay, 0], [halfW, halfD - ay, H]],
    ];

    wallLineSegs.forEach(([a, b]) => {
        const geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(...a),
            new THREE.Vector3(...b),
        ]);
        windShellGroup.add(new THREE.Line(geo, lineMat.clone()));
    });

    const z = H + 0.03;
    const roofLines = [
        [[-halfW + ax, -halfD + ay, z], [halfW - ax, -halfD + ay, z]],
        [[-halfW, -halfD + ay, z], [-halfW + ax, -halfD + ay, z]],
        [[halfW - ax, -halfD + ay, z], [halfW, -halfD + ay, z]],
        [[-halfW + ax, halfD - ay, z], [halfW - ax, halfD - ay, z]],
        [[-halfW, halfD - ay, z], [-halfW + ax, halfD - ay, z]],
        [[halfW - ax, halfD - ay, z], [halfW, halfD - ay, z]],
        [[-halfW + ax, -halfD + ay, z], [-halfW + ax, halfD - ay, z]],
        [[-halfW + ax, -halfD, z], [-halfW + ax, -halfD + ay, z]],
        [[-halfW + ax, halfD - ay, z], [-halfW + ax, halfD, z]],
        [[halfW - ax, -halfD + ay, z], [halfW - ax, halfD - ay, z]],
        [[halfW - ax, -halfD, z], [halfW - ax, -halfD + ay, z]],
        [[halfW - ax, halfD - ay, z], [halfW - ax, halfD, z]],
    ];

    roofLines.forEach(([a, b]) => {
        const geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(...a),
            new THREE.Vector3(...b),
        ]);
        windShellGroup.add(new THREE.Line(geo, lineMat.clone()));
    });
}

function _buildFloorLines(halfW, halfD, H) {
    const config = getConfig();
    const { numFloors, floorHeight } = config;
    if (!numFloors || numFloors <= 1 || !floorHeight) return;
    const mat = new THREE.LineBasicMaterial({ color: 0x999999 });
    for (let f = 1; f < numFloors; f++) {
        const z = f * floorHeight;
        if (z >= H - 0.01) continue;
        [
            [[-halfW, -halfD, z], [halfW, -halfD, z]],
            [[-halfW,  halfD, z], [halfW,  halfD, z]],
            [[-halfW, -halfD, z], [-halfW, halfD, z]],
            [[ halfW, -halfD, z], [ halfW, halfD, z]],
        ].forEach(([a, b]) => {
            const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]);
            windShellGroup.add(new THREE.Line(geo, mat.clone()));
        });
    }
    _buildFloorSlabs(halfW, halfD, H);
}

function _buildFloorSlabs(halfW, halfD, H) {
    const config = getConfig();
    const { numFloors, floorHeight } = config;
    if (!numFloors || numFloors <= 1 || !floorHeight) return;

    const slabGeo = new THREE.PlaneGeometry(2 * halfW, 2 * halfD);
    const slabMat = new THREE.MeshPhongMaterial({
        color: 0xa0a0a0,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
    });

    for (let f = 1; f < numFloors; f++) {
        const z = f * floorHeight;
        if (z >= H - 0.01) continue;
        const slab = new THREE.Mesh(slabGeo, slabMat.clone());
        slab.position.set(0, 0, z);
        slab.renderOrder = 0;
        windShellGroup.add(slab);
    }
}

function _buildGroundShadow(halfW, halfD, H) {
    const px = 0.3 * H;
    const py = 0.25 * H;

    const verts = [
        [-halfW,        -halfD      ],
        [ halfW,        -halfD      ],
        [ halfW,         halfD      ],
        [ halfW - px,    halfD + py ],
        [-halfW - px,    halfD + py ],
        [-halfW - px,   -halfD + py ],
    ];

    const minX = -halfW - px, maxX =  halfW;
    const minY = -halfD,      maxY =  halfD + py;
    const worldW = maxX - minX;
    const worldD = maxY - minY;

    const CANVAS = 512;
    const margin = 0.45;
    const mX = worldW * margin, mY = worldD * margin;
    const totalW = worldW + 2 * mX;
    const totalD = worldD + 2 * mY;
    const maxDim = Math.max(totalW, totalD);
    const ppu = CANVAS / maxDim;

    const cw = Math.ceil(totalW * ppu);
    const ch = Math.ceil(totalD * ppu);

    const canvas = document.createElement('canvas');
    canvas.width  = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');

    const cx = (x) => (x - minX + mX) * ppu;
    const cy = (y) => ch - (y - minY + mY) * ppu;

    const blurPx = Math.max(6, Math.min(cw, ch) * 0.10);
    ctx.filter = `blur(${blurPx}px)`;
    ctx.fillStyle = 'rgba(24, 24, 24, 0.35)';
    ctx.beginPath();
    ctx.moveTo(cx(verts[0][0]), cy(verts[0][1]));
    for (let i = 1; i < verts.length; i++) ctx.lineTo(cx(verts[i][0]), cy(verts[i][1]));
    ctx.closePath();
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(totalW, totalD);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((minX + maxX) / 2, (minY + maxY) / 2, -0.02);
    mesh.renderOrder = 0;
    windShellGroup.add(mesh);
}

function _buildDimensionLines(halfW, halfD, H) {
    const config = getConfig();
    const { width: L, depth: B, height: Ht } = config;
    const refDim = Math.min(L, B, Ht);
    const scaleMult = Math.max(0.6, refDim / 10);
    const off = Math.max(1.2, Math.min(L, B) * 0.12);

    _addDimAnnotation(
        new THREE.Vector3(-halfW, -halfD - off, 0),
        new THREE.Vector3( halfW, -halfD - off, 0),
        [ [new THREE.Vector3(-halfW, -halfD, 0), new THREE.Vector3(-halfW, -halfD - off, 0)],
          [new THREE.Vector3( halfW, -halfD, 0), new THREE.Vector3( halfW, -halfD - off, 0)] ],
        `${L.toFixed(1)} m`, scaleMult
    );

    _addDimAnnotation(
        new THREE.Vector3(halfW + off, -halfD, 0),
        new THREE.Vector3(halfW + off,  halfD, 0),
        [ [new THREE.Vector3(halfW, -halfD, 0), new THREE.Vector3(halfW + off, -halfD, 0)],
          [new THREE.Vector3(halfW,  halfD, 0), new THREE.Vector3(halfW + off,  halfD, 0)] ],
        `${B.toFixed(1)} m`, scaleMult
    );

    const diagOff = off / Math.SQRT2;
    _addDimAnnotation(
        new THREE.Vector3(-halfW - diagOff, -halfD - diagOff, 0),
        new THREE.Vector3(-halfW - diagOff, -halfD - diagOff, H),
        [ [new THREE.Vector3(-halfW, -halfD, 0), new THREE.Vector3(-halfW - diagOff, -halfD - diagOff, 0)],
          [new THREE.Vector3(-halfW, -halfD, H), new THREE.Vector3(-halfW - diagOff, -halfD - diagOff, H)] ],
        `${Ht.toFixed(1)} m`, scaleMult
    );
}

function _addDimAnnotation(start, end, leaders, labelText, scaleMult) {
    const mat = new THREE.LineBasicMaterial({ color: 0xa1a1a1 });

    const extLen = 0.2 * scaleMult;
    const dir = end.clone().sub(start).normalize();
    const extStart = start.clone().sub(dir.clone().multiplyScalar(extLen));
    const extEnd = end.clone().add(dir.clone().multiplyScalar(extLen));

    const mainGeo = new THREE.BufferGeometry().setFromPoints([extStart, extEnd]);
    windShellGroup.add(new THREE.Line(mainGeo, mat.clone()));

    leaders.forEach(([a, b]) => {
        const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
        windShellGroup.add(new THREE.Line(geo, mat.clone()));
    });

    const tickSize = 0.25 * scaleMult;
    const diag = new THREE.Vector3(dir.y, -dir.x, 0).normalize().multiplyScalar(tickSize);

    const tickStart1 = start.clone().add(diag);
    const tickStart2 = start.clone().sub(diag);
    const tickEnd1 = end.clone().add(diag);
    const tickEnd2 = end.clone().sub(diag);
    windShellGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([tickStart1, tickStart2]), mat.clone()));
    windShellGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([tickEnd1, tickEnd2]), mat.clone()));

    const mid = start.clone().add(end).multiplyScalar(0.5);
    const sprite = _makeDimLabel(labelText, scaleMult);
    sprite.position.copy(mid);
    windShellGroup.add(sprite);
}

function _makeDimLabel(text, scaleMult = 1) {
    const fontSize = 20;
    const tmpCanvas = document.createElement('canvas');
    const tmpCtx = tmpCanvas.getContext('2d');
    tmpCtx.font = `600 ${fontSize}px Arial`;
    const textW = tmpCtx.measureText(text).width;
    const W = Math.ceil(textW) + 12;
    const H = 24;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(8,8,8,0.72)';
    ctx.beginPath(); ctx.roundRect(1, 1, W - 2, H - 2, 4); ctx.fill();
    ctx.font = `600 ${fontSize}px Arial`;
    ctx.fillStyle = 'rgba(208, 208, 208, 0.88)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, W / 2, H / 2);
    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set((W / 65) * scaleMult, (H / 65) * scaleMult, 1);
    sprite.renderOrder = 10;
    return sprite;
}

// ============================
// Wind Direction
// ============================

function _syncDirButtons() {
    document.querySelectorAll('.wind-dir-radio').forEach(radio => {
        radio.checked = radio.value === _windDir;
    });
}

function _updateWindArrow() {
    if (_windArrow) {
        windShellGroup.remove(_windArrow);
        _windArrow = null;
    }
    if (!_windDir || !windShellGroup?.visible) return;

    const config = getConfig();
    const { width: L, depth: B, height: Ht } = config;
    const halfW = L / 2; const halfD = B / 2;
    const arrowLen = Math.max(2, Math.min(L, B) * 0.35);
    const gap = Math.max(1.0, Math.min(L, B) * 0.12);
    const midZ = Ht / 2;

    const windVec = _WIND_VECTORS[_windDir].clone();
    let origin;
    switch (_windDir) {
        case '+X': origin = new THREE.Vector3(-halfW - arrowLen - gap, 0, midZ); break;
        case '-X': origin = new THREE.Vector3( halfW + arrowLen + gap, 0, midZ); break;
        case '+Y': origin = new THREE.Vector3(0, -halfD - arrowLen - gap, midZ); break;
        case '-Y': origin = new THREE.Vector3(0,  halfD + arrowLen + gap, midZ); break;
    }

    _windArrow = new THREE.ArrowHelper(windVec, origin, arrowLen, 0x5676b0, arrowLen * 0.28, arrowLen * 0.14);
    _windArrow.line.material.transparent = true; _windArrow.line.material.opacity = 0.70;
    _windArrow.cone.material.transparent = true; _windArrow.cone.material.opacity = 0.70;
    windShellGroup.add(_windArrow);
}

function _isWindward(faceId, isRoof) {
    if (_windDir === null) return null;
    if (isRoof) return false;

    const wallKey = Object.keys(_WALL_NORMALS).find(k => faceId.startsWith(k));
    if (!wallKey) return null;
    const dot = _WALL_NORMALS[wallKey].dot(_WIND_VECTORS[_windDir]);
    return dot < -0.5;
}

function _updateFaceAppearance() {
    _zoneMeshes.forEach(mesh => {
        const { zoneId, faceId, isRoof, baseOpacity } = mesh.userData;
        const windward = _isWindward(faceId, isRoof);
        let opacity = baseOpacity;
        if (windward === true)  opacity = Math.min(1, baseOpacity * 1.15);
        if (windward === false) opacity = baseOpacity * 1.0;
        mesh.material.opacity = opacity;
    });
}

// ============================
// Labels
// ============================

function _updateLabels() {
    if (!labelsGroup) return;

    while (labelsGroup.children.length > 0) {
        const s = labelsGroup.children[0];
        if (s.material?.map) s.material.map.dispose();
        if (s.material) s.material.dispose();
        labelsGroup.remove(s);
    }

    const config = getConfig();
    const { width: L, depth: B, height: H } = config;
    const refDim = Math.min(L, B, H);
    const scaleMult = refDim / 10;

    _zoneMeshes.forEach(mesh => {
        const { zoneId, isRoof, faceId } = mesh.userData;

        const windward = _isWindward(faceId, isRoof);
        const pressureText = _getPressureLabel(zoneId, windward);
        const sprite = _makeLabel(zoneId, pressureText, scaleMult, windward);
        if (!sprite) return;

        const pos = mesh.position.clone();
        const normal = isRoof
            ? new THREE.Vector3(0, 0, 1)
            : new THREE.Vector3(pos.x, pos.y, 0).normalize();
        sprite.userData.faceNormal = normal;

        if (!isRoof) {
            const { x, y } = pos;
            const len = Math.sqrt(x * x + y * y);
            if (len > 0.01) {
                pos.x += (x / len) * 0.4 * scaleMult;
                pos.y += (y / len) * 0.4 * scaleMult;
            }
        } else {
            pos.z += 0.4 * scaleMult;
        }
        sprite.position.copy(pos);
        labelsGroup.add(sprite);
    });
}

function _getPressureLabel(zoneId, windward) {
    if (!_ccData) return null;
    const refArea = '5.0';
    const wall = _ccData.wall?.[refArea];
    const roof = _ccData.roof?.[refArea];

    if (windward === null) {
        if (zoneId === 'z4' && wall) return `+${wall.P_z4_pos ?? '—'} / ${wall.P_z4_neg ?? '—'} kPa`;
        if (zoneId === 'z5' && wall) return `+${wall.P_z5_pos ?? wall.P_z4_pos ?? '—'} / ${wall.P_z5_neg ?? '—'} kPa`;
        if (zoneId === 'z1' && roof) return `${roof.P_z1_neg ?? '—'} kPa`;
        if (zoneId === 'z2' && roof) return `${roof.P_z2_neg ?? '—'} kPa`;
        if (zoneId === 'z3' && roof) return `${roof.P_z3_neg ?? '—'} kPa`;
    } else if (windward) {
        if (zoneId === 'z4' && wall) return `+${wall.P_z4_pos ?? '—'} kPa`;
        if (zoneId === 'z5' && wall) return `+${wall.P_z5_pos ?? wall.P_z4_pos ?? '—'} kPa`;
    } else {
        if (zoneId === 'z4' && wall) return `${wall.P_z4_neg ?? '—'} kPa`;
        if (zoneId === 'z5' && wall) return `${wall.P_z5_neg ?? '—'} kPa`;
        if (zoneId === 'z1' && roof) return `${roof.P_z1_neg ?? '—'} kPa`;
        if (zoneId === 'z2' && roof) return `${roof.P_z2_neg ?? '—'} kPa`;
        if (zoneId === 'z3' && roof) return `${roof.P_z3_neg ?? '—'} kPa`;
    }
    return null;
}

function _makeLabel(zoneId, pressureLine, scaleMult = 1, windward = null) {
    if (!pressureLine) return null;

    const fontSize = 15;
    const tmpCanvas = document.createElement('canvas');
    const tmpCtx = tmpCanvas.getContext('2d');
    tmpCtx.font = `600 ${fontSize}px Arial`;
    const textW = tmpCtx.measureText(pressureLine).width;

    const padH = 14;
    const swatchW = 5;
    const W = Math.ceil(textW + padH + swatchW);
    const H = 34;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(10,10,10,0.80)';
    ctx.beginPath();
    ctx.roundRect(2, 2, W - 4, H - 4, 7);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.30)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(2, 2, W - 4, H - 4, 7);
    ctx.stroke();

    let swatchColor;
    if (windward === true)       swatchColor = '#d4d4d4';
    else if (windward === false) swatchColor = '#555555';
    else                         swatchColor = '#' + ZONE[zoneId].color.toString(16).padStart(6, '0');

    ctx.fillStyle = swatchColor;
    ctx.beginPath();
    ctx.roundRect(2, 2, swatchW, H - 4, [7, 0, 0, 7]);
    ctx.fill();

    ctx.font = `600 ${fontSize}px Arial`;
    ctx.fillStyle = 'rgba(200,200,200,0.92)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pressureLine, (W + swatchW) / 2, H / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set((W / 70) * scaleMult, (H / 70) * scaleMult, 1);
    sprite.renderOrder = 10;
    return sprite;
}

function _getPressureValue(zoneId, windward) {
    if (!_ccData) return 0;
    const refArea = '5.0';
    const wall = _ccData.wall?.[refArea];
    const roof = _ccData.roof?.[refArea];

    if (windward === null) {
        return 0;
    } else if (windward) {
        if (zoneId === 'z4' && wall) return wall.P_z4_pos ?? 0;
        if (zoneId === 'z5' && wall) return wall.P_z5_pos ?? wall.P_z4_pos ?? 0;
    } else {
        if (zoneId === 'z4' && wall) return -(wall.P_z4_neg ?? 0);
        if (zoneId === 'z5' && wall) return -(wall.P_z5_neg ?? 0);
        if (zoneId === 'z1' && roof) return -(roof.P_z1_neg ?? 0);
        if (zoneId === 'z2' && roof) return -(roof.P_z2_neg ?? 0);
        if (zoneId === 'z3' && roof) return -(roof.P_z3_neg ?? 0);
    }
    return 0;
}

// ============================
// Pressure Perimeter
// ============================

function _updatePressurePerimeterAndLabels() {
    if (!windShellGroup?.visible) return;

    if (_pressurePerimeterGroup) {
        windShellGroup.remove(_pressurePerimeterGroup);
        _disposeObject(_pressurePerimeterGroup);
        _pressurePerimeterGroup = null;
    }

    if (!_windDir || !_ccData) return;

    _pressurePerimeterGroup = new THREE.Group();
    _pressurePerimeterGroup.name = 'pressurePerimeter';
    windShellGroup.add(_pressurePerimeterGroup);

    const config = getConfig();
    const ARROW_SPACING = config.floorHeight || 3;
    const BASE_ARROW_LEN = 1.5;
    const PRESSURE_LEN_SCALE = 1.0;
    const PERIMETER_OFFSET_INSET = 0.5;
    const LINE_COLOR = 0xffffff;
    const LINE_OPACITY = 0.5;
    const ARROW_HEAD_SIZE = 1.0;
    const ARROW_HEAD_WIDTH = 0.5;
    const ARROW_OPACITY = 0.7;

    const faces = {};
    _zoneMeshes.forEach(mesh => {
        const { zoneId, faceId, isRoof } = mesh.userData;
        if (!faces[faceId]) {
            faces[faceId] = { meshes: [], isRoof };
        }
        faces[faceId].meshes.push(mesh);
    });

    Object.entries(faces).forEach(([faceId, { meshes, isRoof }]) => {
        let outward;
        if (isRoof) {
            outward = new THREE.Vector3(0, 0, 1);
        } else {
            const wallKey = Object.keys(_WALL_NORMALS).find(k => faceId.startsWith(k));
            outward = wallKey ? _WALL_NORMALS[wallKey].clone() : new THREE.Vector3(0, 0, 1);
        }

        const windward = _isWindward(faceId, isRoof);

        const firstMesh = meshes[0];
        const { zoneId, w, d } = firstMesh.userData;
        if (w === undefined || d === undefined) return;

        const pressure = _getPressureValue(zoneId, windward);

        const arrowLen = BASE_ARROW_LEN + PRESSURE_LEN_SCALE * Math.abs(pressure);

        let arrowDir;
        if (isRoof) {
            arrowDir = new THREE.Vector3(0, 0, 1);
        } else if (windward) {
            arrowDir = outward.clone().negate();
        } else {
            arrowDir = outward.clone();
        }
        arrowDir.normalize();

        const refMesh = meshes[0];
        const refMatrix = refMesh.matrixWorld;
        const invMatrix = refMatrix.clone().invert();
        let minU = Infinity, maxU = -Infinity;
        let minV = Infinity, maxV = -Infinity;
        meshes.forEach(mesh => {
            const { w: fw, d: fd } = mesh.userData;
            const hw = fw / 2, hd = fd / 2;
            const localCorners = [
                new THREE.Vector3(-hw, -hd, 0),
                new THREE.Vector3( hw, -hd, 0),
                new THREE.Vector3( hw,  hd, 0),
                new THREE.Vector3(-hw,  hd, 0)
            ];
            localCorners.forEach(c => {
                const worldPos = c.clone().applyMatrix4(mesh.matrixWorld);
                const localPos = worldPos.clone().applyMatrix4(invMatrix);
                minU = Math.min(minU, localPos.x);
                maxU = Math.max(maxU, localPos.x);
                minV = Math.min(minV, localPos.y);
                maxV = Math.max(maxV, localPos.y);
            });
        });

        const offset = PERIMETER_OFFSET_INSET;
        const localPerimeter = [
            new THREE.Vector3(minU + offset, minV + offset, 0),
            new THREE.Vector3(maxU - offset, minV + offset, 0),
            new THREE.Vector3(maxU - offset, maxV - offset, 0),
            new THREE.Vector3(minU + offset, maxV - offset, 0)
        ];
        const perimeterPoints = localPerimeter.map(p => p.clone().applyMatrix4(refMatrix));

        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            ...perimeterPoints,
            perimeterPoints[0]
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({
            color: LINE_COLOR,
            transparent: true,
            opacity: LINE_OPACITY
        });
        const perimeterLine = new THREE.Line(lineGeometry, lineMaterial);
        _pressurePerimeterGroup.add(perimeterLine);

        let perimeterLength = 0;
        const segments = [];
        for (let i = 0; i < perimeterPoints.length; i++) {
            const next = (i + 1) % perimeterPoints.length;
            const segStart = perimeterPoints[i];
            const segEnd = perimeterPoints[next];
            const segLength = segStart.distanceTo(segEnd);
            segments.push({ start: segStart, end: segEnd, length: segLength });
            perimeterLength += segLength;
        }

        if (perimeterLength > 0) {
            const arrowPositions = [];
            segments.forEach(segment => {
                const segStart = segment.start;
                const segEnd = segment.end;
                const segLen = segment.length;
                const nArrowsOnSeg = Math.max(1, Math.ceil(segLen / ARROW_SPACING));
                for (let i = 0; i < nArrowsOnSeg; i++) {
                    const t = i / Math.max(nArrowsOnSeg - 1, 1);
                    const point = segStart.clone().lerp(segEnd, t);

                    let arrowOrigin;
                    if (isRoof) {
                        arrowOrigin = point.clone();
                    } else if (windward) {
                        arrowOrigin = point.clone().add(outward.clone().multiplyScalar(arrowLen));
                    } else {
                        arrowOrigin = point.clone();
                    }

                    const arrowHead = arrowOrigin.clone().add(arrowDir.clone().multiplyScalar(arrowLen));

                    arrowPositions.push({ origin: arrowOrigin, head: arrowHead });

                    const arrowColor = ZONE[zoneId].color;
                    const arrowHelper = new THREE.ArrowHelper(
                        arrowDir,
                        arrowOrigin,
                        arrowLen,
                        arrowColor,
                        ARROW_HEAD_SIZE,
                        ARROW_HEAD_WIDTH
                    );
                    arrowHelper.line.material.transparent = true;
                    arrowHelper.line.material.opacity = ARROW_OPACITY;
                    arrowHelper.cone.material.transparent = true;
                    arrowHelper.cone.material.opacity = ARROW_OPACITY;
                    _pressurePerimeterGroup.add(arrowHelper);
                }
            });

            if (arrowPositions.length > 1) {
                const tailPoints = arrowPositions.map(a => a.origin);
                const headPoints = arrowPositions.map(a => a.head);

                const tailLineGeo = new THREE.BufferGeometry().setFromPoints([...tailPoints, tailPoints[0]]);
                const tailLineMat = new THREE.LineBasicMaterial({
                    color: ZONE[zoneId].color,
                    transparent: true,
                    opacity: LINE_OPACITY
                });
                _pressurePerimeterGroup.add(new THREE.Line(tailLineGeo, tailLineMat));

                const headLineGeo = new THREE.BufferGeometry().setFromPoints([...headPoints, headPoints[0]]);
                const headLineMat = new THREE.LineBasicMaterial({
                    color: ZONE[zoneId].color,
                    transparent: true,
                    opacity: LINE_OPACITY
                });
                _pressurePerimeterGroup.add(new THREE.Line(headLineGeo, headLineMat));
            }
        }
    });
}

// ============================
// Tick (Per-frame updates)
// ============================

const _camDir = new THREE.Vector3();

function _tickWindShell() {
    if (!windShellGroup?.visible || !labelsGroup || !_view) return;

    const camera = _view.camera;
    if (!camera) return;

    camera.getWorldDirection(_camDir);

    labelsGroup.children.forEach(sprite => {
        const normal = sprite.userData.faceNormal;
        if (!normal) return;
        const dot = normal.dot(_camDir);
        const t = Math.max(0, Math.min(1, (dot + 0.1) / 0.4));
        sprite.material.opacity = 1 - t * 0.82;
    });
}

// ============================
// Helpers
// ============================

function _disposeObject(obj) {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
    }
    obj.children?.forEach(_disposeObject);
}

export {
    initWindView,
    showWindView,
    hideWindView,
    refreshWindShell,
    updateWindBuilding,
    updateWindCCData,
    setWindDirection,
    _saveCameraState as saveWindCameraState,
    _restoreCameraState as restoreWindCameraState
};