// ============================
// Facade View - 3D Facade Visualization
// Static building wireframe + dynamic glass/frame/anchor per category
// ============================

import * as THREE from 'three';
import {
    initSharedView,
    getScene,
    getCamera,
    getRenderer,
    getControls,
    getConfig,
    fitCameraToBuilding,
    setViewMode,
    saveCurrentCameraState,
} from './viewShared.js';

const VIEW_MODE = 'facade';

let buildingGroup, facadeElementsGroup;
let _initialized = false;

// ============================
// Public API
// ============================

async function initFacadeView() {
    console.log('[FacadeView] initFacadeView called, _initialized:', _initialized);
    if (_initialized) {
        console.log('[FacadeView] Already initialized, skipping');
        return;
    }

    try {
        console.log('[FacadeView] Calling initSharedView...');
        const shared = await initSharedView();
        console.log('[FacadeView] initSharedView returned:', !!shared);
        if (!shared) {
            console.warn('[FacadeView] Shared view not ready');
            return;
        }

        const { scene } = shared;
        console.log('[FacadeView] Got scene:', !!scene);

        setViewMode(VIEW_MODE, true);
        fitCameraToBuilding(VIEW_MODE);
        saveCurrentCameraState();

        buildingGroup = new THREE.Group();
        buildingGroup.visible = false;
        scene.add(buildingGroup);

        facadeElementsGroup = new THREE.Group();
        facadeElementsGroup.name = 'facadeElements';
        facadeElementsGroup.visible = false;
        scene.add(facadeElementsGroup);

        _rebuildBuildingWireframe();

        _setupEventListeners();
        _handleInitialState();

        _initialized = true;
        console.log('[FacadeView] Initialized successfully');
    } catch (e) {
        console.error('[FacadeView] Initialization error:', e);
        console.error(e.stack);
    }
}

function updateFacadeBuilding(config = {}) {
    const currentConfig = getConfig();

    if (config.floorHeight !== undefined && config.floorHeight > 0) {
        currentConfig.floorHeight = config.floorHeight;
        currentConfig.numFloors = Math.max(1, Math.round(currentConfig.height / currentConfig.floorHeight));
    }

    _rebuildBuildingWireframe();
    fitCameraToBuilding();
}

function refreshFacadeElements() {
    _updateFacadeElements();
}

// ============================
// Event Listeners
// ============================

function _handleInitialState() {
    const currentModeEl = document.querySelector('.topbar__btn-mode.active');
    const currentMode = currentModeEl?.textContent?.trim().toLowerCase();

    if (currentMode === 'facade' || !currentMode) {
        buildingGroup.visible = true;
        facadeElementsGroup.visible = true;
        _updateFacadeElements();
    }
}

function _setupEventListeners() {
    window.addEventListener('panel-mode-changed', (e) => {
        if (e.detail.mode !== 'facade') {
            buildingGroup.visible = false;
            facadeElementsGroup.visible = false;
            return;
        }

        setViewMode(VIEW_MODE);
        buildingGroup.visible = true;
        facadeElementsGroup.visible = true;
        _updateFacadeElements();
    });

    document.addEventListener('category-changed', () => {
        _updateFacadeElements();
    });

    document.addEventListener('category-added', () => {
        _updateFacadeElements();
    });

    document.addEventListener('category-deleted', () => {
        _updateFacadeElements();
    });

    document.addEventListener('input', _handleInputChange);
    document.addEventListener('change', _handleInputChange);

    _setupFloorHeightListener();
}

function _handleInputChange(e) {
    const target = e.target;
    if (!target.id) return;

    if (target.id.includes('glass') || target.id.includes('frame') || target.id.includes('anchor')) {
        _debouncedUpdateFacadeElements();
    }
}

let facadeUpdateTimer = null;
function _debouncedUpdateFacadeElements() {
    clearTimeout(facadeUpdateTimer);
    facadeUpdateTimer = setTimeout(() => {
        const panelMode = document.querySelector('.panel-mode-btn.active')?.dataset.mode;
        if (panelMode === 'facade' || (!panelMode)) {
            _updateFacadeElements();
        }
    }, 300);
}

// ============================
// Building Wireframe
// ============================

function _rebuildBuildingWireframe() {
    if (!buildingGroup) return;

    while (buildingGroup.children.length > 0) {
        buildingGroup.remove(buildingGroup.children[0]);
    }

    const config = getConfig();
    const { width, depth, floorHeight, numFloors } = config;
    const totalHeight = numFloors * floorHeight;
    const wireframeColor = 0x757575;
    const floorColor = 0x999999;
    const halfW = width / 2;
    const halfD = depth / 2;

    const cornerPositions = [
        [-halfW, -halfD],
        [halfW, -halfD],
        [halfW, halfD],
        [-halfW, halfD],
    ];

    for (const [x, y] of cornerPositions) {
        const colTop = totalHeight + 1.2;
        const points = [
            new THREE.Vector3(x, y, 0),
            new THREE.Vector3(x, y, colTop),
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: wireframeColor, transparent: true, opacity: 0.5 });
        buildingGroup.add(new THREE.Line(geometry, material));

        for (let floor = 1; floor <= numFloors; floor++) {
            const z = floor * floorHeight;
            const extLen = 1.2;
            const extPoints = [
                new THREE.Vector3(x, y, z),
                new THREE.Vector3(x, y, z + extLen),
            ];
            const extGeom = new THREE.BufferGeometry().setFromPoints(extPoints);
            const extMat = new THREE.LineBasicMaterial({ color: wireframeColor, transparent: true, opacity: 0.5 });
            buildingGroup.add(new THREE.Line(extGeom, extMat));
        }
    }

    _createTransparentWalls(width, depth, totalHeight);
    _createTransparentSlabs(width, depth, numFloors, floorHeight);

    for (let floor = 1; floor <= numFloors; floor++) {
        const z = floor * floorHeight;

        const floorPoints = [
            new THREE.Vector3(-halfW, -halfD, z),
            new THREE.Vector3(halfW, -halfD, z),
            new THREE.Vector3(halfW, halfD, z),
            new THREE.Vector3(-halfW, halfD, z),
            new THREE.Vector3(-halfW, -halfD, z),
        ];

        const floorGeometry = new THREE.BufferGeometry().setFromPoints(floorPoints);
        const floorMaterial = new THREE.LineBasicMaterial({ color: floorColor, transparent: true, opacity: 0.3 });
        buildingGroup.add(new THREE.Line(floorGeometry, floorMaterial));
    }

    console.log(`[FacadeView] Wireframe rebuilt: ${width}m x ${depth}m x ${totalHeight}m (${numFloors} floors)`);
}

function _createTransparentWalls(width, depth, height) {
    const halfW = width / 2;
    const halfD = depth / 2;

    const wallMaterial = new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.04,
        side: THREE.DoubleSide,
        depthWrite: false,
    });

    const walls = [
        { pos: [0, halfD, height / 2], rot: [Math.PI / 2, 0, 0], size: [width, height] },
        { pos: [0, -halfD, height / 2], rot: [Math.PI / 2, 0, 0], size: [width, height] },
        { pos: [halfW, 0, height / 2], rot: [Math.PI / 2, Math.PI / 2, 0], size: [depth, height] },
        { pos: [-halfW, 0, height / 2], rot: [Math.PI / 2, Math.PI / 2, 0], size: [depth, height] },
    ];

    walls.forEach(wall => {
        const geometry = new THREE.PlaneGeometry(wall.size[0], wall.size[1]);
        const mesh = new THREE.Mesh(geometry, wallMaterial);
        mesh.position.set(...wall.pos);
        mesh.rotation.set(...wall.rot);
        mesh.userData.isWall = true;
        buildingGroup.add(mesh);
    });
}

function _createTransparentSlabs(width, depth, numFloors, floorHeight) {
    const halfW = width / 2;
    const halfD = depth / 2;

    const transparentMaterial = new THREE.MeshPhongMaterial({
        color: 0xdddddd,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
    });

    const solidMaterial = new THREE.MeshPhongMaterial({
        color: 0x1f211e,
        transparent: true,
        opacity: 0.03,
        side: THREE.DoubleSide,
    });

    for (let floor = 0; floor <= numFloors; floor++) {
        const z = floor * floorHeight;
        const offset = floor === 0 ? 1.2 : 0;
        const thickness = floor === 0 ? 0.3 : 0.01;
        const geometry = new THREE.BoxGeometry(width + offset * 2, depth + offset * 2, thickness);
        const slab = new THREE.Mesh(geometry, floor === 0 ? solidMaterial : transparentMaterial);
        slab.position.set(0, 0, z - thickness / 2);
        slab.userData.isSlab = true;
        buildingGroup.add(slab);
    }

    const borderPoints = [
        new THREE.Vector3(-halfW, -halfD, 0.01),
        new THREE.Vector3(halfW, -halfD, 0.01),
        new THREE.Vector3(halfW, halfD, 0.01),
        new THREE.Vector3(-halfW, halfD, 0.01),
        new THREE.Vector3(-halfW, -halfD, 0.01),
    ];
    const borderGeometry = new THREE.BufferGeometry().setFromPoints(borderPoints);
    const borderMaterial = new THREE.LineBasicMaterial({ color: 0x757575, transparent: true, opacity: 0.4 });
    buildingGroup.add(new THREE.Line(borderGeometry, borderMaterial));
}

// ============================
// Floor Height Listener
// ============================

function _setupFloorHeightListener() {
    const updateFloorHeight = () => {
        const floorHeightInput = document.getElementById('floor_height');
        if (floorHeightInput && floorHeightInput.value) {
            const fh = parseFloat(floorHeightInput.value);
            if (!isNaN(fh) && fh > 0) {
                updateFacadeBuilding({ floorHeight: fh });
            }
        }
    };

    document.addEventListener('change', (e) => {
        if (e.target.id === 'floor_height') {
            updateFloorHeight();
        }
    });

    document.addEventListener('input', (e) => {
        if (e.target.id === 'floor_height') {
            updateFloorHeight();
        }
    });

    updateFloorHeight();
}

// ============================
// Facade Elements (Glass, Frame, Anchors)
// ============================

function _updateFacadeElements() {
    if (!facadeElementsGroup) return;

    while (facadeElementsGroup.children.length > 0) {
        const child = facadeElementsGroup.children[0];
        _disposeObject(child);
        facadeElementsGroup.remove(child);
    }

    const categoryBtns = document.querySelectorAll('.category__btn');
    categoryBtns.forEach(btn => {
        const catNum = parseInt(btn.dataset.category);
        if (isNaN(catNum)) return;

        _buildCategoryFacade(catNum);
    });
}

function _buildCategoryFacade(catNum) {
    const glassType = document.getElementById(`cat${catNum}-glass-type`) || 'sgu';
    const glassWidth = _getInputValue(`cat${catNum}-glass-width`);
    const glassHeight = _getInputValue(`cat${catNum}-glass-height`);

    if (!glassWidth || !glassHeight) return;

    const config = getConfig();
    const { width, depth, floorHeight, numFloors } = config;
    const totalHeight = numFloors * floorHeight;
    const halfW = width / 2;
    const halfD = depth / 2;

    const faceConfigs = [
        { dir: 'front', normal: [0, -1, 0], rot: [Math.PI / 2, 0, 0], size: [width, totalHeight], offset: [-halfD] },
        { dir: 'back', normal: [0, 1, 0], rot: [Math.PI / 2, 0, 0], size: [width, totalHeight], offset: [halfD] },
        { dir: 'left', normal: [-1, 0, 0], rot: [Math.PI / 2, Math.PI / 2, 0], size: [depth, totalHeight], offset: [-halfW] },
        { dir: 'right', normal: [1, 0, 0], rot: [Math.PI / 2, Math.PI / 2, 0], size: [depth, totalHeight], offset: [halfW] },
    ];

    faceConfigs.forEach(face => {
        const faceWidth = face.dir === 'front' || face.dir === 'back' ? width : depth;
        const faceHeight = totalHeight;

        const cols = Math.max(1, Math.floor(faceWidth / glassWidth));
        const rows = numFloors;

        const panelW = faceWidth / cols;
        const panelH = floorHeight;

        for (let col = 0; col < cols; col++) {
            for (let row = 0; row < rows; row++) {
                const x = face.dir === 'front' || face.dir === 'back'
                    ? -faceWidth / 2 + panelW / 2 + col * panelW
                    : 0;
                const y = face.dir === 'left' || face.dir === 'right'
                    ? -faceWidth / 2 + panelW / 2 + col * panelW
                    : face.offset[0];
                const z = panelH / 2 + row * panelH;

                _createGlassPane(x, y, z, panelW, panelH, face.rot, glassType, catNum);
                _createFrameLines(x, y, z, panelW, panelH, face.rot, catNum);
                _createAnchors(x, y, z, panelW, panelH, face.rot, catNum);
            }
        }
    });
}

function _createGlassPane(x, y, z, w, h, rot, glassType, catNum) {
    const geometry = new THREE.PlaneGeometry(w * 0.95, h * 0.95);

    let color = 0x88ccff;
    let opacity = 0.3;
    let metalness = 0.9;
    let roughness = 0.1;

    if (glassType === 'laminated') {
        color = 0x77bbee;
        opacity = 0.4;
    } else if (glassType === 'tempered') {
        color = 0x99ddff;
        opacity = 0.25;
    } else if (glassType === 'sgu') {
        color = 0x88ccff;
        opacity = 0.3;
    }

    const material = new THREE.MeshPhongMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        shininess: 100,
        metalness: metalness,
        roughness: roughness,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(...rot);
    mesh.userData = { type: 'glass', category: catNum };
    facadeElementsGroup.add(mesh);
}

function _createFrameLines(x, y, z, w, h, rot, catNum) {
    const frameColor = 0x606060;
    const lineMaterial = new THREE.LineBasicMaterial({ color: frameColor, transparent: true, opacity: 0.7 });

    const halfW = w / 2;
    const halfH = h / 2;

    const corners = [
        [-halfW, -halfH],
        [halfW, -halfH],
        [halfW, halfH],
        [-halfW, halfH],
        [-halfW, -halfH],
    ];

    const points = corners.map(([u, v]) => new THREE.Vector3(u, v, 0));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const line = new THREE.Line(geometry, lineMaterial);
    line.position.set(x, y, z);
    line.rotation.set(...rot);
    line.userData = { type: 'frame', category: catNum };
    facadeElementsGroup.add(line);
}

function _createAnchors(x, y, z, w, h, rot, catNum) {
    const anchorPositions = [
        [w / 2 * 0.9, -h / 2 * 0.9],
        [-w / 2 * 0.9, -h / 2 * 0.9],
        [w / 2 * 0.9, h / 2 * 0.9],
        [-w / 2 * 0.9, h / 2 * 0.9],
    ];

    const anchorGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const anchorMaterial = new THREE.MeshPhongMaterial({ color: 0xff6600 });

    anchorPositions.forEach(([u, v]) => {
        const anchor = new THREE.Mesh(anchorGeometry, anchorMaterial);
        anchor.position.set(x + u, y + v, z);
        anchor.rotation.set(...rot);
        anchor.userData = { type: 'anchor', category: catNum };
        facadeElementsGroup.add(anchor);
    });
}

function _getInputValue(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    const val = parseFloat(el.value);
    return isNaN(val) || val <= 0 ? null : val;
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
    if (obj.children) {
        obj.children.forEach(child => _disposeObject(child));
    }
}

export { initFacadeView, updateFacadeBuilding, refreshFacadeElements };
