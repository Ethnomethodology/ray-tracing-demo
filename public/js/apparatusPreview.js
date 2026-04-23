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
    const scene  = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(1, 1, 1, 1);

    // Interactive camera — same default angle as the main scene
    const camera = new BABYLON.ArcRotateCamera(
        "prevCam", -Math.PI / 5, Math.PI / 2.5, 38,
        new BABYLON.Vector3(0, -5, 0), scene
    );
    camera.attachControl(canvas, true);
    camera.wheelPrecision  = 50;
    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 100;

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

    // Place stylus at a default starting position
    const staticPos = new BABYLON.Vector3(-2, -5.25, -10);
    stickMesh.position.copyFrom(staticPos);
    let _surfaceNormal = new BABYLON.Vector3(0, 1, 0);

    // Page open/close state & toggle
    let isPageOpen = true;
    const togglePage = () => {
        if (isPageOpen) {
            const anim = new BABYLON.Animation("closePage", "rotation.y", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            anim.setKeys([{ frame: 0, value: 2 * Math.PI / 3 }, { frame: 30, value: 0 }]);
            pageHinge.animations = [anim];
            scene.beginAnimation(pageHinge, 0, 30, false);
            isPageOpen = false;
            stickMesh.position.copyFrom(new BABYLON.Vector3(8, -5, 4));
            _surfaceNormal.copyFrom(new BABYLON.Vector3(0, 1, 0));
        } else {
            const anim = new BABYLON.Animation("openPage", "rotation.y", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
            anim.setKeys([{ frame: 0, value: 0 }, { frame: 30, value: 2 * Math.PI / 3 }]);
            pageHinge.animations = [anim];
            scene.beginAnimation(pageHinge, 0, 30, false);
            isPageOpen = true;
        }
    };

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

    // Interaction loop
    scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
            if (!isPageOpen) return;

            const pickInfo = scene.pick(scene.pointerX, scene.pointerY, (mesh) => mesh === tableMesh || mesh === wallMesh);
            if (pickInfo.hit && pickInfo.pickedPoint) {
                let targetPos = pickInfo.pickedPoint.clone();
                const distToPulley = BABYLON.Vector3.Distance(targetPos, pulleyNode);
                const maxDragDistance = maxStringLength - 1.5;
                if (distToPulley > maxDragDistance) {
                    const direction = targetPos.subtract(pulleyNode).normalize();
                    targetPos = pulleyNode.add(direction.scale(maxDragDistance));
                }
                stickMesh.position.copyFrom(targetPos);
                const pickedNormal = pickInfo.getNormal(true, true);
                if (pickedNormal) _surfaceNormal.copyFrom(pickedNormal);
                canvas.style.cursor = "grabbing";
            } else {
                canvas.style.cursor = "default";
            }
        } else if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
            if (pointerInfo.pickInfo && pointerInfo.pickInfo.hit) {
                const pickedMesh = pointerInfo.pickInfo.pickedMesh;
                if (pickedMesh === gridPlane || pickedMesh === borderBottom || pickedMesh === borderTop || pickedMesh === borderLeft || pickedMesh === borderRight || pickedMesh === pageMesh || pickedMesh === pageBorder) {
                    togglePage();
                    return;
                }
            }

            const freshPick = scene.pick(scene.pointerX, scene.pointerY, (mesh) => mesh === tableMesh || mesh === wallMesh);
            if (freshPick && freshPick.hit) {
                hideCrossThreads();
                let targetPos = freshPick.pickedPoint.clone();
                const distToPulley = BABYLON.Vector3.Distance(targetPos, pulleyNode);
                const maxDragDistance = maxStringLength - 1.5;
                if (distToPulley > maxDragDistance) {
                    const direction = targetPos.subtract(pulleyNode).normalize();
                    targetPos = pulleyNode.add(direction.scale(maxDragDistance));
                }
                stickMesh.position.copyFrom(targetPos);
                const clickedNormal = freshPick.getNormal(true, true);
                if (clickedNormal) _surfaceNormal.copyFrom(clickedNormal);
                
                if (!isPageOpen) {
                    togglePage();
                }
                const manualHit = drawPointAtStick();
                if (manualHit) showCrossThreads(manualHit);
            }
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

    engine.runRenderLoop(() => scene.render());
    window.addEventListener("resize", () => engine.resize());
})();
