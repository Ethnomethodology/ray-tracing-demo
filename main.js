/**
 * Dürer's Perspective Apparatus - Final Historical Integration
 * Premium environment, UI logic, and UX improvements.
 */

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(1, 1, 1, 1); // Laboratory White

    // Performance Optimization: Pre-allocated objects to reduce GC pressure
    const _tempVec = new BABYLON.Vector3();
    const _tempDirection = new BABYLON.Vector3();
    const _sharedRay = new BABYLON.Ray(BABYLON.Vector3.Zero(), BABYLON.Vector3.Up(), 100);
    let _textureDirty = false;
    let _samplePositions = null;

    // 1. ArcRotateCamera setup - Positioned to the side like the Woodcut's perspective
    const camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 6, Math.PI / 2.2, 45, new BABYLON.Vector3(0, 0, 0), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 50;
    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 80;

    // 2. Lighting setup - Positioned to highlight the Lute from above
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;
    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0, -1, 0), scene);
    dirLight.intensity = 0.6;
    dirLight.position = new BABYLON.Vector3(0, 20, -10); // Center over the Lute

    // 3. Environment: The Table (Extended to bridge Lute and Frame)
    const tableMesh = BABYLON.MeshBuilder.CreateBox("tableMesh", { width: 12, height: 0.5, depth: 25 }, scene);
    tableMesh.position.y = -5.25;
    tableMesh.position.z = -7.5; // Offset to sit under both Lute (-10) and Frame (0)
    const tableMaterial = new BABYLON.StandardMaterial("tableMaterial", scene);
    tableMaterial.diffuseColor = new BABYLON.Color3(0.35, 0.22, 0.12); // Richer wooden/walnut brown
    tableMesh.material = tableMaterial;

    // 3b. Environment: The Wall (For the Pulley)
    const wallMesh = BABYLON.MeshBuilder.CreatePlane("wallMesh", { size: 40 }, scene);
    wallMesh.position.z = 16;
    wallMesh.rotation.y = Math.PI; // Face towards the scene
    const wallMaterial = new BABYLON.StandardMaterial("wallMaterial", scene);
    wallMaterial.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.95);
    wallMaterial.alpha = 0.1; // Make the wall transparent as requested
    wallMesh.material = wallMaterial;

    // 4. Create targetMesh (Historical Lute)
    let targetMesh = null;
    const targetMaterial = new BABYLON.StandardMaterial("targetMaterial", scene);
    targetMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.4, 0.2); // Lighter wood tone
    targetMaterial.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);

    BABYLON.SceneLoader.ImportMeshAsync("", "./", "lute.glb", scene).then((result) => {
        // Find the root and all meshes with geometry
        const root = result.meshes[0];
        const actualMeshes = result.meshes.filter(m => m instanceof BABYLON.Mesh && m.getTotalVertices() > 0);

        if (actualMeshes.length > 0) {
            // Bake world transforms into a single merged mesh for the animator/raycaster
            // This avoids coordinate system mismatches between GLB (Y-up) and Babylon (Y-up with root rotation)
            actualMeshes.forEach(m => m.computeWorldMatrix(true));
            const merged = BABYLON.Mesh.MergeMeshes(actualMeshes, true, true, undefined, false, true);

            if (merged) {
                targetMesh = merged;
                targetMesh.name = "targetMesh";
                targetMesh.material = targetMaterial;

                // Accurately calculate the scale based on the merged geometry
                const boundingInfo = targetMesh.getBoundingInfo();
                const size = boundingInfo.maximum.subtract(boundingInfo.minimum);
                const maxDim = Math.max(size.x, size.y, size.z);

                const scaleFactor = (maxDim > 0.001) ? 15 / maxDim : 2.5; // 2.5x size (was 18/maxDim)
                targetMesh.scaling.setAll(scaleFactor);

                // HISTORICAL ORIENTATION - Rotate Face Up, Point Neck towards Frame, and slant to the side
                targetMesh.rotation.y = Math.PI; // Neck points towards +Z (the Frame)

                // User Explicit Rotation setup
                const clockwise_d = 5 * (Math.PI / 180); // Positive indicates clockwise
                targetMesh.rotation.x = Math.PI + clockwise_d;

                const localInfo = targetMesh.getBoundingInfo();

                // Ground the slanted lute: Calculate absolute world bounds and offset to hit Y = -5
                targetMesh.computeWorldMatrix(true);
                localInfo.update(targetMesh.getWorldMatrix());
                const groundOffset = -4.7 - localInfo.boundingBox.minimumWorld.y;
                targetMesh.position.y += groundOffset;
                targetMesh.position.z = -10; // Ensure consistent Z position
                targetMesh.position.x = 0;   // Ensure consistent X position

                // User explicit fine-tuning: Translate along the local Green (Y) axis towards the table
                targetMesh.translate(BABYLON.Axis.Y, 7.5, BABYLON.Space.LOCAL);



                targetMesh.computeWorldMatrix(true);
                // Picking Optimization
                targetMesh.freezeWorldMatrix();

                // Pre-cache positions for the animator
                _samplePositions = targetMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
            }
        }

        // Remove the original root if it's still floating around empty
        if (root && root !== targetMesh) {
            root.dispose();
        }

    }).catch(err => console.error("Lute failed to load:", err));


    // 5. Create gridPlane (Dürer's Frame)
    const gridSize = 10;
    const gridPlane = BABYLON.MeshBuilder.CreatePlane("gridPlane", {
        size: gridSize,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);
    gridPlane.position = new BABYLON.Vector3(0, 0, 0); // Frame at Origin (Center of world)

    // Setup DynamicTexture for the drawing engine
    const textureSize = 1024;
    const drawingTexture = new BABYLON.DynamicTexture("drawingTexture", { width: textureSize, height: textureSize }, scene);
    const textureCtx = drawingTexture.getContext();
    drawingTexture.hasAlpha = true;

    // Initial clear/fill function
    const clearCanvas = () => {
        textureCtx.fillStyle = "rgba(255, 255, 255, 0.3)";
        textureCtx.fillRect(0, 0, textureSize, textureSize);
        drawingTexture.update();
    };
    clearCanvas();

    const planeMaterial = new BABYLON.StandardMaterial("planeMaterial", scene);
    planeMaterial.diffuseTexture = drawingTexture;
    planeMaterial.useAlphaFromDiffusetexture = true;
    planeMaterial.alpha = 0.4; // Transparency polish
    planeMaterial.backFaceCulling = false;
    gridPlane.material = planeMaterial;

    // Frame Border
    const frameHalf = gridSize / 2;
    const framePoints = [
        new BABYLON.Vector3(-frameHalf, -frameHalf, 0),
        new BABYLON.Vector3(frameHalf, -frameHalf, 0),
        new BABYLON.Vector3(frameHalf, frameHalf, 0),
        new BABYLON.Vector3(-frameHalf, frameHalf, 0),
        new BABYLON.Vector3(-frameHalf, -frameHalf, 0)
    ];
    const frameBorder = BABYLON.MeshBuilder.CreateLines("frameBorder", { points: framePoints }, scene);
    frameBorder.parent = gridPlane;
    frameBorder.color = new BABYLON.Color3(0.2, 0.2, 0.2);

    // 6. Create stylus (stickMesh)
    const stickMesh = BABYLON.MeshBuilder.CreateSphere("stickMesh", { diameter: 0.2 }, scene);
    const stickMaterial = new BABYLON.StandardMaterial("stickMaterial", scene);
    stickMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
    stickMaterial.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
    stickMesh.material = stickMaterial;
    stickMesh.isPickable = false;
    stickMesh.position = new BABYLON.Vector3(0, 0, 0);

    // 7. Raycasting Interaction
    scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
            if (!targetMesh) return;
            const pickInfo = scene.pick(scene.pointerX, scene.pointerY, (mesh) => mesh === targetMesh);
            if (pickInfo.hit && pickInfo.pickedPoint) {
                stickMesh.position.copyFrom(pickInfo.pickedPoint);
            }
        }
    });

    // 8. Pulley and String System
    // PulleyNode at the "Eye" point (on the wall)
    const pulleyNode = new BABYLON.Vector3(0, 10, 15.5);
    const maxStringLength = 50.0; // Twice the length of the table (25 * 2)

    const pulleyMesh = BABYLON.MeshBuilder.CreateCylinder("pulleyMesh", { diameter: 0.8, height: 0.2 }, scene);
    pulleyMesh.position.copyFrom(pulleyNode);
    pulleyMesh.rotation.x = Math.PI / 2;
    const pulleyMaterial = new BABYLON.StandardMaterial("pulleyMaterial", scene);
    pulleyMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
    pulleyMesh.material = pulleyMaterial;

    const weightMesh = BABYLON.MeshBuilder.CreateCylinder("weightMesh", { diameter: 0.4, height: 0.8 }, scene);
    const weightMaterial = new BABYLON.StandardMaterial("weightMaterial", scene);
    weightMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    weightMesh.material = weightMaterial;

    let segmentA = BABYLON.MeshBuilder.CreateLines("segmentA", { points: [stickMesh.position, pulleyNode], updatable: true }, scene);
    segmentA.color = new BABYLON.Color3(0.3, 0.3, 0.3);

    let segmentB = BABYLON.MeshBuilder.CreateLines("segmentB", { points: [pulleyNode, weightMesh.position], updatable: true }, scene);
    segmentB.color = new BABYLON.Color3(0.3, 0.3, 0.3);

    scene.onBeforeRenderObservable.add(() => {
        // 1. Update Pulleys and Weights
        const distanceA = BABYLON.Vector3.Distance(stickMesh.position, pulleyNode);
        const lengthB = maxStringLength - distanceA;
        weightMesh.position.set(pulleyNode.x, pulleyNode.y - lengthB, pulleyNode.z);

        if (segmentA) BABYLON.MeshBuilder.CreateLines("segmentA", { points: [stickMesh.position, pulleyNode], instance: segmentA });
        if (segmentB) BABYLON.MeshBuilder.CreateLines("segmentB", { points: [pulleyNode, weightMesh.position], instance: segmentB });

        // 2. Throttled Drawing Update: Only update GPU texture once per frame if dirty
        if (_textureDirty) {
            drawingTexture.update();
            _textureDirty = false;
        }

        // 3. Frame-synced Animator Logic
        if (isAnimating && _samplePositions) {
            if (dotsDrawn >= currentLimit) {
                toggleAnimation();
                return;
            }

            // Sample 2 points per frame at 60fps is faster and smoother than 1 point at 100fps
            for (let i = 0; i < 2; i++) {
                if (dotsDrawn >= currentLimit) break;

                const vertexIndex = Math.floor(Math.random() * (_samplePositions.length / 3)) * 3;
                _tempVec.set(
                    _samplePositions[vertexIndex],
                    _samplePositions[vertexIndex + 1],
                    _samplePositions[vertexIndex + 2]
                );

                // Use cached world matrix for transformation (no computeWorldMatrix call)
                BABYLON.Vector3.TransformCoordinatesToRef(_tempVec, targetMesh.getWorldMatrix(), stickMesh.position);
                drawPointAtStick();
                dotsDrawn++;
            }
        }
    });

    // 9. Core Drawing Function (DRY)
    const drawPointAtStick = () => {
        stickMesh.position.subtractToRef(pulleyNode, _tempDirection);
        _sharedRay.origin.copyFrom(pulleyNode);
        _sharedRay.direction.copyFrom(_tempDirection.normalize());

        const hit = _sharedRay.intersectsMesh(gridPlane);

        if (hit.hit) {
            const uv = hit.getTextureCoordinates();
            if (uv) {
                const x = uv.x * textureSize;
                const y = (1 - uv.y) * textureSize;

                textureCtx.fillStyle = "#000000";
                textureCtx.beginPath();
                textureCtx.arc(x, y, 4, 0, Math.PI * 2);
                textureCtx.fill();
                _textureDirty = true; // Mark for update at end of frame
            }
        }
    };

    // Pointillist Drawing Interaction
    scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
            if (!isAnimating) drawPointAtStick();
        }
    });

    // 10. Auto-Animator Logic
    let isAnimating = false;
    let dotsDrawn = 0;
    let currentLimit = 1000;
    let animationInterval = null;

    const toggleAnimation = () => {
        const animateBtn = document.getElementById("animateBtn");
        const resetBtn = document.getElementById("resetBtn");

        if (isAnimating) {
            isAnimating = false;
            animateBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Animate';
            resetBtn.disabled = false;
        } else {
            if (!targetMesh || !_samplePositions) return;
            isAnimating = true;
            currentLimit = dotsDrawn + 1000; // Increment the target by another 1000
            animateBtn.textContent = "Stop Animation";
            resetBtn.disabled = true;
        }
    };

    document.getElementById("animateBtn").addEventListener("click", toggleAnimation);

    // 11. UI Controller
    const resetScene = () => {
        // Clear dots with proper alpha wipe
        textureCtx.clearRect(0, 0, textureSize, textureSize);
        clearCanvas();
        dotsDrawn = 0;
        if (isAnimating) toggleAnimation();

        // Reset Camera
        const targetPos = new BABYLON.Vector3(0, 0, 0);

        // Animation
        const animationAlpha = new BABYLON.Animation("cameraAlpha", "alpha", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        const animationBeta = new BABYLON.Animation("cameraBeta", "beta", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        const animationRadius = new BABYLON.Animation("cameraRadius", "radius", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);

        const keysAlpha = [{ frame: 0, value: camera.alpha }, { frame: 30, value: Math.PI / 6 }];
        const keysBeta = [{ frame: 0, value: camera.beta }, { frame: 30, value: Math.PI / 2.2 }];
        const keysRadius = [{ frame: 0, value: camera.radius }, { frame: 30, value: 45 }];

        animationAlpha.setKeys(keysAlpha);
        animationBeta.setKeys(keysBeta);
        animationRadius.setKeys(keysRadius);

        camera.animations = [animationAlpha, animationBeta, animationRadius];
        scene.beginAnimation(camera, 0, 30, false);

        camera.setTarget(targetPos);
    };

    document.getElementById("resetBtn").addEventListener("click", resetScene);

    return scene;
};

const scene = createScene();
engine.runRenderLoop(() => { scene.render(); });
window.addEventListener("resize", () => { engine.resize(); });
