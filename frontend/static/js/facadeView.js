// ============================
// Facade View - 3D Facade Visualization
// Static building wireframe (floor height only) + dynamic glass/frame/anchor per category
// Each view has its own Three.js environment (scene, camera, renderer, controls, nav cube)
// ============================

import * as THREE from 'three';
import { createViewBase, getViewInstance } from './viewBase.js';
import { getFacadeResultData } from './results.js';

const FACADE_WIDTH = 15;
const FACADE_DEPTH = 10;
const FACADE_NUM_FLOORS = 4;

const FRAME_COLOR = 0x505050;
const FRAME_DEPTH_M = 0.03;
const FRAME_HEIGHT_M = 0.06;
const GLASS_THICK_M = 0.006;

let _view = null;
let buildingGroup, facadeElementsGroup;
let _initialized = false;
let _lastFloorHeight = null;
let _currentViewMode = 'model';
let _categoryCameraStates = new Map();

function _saveCameraState(catNum) {
    if (!_view || isNaN(catNum)) return;
    const pos = _view.camera.position.toArray();
    const target = _view.controls.target.toArray();
    _categoryCameraStates.set(catNum, { pos, target });
}

function _restoreCameraState(catNum) {
    const state = _categoryCameraStates.get(catNum);
    if (state && state.pos && state.target) {
        _view.setCameraPosition(state.pos, state.target);
    }
}

function _getGlassMaterial(glassType) {
    const colorMap = {
        'dgu': { color: 0x88ccff, opacity: 0.35 },
        'sgu': { color: 0x88ccff, opacity: 0.35 },
        'laminated': { color: 0x77bbee, opacity: 0.4 },
        'tempered': { color: 0x99ddff, opacity: 0.3 },
    };
    const style = colorMap[glassType] || colorMap['dgu'];
    return new THREE.MeshPhongMaterial({
        color: style.color,
        transparent: true,
        opacity: style.opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        shininess: 100,
    });
}

function _getFrameMaterial() {
    return new THREE.MeshPhongMaterial({
        color: FRAME_COLOR,
        transparent: false,
        opacity: 1.0,
        shininess: 30,
    });
}

function _getGlassThicknessMM(catNum, glassType) {
    if (glassType === 'sgu') return _getInputValue(`cat${catNum}-glass-sgu-thickness`);
    if (glassType === 'dgu') return _getInputValue(`cat${catNum}-glass-dgu-thickness1`);
    if (glassType === 'lgu') return _getInputValue(`cat${catNum}-glass-lgu-thickness1`);
    if (glassType === 'ldgu') return _getInputValue(`cat${catNum}-glass-ldgu-thickness1_1`);
    return null;
}

// ============================
// Public API
// ============================

function initFacadeView() {
    if (_initialized) return;

    _view = createViewBase('facade', '#viewport-3d', '#nav-cube-facade');
    if (!_view) {
        console.warn('[FacadeView] Failed to create view base');
        return;
    }

    const { scene } = _view;

    // Set initial camera position for facade view
    _view.camera.position.set(-15, -25, 8);
    _view.camera.lookAt(0, 0, _view.controls.target.z);
    _view.controls.update();

    buildingGroup = new THREE.Group();
    buildingGroup.visible = false;
    scene.add(buildingGroup);

    facadeElementsGroup = new THREE.Group();
    facadeElementsGroup.name = 'facadeElements';
    facadeElementsGroup.visible = false;
    scene.add(facadeElementsGroup);

    _rebuildBuildingWireframe();
    _view.fitCameraToBuilding();

    _setupEventListeners();
    _handleInitialState();

    _initialized = true;
}

function showFacadeView() {
    if (!_view || !buildingGroup || !facadeElementsGroup) return;
    _view.setVisible(true);
    buildingGroup.visible = true;
    facadeElementsGroup.visible = true;

    const activeCat = document.querySelector('.category__btn.active');
    const catNum = activeCat ? parseInt(activeCat.dataset.category) : null;
    if (catNum !== null && _categoryCameraStates.has(catNum)) {
        _restoreCameraState(catNum);
    } else {
        _view.fitCameraToBuilding();
    }

    _updateFacadeElements();
}

function hideFacadeView() {
    if (!_view || !buildingGroup || !facadeElementsGroup) return;
    buildingGroup.visible = false;
    facadeElementsGroup.visible = false;
}

function refreshFacadeElements() {
    if (!_initialized) return;
    _updateFacadeElements();
}

function updateFacadeBuilding(config = {}) {
    const changed = config.floorHeight !== undefined;
    if (changed) {
        _rebuildBuildingWireframe();
        _view?.fitCameraToBuilding();
    }
    _updateFacadeElements();
}

function setViewMode(mode) {
    _currentViewMode = mode;
    if (facadeElementsGroup) {
        _updateResultOverlay(mode);
    }
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
    document.addEventListener('input', _handleInputChange);
    document.addEventListener('change', _handleInputChange);

    const activeCat = document.querySelector('.category__btn.active');
    const catNum = activeCat ? parseInt(activeCat.dataset.category) : 1;
    const floorHeightInput = document.getElementById(`cat${catNum}-general-floor_height`);
    if (floorHeightInput && floorHeightInput.value) {
        const fh = parseFloat(floorHeightInput.value);
        if (!isNaN(fh) && fh > 0) _lastFloorHeight = fh;
    }
}

function _handleInputChange(e) {
    const target = e.target;
    if (!target?.id) return;
    const id = target.id;

    if (id.includes('general-floor_height')) {
        const newFH = parseFloat(target.value);
        if (isNaN(newFH) || newFH <= 0) return;
        if (newFH !== _lastFloorHeight) {
            _lastFloorHeight = newFH;
            updateFacadeBuilding({ floorHeight: newFH / 1000 });
        }
    } else if (
        id.includes('general-') ||
        id.includes('glass-') ||
        id.includes('frame-') ||
        id.includes('anchor-')
    ) {
        _debouncedUpdateFacadeElements();
    }
}

let facadeUpdateTimer = null;
function _debouncedUpdateFacadeElements() {
    clearTimeout(facadeUpdateTimer);
    facadeUpdateTimer = setTimeout(() => {
        _updateFacadeElements();
    }, 150);
}

// ============================
// Building Wireframe
// ============================

function _rebuildBuildingWireframe() {
    if (!buildingGroup || !_view) return;

    while (buildingGroup.children.length > 0) {
        _disposeObject(buildingGroup.children[0]);
        buildingGroup.remove(buildingGroup.children[0]);
    }

    const width = 15;
    const depth = 10;
    const floorHeight = _lastFloorHeight ? _lastFloorHeight / 1000 : 3.2;
    const numFloors = 4;
    const totalHeight = numFloors * floorHeight;
    const wireframeColor = 0x757575;
    const floorColor = 0x999999;
    const halfW = width / 2;
    const halfD = depth / 2;

    for (const [cx, cy] of [[-halfW, -halfD], [halfW, -halfD], [halfW, halfD], [-halfW, halfD]]) {
        const colTop = totalHeight + 1.2;
        const points = [
            new THREE.Vector3(cx, cy, 0),
            new THREE.Vector3(cx, cy, colTop),
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: wireframeColor, transparent: true, opacity: 0.5 });
        buildingGroup.add(new THREE.Line(geometry, material));

        for (let floor = 1; floor <= numFloors; floor++) {
            const z = floor * floorHeight;
            const extPoints = [
                new THREE.Vector3(cx, cy, z),
                new THREE.Vector3(cx, cy, z + 1.2),
            ];
            const extGeom = new THREE.BufferGeometry().setFromPoints(extPoints);
            const extMat = new THREE.LineBasicMaterial({ color: wireframeColor, transparent: true, opacity: 0.5 });
            buildingGroup.add(new THREE.Line(extGeom, extMat));
        }
    }

    _createTransparentWalls(width, depth, totalHeight);
    _createTransparentSlabs(width, depth, numFloors, floorHeight);

    const frontExtension = 1.2;
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

        const frontLinePoints = [
            new THREE.Vector3(-halfW - frontExtension, -halfD, z),
            new THREE.Vector3(halfW + frontExtension, -halfD, z),
        ];
        const frontLineGeometry = new THREE.BufferGeometry().setFromPoints(frontLinePoints);
        const frontLineMaterial = new THREE.LineBasicMaterial({ color: floorColor, transparent: true, opacity: 0.5 });
        buildingGroup.add(new THREE.Line(frontLineGeometry, frontLineMaterial));

        const backLinePoints = [
            new THREE.Vector3(-halfW - frontExtension, halfD, z),
            new THREE.Vector3(halfW + frontExtension, halfD, z),
        ];
        const backLineGeometry = new THREE.BufferGeometry().setFromPoints(backLinePoints);
        const backLineMaterial = new THREE.LineBasicMaterial({ color: floorColor, transparent: true, opacity: 0.5 });
        buildingGroup.add(new THREE.Line(backLineGeometry, backLineMaterial));

        const leftSideLinePoints = [
            new THREE.Vector3(-halfW, halfD, z),
            new THREE.Vector3(-halfW, halfD + frontExtension, z),
        ];
        const leftSideLineGeometry = new THREE.BufferGeometry().setFromPoints(leftSideLinePoints);
        const leftSideLineMaterial = new THREE.LineBasicMaterial({ color: floorColor, transparent: true, opacity: 0.5 });
        buildingGroup.add(new THREE.Line(leftSideLineGeometry, leftSideLineMaterial));

        const rightSideLinePoints = [
            new THREE.Vector3(halfW, halfD, z),
            new THREE.Vector3(halfW, halfD + frontExtension, z),
        ];
        const rightSideLineGeometry = new THREE.BufferGeometry().setFromPoints(rightSideLinePoints);
        const rightSideLineMaterial = new THREE.LineBasicMaterial({ color: floorColor, transparent: true, opacity: 0.5 });
        buildingGroup.add(new THREE.Line(rightSideLineGeometry, rightSideLineMaterial));
    }
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
// Facade Elements (Glass, Frame, Anchors)
// ============================

function _updateFacadeElements() {
    if (!facadeElementsGroup) return;

    const activeCat = document.querySelector('.category__btn.active');
    if (!activeCat) return;
    const catNum = parseInt(activeCat.dataset.category);
    if (isNaN(catNum)) return;

    while (facadeElementsGroup.children.length > 0) {
        _disposeObject(facadeElementsGroup.children[0]);
        facadeElementsGroup.remove(facadeElementsGroup.children[0]);
    }

    const floorHeightMM = _getInputValue(`cat${catNum}-general-floor_height`);
    const newFH = floorHeightMM || 3200;
    if (newFH !== _lastFloorHeight) {
        _lastFloorHeight = newFH;
        _rebuildBuildingWireframe();
    }

    const hasExistingState = _categoryCameraStates.has(catNum);
    if (hasExistingState) {
        _restoreCameraState(catNum);
    } else {
        _view?.fitCameraToBuilding();
    }

    _buildCategoryFacade(catNum);
    _updateResultOverlay(_currentViewMode);
}

function _buildCategoryFacade(catNum) {
    const glassTypeEl = document.getElementById(`cat${catNum}-glass-type`);
    const glassType = glassTypeEl ? glassTypeEl.value : 'dgu';

    const zoneEl = document.getElementById(`cat${catNum}-general-zone`);
    const zone = zoneEl ? zoneEl.value : 'zone4';

    const facadeTypeEl = document.getElementById(`cat${catNum}-general-facade_type`);
    const facadeType = facadeTypeEl ? facadeTypeEl.value : 'cont';

    const spanLength = _getInputValue(`cat${catNum}-general-span_length`);
    const floorHeightMM = _getInputValue(`cat${catNum}-general-floor_height`);
    const verticalSpacingMM = _getInputValue(`cat${catNum}-general-vertical_spacing`);

    if (!spanLength || !verticalSpacingMM || spanLength <= 0) return;

    const width = FACADE_WIDTH;
    const depth = FACADE_DEPTH;
    const numFloors = FACADE_NUM_FLOORS;
    const floorHeight = floorHeightMM / 1000;
    const verticalSpacing = verticalSpacingMM / 1000;
    const halfW = width / 2;
    const halfD = depth / 2;

    const spanMeters = spanLength / 1000;
    const facadeWidth = spanMeters * 5;

    if (facadeWidth <= 0 || facadeWidth > width * 2) return;

    let xOffset;
    if (zone === 'zone5') {
        xOffset = -halfW;
    } else {
        xOffset = -halfW + (width - facadeWidth) / 2;
    }

    let rows = [];
    if (zone === 'zone1' || zone === 'zone2' || zone === 'zone3') {
        rows = [{ start: numFloors, end: numFloors }];
    } else if (facadeType === 'cont') {
        rows = [{ start: 1, end: 2 }, { start: 2, end: 3 }];
    } else {
        rows = [{ start: 1, end: 2 }];
    }

    const y = -halfD;

    for (const row of rows) {
        const z = row.start * floorHeight;
        const nextZ = row.end * floorHeight;
        const panelHeight = nextZ - z;

        _createGlassPanelGrid(xOffset, y, z, facadeWidth, panelHeight, spanMeters, verticalSpacing, glassType, catNum);
        _createMullionsSlabToSlab(xOffset, y, z, nextZ, facadeWidth, spanMeters, catNum);
        _createTransomsAtLevels(xOffset, y, z, nextZ, facadeWidth, spanMeters, verticalSpacing, catNum);
        _createAnchorsAtLevel(xOffset, y, z, facadeWidth, panelHeight, spanMeters, catNum);
        _createDimensionLabels(xOffset, y, z, nextZ, facadeWidth, spanMeters, verticalSpacing, catNum);
    }
}

function _createGlassPanelGrid(x, y, z, w, h, spanMeters, verticalSpacing, glassType, catNum) {
    const glassThickMM = _getGlassThicknessMM(catNum, glassType);
    const glassThickM = glassThickMM ? glassThickMM / 1000 : GLASS_THICK_M;
    const glassMaterial = _getGlassMaterial(glassType);

    const numMullions = 5;

    const transomZ = [z];
    const numMiddle = Math.floor((h - 0.01) / verticalSpacing);
    for (let i = 1; i <= numMiddle; i++) {
        transomZ.push(z + i * verticalSpacing);
    }
    transomZ.push(z + h);
    transomZ.sort((a, b) => a - b);

    for (let i = 0; i < numMullions; i++) {
        for (let j = 0; j < transomZ.length - 1; j++) {
            const panelW = spanMeters;
            const panelH = transomZ[j + 1] - transomZ[j];
            const panelCX = (i + 0.5) * spanMeters;
            const panelCZ = (transomZ[j] + transomZ[j + 1]) / 2;

            const panelGeom = new THREE.BoxGeometry(panelW * 0.95, glassThickM, panelH * 0.95);
            const panel = new THREE.Mesh(panelGeom, glassMaterial);
            panel.position.set(x + panelCX, y, panelCZ);
            panel.userData = { type: 'glass', category: catNum };
            facadeElementsGroup.add(panel);
        }
    }
}

function _createMullionsSlabToSlab(x, y, zStart, zEnd, w, spanMeters, catNum) {
    const frameMaterial = _getFrameMaterial();
    const numMullions = 5;
    const mullionLen = zEnd - zStart;

    for (let i = 0; i <= numMullions; i++) {
        const mx = i * spanMeters;
        const mGeom = new THREE.BoxGeometry(FRAME_HEIGHT_M, FRAME_DEPTH_M, mullionLen);
        const mMesh = new THREE.Mesh(mGeom, frameMaterial);
        mMesh.position.set(x + mx, y, zStart + mullionLen / 2);
        mMesh.userData = { type: 'mullion', category: catNum };
        facadeElementsGroup.add(mMesh);
    }
}

function _createTransomsAtLevels(x, y, zStart, zEnd, w, spanMeters, verticalSpacing, catNum) {
    const frameMaterial = _getFrameMaterial();
    const panelHeight = zEnd - zStart;

    const transomZ = [zStart, zEnd];
    const numMiddle = Math.floor((panelHeight - 0.01) / verticalSpacing);
    for (let i = 1; i <= numMiddle; i++) {
        transomZ.push(zStart + i * verticalSpacing);
    }
    transomZ.sort((a, b) => a - b);

    for (const tz of transomZ) {
        const tGeom = new THREE.BoxGeometry(w, FRAME_DEPTH_M, FRAME_HEIGHT_M);
        const tMesh = new THREE.Mesh(tGeom, frameMaterial);
        tMesh.position.set(x + w / 2, y, tz);
        tMesh.userData = { type: 'transom', category: catNum };
        facadeElementsGroup.add(tMesh);
    }
}

function _createAnchorsAtLevel(x, y, z, w, h, spanMeters, catNum) {
    const anchorTypeEl = document.getElementById(`cat${catNum}-anchor-type`);
    const anchorType = anchorTypeEl ? anchorTypeEl.value : 'box-clump';

    let anchorColor = 0xff6600;
    if (anchorType === 'u-clump') anchorColor = 0xffaa00;
    else if (anchorType === 'l-clump') anchorColor = 0xff4400;

    const anchorMaterial = new THREE.MeshPhongMaterial({ color: anchorColor });
    const anchorGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const numMullions = 5;

    for (let i = 0; i <= numMullions; i++) {
        const mx = i * spanMeters;
        const anchorBot = new THREE.Mesh(anchorGeometry, anchorMaterial);
        anchorBot.position.set(x + mx, y, z);
        anchorBot.userData = { type: 'anchor', category: catNum, anchorType: anchorType };
        facadeElementsGroup.add(anchorBot);

        const anchorTop = new THREE.Mesh(anchorGeometry, anchorMaterial);
        anchorTop.position.set(x + mx, y, z + h);
        anchorTop.userData = { type: 'anchor', category: catNum, anchorType: anchorType };
        facadeElementsGroup.add(anchorTop);
    }
}

// ============================
// Dimension Labels (Architectural Style)
// ============================

function _createDimensionLabels(x, y, zStart, zEnd, facadeWidth, spanMeters, verticalSpacing, catNum) {
    const scaleMult = 0.8;
    const dimColor = 0xa1a1a1;
    const mat = new THREE.LineBasicMaterial({ color: dimColor });

    const leftX = x;
    const rightX = x + facadeWidth;
    const bottomZ = zStart;
    const topZ = zEnd;

    const _addDimLine = (start, end, label) => {
        const dir = end.clone().sub(start).normalize();
        const extLen = 0.15 * scaleMult;
        const extStart = start.clone().sub(dir.clone().multiplyScalar(extLen));
        const extEnd = end.clone().add(dir.clone().multiplyScalar(extLen));

        const geo = new THREE.BufferGeometry().setFromPoints([extStart, extEnd]);
        facadeElementsGroup.add(new THREE.Line(geo, mat.clone()));

        const tickSize = 0.12 * scaleMult;
        const horizDir = new THREE.Vector3(-dir.y, dir.x, 0).normalize();
        const tickStart1 = start.clone().add(horizDir.clone().multiplyScalar(tickSize));
        const tickStart2 = start.clone().sub(horizDir.clone().multiplyScalar(tickSize));
        const tickEnd1 = end.clone().add(horizDir.clone().multiplyScalar(tickSize));
        const tickEnd2 = end.clone().sub(horizDir.clone().multiplyScalar(tickSize));

        facadeElementsGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([tickStart1, tickStart2]), mat.clone()));
        facadeElementsGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([tickEnd1, tickEnd2]), mat.clone()));

        const mid = start.clone().add(end).multiplyScalar(0.5);
        const offsetDir = horizDir.clone().multiplyScalar(-0.25 * scaleMult);
        mid.add(offsetDir);
        _createDimLabelSprite(label, mid, scaleMult);
    };

    const mullionLen = zEnd - zStart;
    _addDimLine(
        new THREE.Vector3(leftX - 0.6, y, bottomZ),
        new THREE.Vector3(leftX - 0.6, y, topZ),
        `${Math.round(mullionLen * 1000)}mm`
    );

    const midZ = bottomZ + verticalSpacing;
    const glassLen1 = midZ - bottomZ;
    const glassLen2 = topZ - midZ;
    _addDimLine(
        new THREE.Vector3(rightX + 0.6, y, bottomZ),
        new THREE.Vector3(rightX + 0.6, y, midZ),
        `${Math.round(glassLen1 * 1000)}mm`
    );
    _addDimLine(
        new THREE.Vector3(rightX + 0.6, y, midZ),
        new THREE.Vector3(rightX + 0.6, y, topZ),
        `${Math.round(glassLen2 * 1000)}mm`
    );

    const numMullions = 5;
    const spacingY = y;
    const _addHorizDimLine = (start, end, label) => {
        const dir = end.clone().sub(start).normalize();
        const extLen = 0.15 * scaleMult;
        const extStart = start.clone().sub(dir.clone().multiplyScalar(extLen));
        const extEnd = end.clone().add(dir.clone().multiplyScalar(extLen));

        const geo = new THREE.BufferGeometry().setFromPoints([extStart, extEnd]);
        facadeElementsGroup.add(new THREE.Line(geo, mat.clone()));

        const tickSize = 0.12 * scaleMult;
        const tickDir = new THREE.Vector3(0, 0, -1).normalize();
        const tickStart1 = start.clone().add(tickDir.clone().multiplyScalar(tickSize));
        const tickStart2 = start.clone().sub(tickDir.clone().multiplyScalar(tickSize));
        const tickEnd1 = end.clone().add(tickDir.clone().multiplyScalar(tickSize));
        const tickEnd2 = end.clone().sub(tickDir.clone().multiplyScalar(tickSize));

        facadeElementsGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([tickStart1, tickStart2]), mat.clone()));
        facadeElementsGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([tickEnd1, tickEnd2]), mat.clone()));

        const mid = start.clone().add(end).multiplyScalar(0.5);
        const offsetDir = new THREE.Vector3(0, 0, -0.35 * scaleMult);
        mid.add(offsetDir);
        _createDimLabelSprite(label, mid, scaleMult);
    };

    for (let i = 0; i < numMullions; i++) {
        const m1 = leftX + i * spanMeters;
        const m2 = leftX + (i + 1) * spanMeters;
        const spacingMM = Math.round(spanMeters * 1000);
        _addHorizDimLine(
            new THREE.Vector3(m1, spacingY, bottomZ - 0.5),
            new THREE.Vector3(m2, spacingY, bottomZ - 0.5),
            `${spacingMM}mm`
        );
    }
}

function _createDimLabelSprite(text, position, scaleMult = 1) {
    const fontSize = 13;
    const tmpCanvas = document.createElement('canvas');
    const tmpCtx = tmpCanvas.getContext('2d');
    tmpCtx.font = `600 ${fontSize}px Arial`;
    const textW = tmpCtx.measureText(text).width;
    const W = Math.ceil(textW) + 6;
    const H = 18;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.font = `600 ${fontSize}px Arial`;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, W / 2, H / 2);
    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set((W / 65) * scaleMult, (H / 65) * scaleMult, 1);
    sprite.renderOrder = 10;
    facadeElementsGroup.add(sprite);
    sprite.position.copy(position);
}

// ============================
// Result Overlay (DC Ratio / Deflection)
// ============================

function _updateResultOverlay(mode) {
    const existing = facadeElementsGroup.children.filter(c => c.userData?.isResultOverlay);
    existing.forEach(child => {
        _disposeObject(child);
        facadeElementsGroup.remove(child);
    });

    if (mode !== 'dc-ratio' && mode !== 'deflection') return;

    const catNum = _getActiveCategoryNum();
    if (!catNum) return;

    const resultData = _getFacadeResultData(catNum);
    if (!resultData) return;

    const { glassResult, frameResult } = resultData;
    const floorHeightMM = _getInputValue(`cat${catNum}-general-floor_height`) || 3200;
    const floorHeight = floorHeightMM / 1000;
    const numFloors = FACADE_NUM_FLOORS;
    const width = FACADE_WIDTH;
    const depth = FACADE_DEPTH;

    const zoneEl = document.getElementById(`cat${catNum}-general-zone`);
    const zone = zoneEl ? zoneEl.value : 'zone4';
    const facadeTypeEl = document.getElementById(`cat${catNum}-general-facade_type`);
    const facadeType = facadeTypeEl ? facadeTypeEl.value : 'cont';
    const spanLength = _getInputValue(`cat${catNum}-general-span_length`) || 2400;
    const spanMeters = spanLength / 1000;
    const facadeWidth = spanMeters * 5;

    const halfW = width / 2;
    const halfD = depth / 2;

    let xOffset;
    if (zone === 'zone5') {
        xOffset = -halfW;
    } else {
        xOffset = -halfW + (config.width - facadeWidth) / 2;
    }

    let startFloor, endFloor;
    if (zone === 'zone1' || zone === 'zone2' || zone === 'zone3') {
        startFloor = numFloors;
        endFloor = numFloors;
    } else if (facadeType === 'cont') {
        startFloor = 1;
        endFloor = 2;
    } else {
        startFloor = 3;
        endFloor = 3;
    }

    const y = -halfD;

    if (mode === 'dc-ratio') {
        const glassDc = glassResult?.stress_ratio ?? null;
        const frameDcMul = frameResult?.mul_dc ?? null;
        const frameDcTran = frameResult?.tran_dc ?? null;

        if (glassDc !== null) {
            const centerZ = (startFloor + endFloor) / 2 * floorHeight;
            const labelColor = glassDc <= 1.0 ? 0x00aa00 : 0xff0000;
            _createTextSprite(`DC: ${glassDc.toFixed(2)}`, xOffset + facadeWidth / 2, y - 0.8, centerZ, 0.5, labelColor, catNum, true);
        }
        if (frameDcMul !== null) {
            const centerZ = (startFloor + endFloor) / 2 * floorHeight;
            const labelColor = frameDcMul <= 1.0 ? 0x00aa00 : 0xff0000;
            _createTextSprite(`FM: ${frameDcMul.toFixed(2)}`, xOffset + facadeWidth / 2, y - 1.3, centerZ, 0.4, labelColor, catNum, true);
        }
        if (frameDcTran !== null) {
            const centerZ = (startFloor + endFloor) / 2 * floorHeight;
            const labelColor = frameDcTran <= 1.0 ? 0x00aa00 : 0xff0000;
            _createTextSprite(`FT: ${frameDcTran.toFixed(2)}`, xOffset + facadeWidth / 2, y - 1.8, centerZ, 0.4, labelColor, catNum, true);
        }
    } else if (mode === 'deflection') {
        const glassDef = glassResult?.deflection ?? null;
        const glassDefRatio = glassResult?.def_ratio ?? null;
        const frameDefMul = frameResult?.mul_def ?? null;
        const frameDefTran = frameResult?.tran_def_wind ?? null;

        if (glassDef !== null) {
            const centerZ = (startFloor + endFloor) / 2 * floorHeight;
            const labelColor = (glassDefRatio !== null && glassDefRatio <= 1.0) ? 0x00aa00 : 0xff8800;
            _createTextSprite(`d: ${glassDef.toFixed(1)}mm`, xOffset + facadeWidth / 2, y - 0.8, centerZ, 0.45, labelColor, catNum, true);
        }
        if (frameDefMul !== null) {
            const centerZ = (startFloor + endFloor) / 2 * floorHeight;
            _createTextSprite(`FM: ${frameDefMul.toFixed(1)}mm`, xOffset + facadeWidth / 2, y - 1.3, centerZ, 0.4, 0xff8800, catNum, true);
        }
        if (frameDefTran !== null) {
            const centerZ = (startFloor + endFloor) / 2 * floorHeight;
            _createTextSprite(`FT: ${frameDefTran.toFixed(1)}mm`, xOffset + facadeWidth / 2, y - 1.8, centerZ, 0.4, 0xff8800, catNum, true);
        }
    }
}

function _createTextSprite(text, x, y, z, scale, color, catNum, isResultOverlay = false) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(x, y, z);
    sprite.scale.set(scale * 4, scale, 1);
    sprite.userData = { type: isResultOverlay ? 'result-overlay' : 'label', category: catNum, isResultOverlay };
    facadeElementsGroup.add(sprite);
}

// ============================
// Helpers
// ============================

function _getInputValue(id) {
    const el = document.getElementById(id);
    if (!el) return null;
    const val = parseFloat(el.value);
    return isNaN(val) || val <= 0 ? null : val;
}

function _getActiveCategoryNum() {
    const activeCat = document.querySelector('.category__btn.active');
    return activeCat ? parseInt(activeCat.dataset.category) : 1;
}

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

function _getFacadeResultData(catNum) {
    return getFacadeResultData ? getFacadeResultData(catNum) : null;
}

export {
    initFacadeView,
    showFacadeView,
    hideFacadeView,
    refreshFacadeElements,
    updateFacadeBuilding,
    setViewMode,
    _saveCameraState,
    _restoreCameraState
};