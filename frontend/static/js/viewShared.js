// ============================
// View Shared - Common Three.js Setup
// Shared scene, camera, renderer, controls for Wind and Facade views
// ============================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, windCamera, facadeCamera, renderer;
let windControls, facadeControls;
let navCubeScene, navCubeCamera, navCubeRenderer, navCube;
let isInitialized = false;
let _instance = null;
let _initPromise = null;
let animationCallback = null;
let currentViewMode = 'facade';
let windCameraSaved = null;
let facadeCameraSaved = null;

const DEFAULT_BUILDING_WIDTH = 15;
const DEFAULT_BUILDING_DEPTH = 10;
const DEFAULT_BUILDING_HEIGHT = 12;
const DEFAULT_FLOOR_HEIGHT = 3.2;
const DEFAULT_NUM_FLOORS = 4;

const currentConfig = {
    width: DEFAULT_BUILDING_WIDTH,
    depth: DEFAULT_BUILDING_DEPTH,
    height: DEFAULT_BUILDING_HEIGHT,
    floorHeight: DEFAULT_FLOOR_HEIGHT,
    numFloors: DEFAULT_NUM_FLOORS,
};

// Initialization - handles container with 0 dimensions
function initSharedView() {
    if (_instance) {
        return Promise.resolve(_instance);
    }

    const container = document.getElementById('viewport-3d');
    if (!container) {
        console.warn('[ViewShared] Container not found');
        return Promise.resolve(null);
    }

    const w = container.clientWidth;
    const h = container.clientHeight;
    console.log('[ViewShared] Container dimensions:', w, 'x', h, '- initializing Three.js');

    if (w === 0 || h === 0) {
        console.log('[ViewShared] Container has 0 size, will retry on animation frame');
        return new Promise((resolve) => {
            const retry = () => {
                const c = document.getElementById('viewport-3d');
                if (!c) {
                    resolve(null);
                    return;
                }
                const rw = c.clientWidth || c.offsetWidth;
                const rh = c.clientHeight || c.offsetHeight;
                if (rw > 0 && rh > 0) {
                    console.log('[ViewShared] Got valid size:', rw, 'x', rh);
                    _instance = _initShared(c, rw, rh);
                    resolve(_instance);
                } else {
                    // Fallback to offset dimensions if client dimensions are 0
                    if (c.offsetWidth > 0 && c.offsetHeight > 0) {
                        console.log('[ViewShared] Using offset dimensions:', c.offsetWidth, 'x', c.offsetHeight);
                        _instance = _initShared(c, c.offsetWidth, c.offsetHeight);
                        resolve(_instance);
                    } else {
                        requestAnimationFrame(retry);
                    }
                }
            };
            requestAnimationFrame(retry);
        });
    }

    _instance = _initShared(container, w, h);
    return Promise.resolve(_instance);
}

function _initShared(container, w, h) {
    console.log('[ViewShared] _initShared called, creating Three.js scene...');
    isInitialized = true;

    scene = new THREE.Scene();

    const skyDome = createSkyDome();
    skyDome.rotation.x = Math.PI / 2;
    scene.add(skyDome);

    windCamera = new THREE.PerspectiveCamera(30, w / h, 0.1, 1000);
    windCamera.position.set(-20, -50, 8);
    windCamera.up.set(0, 0, 1);

    facadeCamera = new THREE.PerspectiveCamera(30, w / h, 0.1, 1000);
    facadeCamera.position.set(-20, -50, 8);
    facadeCamera.up.set(0, 0, 1);

    try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);
        console.log('[ViewShared] WebGL renderer created successfully');
    } catch (e) {
        console.error('[ViewShared] WebGL error:', e);
    }

    windControls = new OrbitControls(windCamera, renderer.domElement);
    windControls.enableDamping = true;
    windControls.dampingFactor = 0.3;
    windControls.rotateSpeed = 1.2;
    windControls.minDistance = 10;
    windControls.maxDistance = 150;
    windControls.target.set(0, 0, currentConfig.height / 2);
    windControls.update();

    facadeControls = new OrbitControls(facadeCamera, renderer.domElement);
    facadeControls.enableDamping = true;
    facadeControls.dampingFactor = 0.3;
    facadeControls.rotateSpeed = 1.2;
    facadeControls.minDistance = 10;
    facadeControls.maxDistance = 150;
    facadeControls.target.set(0, 0, currentConfig.height / 2);
    facadeControls.update();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, -15, 30);
    scene.add(directionalLight);

    initNavCube(container);

    window.addEventListener('resize', onWindowResize);

    animate();

    console.log('[ViewShared] Initialized');

    return { scene, windCamera, facadeCamera, renderer, windControls, facadeControls, currentConfig };
}

function createSkyDome() {
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#86a4df');
    gradient.addColorStop(0.3, '#adc2ed');
    gradient.addColorStop(0.45, '#adc0e7');
    gradient.addColorStop(0.5, '#adb3c0');
    gradient.addColorStop(0.55, '#abb3bc');
    gradient.addColorStop(0.7, '#b0b6bc');
    gradient.addColorStop(1, '#bababa');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const skyMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide,
        fog: false,
    });

    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.userData.isSkyDome = true;
    return sky;
}

function initNavCube(container) {
    const navContainer = document.getElementById('nav-cube-container');
    if (!navContainer) return;

    navCubeScene = new THREE.Scene();

    const navSize = 100;
    navCubeCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    navCubeCamera.position.set(-2.5, -1.5, 2.5);
    navCubeCamera.lookAt(0, 0, 0);
    navCubeCamera.up.set(0, 0, 1);

    navCubeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    navCubeRenderer.setSize(navSize, navSize);
    navCubeRenderer.setPixelRatio(window.devicePixelRatio);
    navContainer.appendChild(navCubeRenderer.domElement);

    const cubeGeometry = new THREE.BoxGeometry(1.3, 1.3, 1.3);

    const faceLabels = ['RIGHT', 'LEFT', 'TOP', 'BOTTOM', 'FRONT', 'BACK'];
    const faceBg = ['#d6dce4', '#d6dce4', '#e8ecf0', '#b8c4ce', '#c8d4e0', '#c0cad4'];
    const faceText = ['#2d3a4a', '#2d3a4a', '#1a2733', '#2d3a4a', '#2d3a4a', '#2d3a4a'];

    const faceMaterials = faceLabels.map((label, i) =>
        new THREE.MeshBasicMaterial({
            map: createFaceTexture(label, faceBg[i], faceText[i]),
            transparent: false,
        }),
    );

    navCube = new THREE.Mesh(cubeGeometry, faceMaterials);
    navCube.rotation.x = Math.PI / 2;
    navCubeScene.add(navCube);

    const edgesGeometry = new THREE.EdgesGeometry(cubeGeometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x5a6a7a, linewidth: 1 });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    navCube.add(edges);

    navCubeScene.add(new THREE.AmbientLight(0xffffff, 1.0));

    navCube.userData.isNavCube = true;
    navCube.userData.isDragging = false;
    navCube.userData.lastMouse = { x: 0, y: 0 };
    navCube.userData.dragStartTime = 0;
    navCubeScene.userData.navCube = navCube;

    container.addEventListener('mousedown', (event) => {
        navCube.userData.isDragging = true;
        navCube.userData.lastMouse = { x: event.clientX, y: event.clientY };
        navCube.userData.dragStartTime = Date.now();
    });

    container.addEventListener('mouseup', (event) => {
        const dragDuration = Date.now() - navCube.userData.dragStartTime;
        navCube.userData.isDragging = false;
        if (dragDuration < 200) {
            handleNavCubeClick(event);
        }
    });

    container.addEventListener('mousemove', (event) => {
        if (event.buttons === 1 && navCube.userData.isDragging) {
            event.preventDefault();
            const deltaX = event.clientX - navCube.userData.lastMouse.x;
            const deltaY = event.clientY - navCube.userData.lastMouse.y;

            const activeCamera = getActiveCamera();
            const activeControls = getActiveControls();
            const offset = activeCamera.position.clone().sub(activeControls.target);
            const r = offset.length();
            let azimuth = Math.atan2(offset.y, offset.x);
            let elevation = Math.asin(Math.max(-1, Math.min(1, offset.z / r)));

            azimuth -= deltaX * 0.01;
            elevation += deltaY * 0.01;
            elevation = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, elevation));

            const newOffset = new THREE.Vector3(
                r * Math.cos(elevation) * Math.cos(azimuth),
                r * Math.cos(elevation) * Math.sin(azimuth),
                r * Math.sin(elevation),
            );
            activeCamera.position.copy(activeControls.target).add(newOffset);
            activeControls.update();

            navCube.userData.lastMouse = { x: event.clientX, y: event.clientY };
        }
    });

    container.style.cursor = 'grab';
}

function createFaceTexture(text, bgColor, textColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 256, 256);

    ctx.font = `Bold ${text.length > 4 ? '30px' : '40px'} Arial`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 128);

    return new THREE.CanvasTexture(canvas);
}

function handleNavCubeClick(event) {
    if (!navCubeRenderer || !navCubeCamera || !navCube) return;

    const canvas = navCubeRenderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x, y }, navCubeCamera);
    const intersects = raycaster.intersectObject(navCube);

    if (intersects.length > 0) {
        const views = ['right', 'left', 'top', 'bottom', 'front', 'back'];
        const view = views[intersects[0].face.materialIndex];
        if (view) moveToView(view);
    }
}

function moveToView(axis) {
    const distance = 50;
    const centerZ = currentConfig.height / 2;

    const viewMap = {
        right: { pos: [distance, 0, centerZ], target: [0, 0, centerZ] },
        left: { pos: [-distance, 0, centerZ], target: [0, 0, centerZ] },
        front: { pos: [0, -distance, centerZ], target: [0, 0, centerZ] },
        back: { pos: [0, distance, centerZ], target: [0, 0, centerZ] },
        top: { pos: [0, 0, distance * 2], target: [0, 0, 0] },
        bottom: { pos: [0.1, 0, -distance], target: [0, 0, 0] },
    };

    const view = viewMap[axis];
    if (view) {
        animateCamera(view.pos, view.target);
    }
}

function animateCamera(position, target) {
    const camera = getActiveCamera();
    const controls = getActiveControls();
    const startPos = camera.position.toArray();
    const startTarget = controls.target.toArray();
    const duration = 500;
    const startTime = Date.now();

    function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 1, 2) / 2;

        camera.position.set(
            startPos[0] + (position[0] - startPos[0]) * ease,
            startPos[1] + (position[1] - startPos[1]) * ease,
            startPos[2] + (position[2] - startPos[2]) * ease,
        );

        controls.target.set(
            startTarget[0] + (target[0] - startTarget[0]) * ease,
            startTarget[1] + (target[1] - startTarget[1]) * ease,
            startTarget[2] + (target[2] - startTarget[2]) * ease,
        );

        controls.update();

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            camera.position.set(...position);
            controls.target.set(...target);
            camera.lookAt(controls.target);
            controls.update();
        }
    }

    update();
}

function fitCameraToBuilding(viewMode = 'facade') {
    const camera = getCamera(viewMode);
    const controls = getControls(viewMode);
    const { width, depth, height } = currentConfig;
    const centerZ = height / 2;
    const diagonal = Math.sqrt(width * width + depth * depth + height * height);
    const fovRad = (camera.fov * Math.PI) / 180;
    const distance = (diagonal / 2 / Math.tan(fovRad / 2)) * 1.5;

    const dir = camera.position.clone().sub(controls.target).normalize();
    const newTarget = new THREE.Vector3(0, 0, centerZ);
    camera.position.copy(newTarget).addScaledVector(dir, distance);
    controls.target.copy(newTarget);
    controls.maxDistance = distance * 3;
    controls.minDistance = Math.max(2, diagonal * 0.1);
    controls.update();
}

function onWindowResize() {
    const container = document.getElementById('viewport-3d');
    if (!container || !renderer) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;

    if (windCamera) {
        windCamera.aspect = w / h;
        windCamera.updateProjectionMatrix();
    }
    if (facadeCamera) {
        facadeCamera.aspect = w / h;
        facadeCamera.updateProjectionMatrix();
    }
    renderer.setSize(w, h);
}

function setAnimationCallback(cb) {
    animationCallback = cb;
}

function animate() {
    requestAnimationFrame(animate);

    const camera = getActiveCamera();
    const controls = getActiveControls();

    if (!renderer || !scene || !camera) {
        return;
    }

    controls.update();
    renderer.render(scene, camera);

    if (animationCallback) {
        animationCallback();
    }

    if (navCubeScene && navCubeCamera && navCubeRenderer && navCube) {
        updateNavCubeOrientation();
        navCubeRenderer.render(navCubeScene, navCubeCamera);
    }
}

function updateNavCubeOrientation() {
    const camera = getActiveCamera();
    const controls = getActiveControls();
    const offset = camera.position.clone().sub(controls.target);
    const dir = offset.normalize();
    navCubeCamera.position.set(dir.x * 3.84, dir.y * 3.84, dir.z * 3.84);
    if (Math.abs(dir.z) > 0.999) {
        navCubeCamera.up.set(0, dir.z > 0 ? 1 : -1, 0);
    } else {
        navCubeCamera.up.set(0, 0, 1);
    }
    navCubeCamera.lookAt(0, 0, 0);
}

function getScene() { return scene; }
function getCamera(viewMode = 'facade') {
    return viewMode === 'wind' ? windCamera : facadeCamera;
}
function getRenderer() { return renderer; }
function getControls(viewMode = 'facade') {
    return viewMode === 'wind' ? windControls : facadeControls;
}
function getActiveCamera() {
    return currentViewMode === 'wind' ? windCamera : facadeCamera;
}
function getActiveControls() {
    return currentViewMode === 'wind' ? windControls : facadeControls;
}
function setViewMode(mode, skipRestore = false) {
    const oldMode = currentViewMode;
    if (mode === oldMode) return;

    if (oldMode === 'wind') {
        windCameraSaved = {
            pos: windCamera.position.clone(),
            target: windControls.target.clone(),
        };
    } else if (oldMode === 'facade') {
        facadeCameraSaved = {
            pos: facadeCamera.position.clone(),
            target: facadeControls.target.clone(),
        };
    }

    currentViewMode = mode;

    if (skipRestore) return;

    if (mode === 'wind' && windCameraSaved) {
        windCamera.position.copy(windCameraSaved.pos);
        windControls.target.copy(windCameraSaved.target);
    } else if (mode === 'facade' && facadeCameraSaved) {
        facadeCamera.position.copy(facadeCameraSaved.pos);
        facadeControls.target.copy(facadeCameraSaved.target);
    }
}
function getViewMode() {
    return currentViewMode;
}
function saveCurrentCameraState() {
    if (currentViewMode === 'wind') {
        windCameraSaved = {
            pos: windCamera.position.clone(),
            target: windControls.target.clone(),
        };
    } else if (currentViewMode === 'facade') {
        facadeCameraSaved = {
            pos: facadeCamera.position.clone(),
            target: facadeControls.target.clone(),
        };
    }
}
function getConfig() { return currentConfig; }

function getWindConfig() {
    return {
        width: currentConfig.width,
        depth: currentConfig.depth,
        totalHeight: currentConfig.height,
        floorHeight: currentConfig.floorHeight,
        numFloors: currentConfig.numFloors,
    };
}

export {
    initSharedView,
    getScene,
    getCamera,
    getRenderer,
    getControls,
    getActiveCamera,
    getActiveControls,
    setViewMode,
    saveCurrentCameraState,
    getViewMode,
    getConfig,
    getWindConfig,
    fitCameraToBuilding,
    setAnimationCallback,
    moveToView,
};
