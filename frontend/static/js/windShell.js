// ============================
// Wind Shell - ASCE 7 C&C Zone Visualization
// Builds a solid building shell with zone-subdivided walls and roof.
// Zones: Z4/Z5 (walls), Z1/Z2/Z3 (roof)
// ============================

import * as THREE from 'three';

// ---- Zone config (black/white/gray: lighter = interior, darker = corner) ----
const ZONE = {
    z4: { color: 0xc4c1c0, label: 'Zone 4', opacity: 0.5 },  // wall interior
    z5: { color: 0xa4bbe0, label: 'Zone 5', opacity: 0.5 },  // wall corner
    z1: { color: 0xc4c1c0, label: 'Zone 1', opacity: 0.85 },  // roof interior
    z2: { color: 0xeab8ff, label: 'Zone 2', opacity: 0.5 },  // roof edge
    z3: { color: 0xf59099, label: 'Zone 3', opacity: 0.5 },  // roof corner
};

// ---- Wind direction helpers ----
const _WIND_VECTORS = {
    '+X': new THREE.Vector3( 1, 0, 0),
    '-X': new THREE.Vector3(-1, 0, 0),
    '+Y': new THREE.Vector3( 0, 1, 0),
    '-Y': new THREE.Vector3( 0,-1, 0),
};

// Outward normals for each wall face (from faceId prefix)
const _WALL_NORMALS = {
    front: new THREE.Vector3( 0,-1, 0),
    back:  new THREE.Vector3( 0, 1, 0),
    left:  new THREE.Vector3(-1, 0, 0),
    right: new THREE.Vector3( 1, 0, 0),
};

// ---- Module state ----
let _scene = null;
let _renderer = null;
let _camera = null;
let _windShellGroup = null;
let _labelsGroup = null;
let _zoneMeshes = [];
let _config = { width: 15, depth: 10, totalHeight: 12.8, numFloors: 4, floorHeight: 3.2 };
let _ccData = null;
let _windDir = null; // null | '+X' | '-X' | '+Y' | '-Y'
let _windArrow = null;

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
        const isWind = e.detail.mode === 'wind';
        _windShellGroup.visible = isWind;
        const legend = document.getElementById('wind-zone-legend');
        if (legend) legend.classList.toggle('visible', isWind);
        const windSection = document.getElementById('filter-wind-section');
        if (windSection) windSection.classList.toggle('visible', isWind);
        if (isWind) {
            _windDir = '+X';
            _syncDirButtons();
            _updateFaceAppearance();
            _updateLabels();
            _updateWindArrow();
        } else {
            _windDir = null;
            _syncDirButtons();
            _updateFaceAppearance();
            _updateWindArrow();
        }
    });

    window.addEventListener('wind-cc-updated', (e) => {
        _ccData = e.detail;
        _updateLabels();
    });

    // Wind direction radio listeners
    document.querySelectorAll('.wind-dir-radio').forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                _windDir = radio.value;
                _updateFaceAppearance();
                _updateLabels();
                _updateWindArrow();
            }
        });
    });

    console.log('[WindShell] Initialized');
}

function setWindDirection(dir) {
    _windDir = dir;
    _syncDirButtons();
    _updateFaceAppearance();
    _updateLabels();
    _updateWindArrow();
}

function updateWindShellGeometry(config) {
    if (!_windShellGroup) return;
    if (config.width !== undefined && config.width > 0) _config.width = config.width;
    if (config.depth !== undefined && config.depth > 0) _config.depth = config.depth;
    if (config.totalHeight !== undefined && config.totalHeight > 0) _config.totalHeight = config.totalHeight;
    if (config.numFloors !== undefined && config.numFloors > 0) _config.numFloors = config.numFloors;
    if (config.floorHeight !== undefined && config.floorHeight > 0) _config.floorHeight = config.floorHeight;
    _rebuild();
}

// ---- Wind direction button sync ----

function _syncDirButtons() {
    document.querySelectorAll('.wind-dir-radio').forEach(radio => {
        radio.checked = radio.value === _windDir;
    });
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
    _windArrow = null; // will be re-created by _updateWindArrow below

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
    _buildFloorLines(halfW, halfD, H);
    _buildGroundShadow(halfW, halfD, H);
    _buildDimensionLines(halfW, halfD, H);
    _updateWindArrow();
    _updateFaceAppearance();
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
    const lineMat = new THREE.LineBasicMaterial({ color: 0x999999 });

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

// ---- Floor division lines ----

function _buildFloorLines(halfW, halfD, H) {
    const { numFloors, floorHeight } = _config;
    if (!numFloors || numFloors <= 1 || !floorHeight) return;
    const mat = new THREE.LineBasicMaterial({ color: 0x999999 });
    for (let f = 1; f < numFloors; f++) {
        const z = f * floorHeight;
        if (z >= H - 0.01) continue;
        [
            [[-halfW, -halfD, z], [halfW, -halfD, z]], // front
            [[-halfW,  halfD, z], [halfW,  halfD, z]], // back
            [[-halfW, -halfD, z], [-halfW, halfD, z]], // left
            [[ halfW, -halfD, z], [ halfW, halfD, z]], // right
        ].forEach(([a, b]) => {
            const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]);
            _windShellGroup.add(new THREE.Line(geo, mat.clone()));
        });
    }
}

// ---- Ground shadow (projected from directional light at (20, -15, 30)) ----
// Shadow ratio per unit of height derived from lightDir = normalize(-20, 15, -30):
//   shadow_x_shift = -0.3 * z,  shadow_y_shift = +0.25 * z

function _buildGroundShadow(halfW, halfD, H) {
    const px = 0.3 * H;
    const py = 0.25 * H;

    // 6-point shadow polygon vertices (world XY)
    const verts = [
        [-halfW,        -halfD      ],
        [ halfW,        -halfD      ],
        [ halfW,         halfD      ],
        [ halfW - px,    halfD + py ],
        [-halfW - px,    halfD + py ],
        [-halfW - px,   -halfD + py ],
    ];

    // Bounding box of shadow polygon
    const minX = -halfW - px, maxX =  halfW;
    const minY = -halfD,      maxY =  halfD + py;
    const worldW = maxX - minX;
    const worldD = maxY - minY;

    // Canvas with margin so blur doesn't get clipped at edges
    const CANVAS = 512;
    const margin = 0.45; // fraction of longest side (increased for shadow projection)
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

    // World → canvas pixel (canvas Y is flipped)
    const cx = (x) => (x - minX + mX) * ppu;
    const cy = (y) => ch - (y - minY + mY) * ppu;

    // Blur radius ~8% of canvas short side
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
    _windShellGroup.add(mesh);
}

// ---- Dimension annotation lines ----

function _buildDimensionLines(halfW, halfD, H) {
    const { width: L, depth: B, totalHeight: Ht } = _config;
    const refDim = Math.min(L, B, Ht);
    const scaleMult = Math.max(0.6, refDim / 10);
    const off = Math.max(1.2, Math.min(L, B) * 0.12); // leader offset from building face

    // Length (X): in front of front wall at z=0
    _addDimAnnotation(
        new THREE.Vector3(-halfW, -halfD - off, 0),
        new THREE.Vector3( halfW, -halfD - off, 0),
        [ [new THREE.Vector3(-halfW, -halfD, 0), new THREE.Vector3(-halfW, -halfD - off, 0)],
          [new THREE.Vector3( halfW, -halfD, 0), new THREE.Vector3( halfW, -halfD - off, 0)] ],
        `${L.toFixed(1)} m`, scaleMult
    );

    // Depth (Y): to the right of right wall at z=0
    _addDimAnnotation(
        new THREE.Vector3(halfW + off, -halfD, 0),
        new THREE.Vector3(halfW + off,  halfD, 0),
        [ [new THREE.Vector3(halfW, -halfD, 0), new THREE.Vector3(halfW + off, -halfD, 0)],
          [new THREE.Vector3(halfW,  halfD, 0), new THREE.Vector3(halfW + off,  halfD, 0)] ],
        `${B.toFixed(1)} m`, scaleMult
    );

    // Height (Z): 45° diagonal from front-left corner (offset in -X/-Y direction)
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

    // Extension length for dimension line beyond endpoints
    const extLen = 0.2 * scaleMult;
    const dir = end.clone().sub(start).normalize();
    const extStart = start.clone().sub(dir.clone().multiplyScalar(extLen));
    const extEnd = end.clone().add(dir.clone().multiplyScalar(extLen));

    const mainGeo = new THREE.BufferGeometry().setFromPoints([extStart, extEnd]);
    _windShellGroup.add(new THREE.Line(mainGeo, mat.clone()));

    leaders.forEach(([a, b]) => {
        const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
        _windShellGroup.add(new THREE.Line(geo, mat.clone()));
    });

    // Architectural cross ticks (45° marks at dimension line endpoints)
    const tickSize = 0.25 * scaleMult;
    const perp = new THREE.Vector3(-dir.y, dir.x, 0).normalize();
    const diag = new THREE.Vector3(dir.y, -dir.x, 0).normalize().multiplyScalar(tickSize);

    // All dimensions use 45° cross tick (architectural style)
    const tickStart1 = start.clone().add(diag);
    const tickStart2 = start.clone().sub(diag);
    const tickEnd1 = end.clone().add(diag);
    const tickEnd2 = end.clone().sub(diag);
    _windShellGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([tickStart1, tickStart2]), mat.clone()));
    _windShellGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([tickEnd1, tickEnd2]), mat.clone()));

    const mid = start.clone().add(end).multiplyScalar(0.5);
    const sprite = _makeDimLabel(labelText, scaleMult);
    sprite.position.copy(mid);
    _windShellGroup.add(sprite);
}

function _makeDimLabel(text, scaleMult = 1) {
    const fontSize = 14;
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
    sprite.scale.set((W / 70) * scaleMult, (H / 70) * scaleMult, 1);
    sprite.renderOrder = 10;
    return sprite;
}

// ---- Wind direction arrow ----

function _updateWindArrow() {
    if (_windArrow) {
        _windShellGroup.remove(_windArrow);
        _windArrow = null;
    }
    if (!_windDir || !_windShellGroup?.visible) return;

    const { width: L, depth: B, totalHeight: Ht } = _config;
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
    _windShellGroup.add(_windArrow);
}

// ---- Wind direction classification ----

/**
 * Returns true (windward / + pressure), false (leeward or side / − pressure),
 * or null (no wind dir selected — show both).
 * Roof faces are always leeward (negative) per ASCE 7 flat-roof C&C.
 */
function _isWindward(faceId, isRoof) {
    if (_windDir === null) return null;
    if (isRoof) return false; // flat roof always suction

    const wallKey = Object.keys(_WALL_NORMALS).find(k => faceId.startsWith(k));
    if (!wallKey) return null;
    const dot = _WALL_NORMALS[wallKey].dot(_WIND_VECTORS[_windDir]);
    return dot < -0.5; // front-facing into wind → windward
}

// ---- Face appearance (opacity) based on wind direction ----

function _updateFaceAppearance() {
    _zoneMeshes.forEach(mesh => {
        const { zoneId, faceId, isRoof, baseOpacity } = mesh.userData;
        const windward = _isWindward(faceId, isRoof);
        let opacity = baseOpacity;
        if (windward === true)  opacity = Math.min(1, baseOpacity * 1.35); // windward pops
        if (windward === false) opacity = baseOpacity * 0.70;             // leeward/side dims
        mesh.material.opacity = opacity;
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

        const windward = _isWindward(faceId, isRoof);
        const pressureText = _getPressureLabel(zoneId, windward);
        const sprite = _makeLabel(zoneId, pressureText, scaleMult, windward);
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

function _getPressureLabel(zoneId, windward) {
    if (!_ccData) return null;
    const refArea = '5.0';
    const wall = _ccData.wall?.[refArea];
    const roof = _ccData.roof?.[refArea];

    if (windward === null) {
        // No wind dir — show both +/-
        if (zoneId === 'z4' && wall) return `+${wall.P_z4_pos ?? '—'} / ${wall.P_z4_neg ?? '—'} kPa`;
        if (zoneId === 'z5' && wall) return `+${wall.P_z5_pos ?? wall.P_z4_pos ?? '—'} / ${wall.P_z5_neg ?? '—'} kPa`;
        if (zoneId === 'z1' && roof) return `${roof.P_z1_neg ?? '—'} kPa`;
        if (zoneId === 'z2' && roof) return `${roof.P_z2_neg ?? '—'} kPa`;
        if (zoneId === 'z3' && roof) return `${roof.P_z3_neg ?? '—'} kPa`;
    } else if (windward) {
        // Windward face: positive pressure
        if (zoneId === 'z4' && wall) return `+${wall.P_z4_pos ?? '—'} kPa`;
        if (zoneId === 'z5' && wall) return `+${wall.P_z5_pos ?? wall.P_z4_pos ?? '—'} kPa`;
    } else {
        // Leeward / side / roof: negative pressure (suction)
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

    // Swatch color: warm for windward (+), cool for leeward (−), zone color for unfiltered
    let swatchColor;
    if (windward === true)       swatchColor = '#d4d4d4'; // positive pressure — light
    else if (windward === false) swatchColor = '#555555'; // negative/suction — dark
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

export { initWindShell, updateWindShellGeometry, tickWindShell, setWindDirection };
