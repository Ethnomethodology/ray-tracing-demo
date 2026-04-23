(function() {
    const canvas = document.getElementById("walkthroughCanvas");
    if (!canvas) return;

    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, alpha: true });
    engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0); 

    const camera = new BABYLON.ArcRotateCamera("walkthroughCamera", -Math.PI / 5, Math.PI / 2.5, 38, new BABYLON.Vector3(0, -5, 0), scene);
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
    const angleH = 0.02; 
    const angleV = Math.PI / 2 - 0.02;

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

    const updateCrossThreads = (hitPoint, progress) => {
        const z = hitPoint.z - 0.05;
        const currentY = BABYLON.Scalar.Lerp(FRAME_HALF - 0.05, hitPoint.y, progress);
        const currentX = BABYLON.Scalar.Lerp(-FRAME_HALF + 0.05, hitPoint.x, progress);
        const hPts = getIntersections(hitPoint.x, currentY, angleH, z);
        const vPts = getIntersections(currentX, hitPoint.y, angleV, z);

        if (!_crossThreadH) {
            _crossThreadH = BABYLON.MeshBuilder.CreateTube("crossH", { path: hPts, radius: 0.015, cap: BABYLON.Mesh.CAP_ALL, updatable: true }, scene);
            _crossThreadH.material = threadMat;
            _crossThreadV = BABYLON.MeshBuilder.CreateTube("crossV", { path: vPts, radius: 0.015, cap: BABYLON.Mesh.CAP_ALL, updatable: true }, scene);
            _crossThreadV.material = threadMat;
        } else {
            _crossThreadH = BABYLON.MeshBuilder.CreateTube("crossH", { path: hPts, instance: _crossThreadH });
            _crossThreadV = BABYLON.MeshBuilder.CreateTube("crossV", { path: vPts, instance: _crossThreadV });
        }
        _crossThreadH.setEnabled(progress > 0);
        _crossThreadV.setEnabled(progress > 0);
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
            camera.radius = 38;
            camera.setTarget(new BABYLON.Vector3(0, -5, 0));
            if (_crossThreadH) _crossThreadH.setEnabled(false);
            if (_crossThreadV) _crossThreadV.setEnabled(false);

        } else if (currentStep === 2) {
            const cycle = elapsed % 8.0;
            camera.alpha = -Math.PI / 5;
            camera.beta = Math.PI / 2.5;
            camera.radius = 38;
            camera.setTarget(new BABYLON.Vector3(0, -5, 0));
            
            pageHinge.rotation.y = 2 * Math.PI / 3;
            lute.isVisible = true;
            stickMesh.position.copyFrom(pEnd);
            const _fromVec = new BABYLON.Vector3(0, 1, 0);
            stickMesh.rotationQuaternion = BABYLON.Quaternion.FromUnitVectorsToRef(
                _fromVec, nEnd.normalize(), stickMesh.rotationQuaternion || new BABYLON.Quaternion());

            if (cycle < 6.0) {
                // Move threads immediately from static view
                const t = cycle / 6.0; // 6 seconds for slow, smooth movement
                const easedT = t * t * (3 - 2 * t);
                updateCrossThreads(hitPoint, easedT);
            } else {
                updateCrossThreads(hitPoint, 1.0);
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
