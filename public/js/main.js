/**
 * Dürer's Perspective Apparatus - Final Historical Integration
 * Premium environment, UI logic, and UX improvements.
 */

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
let camera = null; // Shared scope for resize handler

const createScene = function () {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(1, 1, 1, 1); // Laboratory White

    // Performance Optimization: Pre-allocated objects to reduce GC pressure
    const _tempVec = new BABYLON.Vector3();
    const _tempDirection = new BABYLON.Vector3();
    const _sharedRay = new BABYLON.Ray(BABYLON.Vector3.Zero(), BABYLON.Vector3.Up(), 100);
    let _textureDirty = false;
    let _samplePositions = null;
    let _scanIndices = [];
    let _scanProgress = 0;
    let _surfaceNormal = new BABYLON.Vector3(0, 1, 0); // Outward surface normal at current pick point

    // 1. ArcRotateCamera setup - Positioned to the side like the Woodcut's perspective
    const isMobile = window.innerWidth <= 900;
    const defaultRadius = isMobile ? 65 : 45;
    camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 6, Math.PI / 2.2, defaultRadius, new BABYLON.Vector3(0, -5, 0), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 50;
    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 100;

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

    // 3a. Table Legs
    const legHeight = 9.75; // 15 - 5.25 = 9.75 so absolute bottom is at Y = -15 (matches wall bottom)
    const legDiameter = 0.6;
    const legPositions = [
        new BABYLON.Vector3(5.5, -legHeight / 2, 11.5),
        new BABYLON.Vector3(-5.5, -legHeight / 2, 11.5),
        new BABYLON.Vector3(5.5, -legHeight / 2, -11.5),
        new BABYLON.Vector3(-5.5, -legHeight / 2, -11.5)
    ];
    legPositions.forEach((pos, i) => {
        const leg = BABYLON.MeshBuilder.CreateCylinder(`tableLeg${i}`, { diameter: legDiameter, height: legHeight }, scene);
        leg.parent = tableMesh;
        leg.position = pos;
        leg.material = tableMaterial;
    });

    // 3b. Environment: The Wall (For the Pulley)
    const wallMesh = BABYLON.MeshBuilder.CreatePlane("wallMesh", { width: 40, height: 30 }, scene);
    wallMesh.position.z = 16;
    wallMesh.rotation.y = Math.PI;
    wallMesh.isVisible = false; // Fully hidden

    // 4. Create targetMesh (Historical Lute)
    let targetMesh = null;
    const targetMaterial = new BABYLON.StandardMaterial("targetMaterial", scene);
    targetMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.4, 0.2); // Lighter wood tone
    targetMaterial.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);

    // Object loading is now handled by loadObject() at the bottom of createScene


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
        textureCtx.fillStyle = "#ffffff"; // Solid white paper
        textureCtx.fillRect(0, 0, textureSize, textureSize);
        drawingTexture.update();
    };
    clearCanvas();

    const planeMaterial = new BABYLON.StandardMaterial("planeMaterial", scene);
    planeMaterial.alpha = 0.15; // Very faint glass effect
    planeMaterial.backFaceCulling = false;
    gridPlane.material = planeMaterial;

    // Frame Border (Physical black frame, constructed from 4 boxes)
    const frameHalf = gridSize / 2;
    const borderThickness = 0.2;
    const borderDepth = 0.2;

    const frameBorderMaterial = new BABYLON.StandardMaterial("frameBorderMat", scene);
    frameBorderMaterial.diffuseColor = new BABYLON.Color3(0.02, 0.02, 0.02); // Black
    frameBorderMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);

    // Bottom border (shifted up by borderThickness/2 so bottom edge sits exactly at -frameHalf, i.e., -5.0)
    const borderBottom = BABYLON.MeshBuilder.CreateBox("borderBottom", { width: gridSize + borderThickness * 2, height: borderThickness, depth: borderDepth }, scene);
    borderBottom.parent = gridPlane;
    borderBottom.position = new BABYLON.Vector3(0, -frameHalf + borderThickness / 2, 0);
    borderBottom.material = frameBorderMaterial;

    // Top border
    const borderTop = BABYLON.MeshBuilder.CreateBox("borderTop", { width: gridSize + borderThickness * 2, height: borderThickness, depth: borderDepth }, scene);
    borderTop.parent = gridPlane;
    borderTop.position = new BABYLON.Vector3(0, frameHalf + borderThickness / 2, 0);
    borderTop.material = frameBorderMaterial;

    // Left border
    const borderLeft = BABYLON.MeshBuilder.CreateBox("borderLeft", { width: borderThickness, height: gridSize, depth: borderDepth }, scene);
    borderLeft.parent = gridPlane;
    borderLeft.position = new BABYLON.Vector3(-frameHalf - borderThickness / 2, 0, 0);
    borderLeft.material = frameBorderMaterial;

    // Right border
    const borderRight = BABYLON.MeshBuilder.CreateBox("borderRight", { width: borderThickness, height: gridSize, depth: borderDepth }, scene);
    borderRight.parent = gridPlane;
    borderRight.position = new BABYLON.Vector3(frameHalf + borderThickness / 2, 0, 0);
    borderRight.material = frameBorderMaterial;


    // 5.5 Create Hinged Page (Dürer's drawing surface)
    const pageHinge = new BABYLON.TransformNode("pageHinge", scene);
    pageHinge.parent = gridPlane;
    pageHinge.position = new BABYLON.Vector3(-frameHalf, 0, 0); // Hinge on the left border

    // Use a thin Box for the paper to properly handle front/back materials and orientation
    const pageMesh = BABYLON.MeshBuilder.CreateBox("pageMesh", {
        width: gridSize,
        height: gridSize,
        depth: 0.02
    }, scene);
    pageMesh.parent = pageHinge;
    // Position it so the front face sits at z = -0.05
    pageMesh.position = new BABYLON.Vector3(frameHalf, 0, -0.06);
    pageMesh.isPickable = false;

    // Materials for the page
    const pageInnerMaterial = new BABYLON.StandardMaterial("pageInnerMaterial", scene);
    pageInnerMaterial.diffuseTexture = drawingTexture;
    pageInnerMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
    pageInnerMaterial.disableLighting = true;

    const pageOuterMaterial = new BABYLON.StandardMaterial("pageOuterMaterial", scene);
    pageOuterMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
    pageOuterMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
    pageOuterMaterial.disableLighting = true;

    const multiMat = new BABYLON.MultiMaterial("pageMultiMat", scene);
    multiMat.subMaterials.push(pageInnerMaterial); // Drawing
    multiMat.subMaterials.push(pageOuterMaterial); // White
    multiMat.subMaterials.push(pageOuterMaterial); // Sides
    pageMesh.material = multiMat;

    // Define submeshes for the box faces
    pageMesh.subMeshes = [];
    const verticesCount = pageMesh.getTotalVertices();
    // Mat 0 is Drawing, Mat 1 is White. 
    // Front (+Z) faces the frame when closed, so it gets the drawing.
    new BABYLON.SubMesh(0, 0, verticesCount, 0, 6, pageMesh); // Front (+Z) gets Mat 0 (Drawing)
    new BABYLON.SubMesh(1, 0, verticesCount, 6, 6, pageMesh); // Back (-Z) gets Mat 1 (White)
    new BABYLON.SubMesh(2, 0, verticesCount, 12, 24, pageMesh);

    // Add a black border around the page
    const pageBorderPoints = [
        new BABYLON.Vector3(-frameHalf, -frameHalf, 0),
        new BABYLON.Vector3(frameHalf, -frameHalf, 0),
        new BABYLON.Vector3(frameHalf, frameHalf, 0),
        new BABYLON.Vector3(-frameHalf, frameHalf, 0),
        new BABYLON.Vector3(-frameHalf, -frameHalf, 0)
    ];
    const pageBorder = BABYLON.MeshBuilder.CreateTube("pageBorder", { path: pageBorderPoints, radius: 0.1, cap: BABYLON.Mesh.CAP_ALL }, scene);
    pageBorder.parent = pageMesh;
    pageBorder.position.z = 0.011; // Slightly in front of the front face
    pageBorder.material = frameBorderMaterial;
    pageBorder.isPickable = false;

    pageHinge.setEnabled(true); // Always visible

    let isPageOpen = true;
    pageHinge.rotation.y = 2 * Math.PI / 3; // Open immediately on load, no animation
    const togglePage = () => {
        if (isPageOpen) {
            // Close animation
            const anim = new BABYLON.Animation("closePage", "rotation.y", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            anim.setKeys([{ frame: 0, value: 2 * Math.PI / 3 }, { frame: 30, value: 0 }]);
            pageHinge.animations = [anim];
            scene.beginAnimation(pageHinge, 0, 30, false);
            isPageOpen = false;

            // Park the stylus on the right side of the table when the page is closed.
            // By putting it at z=4 (between the frame at z=0 and pulley at z=15.5),
            // the thread NEVER crosses the z=0 plane, guaranteeing no intersections.
            stickMesh.position.copyFrom(new BABYLON.Vector3(8, -5, 4));
            _surfaceNormal.copyFrom(new BABYLON.Vector3(0, 1, 0)); // Point handle straight up
        } else {
            // Open animation
            const anim = new BABYLON.Animation("openPage", "rotation.y", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            anim.setKeys([{ frame: 0, value: 0 }, { frame: 30, value: 2 * Math.PI / 3 }]);
            pageHinge.animations = [anim];
            scene.beginAnimation(pageHinge, 0, 30, false);
            isPageOpen = true;
        }
    };

    // 6. Create stylus (stickMesh) to match Dürer's original design
    const stickMesh = BABYLON.MeshBuilder.CreateCylinder("stickMesh", { diameterTop: 0.02, diameterBottom: 0.15, height: 3.5 }, scene);

    // The stylus geometry: rotate so the cylinder runs along the Y axis (default).
    // The JOINT (thread attachment) is at the ORIGIN of stickMesh.
    // The tip (narrow end) is at Y = 1.75 (pointing up, attached to the thread)
    // and the handle (wide end) is at Y = -1.75 (pointing down, held by operator).
    // We shift geometry so the joint is exactly at Y = 0 (origin stays at joint).
    // Default cylinder: center at origin. We want the thick handle at the origin (touching the mesh).
    // Since handle is at -Y (-1.75), we translate up by 1.75 so handle is at origin (0).
    stickMesh.bakeTransformIntoVertices(BABYLON.Matrix.Translation(0, 1.75, 0));
    // Now thick handle is at Y = 0 (origin/joint), narrow tip at Y = 3.5.

    const stickMaterial = new BABYLON.StandardMaterial("stickMaterial", scene);
    // Red material for visibility while keeping the historical shape
    stickMaterial.diffuseColor = new BABYLON.Color3(1, 0.1, 0.1);
    stickMaterial.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
    stickMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    stickMesh.material = stickMaterial;
    stickMesh.isPickable = false;
    stickMesh.position = new BABYLON.Vector3(0, 0, 0);

    // 7. Raycasting Interaction
    scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
            if (!targetMesh) return;
            if (!isPageOpen) return; // Do not track stylus to mouse when the page is closed

            const pickInfo = scene.pick(scene.pointerX, scene.pointerY, (mesh) => mesh === targetMesh);
            if (pickInfo.hit && pickInfo.pickedPoint) {
                stickMesh.position.copyFrom(pickInfo.pickedPoint);

                // Capture the outward surface normal for stylus orientation (essentially free)
                const pickedNormal = pickInfo.getNormal(true, true);
                if (pickedNormal) _surfaceNormal.copyFrom(pickedNormal);

                // Use the same pulley-ray test as the click guard for consistency
                const dirToJoint = pickInfo.pickedPoint.subtract(pulleyNode).normalize();
                const checkRay = new BABYLON.Ray(pulleyNode, dirToJoint, 200);
                const checkHit = checkRay.intersectsMesh(targetMesh, false);
                const distToPoint = BABYLON.Vector3.Distance(pulleyNode, pickInfo.pickedPoint);
                const isFrontFace = checkHit.hit && Math.abs(checkHit.distance - distToPoint) < 0.5;

                canvas.style.cursor = isFrontFace ? "grabbing" : "not-allowed";
            } else {
                canvas.style.cursor = "default";
            }
        }
    });

    // 8. Pulley and String System
    // PulleyNode at the "Eye" point (on the wall)
    const pulleyNode = new BABYLON.Vector3(0, 10, 15.5);
    const maxStringLength = 35.7; // Reduced by 15% from 42

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
        // 1. Update Pulleys, Weights, and Stylus Alignment
        //
        // Historical mechanic (Dürer's woodcut):
        //   - The THREAD ties at the JOINT (stickMesh.position)
        //   - The STYLUS is held perpendicular (90°) to the thread
        //   - Someone holds the stylus and pulls the thread taut to the point of interest
        //
        // Orient the stylus along the outward surface normal at the current pick point.
        // _surfaceNormal is updated on every POINTERMOVE/POINTERDOWN from pickInfo.getNormal()
        // which is free — it only interpolates already-computed vertex normals.
        // The thick handle stays at origin (touching the mesh); +Y (narrow tip) points OUT along the normal.
        // So we align +Y with the OUTWARD normal, meaning the narrow tip points out (attaching to thread).
        const _fromVec = new BABYLON.Vector3(0, 1, 0);
        const _toVec = _surfaceNormal.clone();
        stickMesh.rotationQuaternion = BABYLON.Quaternion.FromUnitVectorsToRef(
            _fromVec,
            _toVec,
            stickMesh.rotationQuaternion || new BABYLON.Quaternion()
        );

        // Thread goes from joint (stickMesh.position) to pulleyNode
        const jointPos = stickMesh.position;
        const distanceA = BABYLON.Vector3.Distance(jointPos, pulleyNode);
        const lengthB = maxStringLength - distanceA;
        weightMesh.position.set(pulleyNode.x, pulleyNode.y - lengthB, pulleyNode.z);

        if (segmentA) BABYLON.MeshBuilder.CreateLines("segmentA", { points: [jointPos, pulleyNode], instance: segmentA });
        if (segmentB) BABYLON.MeshBuilder.CreateLines("segmentB", { points: [pulleyNode, weightMesh.position], instance: segmentB });

        // 2. Throttled Drawing Update: Only update GPU texture once per frame if dirty
        if (_textureDirty) {
            drawingTexture.update();
            _textureDirty = false;
        }

        // 3. Frame-synced Animator Logic
        if (isAnimating && _samplePositions) {
            if (_scanProgress >= _scanIndices.length) {
                toggleAnimation();
                return;
            }

            // 1 dot every 3 frames ≈ 20 dots/s at 60fps — slow enough to follow comfortably
            if (scene.getFrameId() % 3 !== 0) return;

            if (_scanProgress >= _scanIndices.length) return;

            const vertexIndex = _scanIndices[_scanProgress];
            // Increase density slightly (0.05 instead of 0.033) for better coverage
            const targetPoints = Math.max(500, Math.min(2500, _scanIndices.length * 0.05)); 
            const stride = _scanIndices.length / targetPoints;
            const advance = Math.floor(stride * 0.25) + Math.floor(Math.random() * stride * 1.5);
            _scanProgress += Math.max(1, advance);

            _tempVec.set(
                _samplePositions[vertexIndex],
                _samplePositions[vertexIndex + 1],
                _samplePositions[vertexIndex + 2]
            );

            BABYLON.Vector3.TransformCoordinatesToRef(_tempVec, targetMesh.getWorldMatrix(), stickMesh.position);
            const animHit = drawPointAtStick();
            if (animHit) showCrossThreads(animHit);
            dotsDrawn++;
        }
    });

    // 9. Core Drawing Function (DRY)
    // Ray is cast from the pulleyNode (eye/fixpoint on wall) through the JOINT
    // (stickMesh.position) — the point where thread meets stylus — as per Dürer's design.
    const drawPointAtStick = () => {
        pulleyNode.subtractToRef(stickMesh.position, _tempDirection);
        _tempDirection.negateInPlace(); // direction: pulleyNode → joint
        _sharedRay.origin.copyFrom(pulleyNode);
        _sharedRay.direction.copyFrom(_tempDirection.normalize());

        const hit = _sharedRay.intersectsMesh(gridPlane);

        if (hit.hit) {
            // World-space point where the sighting thread pierces the frame
            const hitPoint = new BABYLON.Vector3(
                pulleyNode.x + _sharedRay.direction.x * hit.distance,
                pulleyNode.y + _sharedRay.direction.y * hit.distance,
                pulleyNode.z + _sharedRay.direction.z * hit.distance
            );
            const uv = hit.getTextureCoordinates();
            if (uv) {
                const x = uv.x * textureSize;
                const y = uv.y * textureSize;

                textureCtx.fillStyle = "#000000";
                textureCtx.beginPath();
                textureCtx.arc(x, y, 4, 0, Math.PI * 2);
                textureCtx.fill();
                _textureDirty = true;
            }
            return hitPoint;
        }
        return null;
    };

    // ── Cross-Thread Overlay ─────────────────────────────────────────────────
    // Two slightly-curved threads spanning the frame, crossing at the point
    // where the main sighting thread pierces the gridPlane — as in Dürer's
    // original apparatus where the assistant knotted two threads at that spot.
    let _crossThreadH = null;
    let _crossThreadV = null;
    const FRAME_HALF = gridSize / 2;

    const hideCrossThreads = () => {
        if (_crossThreadH) _crossThreadH.setEnabled(false);
        if (_crossThreadV) _crossThreadV.setEnabled(false);
    };

    const showCrossThreads = (hitPoint) => {
        const z = hitPoint.z - 0.04; // sits behind the page when closed, but in front of gridPlane

        // Helper to find intersections of a line (passing through px, py with angle) with the frame bounding box
        const getIntersections = (px, py, angle) => {
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);

            const tx1 = (-FRAME_HALF - px) / dx;
            const tx2 = (FRAME_HALF - px) / dx;
            const tMinX = Math.min(tx1, tx2);
            const tMaxX = Math.max(tx1, tx2);

            const ty1 = (-FRAME_HALF - py) / dy;
            const ty2 = (FRAME_HALF - py) / dy;
            const tMinY = Math.min(ty1, ty2);
            const tMaxY = Math.max(ty1, ty2);

            const tMin = Math.max(tMinX, tMinY);
            const tMax = Math.min(tMaxX, tMaxY);

            return [
                new BABYLON.Vector3(px + tMin * dx, py + tMin * dy, z),
                new BABYLON.Vector3(px + tMax * dx, py + tMax * dy, z)
            ];
        };

        // Add slight randomness to angles to look natural (roughly +/- 10 degrees offset)
        const angleH = (Math.random() - 0.5) * 0.35; // slightly off horizontal
        const angleV = Math.PI / 2 + (Math.random() - 0.5) * 0.35; // slightly off vertical

        const hPts = getIntersections(hitPoint.x, hitPoint.y, angleH);
        const vPts = getIntersections(hitPoint.x, hitPoint.y, angleV);

        if (_crossThreadH) _crossThreadH.dispose();
        if (_crossThreadV) _crossThreadV.dispose();

        _crossThreadH = BABYLON.MeshBuilder.CreateLines("crossH", { points: hPts }, scene);
        _crossThreadH.color = new BABYLON.Color3(0.1, 0.3, 0.9);
        _crossThreadH.isPickable = false;

        _crossThreadV = BABYLON.MeshBuilder.CreateLines("crossV", { points: vPts }, scene);
        _crossThreadV.color = new BABYLON.Color3(0.1, 0.3, 0.9);
        _crossThreadV.isPickable = false;
    };

    // Pointillist Drawing and Frame Interaction
    scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
            // Check for frame click to toggle the page
            if (pointerInfo.pickInfo && pointerInfo.pickInfo.hit) {
                const pickedMesh = pointerInfo.pickInfo.pickedMesh;
                if (pickedMesh === gridPlane || pickedMesh === borderBottom || pickedMesh === borderTop || pickedMesh === borderLeft || pickedMesh === borderRight) {
                    if (isAnimating) {
                        toggleAnimation();
                    }
                    togglePage();
                    return; // Prevent drawing if we clicked the frame
                }
            }

            if (!isAnimating) {
                // Re-pick targetMesh fresh on every click so we are never relying on
                // a stale stickMesh.position from the last POINTERMOVE (e.g. after a
                // scene rotation without hovering over the target first).
                const freshPick = scene.pick(scene.pointerX, scene.pointerY, (mesh) => mesh === targetMesh);
                if (freshPick && freshPick.hit && freshPick.pickedMesh === targetMesh) {
                    hideCrossThreads(); // Only clear overlay if we clicked the object itself
                    // Update stickMesh to the freshly-picked point so the stylus and
                    // the back-face guard are always in sync.
                    stickMesh.position.copyFrom(freshPick.pickedPoint);

                    // Capture the outward surface normal for stylus orientation
                    const clickedNormal = freshPick.getNormal(true, true);
                    if (clickedNormal) _surfaceNormal.copyFrom(clickedNormal);

                    // Back-face guard: ray from pulley eye toward the picked point.
                    // Front face → ray hits the mesh at the same distance as the point.
                    // Back face  → ray hits the near side first (shorter distance) → reject.
                    const dirToJoint = freshPick.pickedPoint.subtract(pulleyNode).normalize();
                    const checkRay = new BABYLON.Ray(pulleyNode, dirToJoint, 200);
                    const checkHit = checkRay.intersectsMesh(targetMesh, false);
                    const distToPoint = BABYLON.Vector3.Distance(pulleyNode, freshPick.pickedPoint);
                    const isFrontFace = checkHit.hit && Math.abs(checkHit.distance - distToPoint) < 0.5;
                    if (!isFrontFace) return; // Back-face — no dot drawn

                    if (!isPageOpen) {
                        togglePage();
                    }
                    const manualHit = drawPointAtStick();
                    if (manualHit) showCrossThreads(manualHit);
                }
            }
        }
    });

    // 10. Auto-Animator Logic
    let isAnimating = false;
    let dotsDrawn = 0;
    let animationInterval = null;

    const toggleAnimation = () => {
        const animateBtn = document.getElementById("animateBtn");
        const finishBtn = document.getElementById("fastForwardBtn");

        if (isAnimating) {
            isAnimating = false;
            animateBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
            animateBtn.classList.remove('playing');
            finishBtn.disabled = true;
        } else {
            if (!targetMesh || !_samplePositions) return;

            // Ensure the page is open during drawing animation
            if (!isPageOpen) {
                togglePage();
            }

            isAnimating = true;
            finishBtn.disabled = false;
            if (_scanProgress >= _scanIndices.length) {
                _scanProgress = 0;
            }
            animateBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
            animateBtn.classList.add('playing');
        }
    };

    const finishAnimation = () => {
        if (isAnimating) toggleAnimation();
        document.getElementById("fastForwardBtn").disabled = true; // Pause animation if running

        // Instantly finish the remaining points in the pass
        if (targetMesh && _samplePositions) {
            if (!isPageOpen) togglePage();

            while (_scanProgress < _scanIndices.length) {
                const vertexIndex = _scanIndices[_scanProgress];
                const targetPoints = Math.max(333, Math.min(1667, _scanIndices.length * 0.033));
                const stride = _scanIndices.length / targetPoints;
                const advance = Math.floor(stride * 0.25) + Math.floor(Math.random() * stride * 1.5);
                _scanProgress += Math.max(1, advance);

                _tempVec.set(
                    _samplePositions[vertexIndex],
                    _samplePositions[vertexIndex + 1],
                    _samplePositions[vertexIndex + 2]
                );

                BABYLON.Vector3.TransformCoordinatesToRef(_tempVec, targetMesh.getWorldMatrix(), stickMesh.position);
                drawPointAtStick();
                dotsDrawn++;
            }
        }
    };

    document.getElementById("animateBtn").addEventListener("click", toggleAnimation);
    document.getElementById("fastForwardBtn").addEventListener("click", finishAnimation);

    const rotateLeft  = document.getElementById("rotateLeftBtn");
    const rotateRight = document.getElementById("rotateRightBtn");

    const doRotate = (angle) => {
        if (!targetMesh) return;
        // Stop any running animation first
        if (isAnimating) toggleAnimation();
        // Clear the drawn canvas image
        textureCtx.clearRect(0, 0, textureSize, textureSize);
        clearCanvas();
        dotsDrawn = 0;
        document.getElementById("fastForwardBtn").disabled = true;
        // Rotate the mesh
        targetMesh.unfreezeWorldMatrix();
        targetMesh.rotate(BABYLON.Axis.Y, angle, BABYLON.Space.WORLD);
        regroundTargetMesh();
        finalizeTargetMesh();
    };

    rotateLeft .addEventListener("click", () => doRotate(-Math.PI / 12));
    rotateRight.addEventListener("click", () => doRotate( Math.PI / 12));

    // Disable camera drag while hovering rotate buttons so the scene
    // doesn't accidentally orbit when the user reaches for the buttons.
    [rotateLeft, rotateRight].forEach(btn => {
        btn.addEventListener("mouseenter", () => camera.detachControl());
        btn.addEventListener("mouseleave", () => camera.attachControl(canvas, true));
    });

    document.getElementById("zoomInBtn").addEventListener("click", () => {
        if (camera) {
            const newRadius = camera.radius - 5;
            camera.radius = Math.max(newRadius, camera.lowerRadiusLimit || 5);
        }
    });

    document.getElementById("zoomOutBtn").addEventListener("click", () => {
        if (camera) {
            const newRadius = camera.radius + 5;
            camera.radius = Math.min(newRadius, camera.upperRadiusLimit || 100);
        }
    });

    // 11. UI Controller
    const resetScene = () => {
        // Clear dots with proper alpha wipe
        textureCtx.clearRect(0, 0, textureSize, textureSize);
        clearCanvas();
        dotsDrawn = 0;
        if (isAnimating) toggleAnimation();
        document.getElementById("fastForwardBtn").disabled = true;

        // Reset Camera
        const targetPos = new BABYLON.Vector3(0, -5, 0);

        // Animation
        const animationAlpha = new BABYLON.Animation("cameraAlpha", "alpha", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        const animationBeta = new BABYLON.Animation("cameraBeta", "beta", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        const animationRadius = new BABYLON.Animation("cameraRadius", "radius", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);

        const currentIsMobile = window.innerWidth <= 900;
        const targetRadius = currentIsMobile ? 65 : 45;

        const keysAlpha = [{ frame: 0, value: camera.alpha }, { frame: 30, value: -Math.PI / 6 }];
        const keysBeta = [{ frame: 0, value: camera.beta }, { frame: 30, value: Math.PI / 2.2 }];
        const keysRadius = [{ frame: 0, value: camera.radius }, { frame: 30, value: targetRadius }];

        animationAlpha.setKeys(keysAlpha);
        animationBeta.setKeys(keysBeta);
        animationRadius.setKeys(keysRadius);

        camera.animations = [animationAlpha, animationBeta, animationRadius];
        scene.beginAnimation(camera, 0, 30, false);

        camera.setTarget(targetPos);
    };

    document.getElementById("stopBtn").addEventListener("click", resetScene);

    const normalsBtn = document.getElementById("normalsBtn");
    if (normalsBtn) {
        normalsBtn.addEventListener("click", (e) => {
            showNormals = !showNormals;
            e.target.classList.toggle("active", showNormals);
            document.getElementById("debugControls").style.display = showNormals ? "block" : "none";
            updateNormalLines();
        });
    }

    const lutePartSelect = document.getElementById("lutePartSelect");
    if (lutePartSelect) {
        lutePartSelect.addEventListener("change", () => {
            updateNormalLines();
        });
    }

    const regroundTargetMesh = () => {
        if (!targetMesh) return;
        targetMesh.computeWorldMatrix(true);
        const boundingInfo = targetMesh.getBoundingInfo();
        // Ground on table (table is at Y = -5.25, thickness is 0.5, so top is exactly -5.0)
        const groundOffset = -5.0 - boundingInfo.boundingBox.minimumWorld.y;
        targetMesh.position.y += groundOffset;
    };

    // 12. Dynamic Object Loading
    const setupTargetMesh = (mesh, targetScale = 15) => {
        if (targetMesh) {
            targetMesh.dispose();
        }
        targetMesh = mesh;
        targetMesh.name = "targetMesh";
        targetMesh.material = targetMaterial;

        // Center the geometry so rotation happens around the physical middle
        targetMesh.computeWorldMatrix(true);
        const center = targetMesh.getBoundingInfo().boundingBox.center;
        targetMesh.bakeTransformIntoVertices(BABYLON.Matrix.Translation(-center.x, -center.y, -center.z));

        const boundingInfo = targetMesh.getBoundingInfo();
        const size = boundingInfo.maximum.subtract(boundingInfo.minimum);
        const maxDim = Math.max(size.x, size.y, size.z);

        const scaleFactor = (maxDim > 0.001) ? targetScale / maxDim : 2.5;
        targetMesh.scaling.setAll(scaleFactor);

        regroundTargetMesh();
        targetMesh.position.z = -11;
        targetMesh.position.x = 0;

        updateNormalLines();

        return targetMesh;
    };

    const finalizeTargetMesh = () => {
        targetMesh.computeWorldMatrix(true);
        targetMesh.freezeWorldMatrix();

        _samplePositions = targetMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const _normals = targetMesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);

        _scanIndices = [];
        const matrix = targetMesh.getWorldMatrix();
        const tempV = new BABYLON.Vector3();
        const tempN = new BABYLON.Vector3();

        const vertexCount = _samplePositions.length / 3;
            const sortEntries = [];
            for (let i = 0; i < vertexCount; i++) {
                const localX = _samplePositions[i * 3];
                const localY = _samplePositions[i * 3 + 1];
                const localZ = _samplePositions[i * 3 + 2];
    
                BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(localX, localY, localZ, matrix, tempV);
    
                // Physically realistic culling: ignore vertices on the "back" of the object
                if (_normals) {
                    const nx = _normals[i * 3];
                    const ny = _normals[i * 3 + 1];
                    const nz = _normals[i * 3 + 2];
                    BABYLON.Vector3.TransformNormalFromFloatsToRef(nx, ny, nz, matrix, tempN);
    
                    const toPulley = pulleyNode.subtract(tempV);
                    // Slightly relax culling (-0.1 instead of 0) to capture silhouette edges on the neck/pegbox
                    if (BABYLON.Vector3.Dot(tempN.normalize(), toPulley.normalize()) < -0.1) {
                        continue;
                    }
                }
    
                // Sort along Z (longitudinal axis) to ensure even coverage from pegbox to bowl
                const zBucket = Math.round(tempV.z / 0.2);
                sortEntries.push({ index: i * 3, sortVal: -zBucket * 10000 + tempV.x });
            }

        sortEntries.sort((a, b) => a.sortVal - b.sortVal);
        _scanIndices = sortEntries.map(e => e.index);
        _scanProgress = 0;
    };

    let normalLines = null;
    let showNormals = false;

    const updateNormalLines = () => {
        if (normalLines) {
            normalLines.dispose();
            normalLines = null;
        }

        if (!showNormals || !targetMesh) return;

        const partSelect = document.getElementById("lutePartSelect");
        const selectedPart = partSelect ? partSelect.value : "all";
        
        let meshToVisualize = targetMesh;
        if (selectedPart !== "all" && currentLuteParts[selectedPart]) {
            meshToVisualize = currentLuteParts[selectedPart];
        }

        const positions = meshToVisualize.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const normals = meshToVisualize.getVerticesData(BABYLON.VertexBuffer.NormalKind);
        if (!positions || !normals) return;

        const lines = [];
        const size = 0.5;
        // Subsample slightly for performance if the mesh is dense
        const step = positions.length > 3000 ? 6 : 3; 
        
        // Use the mesh's world matrix to transform normal lines
        meshToVisualize.computeWorldMatrix(true);
        const worldMatrix = meshToVisualize.getWorldMatrix();

        for (let i = 0; i < positions.length; i += step) {
            const startLocal = new BABYLON.Vector3(positions[i], positions[i+1], positions[i+2]);
            const normalLocal = new BABYLON.Vector3(normals[i], normals[i+1], normals[i+2]);
            
            const startWorld = BABYLON.Vector3.TransformCoordinates(startLocal, worldMatrix);
            
            // Transform normal to world space and normalize it to ensure the debug line 
            // is a consistent length even if the part is flattened (like the soundboard).
            const normalWorld = BABYLON.Vector3.TransformNormal(normalLocal, worldMatrix).normalize();
            const endWorld = startWorld.add(normalWorld.scale(size));
            
            lines.push([startWorld, endWorld]);
        }

        normalLines = BABYLON.MeshBuilder.CreateLineSystem("normalLines", { lines: lines }, scene);
        normalLines.color = new BABYLON.Color3(0, 1, 1); // Cyan for high contrast
        normalLines.isPickable = false;
    };

    let currentLuteParts = {};

    const loadObject = (type) => {
        resetScene();
        if (type === "lute") {
            const merged = buildProceduralLute();
            if (merged) {
                setupTargetMesh(merged, 15);
                targetMesh.position.z = -11; // Final adjusted position
                finalizeTargetMesh();
            }
        } else if (type === "teapot") {
            // Clear lute-specific debug state
            currentLuteParts = {};
            BABYLON.SceneLoader.ImportMeshAsync("", "models/", "teapot.glb", scene).then((result) => {
                // Step 1: Force-compute world matrices for the ENTIRE hierarchy
                // (GLB root often carries a -90° X rotation for glTF Y-up → Babylon Z-up)
                result.meshes.forEach(m => m.computeWorldMatrix(true));

                const actualMeshes = result.meshes.filter(m => m instanceof BABYLON.Mesh && m.getTotalVertices() > 0);
                if (actualMeshes.length > 0) {
                    // Step 2: Snapshot the FULL world matrix of each sub-mesh, then
                    // detach it from the GLB hierarchy and bake that world matrix directly
                    // into its vertex buffer.  This is the critical difference from
                    // bakeCurrentTransformIntoVertices(), which only bakes LOCAL transforms
                    // and misses any parent-chain offsets/rotations in the GLB hierarchy.
                    actualMeshes.forEach(m => {
                        const worldMatrix = m.getWorldMatrix().clone(); // full parent-chain transform
                        m.parent = null;                                 // detach from hierarchy
                        m.position = BABYLON.Vector3.Zero();            // reset local transform to identity
                        m.rotation = BABYLON.Vector3.Zero();
                        m.rotationQuaternion = null;
                        m.scaling = BABYLON.Vector3.One();
                        m.computeWorldMatrix(true);                     // recompute as standalone
                        m.bakeTransformIntoVertices(worldMatrix);       // embed world transform in vertices
                    });

                    // Step 3: Merge the now-standalone, world-space meshes.
                    // multiMultiMaterials=false gives a clean single-buffer mesh with no
                    // sub-mesh confusion; all parts share one pivot and rotate as one body.
                    const merged = BABYLON.Mesh.MergeMeshes(actualMeshes, true, true, undefined, false, false);
                    if (merged) {
                        // Step 4: Apply desired initial orientation and bake it in so
                        // the mesh starts with a zero-rotation state.  All subsequent
                        // mesh.rotate() calls then compose clean quaternions with no
                        // Euler/quaternion mixing.
                        merged.rotation.y = -Math.PI / 2;
                        merged.computeWorldMatrix(true);
                        merged.bakeCurrentTransformIntoVertices();
                        setupTargetMesh(merged, 9);
                        finalizeTargetMesh();
                    }
                }
                // Dispose the GLB root node (its children were already disposed by MergeMeshes)
                result.meshes.forEach(m => { if (!m.isDisposed()) m.dispose(); });
            });
        } else if (type === "sphere") {
            // Clear lute-specific debug state
            currentLuteParts = {};
            const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 5, segments: 32 }, scene);
            setupTargetMesh(sphere, 5);
            finalizeTargetMesh();
        }
    };

    // UI Toggles
    const toggleButtons = document.querySelectorAll(".btn-toggle");
    toggleButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            toggleButtons.forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            loadObject(e.target.dataset.target);
        });
    });

    // Initial load
    loadObject("lute");

    return scene;
};

const scene = createScene();
engine.runRenderLoop(() => { scene.render(); });

    const adjustCameraView = () => {
        // Adjust zoom based on canvas width vs height ratio so it fits the layout container
        const canvasRect = engine.getRenderingCanvasClientRect();
        if (!canvasRect || canvasRect.width === 0) return;

        // Base logic: narrower aspect ratio means we need to pull the camera further back to see the width.
        const aspect = canvasRect.width / canvasRect.height;
        // Increase zoom by ~1.5x (smaller radius = zoomed in closer)
        let newRadius = 30; // Default for widescreen desktop (was 45)

        if (aspect < 1.0) {
            newRadius = 43 + (1.0 - aspect) * 15; // Mobile / Portrait (was 65)
        } else if (aspect < 1.5) {
            newRadius = 36; // Tablet / Square-ish (was 55)
        }

        camera.radius = newRadius;
    };

    window.addEventListener("resize", () => {
        engine.resize();
        adjustCameraView();
    });

    // Initial check
    adjustCameraView();
