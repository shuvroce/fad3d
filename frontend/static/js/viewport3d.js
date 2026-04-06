// ============================
// 3D Viewport - Three.js Implementation
// Building wireframe placeholder + navigation cube
// ============================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let buildingGroup, navCubeScene, navCubeCamera, navCubeRenderer, navCube;

const DEFAULT_FLOOR_HEIGHT = 3.2;
const DEFAULT_BUILDING_WIDTH = 20;
const DEFAULT_BUILDING_DEPTH = 15;
const DEFAULT_NUM_FLOORS = 5;

let currentConfig = {
    width: DEFAULT_BUILDING_WIDTH,
    depth: DEFAULT_BUILDING_DEPTH,
    numFloors: DEFAULT_NUM_FLOORS,
    floorHeight: DEFAULT_FLOOR_HEIGHT,
    totalHeight: DEFAULT_NUM_FLOORS * DEFAULT_FLOOR_HEIGHT,
};

let isInitialized = false;

function createSkyDome() {
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#d2e0f8');
    gradient.addColorStop(0.6, '#c5d6e8');
    gradient.addColorStop(1, '#a8a8a8');

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

function initViewport3D() {
    const container = document.getElementById('viewport-3d');
    if (!container) {
        console.warn('[Viewport3D] Container not found');
        return;
    }

    const w = container.clientWidth;
    const h = container.clientHeight;
    console.log(`[Viewport3D] Container size: ${w}x${h}`);

    if (w === 0 || h === 0) {
        console.warn('[Viewport3D] Container has zero dimensions, waiting...');
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0 && !isInitialized) {
                    observer.disconnect();
                    console.log(`[Viewport3D] Container ready: ${width}x${height}`);
                    _initScene(container);
                    break;
                }
            }
        });
        observer.observe(container);
        return;
    }

    _initScene(container);
}

function _initScene(container) {
    isInitialized = true;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    const skyDome = createSkyDome();
    scene.add(skyDome);

    const w = container.clientWidth;
    const h = container.clientHeight;

    camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    camera.position.set(30, 20, 30);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.3;
    controls.rotateSpeed = 1.2;
    controls.minDistance = 10;
    controls.maxDistance = 150;
    controls.target.set(0, currentConfig.totalHeight / 2, 0);
    controls.update();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 30, 20);
    scene.add(directionalLight);

    buildingGroup = new THREE.Group();
    createBuildingWireframe();
    scene.add(buildingGroup);

    initNavCube();

    window.addEventListener('resize', onWindowResize);

    document.addEventListener('theme-changed', () => {
        const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-body').trim();
        if (bg) scene.background = new THREE.Color(bg);
    });

    setupDynamicInputListeners();
    setupViewportModeListener();

    animate();

    console.log('[Viewport3D] Initialized', {
        cameraPos: camera.position.toArray(),
        target: controls.target.toArray(),
        buildingHeight: currentConfig.totalHeight,
        sceneChildren: scene.children.length,
    });
}

function createBuildingWireframe() {
    while (buildingGroup.children.length > 0) {
        buildingGroup.remove(buildingGroup.children[0]);
    }

    const { width, depth, numFloors, floorHeight, totalHeight } = currentConfig;
    const wireframeColor = 0x888888;
    const floorColor = 0x999999;
    const halfW = width / 2;
    const halfD = depth / 2;

    const cornerPositions = [
        [-halfW, -halfD],
        [halfW, -halfD],
        [halfW, halfD],
        [-halfW, halfD],
    ];

    for (const [x, z] of cornerPositions) {
        const points = [
            new THREE.Vector3(x, 0, z),
            new THREE.Vector3(x, totalHeight, z),
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: wireframeColor });
        buildingGroup.add(new THREE.Line(geometry, material));
    }

    createTransparentWalls(width, depth, totalHeight);
    createTransparentSlabs(width, depth, numFloors, floorHeight);

    for (let floor = 0; floor <= numFloors; floor++) {
        const y = floor * floorHeight;

        const floorPoints = [
            new THREE.Vector3(-halfW, y, -halfD),
            new THREE.Vector3(halfW, y, -halfD),
            new THREE.Vector3(halfW, y, halfD),
            new THREE.Vector3(-halfW, y, halfD),
            new THREE.Vector3(-halfW, y, -halfD),
        ];

        const floorGeometry = new THREE.BufferGeometry().setFromPoints(floorPoints);
        const floorMaterial = new THREE.LineBasicMaterial({ color: floorColor });
        buildingGroup.add(new THREE.Line(floorGeometry, floorMaterial));
    }

    for (let floor = 0; floor <= numFloors; floor++) {
        const y = floor * floorHeight;
        const heightMm = Math.round(y * 1000);
        const label = `${heightMm}`;
        const sprite = createTextSprite(label);
        sprite.position.set(-width / 2 - 2, y, depth / 2 + 1);
        sprite.scale.set(3, 1, 1);
        buildingGroup.add(sprite);
    }

    console.log(`[Viewport3D] Wireframe rebuilt: ${width}m x ${depth}m x ${totalHeight}m (${numFloors} floors)`);
}

function createTransparentWalls(width, depth, totalHeight) {
    const halfW = width / 2;
    const halfD = depth / 2;
    const wallHeight = totalHeight;

    const wallMaterial = new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
    });

    const walls = [
        { pos: [0, wallHeight / 2, halfD], rot: [0, 0, 0], size: [width, wallHeight] },
        { pos: [0, wallHeight / 2, -halfD], rot: [0, 0, 0], size: [width, wallHeight] },
        { pos: [halfW, wallHeight / 2, 0], rot: [0, Math.PI / 2, 0], size: [depth, wallHeight] },
        { pos: [-halfW, wallHeight / 2, 0], rot: [0, Math.PI / 2, 0], size: [depth, wallHeight] },
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

function createTransparentSlabs(width, depth, numFloors, floorHeight) {
    const halfW = width / 2;
    const halfD = depth / 2;

    const slabMaterial = new THREE.MeshPhongMaterial({
        color: 0xdddddd,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
    });

    for (let floor = 0; floor <= numFloors; floor++) {
        const y = floor * floorHeight;
        const geometry = new THREE.PlaneGeometry(width, depth);
        const slab = new THREE.Mesh(geometry, slabMaterial);
        slab.rotation.x = -Math.PI / 2;
        slab.position.set(0, y, 0);
        slab.userData.isSlab = true;
        buildingGroup.add(slab);
    }
}

function createTextSprite(text, color = 0x94a3b8) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const colorHex = '#' + color.toString(16).padStart(6, '0');
    context.font = 'Bold 28px Arial';
    context.fillStyle = colorHex;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    return new THREE.Sprite(material);
}

function initNavCube() {
    const navContainer = document.getElementById('nav-cube-container');
    if (!navContainer) {
        console.warn('[Viewport3D] Nav cube container not found');
        return;
    }

    navCubeScene = new THREE.Scene();

    const navSize = 120;
    navCubeCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    navCubeCamera.position.set(3, 3, 3);
    navCubeCamera.lookAt(0, 0, 0);

    navCubeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    navCubeRenderer.setSize(navSize, navSize);
    navCubeRenderer.setPixelRatio(window.devicePixelRatio);
    navContainer.appendChild(navCubeRenderer.domElement);

    const cubeGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);

    const faceColors = [
        0xef4444,
        0xf97316,
        0x22c55e,
        0x3b82f6,
        0x8b5cf6,
        0xec4899,
    ];

    const faceMaterials = faceColors.map(color =>
        new THREE.MeshBasicMaterial({ color, wireframe: false, transparent: true, opacity: 0.8 }),
    );

    navCube = new THREE.Mesh(cubeGeometry, faceMaterials);

    navCubeScene.add(navCube);

    const edgesGeometry = new THREE.EdgesGeometry(cubeGeometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    navCube.add(edges);

    const labelData = [
        { text: 'RIGHT', pos: [1.6, 0, 0], rot: [0, Math.PI / 2, 0], color: 0xef4444 },
        { text: 'LEFT', pos: [-1.6, 0, 0], rot: [0, -Math.PI / 2, 0], color: 0xf97316 },
        { text: 'TOP', pos: [0, 1.6, 0], rot: [-Math.PI / 2, 0, 0], color: 0x22c55e },
        { text: 'BOTTOM', pos: [0, -1.6, 0], rot: [Math.PI / 2, 0, 0], color: 0x3b82f6 },
        { text: 'FRONT', pos: [0, 0, 1.6], rot: [0, 0, 0], color: 0x8b5cf6 },
        { text: 'BACK', pos: [0, 0, -1.6], rot: [0, Math.PI, 0], color: 0xec4899 },
    ];

    labelData.forEach(label => {
        const sprite = createTextSprite(label.text, label.color);
        sprite.position.set(...label.pos);
        sprite.rotation.set(...label.rot);
        sprite.scale.set(1.2, 0.4, 1);
        navCube.add(sprite);
    });

    createAxisArrows();

    navCube.userData.isNavCube = true;
    navCube.userData.isDragging = false;
    navCube.userData.lastMouse = { x: 0, y: 0 };
    navCube.userData.dragStartTime = 0;
    navCubeScene.userData.navCube = navCube;

    const container = document.getElementById('nav-cube-container');

    container.addEventListener('mousedown', (event) => {
        navCube.userData.isDragging = true;
        navCube.userData.lastMouse = { x: event.clientX, y: event.clientY };
        navCube.userData.dragStartTime = Date.now();
    });

    container.addEventListener('mouseup', (event) => {
        const dragDuration = Date.now() - navCube.userData.dragStartTime;
        if (!navCube.userData.isDragging || dragDuration < 200) {
            handleNavCubeClick(event);
        }
        navCube.userData.isDragging = false;
    });

    container.addEventListener('mousemove', (event) => {
        if (event.buttons === 1 && navCube.userData.isDragging) {
            event.preventDefault();
            const deltaX = event.clientX - navCube.userData.lastMouse.x;
            const deltaY = event.clientY - navCube.userData.lastMouse.y;

            const spherical = new THREE.Spherical();
            spherical.setFromVector3(camera.position.clone().sub(controls.target));
            spherical.theta -= deltaX * 0.01;
            spherical.phi -= deltaY * 0.01;
            spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
            
            const newPos = new THREE.Vector3().setFromSpherical(spherical).add(controls.target);
            camera.position.copy(newPos);
            camera.lookAt(controls.target);

            navCube.userData.lastMouse = { x: event.clientX, y: event.clientY };
        }
    });

    container.style.cursor = 'grab';
}

function createAxisArrows() {
    const arrowLength = 1.2;
    const arrowHeadLen = 0.25;
    const arrowHeadWidth = 0.15;
    const colors = {
        x: 0xff4444,
        y: 0x44ff44,
        z: 0x4444ff,
    };

    const xDir = new THREE.Vector3(1, 0, 0);
    const xArrow = new THREE.ArrowHelper(xDir, new THREE.Vector3(0.75, 0, 0), arrowLength, colors.x, arrowHeadLen, arrowHeadWidth);
    navCube.add(xArrow);

    const yDir = new THREE.Vector3(0, 1, 0);
    const yArrow = new THREE.ArrowHelper(yDir, new THREE.Vector3(0, 0.75, 0), arrowLength, colors.y, arrowHeadLen, arrowHeadWidth);
    navCube.add(yArrow);

    const zDir = new THREE.Vector3(0, 0, 1);
    const zArrow = new THREE.ArrowHelper(zDir, new THREE.Vector3(0, 0, 0.75), arrowLength, colors.z, arrowHeadLen, arrowHeadWidth);
    navCube.add(zArrow);
}

function handleNavCubeClick(event) {
    if (navCube.userData.isDragging) {
        navCube.userData.isDragging = false;
        return;
    }

    const container = document.getElementById('nav-cube-container');
    const rect = container.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    let axis;
    if (y > 0.3) {
        axis = 'top';
    } else if (y < -0.3) {
        axis = 'bottom';
    } else if (x > 0.3) {
        axis = 'right';
    } else if (x < -0.3) {
        axis = 'left';
    } else if (y > -0.3 && y < 0.3 && x > -0.3 && x < 0.3) {
        axis = 'front';
    } else {
        axis = 'front';
    }

    moveToView(axis);
}

function moveToView(axis) {
    const distance = 30;
    const centerY = currentConfig.totalHeight / 2;

    const viewMap = {
        right: { pos: [distance, centerY, 0], target: [0, centerY, 0] },
        left: { pos: [-distance, centerY, 0], target: [0, centerY, 0] },
        top: { pos: [0, distance, 0.1], target: [0, 0, 0] },
        bottom: { pos: [0, -distance, 0.1], target: [0, 0, 0] },
        front: { pos: [0, centerY, distance], target: [0, centerY, 0] },
        back: { pos: [0, centerY, -distance], target: [0, centerY, 0] },
    };

    const view = viewMap[axis];
    if (view) {
        animateCamera(view.pos, view.target);
    }
}

function determineFaceFromNormal(normal) {
    const absX = Math.abs(normal.x);
    const absY = Math.abs(normal.y);
    const absZ = Math.abs(normal.z);

    const max = Math.max(absX, absY, absZ);

    if (max === absX) return normal.x > 0 ? 'right' : 'left';
    if (max === absY) return normal.y > 0 ? 'top' : 'bottom';
    return normal.z > 0 ? 'front' : 'back';
}

function animateCamera(position, target) {
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
        }
    }

    update();
}

function onWindowResize() {
    const container = document.getElementById('viewport-3d');
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}

function animate() {
    requestAnimationFrame(animate);

    controls.update();
    renderer.render(scene, camera);

    if (navCubeScene && navCubeCamera && navCubeRenderer && navCube) {
        updateNavCubeOrientation();
        navCubeRenderer.render(navCubeScene, navCubeCamera);
    }
}

function updateNavCubeOrientation() {
    const camDir = camera.position.clone().sub(controls.target).normalize();
    const absX = Math.abs(camDir.x);
    const absY = Math.abs(camDir.y);
    const absZ = Math.abs(camDir.z);
    const max = Math.max(absX, absY, absZ);

    const front = new THREE.Vector3(0, 0, 1);
    const right = new THREE.Vector3(1, 0, 0);
    const top = new THREE.Vector3(0, 1, 0);

    let lookDir;
    if (max === absX) {
        lookDir = camDir.x > 0 ? right.clone().negate() : right.clone();
    } else if (max === absY) {
        lookDir = camDir.y > 0 ? top.clone() : top.clone().negate();
    } else {
        lookDir = camDir.z > 0 ? front.clone() : front.clone().negate();
    }

    navCube.quaternion.setFromUnitVectors(front, camDir);
}

function updateBuilding(config = {}) {
    let changed = false;

    if (config.width !== undefined && config.width > 0) {
        currentConfig.width = config.width;
        changed = true;
    }
    if (config.depth !== undefined && config.depth > 0) {
        currentConfig.depth = config.depth;
        changed = true;
    }
    if (config.floorHeight !== undefined && config.floorHeight > 0) {
        currentConfig.floorHeight = config.floorHeight;
        changed = true;
    }
    if (config.numFloors !== undefined && config.numFloors > 0) {
        currentConfig.numFloors = config.numFloors;
        changed = true;
    }

    if (config.numFloors !== undefined || config.floorHeight !== undefined) {
        currentConfig.totalHeight = currentConfig.numFloors * currentConfig.floorHeight;
        const centerY = currentConfig.totalHeight / 2;
        controls.target.set(0, centerY, 0);
    }

    if (changed) {
        createBuildingWireframe();
    }
}

function setupViewportModeListener() {
    window.addEventListener('viewport-mode-changed', (e) => {
        const mode = e.detail.mode;
        applyViewMode(mode);
    });
}

function applyViewMode(mode) {
    const wireframeColor = mode === 'model' ? 0x6366f1 : mode === 'dc-ratio' ? 0xf59e0b : 0x3b82f6;
    const floorColor = mode === 'model' ? 0x475569 : mode === 'dc-ratio' ? 0xd97706 : 0x2563eb;

    buildingGroup.children.forEach(child => {
        if (child.material && child.material.color) {
            if (child.material.color.getHex() === 0x6366f1 || child.material.color.getHex() === 0xf59e0b || child.material.color.getHex() === 0x3b82f6) {
                child.material.color.setHex(wireframeColor);
            } else if (child.material.color.getHex() === 0x475569 || child.material.color.getHex() === 0xd97706 || child.material.color.getHex() === 0x2563eb) {
                child.material.color.setHex(floorColor);
            }
        }
    });
}

function setupDynamicInputListeners() {
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

        const length = safeParseFloat(bLength?.value);
        if (length) newConfig.width = length;

        const width = safeParseFloat(bWidth?.value);
        if (width) newConfig.depth = width;

        if (bFloorHeights?.value?.trim()) {
            const heights = bFloorHeights.value.trim().split(/\s+/).map(safeParseFloat).filter(h => h !== null);
            if (heights.length > 0) {
                newConfig.numFloors = heights.length;
                const avgFloorHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
                newConfig.floorHeight = avgFloorHeight / 1000;
            }
        } else {
            const height = safeParseFloat(bHeight?.value);
            if (height) {
                newConfig.totalHeight = height;
                newConfig.numFloors = Math.max(1, Math.round(height / currentConfig.floorHeight));
                newConfig.floorHeight = height / newConfig.numFloors;
            }
        }

        if (Object.keys(newConfig).length > 0) {
            updateBuilding(newConfig);
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

    updateFromInputs();
}

export { initViewport3D, updateBuilding };
