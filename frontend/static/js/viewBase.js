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

    const skyDome = _createSkyDome(document.body.classList.contains('theme__dark'));
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
            _updateNavCubeOrientation(navCube, camera, controls);
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
            if (visible) {
                navContainer.classList.add('visible');
            } else {
                navContainer.classList.remove('visible');
            }
        }
        if (visible) {
            _viewInstances.forEach((otherView, otherId) => {
                if (otherId !== viewId) {
                    if (otherView.renderer && otherView.renderer.domElement) {
                        otherView.renderer.domElement.style.display = 'none';
                    }
                    if (otherView.navCube && otherView.navCube.renderer) {
                        const otherNavContainer = otherView.navCube.renderer.domElement.parentElement;
                        if (otherNavContainer) {
                            otherNavContainer.classList.remove('visible');
                        }
                    }
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
        skyDome,
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

function _createSkyDome(isDark = false) {
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 512);

    if (isDark) {
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(0.3, '#000000');
        gradient.addColorStop(0.45, '#000104');
        gradient.addColorStop(0.5, '#000104');
        gradient.addColorStop(0.55, '#000107');
        gradient.addColorStop(0.7, '#000107');
        gradient.addColorStop(1, '#000107');
    } else {
        gradient.addColorStop(0, '#86a4df');
        gradient.addColorStop(0.3, '#adc2ed');
        gradient.addColorStop(0.45, '#adc0e7');
        gradient.addColorStop(0.5, '#adb3c0');
        gradient.addColorStop(0.55, '#abb3bc');
        gradient.addColorStop(0.7, '#b0b6bc');
        gradient.addColorStop(1, '#bababa');
    }

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

function _updateSkyDomeColor(skyMesh, isDark) {
    if (!skyMesh) return;
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 512);

    if (isDark) {
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(0.3, '#000000');
        gradient.addColorStop(0.45, '#000104');
        gradient.addColorStop(0.5, '#000104');
        gradient.addColorStop(0.55, '#000107');
        gradient.addColorStop(0.7, '#000107');
        gradient.addColorStop(1, '#000107');
    } else {
        gradient.addColorStop(0, '#86a4df');
        gradient.addColorStop(0.3, '#adc2ed');
        gradient.addColorStop(0.45, '#adc0e7');
        gradient.addColorStop(0.5, '#adb3c0');
        gradient.addColorStop(0.55, '#abb3bc');
        gradient.addColorStop(0.7, '#b0b6bc');
        gradient.addColorStop(1, '#bababa');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    skyMesh.material.map = texture;
    skyMesh.material.needsUpdate = true;
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

    const faceLabels = ['RIGHT (+Y)', 'LEFT (-Y)', 'TOP (+Z)', 'BOTTOM (-Z)', 'FRONT (+X)', 'BACK (+X)'];
    const isDark = document.body.classList.contains('theme__dark');
    const { faceBg, faceText, edgesColor } = isDark
        ? {
              faceBg: ['#2a2a3a', '#2a2a3a', '#333344', '#252535', '#2e2e40', '#282838'],
              faceText: ['#b0b0c0', '#b0b0c0', '#a0a0b8', '#b0b0c0', '#a8a8bc', '#b0b0c0'],
              edgesColor: 0x6a7080,
          }
        : {
              faceBg: ['#d6dce4', '#d6dce4', '#e8ecf0', '#b8c4ce', '#c8d4e0', '#c0cad4'],
              faceText: ['#2d3a4a', '#2d3a4a', '#1a2733', '#2d3a4a', '#2d3a4a', '#2d3a4a'],
              edgesColor: 0x5a6a7a,
          };

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
    const edgesMaterial = new THREE.LineBasicMaterial({ color: edgesColor, linewidth: 1 });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    navCube.add(edges);

    navCubeScene.add(new THREE.AmbientLight(0xffffff, 1.0));

    navCube.userData.isNavCube = true;
    navCube.userData.isDragging = false;
    navCube.userData.lastMouse = { x: 0, y: 0 };
    navCube.userData.dragStartTime = 0;

    navContainer.style.cursor = 'pointer';
    navCubeRenderer.domElement.style.cursor = 'pointer';

    const navCubeWrapper = { scene: navCubeScene, camera: navCubeCamera, renderer: navCubeRenderer, mesh: navCube, edges };

    navContainer.addEventListener('click', (event) => {
        _handleNavCubeClick(event, camera, controls, navCubeWrapper);
    });

    navContainer.addEventListener('mousedown', (event) => {
        navCube.userData.isDragging = true;
        navCube.userData.lastMouse = { x: event.clientX, y: event.clientY };
    });

    navContainer.addEventListener('mousemove', (event) => {
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

    navContainer.addEventListener('mouseup', () => {
        navCube.userData.isDragging = false;
    });

    return navCubeWrapper;
}

function _handleNavCubeClick(event, camera, controls, navCube) {
    if (!navCube || !navCube.mesh) {
        return;
    }

    const navRenderer = navCube.renderer;
    if (!navRenderer) {
        return;
    }

    const canvas = navRenderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x, y }, navCube.camera);
    const intersects = raycaster.intersectObject(navCube.mesh, false);

    if (intersects.length > 0) {
        const face = intersects[0].face;
        if (face && face.materialIndex !== undefined) {
            const faceIdx = face.materialIndex;
            const viewMap = {
                0: 'right',
                1: 'left',
                2: 'top',
                3: 'bottom',
                4: 'front',
                5: 'back'
            };
            const view = viewMap[faceIdx];
            if (view) {
                _animateCameraToView(view, camera, controls);
            }
        }
    }
}

function _animateCameraToView(view, camera, controls) {
    const config = getConfig();
    const buildingDiag = Math.sqrt(config.width * config.width + config.depth * config.depth + config.height * config.height);
    const distance = Math.max(50, buildingDiag * 1.5);
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

    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const targetPos = new THREE.Vector3(...targetView.pos);
    const targetCenter = new THREE.Vector3(...targetView.target);

    const duration = 800;
    const startTime = Date.now();

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function update() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeInOutCubic(progress);

        camera.position.lerpVectors(startPos, targetPos, eased);
        controls.target.lerpVectors(startTarget, targetCenter, eased);
        controls.update();

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            camera.position.copy(targetPos);
            controls.target.copy(targetCenter);
            camera.lookAt(controls.target);
            controls.update();
        }
    }

    update();
}

function _updateNavCubeOrientation(navCube, camera, controls) {
    const navCamera = navCube.camera;
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

function updateAllSkyDomes(isDark) {
    _viewInstances.forEach(instance => {
        if (instance.skyDome) {
            _updateSkyDomeColor(instance.skyDome, isDark);
        }
    });
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { isDark } }));
}

function _updateNavCubeColors(navCubeWrapper, isDark) {
    if (!navCubeWrapper?.mesh) return;

    const faceLabels = ['RIGHT (+Y)', 'LEFT (-Y)', 'TOP (+Z)', 'BOTTOM (-Z)', 'FRONT (+X)', 'BACK (+X)'];
    const { faceBg, faceText, edgesColor } = isDark
        ? {
              faceBg: ['#2a2a3a', '#2a2a3a', '#333344', '#252535', '#2e2e40', '#282838'],
              faceText: ['#b0b0c0', '#b0b0c0', '#a0a0b8', '#b0b0c0', '#a8a8bc', '#b0b0c0'],
              edgesColor: 0x6a7080,
          }
        : {
              faceBg: ['#d6dce4', '#d6dce4', '#e8ecf0', '#b8c4ce', '#c8d4e0', '#c0cad4'],
              faceText: ['#2d3a4a', '#2d3a4a', '#1a2733', '#2d3a4a', '#2d3a4a', '#2d3a4a'],
              edgesColor: 0x5a6a7a,
          };

    navCubeWrapper.mesh.material.forEach((mat, i) => {
        mat.map = _createFaceTexture(faceLabels[i], faceBg[i], faceText[i]);
        mat.needsUpdate = true;
    });

    if (navCubeWrapper.edges) {
        navCubeWrapper.edges.material.color.setHex(edgesColor);
    }
}

function updateAllNavCubes(isDark) {
    _viewInstances.forEach(instance => {
        if (instance.navCube) {
            _updateNavCubeColors(instance.navCube, isDark);
        }
    });
}

function disposeAll() {
    _viewInstances.forEach(instance => instance.dispose());
    _viewInstances.clear();
}

function isThemeDark() {
    return document.body.classList.contains('theme__dark');
}

function getThemeColors() {
    if (isThemeDark()) {
        return {
            label: '#707070',
            labelBg: '#000000',
            dimension: 0x707070,
            arrow: 0x707070,
            wireframe: 0x666666,
            floor: 0x555555,
            grid: 0x444444,
        };
    }
    return {
        label: '#000000',
        labelBg: '#ffffff',
        dimension: 0x333333,
        arrow: 0x333333,
        wireframe: 0xcccccc,
        floor: 0xcccccc,
        grid: 0xcccccc,
    };
}

export {
    createViewBase,
    getViewInstance,
    updateAllSkyDomes,
    updateAllNavCubes,
    disposeAll,
    isThemeDark,
    getThemeColors,
};