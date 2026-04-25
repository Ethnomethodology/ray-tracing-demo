/**
 * apparatusPreview.js
 * ───────────────────
 * Interactive 3D scene showing Dürer's apparatus without any target
 * object. Reuses buildApparatus() from sceneSetup.js — zero code duplication.
 */
(function () {
    const canvas = document.getElementById("previewCanvas");
    if (!canvas) return;

    const engine = new BABYLON.Engine(canvas, true);
    engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
    const scene  = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(1, 1, 1, 1);

    // Static zoomed-out camera
    const camera = new BABYLON.ArcRotateCamera(
        "prevCam", -Math.PI / 5, Math.PI / 2.5, 45,
        new BABYLON.Vector3(0, -5, 2.5), scene
    );

    // Build the full apparatus (no drawing texture → plain white page)
    const { 
        stickMesh, pulleyNode, weightMesh, maxStringLength,
        segmentA: _segA, segmentB: _segB,
        gridPlane, borderBottom, borderTop, borderLeft, borderRight,
        pageHinge, gridSize, tableMesh, wallMesh, pageMesh, pageBorder
    } = buildApparatus(scene);

    let segmentA = _segA;
    let segmentB = _segB;

    // We will use the table and an invisible wall for the stylus to track against
    wallMesh.isVisible = true;
    wallMesh.visibility = 0;
    wallMesh.isPickable = true;

    let targetMesh = null;
    if (typeof buildProceduralLute === "function") {
        targetMesh = buildProceduralLute(scene);
        if (targetMesh) {
            const targetMaterial = new BABYLON.StandardMaterial("targetMaterial", scene);
            targetMaterial.diffuseColor  = new BABYLON.Color3(0.6, 0.4, 0.2);
            targetMaterial.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
            targetMesh.material = targetMaterial;

            targetMesh.computeWorldMatrix(true);
            const center = targetMesh.getBoundingInfo().boundingBox.center;
            targetMesh.bakeTransformIntoVertices(BABYLON.Matrix.Translation(-center.x, -center.y, -center.z));

            const boundingInfo = targetMesh.getBoundingInfo();
            const size = boundingInfo.maximum.subtract(boundingInfo.minimum);
            const maxDim = Math.max(size.x, size.y, size.z);
            const scaleFactor = (maxDim > 0.001) ? 15 / maxDim : 2.5;
            targetMesh.scaling.setAll(scaleFactor);

            targetMesh.computeWorldMatrix(true);
            const groundOffset = -5.0 - targetMesh.getBoundingInfo().boundingBox.minimumWorld.y;
            targetMesh.position.y += groundOffset;
            targetMesh.position.z = -11;
            targetMesh.position.x = 0;
        }
    }

    let _surfaceNormal = new BABYLON.Vector3(0, 1, 0);
    // Shared ray for drawing calculations
    const _sharedRay = new BABYLON.Ray(BABYLON.Vector3.Zero(), BABYLON.Vector3.Up(), 100);
    const _tempDirection = new BABYLON.Vector3();

    const drawPointAtStick = () => {
        pulleyNode.subtractToRef(stickMesh.position, _tempDirection);
        _tempDirection.negateInPlace(); // direction: pulleyNode → joint
        _sharedRay.origin.copyFrom(pulleyNode);
        _sharedRay.direction.copyFrom(_tempDirection.normalize());

        const hit = _sharedRay.intersectsMesh(gridPlane);

        if (hit.hit) {
            return new BABYLON.Vector3(
                pulleyNode.x + _sharedRay.direction.x * hit.distance,
                pulleyNode.y + _sharedRay.direction.y * hit.distance,
                pulleyNode.z + _sharedRay.direction.z * hit.distance
            );
        }
        return null;
    };

    let _crossThreadH = null;
    let _crossThreadV = null;
    const FRAME_HALF = gridSize / 2;

    const hideCrossThreads = () => {
        if (_crossThreadH) _crossThreadH.dispose();
        if (_crossThreadV) _crossThreadV.dispose();
        _crossThreadH = null;
        _crossThreadV = null;
    };

    const showCrossThreads = (hitPoint) => {
        const z = hitPoint.z - 0.04;

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

        const angleH = (Math.random() - 0.5) * 0.35;
        const angleV = Math.PI / 2 + (Math.random() - 0.5) * 0.35;

        const hPts = getIntersections(hitPoint.x, hitPoint.y, angleH);
        const vPts = getIntersections(hitPoint.x, hitPoint.y, angleV);

        hideCrossThreads();

        _crossThreadH = BABYLON.MeshBuilder.CreateLines("crossH", { points: hPts }, scene);
        _crossThreadH.color = new BABYLON.Color3(0.1, 0.3, 0.9);
        _crossThreadH.isPickable = false;

        _crossThreadV = BABYLON.MeshBuilder.CreateLines("crossV", { points: vPts }, scene);
        _crossThreadV.color = new BABYLON.Color3(0.1, 0.3, 0.9);
        _crossThreadV.isPickable = false;
    };

    let currentHitPoint = null;
    // Setup static initial state
    scene.onReadyObservable.addOnce(() => {
        const ray = new BABYLON.Ray(new BABYLON.Vector3(0, 5, -11), new BABYLON.Vector3(0, -1, 0));
        const pick = scene.pickWithRay(ray, (mesh) => mesh === targetMesh);
        if (pick && pick.hit) {
            stickMesh.position.copyFrom(pick.pickedPoint);
            const normal = pick.getNormal(true, true);
            if (normal) _surfaceNormal.copyFrom(normal);
        } else {
            stickMesh.position.copyFrom(new BABYLON.Vector3(0, -3.5, -11));
        }
        
        const hitPoint = drawPointAtStick();
        if (hitPoint) {
            currentHitPoint = hitPoint;
            showCrossThreads(hitPoint);
        }
    });

    scene.onBeforeRenderObservable.add(() => {
        const _fromVec = new BABYLON.Vector3(0, 1, 0);
        const _toVec = _surfaceNormal.clone();
        stickMesh.rotationQuaternion = BABYLON.Quaternion.FromUnitVectorsToRef(
            _fromVec,
            _toVec,
            stickMesh.rotationQuaternion || new BABYLON.Quaternion()
        );

        const jointPos = stickMesh.position;
        const distanceA = BABYLON.Vector3.Distance(jointPos, pulleyNode);
        const lengthB = Math.max(0, maxStringLength - distanceA);
        weightMesh.position.set(pulleyNode.x, pulleyNode.y - lengthB, pulleyNode.z);

        if (segmentA) BABYLON.MeshBuilder.CreateLines("segmentA", { points: [jointPos, pulleyNode], instance: segmentA });
        if (segmentB) BABYLON.MeshBuilder.CreateLines("segmentB", { points: [pulleyNode, weightMesh.position], instance: segmentB });
    });

    // ── Dynamic annotation pill positioning ──────────────────────────────────
    scene.onAfterRenderObservable.add(() => {
        const w    = engine.getRenderWidth();
        const h    = engine.getRenderHeight();
        const vp   = camera.viewport.toGlobal(w, h);
        const tf   = scene.getTransformMatrix();
        const rect = canvas.getBoundingClientRect();

        const stringMidB = new BABYLON.Vector3(
            pulleyNode.x + 1.5,
            (pulleyNode.y + weightMesh.position.y) / 2,
            pulleyNode.z
        );

        const annotations = [
            { id: "pill-1", world: new BABYLON.Vector3(pulleyNode.x + 2.0, pulleyNode.y, pulleyNode.z) },
            { id: "pill-2", world: stringMidB },
            { id: "pill-3", world: new BABYLON.Vector3(weightMesh.position.x, weightMesh.position.y - 2.0, weightMesh.position.z) },
            { id: "pill-4", world: new BABYLON.Vector3(0, 7.0, 0) },
            { id: "pill-5", world: pageMesh.getAbsolutePosition() },
            { id: "pill-6", world: currentHitPoint ? new BABYLON.Vector3(currentHitPoint.x + 2.0, currentHitPoint.y - 1.5, currentHitPoint.z) : new BABYLON.Vector3(0, 0, 0) },
            { id: "pill-7", world: new BABYLON.Vector3(stickMesh.position.x - 3.0, stickMesh.position.y + 1.5, stickMesh.position.z) },
            { id: "pill-8", world: targetMesh ? new BABYLON.Vector3(0, targetMesh.position.y - 1.0, targetMesh.position.z - 4.0) : new BABYLON.Vector3(0, 0, 0) }
        ];

        annotations.forEach(({ id, world }) => {
            const s    = BABYLON.Vector3.Project(world, BABYLON.Matrix.Identity(), tf, vp);
            const pill = document.getElementById(id);
            if (!pill) return;
            pill.style.left       = (s.x / w) * rect.width  + "px";
            pill.style.top        = (s.y / h) * rect.height + "px";
            pill.style.visibility = (s.z > 0 && s.z < 1) ? "visible" : "hidden";
        });
    });

    // ── Pill Interaction Logic ───────────────────────────────────────────────
    const pills = [1, 2, 3, 4, 5, 6, 7, 8].map(i => document.getElementById(`pill-${i}`));
    const steps = document.querySelectorAll('#explanation-steps .step');
    const prevBtn = document.getElementById('prevStepBtn');
    const nextBtn = document.getElementById('nextStepBtn');
    let currentPillIndex = 0;

    const setActivePill = (index) => {
        currentPillIndex = index;
        pills.forEach((pill, i) => {
            if (pill) {
                if (i === index) pill.classList.add('active');
                else pill.classList.remove('active');
            }
        });
        steps.forEach((step, i) => {
            if (step) {
                if (i === index) step.classList.add('active');
                else step.classList.remove('active');
            }
        });

        if (prevBtn) prevBtn.disabled = (index === 0);
        if (nextBtn) nextBtn.disabled = (index === pills.length - 1);
    };

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPillIndex > 0) setActivePill(currentPillIndex - 1);
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentPillIndex < pills.length - 1) setActivePill(currentPillIndex + 1);
        });
    }

    // Initialize with first pill active
    setActivePill(0);

    pills.forEach((pill, index) => {
        if (pill) {
            pill.addEventListener('click', () => {
                setActivePill(index);
            });
        }
    });

    engine.runRenderLoop(() => scene.render());
    window.addEventListener("resize", () => engine.resize());
})();
