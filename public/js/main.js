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
    let _scanIndices = [];
    let _scanProgress = 0;
    let _surfaceNormal = new BABYLON.Vector3(0, 1, 0); // Outward surface normal at current pick point

    // 1. ArcRotateCamera setup - Positioned to the side like the Woodcut's perspective
    const isMobile = window.innerWidth <= 900;
    const defaultRadius = isMobile ? 65 : 45;
    const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 6, Math.PI / 2.2, defaultRadius, new BABYLON.Vector3(0, -5, 0), scene);
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
    // The tip (narrow end) is at Y = -1.75 (pointing down toward the object)
    // and the handle (wide end) is at Y = +1.75 (pointing up, held by operator).
    // We shift geometry so the joint is exactly at Y = 0 (origin stays at joint).
    // Default cylinder: center at origin, so no extra baking needed — origin = joint mid-point.
    // We translate so the joint is at the narrow-tip end (Y = -1.75 → origin):
    stickMesh.bakeTransformIntoVertices(BABYLON.Matrix.Translation(0, 1.75, 0));
    // Now tip is at Y = 0 (origin/joint), handle at Y = 3.5 (upward).

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
        // The stylus tip stays at origin (joint); +Y (handle) points out along the normal.
        const _fromVec = new BABYLON.Vector3(0, 1, 0);
        stickMesh.rotationQuaternion = BABYLON.Quaternion.FromUnitVectorsToRef(
            _fromVec,
            _surfaceNormal,
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
            const targetPoints = Math.max(333, Math.min(1667, _scanIndices.length * 0.033)); // 1/3 density; run again to layer more
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

        if (isAnimating) {
            isAnimating = false;
            animateBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Play';
        } else {
            if (!targetMesh || !_samplePositions) return;

            // Ensure the page is open during drawing animation
            if (!isPageOpen) {
                togglePage();
            }

            isAnimating = true;
            if (_scanProgress >= _scanIndices.length) {
                _scanProgress = 0;
            }
            animateBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Pause';
        }
    };

    const finishAnimation = () => {
        if (isAnimating) toggleAnimation(); // Pause animation if running
        
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

    // 11. UI Controller
    const resetScene = () => {
        // Clear dots with proper alpha wipe
        textureCtx.clearRect(0, 0, textureSize, textureSize);
        clearCanvas();
        dotsDrawn = 0;
        if (isAnimating) toggleAnimation();

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

    // 12. Dynamic Object Loading
    const setupTargetMesh = (mesh, targetScale = 15) => {
        if (targetMesh) {
            targetMesh.dispose();
        }
        targetMesh = mesh;
        targetMesh.name = "targetMesh";
        targetMesh.material = targetMaterial;

        const boundingInfo = targetMesh.getBoundingInfo();
        const size = boundingInfo.maximum.subtract(boundingInfo.minimum);
        const maxDim = Math.max(size.x, size.y, size.z);

        const scaleFactor = (maxDim > 0.001) ? targetScale / maxDim : 2.5;
        targetMesh.scaling.setAll(scaleFactor);

        targetMesh.computeWorldMatrix(true);
        const localInfo = targetMesh.getBoundingInfo();
        localInfo.update(targetMesh.getWorldMatrix());

        // Ground on table (table is at Y = -5.25, thickness is 0.5, so top is exactly -5.0)
        const groundOffset = -5.0 - localInfo.boundingBox.minimumWorld.y;
        targetMesh.position.y += groundOffset;
        targetMesh.position.z = -10;
        targetMesh.position.x = 0;

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
            // The physical string from the wall cannot pass through the solid object
            if (_normals) {
                const nx = _normals[i * 3];
                const ny = _normals[i * 3 + 1];
                const nz = _normals[i * 3 + 2];
                BABYLON.Vector3.TransformNormalFromFloatsToRef(nx, ny, nz, matrix, tempN);

                const toPulley = pulleyNode.subtract(tempV);
                // If the normal points away from the pulley, the point is physically occluded
                if (BABYLON.Vector3.Dot(tempN, toPulley) < 0) {
                    continue;
                }
            }

            const yBucket = Math.round(tempV.y / 0.2);
            sortEntries.push({ index: i * 3, sortVal: -yBucket * 10000 + tempV.x });
        }

        sortEntries.sort((a, b) => a.sortVal - b.sortVal);
        _scanIndices = sortEntries.map(e => e.index);
        _scanProgress = 0;
    };

    const buildProceduralLute = () => {
        // ── Mathematical profile: teardrop outline (round bottom → tapered top) ──
        const R      = 2.5;    // bulbous bottom radius
        const L      = 6.0;    // body length
        const neckR  = 0.45;   // half-width at neck join
        const STEPS  = 60;

        const profile = [];
        for (let i = 0; i <= STEPS; i++) {
            const y = (i / STEPS) * L;
            let x;
            if (y <= R) {
                x = Math.sqrt(R * R - Math.pow(R - y, 2));
            } else {
                const t = (y - R) / (L - R);
                x = R - (R - neckR) * t;
            }
            profile.push(new BABYLON.Vector3(x, y, 0));
        }

        const parts = [];

        // 1. Ribbed bowl — half-lathe gives the classic staved back
        const bowl = BABYLON.MeshBuilder.CreateLathe("lbowl", {
            shape: profile, arc: 0.5, tessellation: 22,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, scene);
        bowl.convertToFlatShadedMesh();
        parts.push(bowl);

        // 2. Soundboard — full lathe flattened to near-zero depth
        const topPlate = BABYLON.MeshBuilder.CreateLathe("ltop", {
            shape: profile, arc: 1.0, tessellation: 40,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, scene);
        topPlate.scaling.z = 0.001;
        parts.push(topPlate);

        // 3. Soundhole disc (dark plug)
        const holeY   = R + (L - R) * 0.4;
        const holeR   = 0.65;
        const hole = BABYLON.MeshBuilder.CreateCylinder("lhole", {
            height: 0.05, diameter: holeR * 2, tessellation: 32
        }, scene);
        hole.rotation.x = Math.PI / 2;
        hole.position.set(0, holeY, -0.01);
        parts.push(hole);

        // 4. Rosette rings
        [0.75, 0.85, 0.95].forEach((r, idx) => {
            const ring = BABYLON.MeshBuilder.CreateTorus("lring" + idx, {
                diameter: r * 2, thickness: 0.04, tessellation: 32
            }, scene);
            ring.rotation.x = Math.PI / 2;
            ring.position.set(0, holeY, -0.015);
            parts.push(ring);
        });

        // 5. Bridge
        const bridgeY = R * 0.4;
        const bridge = BABYLON.MeshBuilder.CreateBox("lbridge", {
            width: 2.4, height: 0.15, depth: 0.1
        }, scene);
        bridge.position.set(0, bridgeY, -0.05);
        parts.push(bridge);

        // 6. Neck
        const neckHeight = 3.6;
        const neck = BABYLON.MeshBuilder.CreateCylinder("lneck", {
            height: neckHeight,
            diameterBottom: neckR * 2,
            diameterTop: neckR * 2 - 0.15,
            tessellation: 20
        }, scene);
        neck.scaling.z = 0.5;
        neck.position.set(0, L + neckHeight / 2, 0.1);
        parts.push(neck);

        // 7. Fingerboard (flat dark plate over neck)
        const fbStartY = holeY + holeR + 0.15;
        const fbEndY   = L + neckHeight;
        const fbHeight = fbEndY - fbStartY;
        const fb = BABYLON.MeshBuilder.CreateCylinder("lfb", {
            height: fbHeight,
            diameterBottom: neckR * 2 + 0.25,
            diameterTop: neckR * 2 - 0.05,
            tessellation: 20
        }, scene);
        fb.scaling.z = 0.04;
        fb.position.set(0, fbStartY + fbHeight / 2, -0.02);
        parts.push(fb);

        // 8. Pegbox (angled box)
        const pegboxHeight = 2.4;
        const pegboxWidth  = neckR * 2 - 0.15;
        const pegbox = BABYLON.MeshBuilder.CreateBox("lpegbox", {
            width: pegboxWidth, height: pegboxHeight, depth: 0.25
        }, scene);
        pegbox.setPivotMatrix(BABYLON.Matrix.Translation(0, -pegboxHeight / 2, 0), false);
        pegbox.position.set(0, fbEndY, 0.1);
        pegbox.rotation.x = -115 * (Math.PI / 180);
        pegbox.computeWorldMatrix(true);
        parts.push(pegbox);

        // 9. Tuning pegs (8 total: 4 pairs)
        // Keep pegs parented to pegbox — MergeMeshes uses each mesh's world matrix,
        // so parented pegs are correctly placed on the angled headstock in the merged result.
        for (let i = 0; i < 4; i++) {
            const h = -pegboxHeight / 2 + 0.4 + i * 0.5;
            [-1, 1].forEach((side, si) => {
                const peg = BABYLON.MeshBuilder.CreateCylinder("lpeg" + i + "_" + si, {
                    height: 1.2, diameter: 0.08, tessellation: 8
                }, scene);
                peg.rotation.z = Math.PI / 2;
                peg.position.set(side * pegboxWidth / 2, h + (si === 1 ? 0.25 : 0), 0);
                peg.parent = pegbox;          // stay parented — world matrix is correct
                peg.computeWorldMatrix(true); // force propagation through parent chain
                parts.push(peg);
            });
        }

        // 10. Frets (gut strings tied around neck — logarithmic spacing)
        const numFrets = 9;
        for (let i = 0; i < numFrets; i++) {
            const fretDist = Math.pow((i + 1) / (numFrets + 1), 0.8) * fbHeight * 0.85;
            const fretY    = fbEndY - fretDist;
            const t        = (fretY - fbStartY) / fbHeight;
            const w        = (neckR * 2 + 0.25) * (1 - t) + (neckR * 2 - 0.05) * t;
            const fret = BABYLON.MeshBuilder.CreateCylinder("lfret" + i, {
                height: w * 0.98, diameter: 0.018, tessellation: 8
            }, scene);
            fret.rotation.z = Math.PI / 2;
            fret.position.set(0, fretY, -0.035);
            parts.push(fret);
        }

        // 11. Strings (8 tubes from bridge to pegbox)
        const numStrings = 8;
        for (let i = 0; i < numStrings; i++) {
            const xBot = -1.0 + (i * 2.0 / (numStrings - 1));
            const xTop = -(pegboxWidth - 0.2) / 2 + (i * (pegboxWidth - 0.2) / (numStrings - 1));
            const stringPath = [
                new BABYLON.Vector3(xBot, bridgeY, -0.1),
                new BABYLON.Vector3(xTop, fbEndY,  -0.05)
            ];
            const str = BABYLON.MeshBuilder.CreateTube("lstr" + i, {
                path: stringPath, radius: 0.008, tessellation: 4
            }, scene);
            parts.push(str);
        }

        // Force all world matrices before merge
        parts.forEach(p => p.computeWorldMatrix(true));

        // Merge everything into a single mesh for the raycasting pipeline
        const merged = BABYLON.Mesh.MergeMeshes(parts, true, true, undefined, false, false);
        if (!merged) return null;

        // The lathe builds the body along +Y (round body bottom → neck top), already upright.
        // A slight Y-rotation shows the ribbed bowl to the camera.
        merged.rotation.y = Math.PI / 5;  // turn to reveal the ribbed back

        // Flip normals outward (lathe/MergeMeshes can invert them)
        const normals = merged.getVerticesData(BABYLON.VertexBuffer.NormalKind);
        if (normals) {
            for (let i = 0; i < normals.length; i++) normals[i] = -normals[i];
            merged.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
        }

        return merged;
    };

    const loadObject = (type) => {
        resetScene();
        if (type === "lute") {
            const merged = buildProceduralLute();
            if (merged) {
                setupTargetMesh(merged, 15);
                finalizeTargetMesh();
            }
        } else if (type === "teapot") {
            BABYLON.SceneLoader.ImportMeshAsync("", "models/", "teapot.glb", scene).then((result) => {
                const root = result.meshes[0];
                const actualMeshes = result.meshes.filter(m => m instanceof BABYLON.Mesh && m.getTotalVertices() > 0);
                if (actualMeshes.length > 0) {
                    actualMeshes.forEach(m => m.computeWorldMatrix(true));
                    const merged = BABYLON.Mesh.MergeMeshes(actualMeshes, true, true, undefined, false, true);
                    if (merged) {
                        merged.rotation.y = -Math.PI / 2;
                        setupTargetMesh(merged, 9); // 25% reduction from 12
                        finalizeTargetMesh();
                    }
                }
                if (root && root !== targetMesh) root.dispose();
            });
        } else if (type === "sphere") {
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
window.addEventListener("resize", () => { engine.resize(); });
