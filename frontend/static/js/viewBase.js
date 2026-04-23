// ============================
// View Base - Per-View Three.js Setup
// Creates isolated Three.js environment for each view (wind/facade)
// Each view gets its own scene, camera, renderer, controls, nav cube
// ============================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getConfig } from './buildingConfig.js';

let _viewInstances = new Map();

function createViewBase(viewId, containerSelector, navCubeContainerSelector = '#nav-cube-container') {
    if (_viewInstances.has(viewId)) {
        return _viewInstances.get(viewId);
    }

    const container = document.querySelector(containerSelector);
    if (!container) {
        console.warn(`[viewBase:${viewId}] Container not found: ${containerSelector}`);
        return null;
    }

    const navContainer = document.querySelector(navCubeContainerSelector);
    if (!navContainer) {
        console.warn(`[viewBase:${viewId}] Nav cube container not found: ${navCubeContainerSelector}`);
    }

    let w = container.clientWidth;
    let h = container.clientHeight;
    if (w === 0 || h === 0) {
        w = container.offsetWidth || 800;
        h = container.offsetHeight || 600;
    }

    const scene = new THREE.Scene();

    const skyDome = _createSkyDome();
    skyDome.rotation.x = Math.PI / 2;
    scene.add(skyDome);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, -15, 30);
    scene.add(directionalLight);

    const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 1000);
    camera.up.set(0, 0, 1);

    let renderer = null;
    try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(w, h);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.domElement.style.display = 'none'; // Start hidden
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        container.appendChild(renderer.domElement);
    } catch (e) {
        console.error(`[viewBase:${viewId}] WebGL error:`, e);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.3;
    controls.rotateSpeed = 1.2;
    controls.minDistance = 10;
    controls.maxDistance = 150;

    const config = getConfig();
    controls.target.set(0, 0, config.height / 2);
    controls.update();

    const navCube = _createNavCube(container, navContainer, camera, controls);

    let _visible = false;
    let _animationCallback = null;
    let _animating = false;

    function animate() {
        if (!_animating) return;
        requestAnimationFrame(animate);

        controls.update();

        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }

        if (navCube.scene && navCube.camera && navCube.renderer) {
            _updateNavCubeOrientation(camera, controls);
            navCube.renderer.render(navCube.scene, navCube.camera);
        }

        if (_animationCallback) {
            _animationCallback();
        }
    }

    function startAnimation() {
        if (_animating) return;
        _animating = true;
        animate();
    }

    function stopAnimation() {
        _animating = false;
    }

    function fitCameraToBuilding() {
        const cfg = getConfig();
        const { width, depth, height } = cfg;
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

    function setCameraPosition(pos, target) {
        if (pos) camera.position.set(...pos);
        if (target) controls.target.set(...target);
        controls.update();
    }

    function setVisible(visible) {
        _visible = visible;
        if (renderer) {
            renderer.domElement.style.display = visible ? 'block' : 'none';
        }
        if (navContainer) {
            navContainer.classList.toggle('visible', visible);
        }
        // Hide all other view renderers when showing this one
        if (visible) {
            _viewInstances.forEach((otherView, otherId) => {
                if (otherId !== viewId && otherView.renderer && otherView.renderer.domElement) {
                    otherView.renderer.domElement.style.display = 'none';
                }
            });
            startAnimation();
        } else {
            stopAnimation();
        }
    }

    function isVisible() {
        return _visible;
    }

    function setAnimationCallback(cb) {
        _animationCallback = cb;
    }

    function handleResize() {
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        if (cw === 0 || ch === 0) return;

        camera.aspect = cw / ch;
        camera.updateProjectionMatrix();
        if (renderer) {
            renderer.setSize(cw, ch);
        }
    }

    const instance = {
        viewId,
        scene,
        camera,
        renderer,
        controls,
        fitCameraToBuilding,
        setCameraPosition,
        setVisible,
        isVisible,
        setAnimationCallback,
        startAnimation,
        stopAnimation,
        handleResize,
        navCube,
        dispose: () => {
            stopAnimation();
            if (renderer) {
                renderer.dispose();
                container.removeChild(renderer.domElement);
            }
            if (navCube.renderer) {
                navCube.renderer.dispose();
            }
            _viewInstances.delete(viewId);
        }
    };

    _viewInstances.set(viewId, instance);

    window.addEventListener('resize', handleResize);

    return instance;
}

function _createSkyDome() {
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

function _createNavCube(container, navContainer, camera, controls) {
    if (!navContainer) {
        return { scene: null, camera: null, renderer: null };
    }

    const navCubeScene = new THREE.Scene();

    const navSize = 100;
    const navCubeCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    navCubeCamera.position.set(-2.5, -1.5, 2.5);
    navCubeCamera.lookAt(0, 0, 0);
    navCubeCamera.up.set(0, 0, 1);

    const navCubeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    navCubeRenderer.setSize(navSize, navSize);
    navCubeRenderer.setPixelRatio(window.devicePixelRatio);
    navContainer.appendChild(navCubeRenderer.domElement);

    const cubeGeometry = new THREE.BoxGeometry(1.3, 1.3, 1.3);

    const faceLabels = ['RIGHT', 'LEFT', 'TOP', 'BOTTOM', 'FRONT', 'BACK'];
    const faceBg = ['#d6dce4', '#d6dce4', '#e8ecf0', '#b8c4ce', '#c8d4e0', '#c0cad4'];
    const faceText = ['#2d3a4a', '#2d3a4a', '#1a2733', '#2d3a4a', '#2d3a4a', '#2d3a4a'];

    const faceMaterials = faceLabels.map((label, i) =>
        new THREE.MeshBasicMaterial({
            map: _createFaceTexture(label, faceBg[i], faceText[i]),
            transparent: false,
        }),
    );

    const navCube = new THREE.Mesh(cubeGeometry, faceMaterials);
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

    container.addEventListener('mousedown', (event) => {
        navCube.userData.isDragging = true;
        navCube.userData.lastMouse = { x: event.clientX, y: event.clientY };
        navCube.userData.dragStartTime = Date.now();
    });

    container.addEventListener('mouseup', (event) => {
        const dragDuration = Date.now() - navCube.userData.dragStartTime;
        navCube.userData.isDragging = false;
        if (dragDuration < 200) {
            _handleNavCubeClick(event, camera, controls, navCube);
        }
    });

    container.addEventListener('mousemove', (event) => {
        if (event.buttons === 1 && navCube.userData.isDragging) {
            event.preventDefault();
            const deltaX = event.clientX - navCube.userData.lastMouse.x;
            const deltaY = event.clientY - navCube.userData.lastMouse.y;

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

    return { scene: navCubeScene, camera: navCubeCamera, renderer: navCubeRenderer, mesh: navCube };
}

function _handleNavCubeClick(event, camera, controls, navCube) {
    if (!navCube || !navCube.mesh) return;

    const navContainer = document.getElementById('nav-cube-container');
    if (!navContainer) return;

    const navRenderer = navContainer.querySelector('canvas');
    if (!navRenderer) return;

    const rect = navRenderer.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x, y }, navCube.camera);
    const intersects = raycaster.intersectObject(navCube.mesh);
    if (intersects.length > 0) {
        const views = ['right', 'left', 'top', 'bottom', 'front', 'back'];
        const view = views[intersects[0].face.materialIndex];
        if (view) {
            _animateCameraToView(view, camera, controls);
        }
    }
}

function _animateCameraToView(view, camera, controls) {
    const config = getConfig();
    const distance = 50;
    const centerZ = config.height / 2;

    const viewMap = {
        right: { pos: [distance, 0, centerZ], target: [0, 0, centerZ] },
        left: { pos: [-distance, 0, centerZ], target: [0, 0, centerZ] },
        front: { pos: [0, -distance, centerZ], target: [0, 0, centerZ] },
        back: { pos: [0, distance, centerZ], target: [0, 0, centerZ] },
        top: { pos: [0, 0, distance * 2], target: [0, 0, 0] },
        bottom: { pos: [0.1, 0, -distance], target: [0, 0, 0] },
    };

    const targetView = viewMap[view];
    if (!targetView) return;

    const startPos = camera.position.toArray();
    const startTarget = controls.target.toArray();
    const duration = 500;
    const startTime = Date.now();

    function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 1, 2) / 2;

        camera.position.set(
            startPos[0] + (targetView.pos[0] - startPos[0]) * ease,
            startPos[1] + (targetView.pos[1] - startPos[1]) * ease,
            startPos[2] + (targetView.pos[2] - startPos[2]) * ease,
        );

        controls.target.set(
            startTarget[0] + (targetView.target[0] - startTarget[0]) * ease,
            startTarget[1] + (targetView.target[1] - startTarget[1]) * ease,
            startTarget[2] + (targetView.target[2] - startTarget[2]) * ease,
        );

        controls.update();

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            camera.position.set(...targetView.pos);
            controls.target.set(...targetView.target);
            camera.lookAt(controls.target);
            controls.update();
        }
    }

    update();
}

function _updateNavCubeOrientation(camera, controls) {
    const navContainer = document.getElementById('nav-cube-container');
    if (!navContainer || !navContainer.__navCubeCamera) return;

    const navCamera = navContainer.__navCubeCamera;
    const offset = camera.position.clone().sub(controls.target);
    const dir = offset.normalize();
    navCamera.position.set(dir.x * 3.84, dir.y * 3.84, dir.z * 3.84);
    if (Math.abs(dir.z) > 0.999) {
        navCamera.up.set(0, dir.z > 0 ? 1 : -1, 0);
    } else {
        navCamera.up.set(0, 0, 1);
    }
    navCamera.lookAt(0, 0, 0);
}

function _createFaceTexture(text, bgColor, textColor) {
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

function getViewInstance(viewId) {
    return _viewInstances.get(viewId);
}

function disposeAll() {
    _viewInstances.forEach(instance => instance.dispose());
    _viewInstances.clear();
}

export {
    createViewBase,
    getViewInstance,
    disposeAll
};