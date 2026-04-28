(function() {
    const canvas = document.getElementById("walkthroughCanvas");
    if (!canvas) return;

    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, alpha: true });
    engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0); 

    const isMobile = window.innerWidth <= 900;
    // Using same zoom as canvas 3
    const defaultRadius = isMobile ? 36 : 28;
    const camera = new BABYLON.ArcRotateCamera("walkthroughCamera", -Math.PI / 5, Math.PI / 2.5, defaultRadius, new BABYLON.Vector3(0, -1, -3.5), scene); camera.inputs.removeByType("ArcRotateCameraMouseWheelInput");
    camera.attachControl(canvas, false);

    const { 
        pageHinge, stickMesh, pulleyNode, weightMesh, segmentA, segmentB, maxStringLength,
        gridSize, gridPlane, pageMesh
    } = buildApparatus(scene);

    const targetMaterial = new BABYLON.StandardMaterial("targetMaterial", scene);
    targetMaterial.diffuseColor  = new BABYLON.Color3(0.6, 0.4, 0.2);
    targetMaterial.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);

    const lute = buildProceduralLute(scene);
    lute.material = targetMaterial;
    lute.isVisible = false; 

    lute.computeWorldMatrix(true);
    const center = lute.getBoundingInfo().boundingBox.center;
    lute.bakeTransformIntoVertices(BABYLON.Matrix.Translation(-center.x, -center.y, -center.z));
    
    const boundingInfo = lute.getBoundingInfo();
    const size = boundingInfo.maximum.subtract(boundingInfo.minimum);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = (maxDim > 0.001) ? 15 / maxDim : 2.5;
    lute.scaling.setAll(scaleFactor);

    lute.computeWorldMatrix(true);
    const groundOffset = -5.0 - lute.getBoundingInfo().boundingBox.minimumWorld.y;
    lute.position.y += groundOffset;
    lute.position.z = -11;
    lute.position.x = 0;
    lute.freezeWorldMatrix();

    const pStart = new BABYLON.Vector3(8, -5, 4); 
    const nStart = new BABYLON.Vector3(0, 1, 0);

    // Dynamic Surface Latching: find exact point on lute bowl
    const surfaceRay = new BABYLON.Ray(new BABYLON.Vector3(0, 10, -12.5), new BABYLON.Vector3(0, -1, 0), 20);
    const surfaceHit = scene.pickWithRay(surfaceRay, (m) => m === lute);
    const pEnd = surfaceHit.hit ? surfaceHit.pickedPoint.add(new BABYLON.Vector3(0, 0.05, 0)) : new BABYLON.Vector3(0, -1.8, -12.2);
    const nEnd = surfaceHit.hit ? surfaceHit.getNormal(true) : new BABYLON.Vector3(0, 1, 0);

    const FRAME_HALF = gridSize / 2;
    let _crossThreadH = null;
    let _crossThreadV = null;
    const angleH = 0.0; 
    const angleV = Math.PI / 2 - 0.15;

    const threadMat = new BABYLON.StandardMaterial("threadMat", scene);
    threadMat.diffuseColor = new BABYLON.Color3(0.1, 0.3, 0.7);
    threadMat.emissiveColor = new BABYLON.Color3(0.05, 0.1, 0.3);

    // Create Pencil Mesh for Step 3
    const pencilBody = BABYLON.MeshBuilder.CreateCylinder("pencilBody", { height: 4, diameter: 0.15 }, scene);
    const pencilTip = BABYLON.MeshBuilder.CreateCylinder("pencilTip", { height: 0.5, diameterTop: 0, diameterBottom: 0.15 }, scene);
    pencilTip.position.y = 2.25;
    const pencil = BABYLON.Mesh.MergeMeshes([pencilBody, pencilTip], true, true);
    pencil.isVisible = false;
    const pencilMat = new BABYLON.StandardMaterial("pencilMat", scene);
    pencilMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    pencil.material = pencilMat;
    pencil.bakeTransformIntoVertices(BABYLON.Matrix.Translation(0, -2.25, 0));

    // Create persistent mark dot
    const markedDot = BABYLON.MeshBuilder.CreateDisc("markedDot", { radius: 0.15 }, scene);
    markedDot.isVisible = false;
    markedDot.parent = pageMesh; // Attach to the paper tablet so it moves when the door opens
    markedDot.rotation.y = Math.PI; // Flip to face the draughtsman (ink is only on one side)
    const dotMat = new BABYLON.StandardMaterial("dotMat", scene);
    dotMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
    dotMat.emissiveColor = new BABYLON.Color3(0, 0, 0);
    markedDot.material = dotMat;

    const getIntersections = (px, py, angle, z) => {
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

    const updateCrossThreads = (hGrowth, vGrowth) => {
        const z = hitPoint.z - 0.05;
        
        // --- Vertical Thread (V) ---
        // Find top and bottom intersections for the vertical line at hitPoint.x
        const vBasePts = getIntersections(hitPoint.x, hitPoint.y, angleV, z);
        // Sort by Y descending so p0 is top, p1 is bottom
        const vTop = vBasePts[0].y > vBasePts[1].y ? vBasePts[0] : vBasePts[1];
        const vBot = vBasePts[0].y > vBasePts[1].y ? vBasePts[1] : vBasePts[0];
        
        const vCurrent = BABYLON.Vector3.Lerp(vTop, vBot, vGrowth);
        const vPts = [vTop, vCurrent];
        // Ensure minimum length for Tube mesh
        if (vGrowth < 0.001) vPts[1] = vTop.add(new BABYLON.Vector3(0, -0.01, 0));

        // --- Horizontal Thread (H) ---
        // Find left and right intersections for the horizontal line at hitPoint.y
        const hBasePts = getIntersections(hitPoint.x, hitPoint.y, angleH, z);
        // Sort by X ascending so p0 is left, p1 is right
        const hLeft = hBasePts[0].x < hBasePts[1].x ? hBasePts[0] : hBasePts[1];
        const hRight = hBasePts[0].x < hBasePts[1].x ? hBasePts[1] : hBasePts[0];
        
        const hCurrent = BABYLON.Vector3.Lerp(hLeft, hRight, hGrowth);
        const hPts = [hLeft, hCurrent];
        // Ensure minimum length for Tube mesh
        if (hGrowth < 0.001) hPts[1] = hLeft.add(new BABYLON.Vector3(0.01, 0, 0));

        if (!_crossThreadV) {
            _crossThreadV = BABYLON.MeshBuilder.CreateTube("crossV", { path: vPts, radius: 0.015, cap: BABYLON.Mesh.CAP_ALL, updatable: true }, scene);
            _crossThreadV.material = threadMat;
            _crossThreadH = BABYLON.MeshBuilder.CreateTube("crossH", { path: hPts, radius: 0.015, cap: BABYLON.Mesh.CAP_ALL, updatable: true }, scene);
            _crossThreadH.material = threadMat;
        } else {
            _crossThreadV = BABYLON.MeshBuilder.CreateTube("crossV", { path: vPts, instance: _crossThreadV });
            _crossThreadH = BABYLON.MeshBuilder.CreateTube("crossH", { path: hPts, instance: _crossThreadH });
        }
        
        _crossThreadV.setEnabled(vGrowth > 0.0001);
        _crossThreadH.setEnabled(hGrowth > 0.0001);
    };

    const dir = pEnd.subtract(pulleyNode).normalize();
    const ray = new BABYLON.Ray(pulleyNode, dir);
    const hit = ray.intersectsMesh(gridPlane);
    const hitPoint = hit.hit ? pulleyNode.add(dir.scale(hit.distance)) : new BABYLON.Vector3(0,0,0);
    // paperHitPoint: The actual surface of the paper tablet (Z=-0.05 when door is closed)
    const paperHitPoint = hitPoint.add(new BABYLON.Vector3(0, 0, -0.05));

    let currentStep = 1;
    let startTime = performance.now();

    scene.onBeforeRenderObservable.add(() => {
        const now = performance.now();
        const elapsed = (now - startTime) / 1000;
        
        if (currentStep === 1) {
            const cycle = elapsed % 6.5;
            let currentPos = new BABYLON.Vector3();
            let currentNormal = new BABYLON.Vector3();

            if (pencil) pencil.isVisible = false;
            if (cycle < 1.5) {
                // Phase 1: Door Opens
                pageHinge.rotation.y = BABYLON.Scalar.Lerp(0, 2 * Math.PI / 3, cycle / 1.5);
                lute.isVisible = false;
                lute.visibility = 0;
                currentPos.copyFrom(pStart);
                currentNormal.copyFrom(nStart);
            } else if (cycle < 2.0) {
                // Phase 2: Short Wait (0.5s)
                pageHinge.rotation.y = 2 * Math.PI / 3;
                lute.isVisible = false;
                lute.visibility = 0;
                currentPos.copyFrom(pStart);
                currentNormal.copyFrom(nStart);
            } else if (cycle < 3.5) {
                // Phase 3: Lute Fades In (1.5s)
                pageHinge.rotation.y = 2 * Math.PI / 3;
                lute.isVisible = true;
                const t = (cycle - 2.0) / 1.5;
                lute.visibility = t; 
                currentPos.copyFrom(pStart);
                currentNormal.copyFrom(nStart);
            } else if (cycle < 5.0) {
                // Phase 4: Pointer Moves
                pageHinge.rotation.y = 2 * Math.PI / 3;
                lute.isVisible = true;
                lute.visibility = 1.0;
                const t = (cycle - 3.5) / 1.5;
                const easedT = t * t * (3 - 2 * t);
                BABYLON.Vector3.LerpToRef(pStart, pEnd, easedT, currentPos);
                BABYLON.Vector3.LerpToRef(nStart, nEnd, easedT, currentNormal);
            } else {
                // Phase 5: Hold
                pageHinge.rotation.y = 2 * Math.PI / 3;
                lute.isVisible = true;
                lute.visibility = 1.0;
                currentPos.copyFrom(pEnd);
                currentNormal.copyFrom(nEnd);
            }
            
            stickMesh.position.copyFrom(currentPos);
            const _fromVec = new BABYLON.Vector3(0, 1, 0);
            stickMesh.rotationQuaternion = BABYLON.Quaternion.FromUnitVectorsToRef(
                _fromVec, currentNormal.normalize(), stickMesh.rotationQuaternion || new BABYLON.Quaternion());
            
            camera.alpha = -Math.PI / 5;
            camera.beta = Math.PI / 2.5;
            camera.radius = isMobile ? 54 : 45;
            camera.setTarget(new BABYLON.Vector3(0, -1, -3.5));
            if (_crossThreadH) _crossThreadH.setEnabled(false);
            if (_crossThreadV) _crossThreadV.setEnabled(false);

        } else if (currentStep === 2) {
            const cycle = elapsed % 11.0;
            const startAlpha = -Math.PI / 5;
            const startBeta = Math.PI / 2.5;
            const startRadius = isMobile ? 54 : 45;
            const startTarget = new BABYLON.Vector3(0, -1, -3.5);

            // Perspective matching the user screenshot: 3/4 view from draughtsman side
            const endAlpha = Math.PI / 3.5; 
            const endBeta = Math.PI / 3.2;
            const endRadius = isMobile ? 54 : 45;
            const endTarget = new BABYLON.Vector3(0, -1, -3.5);

            if (pencil) pencil.isVisible = false;
            pageHinge.rotation.y = 2 * Math.PI / 3;
            lute.isVisible = true;
            lute.visibility = 1.0;
            stickMesh.position.copyFrom(pEnd);
            const _fromVec = new BABYLON.Vector3(0, 1, 0);
            stickMesh.rotationQuaternion = BABYLON.Quaternion.FromUnitVectorsToRef(
                _fromVec, nEnd.normalize(), stickMesh.rotationQuaternion || new BABYLON.Quaternion());

            camera.alpha = startAlpha;
            camera.beta = startBeta;
            camera.radius = startRadius;
            camera.setTarget(startTarget);

            if (cycle < 3.0) {
                // Phase 1: Vertical thread grows top to bottom
                const t = cycle / 3.0;
                const easedT = t * t * (3 - 2 * t);
                updateCrossThreads(0, easedT); // hGrowth=0, vGrowth=easedT
            } else if (cycle < 6.0) {
                // Phase 2: Horizontal thread grows left to right
                const t = (cycle - 3.0) / 3.0;
                const easedT = t * t * (3 - 2 * t);
                updateCrossThreads(easedT, 1.0); // hGrowth=easedT, vGrowth=1.0
            } else if (cycle < 9.5) {
                // Phase 3: Transition camera
                updateCrossThreads(1.0, 1.0);
                const t = (cycle - 6.0) / 3.5;
                const easedT = t * t * (3 - 2 * t);

                camera.alpha = BABYLON.Scalar.Lerp(startAlpha, endAlpha, easedT);
                camera.beta = BABYLON.Scalar.Lerp(startBeta, endBeta, easedT);
                camera.radius = BABYLON.Scalar.Lerp(startRadius, endRadius, easedT);
                camera.setTarget(BABYLON.Vector3.Lerp(startTarget, endTarget, easedT));
            } else {
                updateCrossThreads(1.0, 1.0);
                camera.alpha = endAlpha;
                camera.beta = endBeta;
                camera.radius = endRadius;
                camera.setTarget(endTarget);
            }
        } else if (currentStep === 3) {
            const cycle = elapsed % 14.0;
            // Camera position from end of step 2
            camera.alpha = Math.PI / 3.5;
            camera.beta = Math.PI / 3.2;
            camera.radius = isMobile ? 54 : 45;
            camera.setTarget(new BABYLON.Vector3(0, -1, -3.5));

            lute.isVisible = true;
            lute.visibility = 1.0;
            
            let currentPos = new BABYLON.Vector3();
            let currentNormal = new BABYLON.Vector3();
            const pencilStart = hitPoint.add(new BABYLON.Vector3(-7.5, 0, 6)); 

            if (cycle < 2.5) {
                // Phase 1: Relax thread (Pointer pEnd -> pStart)
                pageHinge.rotation.y = 2 * Math.PI / 3;
                const t = cycle / 2.5;
                const easedT = t * t * (3 - 2 * t);
                BABYLON.Vector3.LerpToRef(pEnd, pStart, easedT, currentPos);
                BABYLON.Vector3.LerpToRef(nEnd, nStart, easedT, currentNormal);
                pencil.isVisible = false;
                updateCrossThreads(1.0, 1.0);
                markedDot.isVisible = false;
            } else if (cycle < 5.0) {
                // Phase 2: Close door (2*PI/3 -> 0)
                const t = (cycle - 2.5) / 2.5;
                const easedT = t * t * (3 - 2 * t);
                pageHinge.rotation.y = BABYLON.Scalar.Lerp(2 * Math.PI / 3, 0, easedT);
                currentPos.copyFrom(pStart);
                currentNormal.copyFrom(nStart);
                pencil.isVisible = false;
                updateCrossThreads(1.0, 1.0);
                markedDot.isVisible = false;
            } else if (cycle < 7.5) {
                // Phase 3: Pencil slides in (parallel)
                pageHinge.rotation.y = 0;
                currentPos.copyFrom(pStart);
                currentNormal.copyFrom(nStart);
                pencil.isVisible = true;
                const t = (cycle - 5.0) / 2.5;
                const easedT = t * t * (3 - 2 * t);
                BABYLON.Vector3.LerpToRef(pencilStart, paperHitPoint, easedT, pencil.position);
                pencil.rotationQuaternion = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(0, 0, 1), -Math.PI / 2); 
                updateCrossThreads(1.0, 1.0);
                markedDot.isVisible = false;
            } else if (cycle < 9.0) {
                // Phase 4: Pencil tilts to 45 deg (Marking)
                pageHinge.rotation.y = 0;
                currentPos.copyFrom(pStart);
                currentNormal.copyFrom(nStart);
                pencil.isVisible = true;
                pencil.position.copyFrom(paperHitPoint);
                const t = (cycle - 7.5) / 1.5;
                const easedT = t * t * (3 - 2 * t);
                const startRot = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(0, 0, 1), -Math.PI / 2);
                const endRot = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(0, 0, 1), -Math.PI / 4);
                BABYLON.Quaternion.SlerpToRef(startRot, endRot, easedT, pencil.rotationQuaternion);
                updateCrossThreads(1.0, 1.0);
                markedDot.isVisible = false;
            } else if (cycle < 11.5) {
                // Phase 5: Pencil tilts back and slides out
                pageHinge.rotation.y = 0;
                currentPos.copyFrom(pStart);
                currentNormal.copyFrom(nStart);
                pencil.isVisible = true;
                const t = (cycle - 9.0) / 2.5;
                const easedT = t * t * (3 - 2 * t);
                BABYLON.Vector3.LerpToRef(paperHitPoint, pencilStart, easedT, pencil.position);
                const markRot = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(0, 0, 1), -Math.PI / 4);
                const backRot = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(0, 0, 1), -Math.PI / 2);
                BABYLON.Quaternion.SlerpToRef(markRot, backRot, easedT, pencil.rotationQuaternion);
                updateCrossThreads(1.0, 1.0);
                
                // Show dot on tablet surface (local coordinates)
                markedDot.isVisible = true;
                markedDot.position.set(hitPoint.x, hitPoint.y, 0.015);
            } else {
                // Phase 6: Threads disappear, Hold
                pageHinge.rotation.y = 0;
                currentPos.copyFrom(pStart);
                currentNormal.copyFrom(nStart);
                pencil.isVisible = true;
                pencil.position.copyFrom(pencilStart);
                pencil.rotationQuaternion = BABYLON.Quaternion.RotationAxis(new BABYLON.Vector3(0, 0, 1), -Math.PI / 2);
                updateCrossThreads(0, 0); // Hide threads
                markedDot.isVisible = true;
                markedDot.position.set(hitPoint.x, hitPoint.y, 0.015);
            }

            stickMesh.position.copyFrom(currentPos);
            const _fromVec = new BABYLON.Vector3(0, 1, 0);
            stickMesh.rotationQuaternion = BABYLON.Quaternion.FromUnitVectorsToRef(
                _fromVec, currentNormal.normalize(), stickMesh.rotationQuaternion || new BABYLON.Quaternion());
        } else if (currentStep === 4) {
            const duration = 4.0;
            const cycle = elapsed % (duration + 2.0);

            const startAlpha = Math.PI / 3.5; 
            const startBeta = Math.PI / 3.2;
            const startRadius = isMobile ? 54 : 45;
            const startTarget = new BABYLON.Vector3(0, -1, -3.5);

            const endAlpha = -Math.PI / 5;
            const endBeta = Math.PI / 2.5;
            const endRadius = isMobile ? 54 : 45;
            const endTarget = new BABYLON.Vector3(0, -1, -3.5);

            // Maintain state from end of Step 3
            lute.isVisible = true;
            lute.visibility = 1.0;
            stickMesh.position.copyFrom(pStart);
            pencil.isVisible = false;
            updateCrossThreads(0, 0);
            markedDot.isVisible = true;
            markedDot.position.set(hitPoint.x, hitPoint.y, 0.015);

            if (cycle < duration) {
                const t = cycle / duration;
                const easedT = t * t * (3 - 2 * t);
                
                // Open door simultaneously
                pageHinge.rotation.y = BABYLON.Scalar.Lerp(0, 2 * Math.PI / 3, easedT);
                
                camera.alpha = BABYLON.Scalar.Lerp(startAlpha, endAlpha, easedT);
                camera.beta = BABYLON.Scalar.Lerp(startBeta, endBeta, easedT);
                camera.radius = BABYLON.Scalar.Lerp(startRadius, endRadius, easedT);
                camera.setTarget(BABYLON.Vector3.Lerp(startTarget, endTarget, easedT));
            } else {
                pageHinge.rotation.y = 2 * Math.PI / 3;
                camera.alpha = endAlpha;
                camera.beta = endBeta;
                camera.radius = endRadius;
                camera.setTarget(endTarget);
            }
        }

        const jointPos = stickMesh.position;
        const distanceA = BABYLON.Vector3.Distance(jointPos, pulleyNode);
        const lengthB = Math.max(0, maxStringLength - distanceA);
        weightMesh.position.set(pulleyNode.x, pulleyNode.y - lengthB, pulleyNode.z);
        if (segmentA) BABYLON.MeshBuilder.CreateLines("segmentA", { points: [jointPos, pulleyNode], instance: segmentA });
        if (segmentB) BABYLON.MeshBuilder.CreateLines("segmentB", { points: [pulleyNode, weightMesh.position], instance: segmentB });
    });

    engine.runRenderLoop(() => { scene.render(); });
    window.addEventListener("resize", () => { engine.resize(); });

    const prevBtn = document.getElementById("prevDraughtsmanBtn");
    const nextBtn = document.getElementById("nextDraughtsmanBtn");
    const steps = document.querySelectorAll("#draughtsman-steps .step");

    let showStep = (stepNum) => {
        currentStep = stepNum;
        startTime = performance.now();
        steps.forEach((s, i) => {
            if (i + 1 === stepNum) s.classList.add("active");
            else s.classList.remove("active");
        });
        if (prevBtn) prevBtn.disabled = (stepNum === 1);
        if (nextBtn) nextBtn.disabled = (stepNum === 4);
    };

    const canvasPrev = document.getElementById('walkthroughPrev');
    const canvasNext = document.getElementById('walkthroughNext');

    const originalShowStep = showStep;
    const updatedShowStep = (stepNum) => {
        originalShowStep(stepNum);
        if (canvasPrev) canvasPrev.disabled = (stepNum === 1);
        if (canvasNext) canvasNext.disabled = (stepNum === 4);
    };

    if (prevBtn) prevBtn.addEventListener("click", () => updatedShowStep(currentStep - 1));
    if (nextBtn) nextBtn.addEventListener("click", () => updatedShowStep(currentStep + 1));
    if (canvasPrev) canvasPrev.addEventListener("click", () => updatedShowStep(currentStep - 1));
    if (canvasNext) canvasNext.addEventListener("click", () => updatedShowStep(currentStep + 1));

    // Initialize UI on first load
    updatedShowStep(1);

})();
