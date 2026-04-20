// ============================
// Wind Shell - ASCE 7 C&C Zone Visualization
// Builds a solid building shell with zone-subdivided walls and roof.
// Zones: Z4/Z5 (walls), Z1/Z2/Z3 (roof)
// ============================

import * as THREE from 'three';

// ---- Zone config (black/white/gray: lighter = interior, darker = corner) ----
const ZONE = {
    z4: { color: 0xc3dbc7, label: 'Zone 4', opacity: 0.5 },  // wall interior
    z5: { color: 0xa4bbe0, label: 'Zone 5', opacity: 0.5 },  // wall corner
    z1: { color: 0xfaffb0, label: 'Zone 1', opacity: 0.5 },  // roof interior
    z2: { color: 0xeab8ff, label: 'Zone 2', opacity: 0.5 },  // roof edge
    z3: { color: 0xf59099, label: 'Zone 3', opacity: 0.5 },  // roof corner
};

// ---- Module state ----
let _scene = null;
let _renderer = null;
let _camera = null;
let _windShellGroup = null;
let _labelsGroup = null;
let _zoneMeshes = [];
let _config = { width: 15, depth: 10, totalHeight: 12.8 };
let _ccData = null;

// ---- Public API ----

function initWindShell(scene, renderer, camera) {
    _scene = scene;
    _renderer = renderer;
    _camera = camera;

    _windShellGroup = new THREE.Group();
    _windShellGroup.name = 'windShell';
    _windShellGroup.visible = false;

    _labelsGroup = new THREE.Group();
    _labelsGroup.name = 'windShellLabels';
    _windShellGroup.add(_labelsGroup);

    scene.add(_windShellGroup);

    window.addEventListener('panel-mode-changed', (e) => {
        _windShellGroup.visible = e.detail.mode === 'wind';
        const legend = document.getElementById('wind-zone-legend');
        if (legend) legend.classList.toggle('visible', e.detail.mode === 'wind');
    });

    window.addEventListener('wind-cc-updated', (e) => {
        _ccData = e.detail;
        _updateLabels();
    });

    console.log('[WindShell] Initialized');
}

function updateWindShellGeometry(config) {
    if (!_windShellGroup) return;
    if (config.width !== undefined && config.width > 0) _config.width = config.width;
    if (config.depth !== undefined && config.depth > 0) _config.depth = config.depth;
    if (config.totalHeight !== undefined && config.totalHeight > 0) _config.totalHeight = config.totalHeight;
    _rebuild();
}

// ---- Zone width (ASCE 7-16 §26.2) ----

function _zoneA(L, B, H) {
    const minDim = Math.min(L, B);
    const candidate = Math.min(0.1 * minDim, 0.6 * H);
    return Math.max(candidate, Math.max(0.06 * minDim, 0.91));
}

// ---- Geometry build ----

function _rebuild() {
    _zoneMeshes = [];

    // Remove all non-labels children and rebuild
    const toRemove = [];
    _windShellGroup.children.forEach(c => { if (c !== _labelsGroup) toRemove.push(c); });
    toRemove.forEach(c => { _disposeObject(c); _windShellGroup.remove(c); });

    const { width: L, depth: B, totalHeight: H } = _config;
    if (L <= 0.1 || B <= 0.1 || H <= 0.1) return;

    const a = _zoneA(L, B, H);
    const halfW = L / 2;
    const halfD = B / 2;
    const ax = Math.min(a, halfW - 0.01);
    const ay = Math.min(a, halfD - 0.01);

    _buildWalls(halfW, halfD, H, ax, ay);
    _buildRoof(halfW, halfD, H, ax, ay);
    _buildZoneEdgeLines(halfW, halfD, H, ax, ay);
    _updateLabels();
}

function _buildWalls(halfW, halfD, H, ax, ay) {
    // Rotation for front/back walls (y = ±halfD): lies in XZ plane
    const rotFB = [Math.PI / 2, 0, 0];
    // Rotation for left/right walls (x = ±halfW): lies in YZ plane
    const rotLR = [Math.PI / 2, Math.PI / 2, 0];

    const innerX = 2 * halfW - 2 * ax;
    const innerY = 2 * halfD - 2 * ay;

    // Front wall (y = -halfD)
    _addZone('z5', ax, H, [-halfW + ax / 2, -halfD, H / 2], rotFB, 'front-left');
    if (innerX > 0.01) _addZone('z4', innerX, H, [0, -halfD, H / 2], rotFB, 'front-mid');
    _addZone('z5', ax, H, [halfW - ax / 2, -halfD, H / 2], rotFB, 'front-right');

    // Back wall (y = +halfD)
    _addZone('z5', ax, H, [-halfW + ax / 2, halfD, H / 2], rotFB, 'back-left');
    if (innerX > 0.01) _addZone('z4', innerX, H, [0, halfD, H / 2], rotFB, 'back-mid');
    _addZone('z5', ax, H, [halfW - ax / 2, halfD, H / 2], rotFB, 'back-right');

    // Left wall (x = -halfW)
    _addZone('z5', ay, H, [-halfW, -halfD + ay / 2, H / 2], rotLR, 'left-front');
    if (innerY > 0.01) _addZone('z4', innerY, H, [-halfW, 0, H / 2], rotLR, 'left-mid');
    _addZone('z5', ay, H, [-halfW, halfD - ay / 2, H / 2], rotLR, 'left-back');

    // Right wall (x = +halfW)
    _addZone('z5', ay, H, [halfW, -halfD + ay / 2, H / 2], rotLR, 'right-front');
    if (innerY > 0.01) _addZone('z4', innerY, H, [halfW, 0, H / 2], rotLR, 'right-mid');
    _addZone('z5', ay, H, [halfW, halfD - ay / 2, H / 2], rotLR, 'right-back');
}

function _buildRoof(halfW, halfD, H, ax, ay) {
    const innerX = 2 * halfW - 2 * ax;
    const innerY = 2 * halfD - 2 * ay;
    const zRoof = H + 0.02; // slight offset above slab
    const rot = [0, 0, 0];

    // Interior Zone 1
    if (innerX > 0.01 && innerY > 0.01) {
        _addZone('z1', innerX, innerY, [0, 0, zRoof], rot, 'roof-interior', true);
    }

    // Edge Zone 2
    if (innerX > 0.01) {
        _addZone('z2', innerX, ay, [0, -halfD + ay / 2, zRoof], rot, 'roof-edge-front', true);
        _addZone('z2', innerX, ay, [0, halfD - ay / 2, zRoof], rot, 'roof-edge-back', true);
    }
    if (innerY > 0.01) {
        _addZone('z2', ax, innerY, [-halfW + ax / 2, 0, zRoof], rot, 'roof-edge-left', true);
        _addZone('z2', ax, innerY, [halfW - ax / 2, 0, zRoof], rot, 'roof-edge-right', true);
    }

    // Corner Zone 3
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
    _windShellGroup.add(mesh);
    _zoneMeshes.push(mesh);
}

function _buildZoneEdgeLines(halfW, halfD, H, ax, ay) {
    const lineColor = 0xcccccc;
    const lineMat = new THREE.LineBasicMaterial({ color: lineColor, transparent: true, opacity: 0.25 });

    // Vertical boundary lines on walls at ±ax from wall ends
    const wallLineSegs = [
        // Front wall zone boundaries (x positions at ±(halfW - ax))
        [[-halfW + ax, -halfD, 0], [-halfW + ax, -halfD, H]],
        [[halfW - ax, -halfD, 0], [halfW - ax, -halfD, H]],
        // Back wall
        [[-halfW + ax, halfD, 0], [-halfW + ax, halfD, H]],
        [[halfW - ax, halfD, 0], [halfW - ax, halfD, H]],
        // Left wall zone boundaries (y positions at ±(halfD - ay))
        [[-halfW, -halfD + ay, 0], [-halfW, -halfD + ay, H]],
        [[-halfW, halfD - ay, 0], [-halfW, halfD - ay, H]],
        // Right wall
        [[halfW, -halfD + ay, 0], [halfW, -halfD + ay, H]],
        [[halfW, halfD - ay, 0], [halfW, halfD - ay, H]],
    ];

    wallLineSegs.forEach(([a, b]) => {
        const geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(...a),
            new THREE.Vector3(...b),
        ]);
        _windShellGroup.add(new THREE.Line(geo, lineMat.clone()));
    });

    // Roof zone boundary lines at z = H + 0.03
    const z = H + 0.03;
    const roofLines = [
        // Front edge
        [[-halfW + ax, -halfD + ay, z], [halfW - ax, -halfD + ay, z]],
        [[-halfW, -halfD + ay, z], [-halfW + ax, -halfD + ay, z]],
        [[halfW - ax, -halfD + ay, z], [halfW, -halfD + ay, z]],
        // Back edge
        [[-halfW + ax, halfD - ay, z], [halfW - ax, halfD - ay, z]],
        [[-halfW, halfD - ay, z], [-halfW + ax, halfD - ay, z]],
        [[halfW - ax, halfD - ay, z], [halfW, halfD - ay, z]],
        // Left edge
        [[-halfW + ax, -halfD + ay, z], [-halfW + ax, halfD - ay, z]],
        [[-halfW + ax, -halfD, z], [-halfW + ax, -halfD + ay, z]],
        [[-halfW + ax, halfD - ay, z], [-halfW + ax, halfD, z]],
        // Right edge
        [[halfW - ax, -halfD + ay, z], [halfW - ax, halfD - ay, z]],
        [[halfW - ax, -halfD, z], [halfW - ax, -halfD + ay, z]],
        [[halfW - ax, halfD - ay, z], [halfW - ax, halfD, z]],
    ];

    roofLines.forEach(([a, b]) => {
        const geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(...a),
            new THREE.Vector3(...b),
        ]);
        _windShellGroup.add(new THREE.Line(geo, lineMat.clone()));
    });
}

// ---- Zone labels (sprites, scaled to building size) ----

function _updateLabels() {
    while (_labelsGroup.children.length > 0) {
        const s = _labelsGroup.children[0];
        if (s.material?.map) s.material.map.dispose();
        if (s.material) s.material.dispose();
        _labelsGroup.remove(s);
    }

    // Scale sprites proportionally to building dimensions
    const { width: L, depth: B, totalHeight: H } = _config;
    const refDim = Math.min(L, B, H);
    const scaleMult = refDim / 10;

    _zoneMeshes.forEach(mesh => {
        const { zoneId, isRoof, faceId } = mesh.userData;

        // At each corner two z5 faces meet (front/back wall + side wall).
        // Only label the front/back wall faces to get one label per corner (4 total).
        if (zoneId === 'z5' && !faceId.startsWith('front') && !faceId.startsWith('back')) return;

        const pressureText = _getPressureLabel(zoneId);
        const sprite = _makeLabel(zoneId, pressureText, scaleMult);
        if (!sprite) return;

        const pos = mesh.position.clone();
        // Compute outward face normal: for walls use XY direction, for roof use +Z
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
        _labelsGroup.add(sprite);
    });
}

function _getPressureLabel(zoneId) {
    if (!_ccData) return null;
    const refArea = '5.0';
    const wall = _ccData.wall?.[refArea];
    const roof = _ccData.roof?.[refArea];

    if (zoneId === 'z4' && wall) return `+${wall.P_z4_pos ?? '—'} / ${wall.P_z4_neg ?? '—'} kPa`;
    if (zoneId === 'z5' && wall) return `+${wall.P_z5_pos ?? wall.P_z4_pos ?? '—'} / ${wall.P_z5_neg ?? '—'} kPa`;
    if (zoneId === 'z1' && roof) return `${roof.P_z1_neg ?? '—'} kPa`;
    if (zoneId === 'z2' && roof) return `${roof.P_z2_neg ?? '—'} kPa`;
    if (zoneId === 'z3' && roof) return `${roof.P_z3_neg ?? '—'} kPa`;
    return null;
}

function _makeLabel(zoneId, pressureLine, scaleMult = 1) {
    if (!pressureLine) return null;

    // Measure text width and fit canvas tightly
    const fontSize = 15;
    const tmpCanvas = document.createElement('canvas');
    const tmpCtx = tmpCanvas.getContext('2d');
    tmpCtx.font = `600 ${fontSize}px Arial`;
    const textW = tmpCtx.measureText(pressureLine).width;

    const padH = 14; // total horizontal padding (7px each side)
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

    const swatchGray = '#' + ZONE[zoneId].color.toString(16).padStart(6, '0');
    ctx.fillStyle = swatchGray;
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

// ---- Per-frame label visibility (back-facing labels fade out) ----

const _camDir = new THREE.Vector3();

function tickWindShell(camera) {
    if (!_windShellGroup?.visible || !_labelsGroup) return;
    camera.getWorldDirection(_camDir);

    _labelsGroup.children.forEach(sprite => {
        const normal = sprite.userData.faceNormal;
        if (!normal) return;
        // dot > 0: face pointing same dir as camera (back-facing), < 0: front-facing
        const dot = normal.dot(_camDir);
        // Map: front-facing (dot ≤ -0.1) → full opacity, back-facing (dot ≥ 0.3) → dim
        const t = Math.max(0, Math.min(1, (dot + 0.1) / 0.4));
        sprite.material.opacity = 1 - t * 0.82; // fades from 1.0 → 0.18
    });
}

// ---- Helpers ----

function _disposeObject(obj) {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
    }
    obj.children?.forEach(_disposeObject);
}

export { initWindShell, updateWindShellGeometry, tickWindShell };
