(function() {
    const canvas = document.getElementById("walkthroughCanvas");
    if (!canvas) return;

    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, alpha: true });
    engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0); 

    const camera = new BABYLON.ArcRotateCamera("walkthroughCamera", -Math.PI / 5, Math.PI / 2.5, 45, new BABYLON.Vector3(0, -5, 0), scene);
    camera.attachControl(canvas, false);

    const { 
        pageHinge, stickMesh, pulleyNode, weightMesh, segmentA, segmentB, maxStringLength,
        gridSize, gridPlane
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

    let currentStep = 1;
    let startTime = performance.now();

    scene.onBeforeRenderObservable.add(() => {
        const now = performance.now();
        const elapsed = (now - startTime) / 1000;
        
        if (currentStep === 1) {
            const cycle = elapsed % 7.5;
            let currentPos = new BABYLON.Vector3();
            let currentNormal = new BABYLON.Vector3();

            if (cycle < 1.5) {
                pageHinge.rotation.y = BABYLON.Scalar.Lerp(0, 2 * Math.PI / 3, cycle / 1.5);
                lute.isVisible = false;
                currentPos.copyFrom(pStart);
                currentNormal.copyFrom(nStart);
            } else if (cycle < 2.5) {
                pageHinge.rotation.y = 2 * Math.PI / 3;
                lute.isVisible = false;
                currentPos.copyFrom(pStart);
                currentNormal.copyFrom(nStart);
            } else if (cycle < 3.5) {
                pageHinge.rotation.y = 2 * Math.PI / 3;
                lute.isVisible = true;
                currentPos.copyFrom(pStart);
                currentNormal.copyFrom(nStart);
            } else if (cycle < 5.0) {
                pageHinge.rotation.y = 2 * Math.PI / 3;
                lute.isVisible = true;
                const t = (cycle - 3.5) / 1.5;
                const easedT = t * t * (3 - 2 * t);
                BABYLON.Vector3.LerpToRef(pStart, pEnd, easedT, currentPos);
                BABYLON.Vector3.LerpToRef(nStart, nEnd, easedT, currentNormal);
            } else {
                pageHinge.rotation.y = 2 * Math.PI / 3;
                lute.isVisible = true;
                currentPos.copyFrom(pEnd);
                currentNormal.copyFrom(nEnd);
            }
            
            stickMesh.position.copyFrom(currentPos);
            const _fromVec = new BABYLON.Vector3(0, 1, 0);
            stickMesh.rotationQuaternion = BABYLON.Quaternion.FromUnitVectorsToRef(
                _fromVec, currentNormal.normalize(), stickMesh.rotationQuaternion || new BABYLON.Quaternion());
            
            camera.alpha = -Math.PI / 5;
            camera.beta = Math.PI / 2.5;
            camera.radius = 45;
            camera.setTarget(new BABYLON.Vector3(0, -5, 0));
            if (_crossThreadH) _crossThreadH.setEnabled(false);
            if (_crossThreadV) _crossThreadV.setEnabled(false);

        } else if (currentStep === 2) {
            const cycle = elapsed % 11.0;
            const startAlpha = -Math.PI / 5;
            const startBeta = Math.PI / 2.5;
            const startRadius = 45;
            const startTarget = new BABYLON.Vector3(0, -5, 0);

            // Perspective matching the user screenshot: 3/4 view from draughtsman side
            const endAlpha = Math.PI / 3.5; 
            const endBeta = Math.PI / 3.2;
            const endRadius = 45;
            const endTarget = new BABYLON.Vector3(0, -5, 0);

            pageHinge.rotation.y = 2 * Math.PI / 3;
            lute.isVisible = true;
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
                updateCrossThreads(hitPoint, 1.0, 1.0);
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
    const steps = document.querySelectorAll(".walkthrough-section .step");

    const showStep = (stepNum) => {
        currentStep = stepNum;
        startTime = performance.now();
        steps.forEach((s, i) => {
            if (i + 1 === stepNum) s.classList.add("active");
            else s.classList.remove("active");
        });
        if (prevBtn) prevBtn.disabled = (stepNum === 1);
        if (nextBtn) nextBtn.disabled = (stepNum === 2);
    };

    if (prevBtn) prevBtn.addEventListener("click", () => showStep(1));
    if (nextBtn) nextBtn.addEventListener("click", () => showStep(2));

    // Initialize UI on first load
    showStep(1);

})();
