// ============================
// 3D Viewport - Three.js Implementation
// Building wireframe placeholder + navigation cube
// ============================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { initWindShell, updateWindShellGeometry, tickWindShell } from './windShell.js';

let scene, camera, renderer, controls;
let buildingGroup, navCubeScene, navCubeCamera, navCubeRenderer, navCube;

const DEFAULT_FLOOR_HEIGHT = 3.2;
const DEFAULT_BUILDING_WIDTH = 15;
const DEFAULT_BUILDING_DEPTH = 10;
const DEFAULT_NUM_FLOORS = 4;

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
    gradient.addColorStop(0, '#6a97e5');
    gradient.addColorStop(0.4, '#c5d6e8');
    gradient.addColorStop(1, '#e2e2e2');

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
    // Rotate sky sphere so north pole (+Y) aligns with world +Z (up)
    skyDome.rotation.x = Math.PI / 2;
    scene.add(skyDome);

    const w = container.clientWidth;
    const h = container.clientHeight;

    camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 1000);
    // Z-up: X/Y horizontal, Z is height. Isometric view showing LEFT, FRONT, TOP.
    camera.position.set(-20, -50, 8);
    camera.up.set(0, 0, 1);

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
    controls.target.set(0, 0, currentConfig.totalHeight / 2);
    controls.update();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    // Light from X+ front-side, elevated in Z
    directionalLight.position.set(20, -15, 30);
    scene.add(directionalLight);

    buildingGroup = new THREE.Group();
    createBuildingWireframe();
    scene.add(buildingGroup);
    _fitCameraToBuilding();

    // Initialize wind shell (hidden by default, shown in wind mode)
    initWindShell(scene, renderer, camera);
    updateWindShellGeometry({ width: currentConfig.width, depth: currentConfig.depth, totalHeight: currentConfig.totalHeight });

    // Hide wireframe when in wind mode, restore when switching back
    window.addEventListener('panel-mode-changed', (e) => {
        buildingGroup.visible = e.detail.mode !== 'wind';
    });

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
    const wireframeColor = 0x757575;
    const floorColor = 0x999999;
    const halfW = width / 2;
    const halfD = depth / 2;

    // Z-up: corners in XY plane, columns rise along Z
    const cornerPositions = [
        [-halfW, -halfD],
        [halfW, -halfD],
        [halfW, halfD],
        [-halfW, halfD],
    ];

    for (const [x, y] of cornerPositions) {
        const points = [
            new THREE.Vector3(x, y, 0),
            new THREE.Vector3(x, y, totalHeight),
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: wireframeColor, transparent: true, opacity: 0.3 });
        buildingGroup.add(new THREE.Line(geometry, material));
    }

    createTransparentWalls(width, depth, totalHeight);
    createTransparentSlabs(width, depth, numFloors, floorHeight);

    // Z-up: floor outlines are horizontal rectangles in XY at each z level
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

    console.log(`[Viewport3D] Wireframe rebuilt: ${width}m x ${depth}m x ${totalHeight}m (${numFloors} floors)`);
}

function createTransparentWalls(width, depth, totalHeight) {
    const halfW = width / 2;
    const halfD = depth / 2;
    const wallHeight = totalHeight;

    const wallMaterial = new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.04,
        side: THREE.DoubleSide,
        depthWrite: false,
    });

    // Z-up: walls are vertical planes spanning (X or Y) and Z (height).
    // PlaneGeometry lies in XY by default.
    //   - Front/Back walls at y=±halfD: Rx(PI/2) → spans world X and Z, normal ±Y ✓
    //   - Left/Right walls at x=±halfW: Rx(PI/2)*Ry(PI/2) → spans world Y and Z, normal ±X ✓
    const walls = [
        { pos: [0, halfD, wallHeight / 2], rot: [Math.PI / 2, 0, 0], size: [width, wallHeight] },
        { pos: [0, -halfD, wallHeight / 2], rot: [Math.PI / 2, 0, 0], size: [width, wallHeight] },
        { pos: [halfW, 0, wallHeight / 2], rot: [Math.PI / 2, Math.PI / 2, 0], size: [depth, wallHeight] },
        { pos: [-halfW, 0, wallHeight / 2], rot: [Math.PI / 2, Math.PI / 2, 0], size: [depth, wallHeight] },
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

    const transparentMaterial = new THREE.MeshPhongMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.04,
        side: THREE.DoubleSide,
        depthWrite: false,
    });

    const solidMaterial = new THREE.MeshPhongMaterial({
        color: 0x1f211e,
        transparent: true,
        opacity: 0.03,
        side: THREE.DoubleSide,
    });

    // Z-up: slabs are horizontal boxes in XY plane, thin in Z.
    // BoxGeometry(width, depth, thickness) is already correct — thin in Z dimension.
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

    // Ground border outline in XY plane at z≈0
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

function createFaceTexture(text, bgColor, textColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Background fill
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 256, 256);

    // Label text
    ctx.font = `Bold ${text.length > 4 ? '30px' : '40px'} Arial`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 128);

    return new THREE.CanvasTexture(canvas);
}

function initNavCube() {
    const navContainer = document.getElementById('nav-cube-container');
    if (!navContainer) {
        console.warn('[Viewport3D] Nav cube container not found');
        return;
    }

    navCubeScene = new THREE.Scene();

    const navSize = 100;
    navCubeCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    // Z-up: isometric position showing LEFT(-X), FRONT(-Y), TOP(+Z) faces
    navCubeCamera.position.set(-2.5, -1.5, 2.5);
    navCubeCamera.lookAt(0, 0, 0);
    navCubeCamera.up.set(0, 0, 1); // Z is up

    navCubeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    navCubeRenderer.setSize(navSize, navSize);
    navCubeRenderer.setPixelRatio(window.devicePixelRatio);
    navContainer.appendChild(navCubeRenderer.domElement);

    const cubeGeometry = new THREE.BoxGeometry(1.3, 1.3, 1.3);

    // Three.js BoxGeometry material index order: +X, -X, +Y, -Y, +Z, -Z
    // After navCube.rotation.x = PI/2: +X→RIGHT, -X→LEFT, +Y→TOP(+Z world), -Y→BOTTOM(-Z world), +Z→FRONT(-Y world), -Z→BACK(+Y world)
    const faceLabels = ['RIGHT', 'LEFT', 'TOP', 'BOTTOM', 'FRONT', 'BACK'];
    // TOP lightest, SIDES medium gray, FRONT blue-tinted, BACK/BOTTOM darker
    const faceBg = ['#d6dce4', '#d6dce4', '#e8ecf0', '#b8c4ce', '#c8d4e0', '#c0cad4'];
    const faceText = ['#2d3a4a', '#2d3a4a', '#1a2733', '#2d3a4a', '#2d3a4a', '#2d3a4a'];

    const faceMaterials = faceLabels.map((label, i) =>
        new THREE.MeshBasicMaterial({
            map: createFaceTexture(label, faceBg[i], faceText[i]),
            transparent: false,
        }),
    );

    navCube = new THREE.Mesh(cubeGeometry, faceMaterials);
    // Rotate base so side faces have texture-up = world +Z (matches Z-up convention)
    navCube.rotation.x = Math.PI / 2;
    navCubeScene.add(navCube);

    // Dark thin edges for the CAD look
    const edgesGeometry = new THREE.EdgesGeometry(cubeGeometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x5a6a7a, linewidth: 1 });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    navCube.add(edges);

    // Subtle ambient light for the cube faces
    navCubeScene.add(new THREE.AmbientLight(0xffffff, 1.0));

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

            // Z-up spherical: azimuth rotates around Z, elevation is angle above XY plane
            const offset = camera.position.clone().sub(controls.target);
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
            camera.position.copy(controls.target).add(newOffset);
            controls.update();

            navCube.userData.lastMouse = { x: event.clientX, y: event.clientY };
        }
    });

    container.style.cursor = 'grab';
}

function handleNavCubeClick(event) {
    // Use the canvas element's own rect so coordinates are exact regardless of container padding
    const canvas = navCubeRenderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x, y }, navCubeCamera);
    const intersects = raycaster.intersectObject(navCube);

    if (intersects.length > 0) {
        // face.materialIndex directly maps to which material group was hit:
        // 0=right, 1=left, 2=top, 3=bottom, 4=front, 5=back (matches faceLabels order)
        const views = ['right', 'left', 'top', 'bottom', 'front', 'back'];
        const view = views[intersects[0].face.materialIndex];
        if (view) moveToView(view);
    }
}

function moveToView(axis) {
    const distance = 50;
    const centerZ = currentConfig.totalHeight / 2;

    // Z-up: X/Y horizontal, Z is height (up)
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
            // Enforce exact final position and orientation
            camera.position.set(...position);
            controls.target.set(...target);
            camera.lookAt(controls.target);
            controls.update();
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
    tickWindShell(camera);

    if (navCubeScene && navCubeCamera && navCubeRenderer && navCube) {
        updateNavCubeOrientation();
        navCubeRenderer.render(navCubeScene, navCubeCamera);
    }
}

function updateNavCubeOrientation() {
    // Position the nav cube camera in the same orbital direction as the main camera.
    // The cube stays at its base rotation — only the nav cam moves each frame.
    // This is convention-agnostic: no quaternion math, no Z-up/Y-up mismatch.
    const offset = camera.position.clone().sub(controls.target);
    const dir = offset.normalize(); // normalize in-place; offset no longer needed
    navCubeCamera.position.set(dir.x * 3.84, dir.y * 3.84, dir.z * 3.84);
    // Use Z as up for all views except when looking nearly straight up/down
    if (Math.abs(dir.z) > 0.999) {
        // For top/bottom views: align text-up (+Y for TOP face, -Y for BOTTOM face)
        navCubeCamera.up.set(0, dir.z > 0 ? 1 : -1, 0);
    } else {
        navCubeCamera.up.set(0, 0, 1);
    }
    navCubeCamera.lookAt(0, 0, 0);
}

// Auto-fit camera to current building extents, preserving viewing angle
function _fitCameraToBuilding() {
    const { width, depth, totalHeight } = currentConfig;
    const centerZ = totalHeight / 2;
    const diagonal = Math.sqrt(width * width + depth * depth + totalHeight * totalHeight);
    const fovRad = (camera.fov * Math.PI) / 180;
    // Distance needed to fit the diagonal within vertical FOV, with padding
    const distance = (diagonal / 2 / Math.tan(fovRad / 2)) * 1.5;

    // Maintain current viewing direction, just move back along it
    const dir = camera.position.clone().sub(controls.target).normalize();
    const newTarget = new THREE.Vector3(0, 0, centerZ);
    camera.position.copy(newTarget).addScaledVector(dir, distance);
    controls.target.copy(newTarget);
    controls.maxDistance = distance * 3;
    controls.minDistance = Math.max(2, diagonal * 0.1);
    controls.update();
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
    // Allow direct totalHeight override (e.g. from b_height input)
    if (config.totalHeight !== undefined && config.totalHeight > 0) {
        currentConfig.totalHeight = config.totalHeight;
        changed = true;
    }

    if (config.numFloors !== undefined || config.floorHeight !== undefined) {
        currentConfig.totalHeight = currentConfig.numFloors * currentConfig.floorHeight;
    }

    if (changed) {
        createBuildingWireframe();
        _fitCameraToBuilding();
        updateWindShellGeometry({
            width: currentConfig.width,
            depth: currentConfig.depth,
            totalHeight: currentConfig.totalHeight,
        });
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
                newConfig.floorHeight = avgFloorHeight;
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
