(function() {
    const canvas = document.getElementById("stepOneCanvas");
    if (!canvas) return;

    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, alpha: true });
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0); 

    const camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 5, Math.PI / 2.5, 38, new BABYLON.Vector3(0, -5, 0), scene);
    camera.attachControl(canvas, false);

    const { pageHinge, stickMesh, pulleyNode, weightMesh, segmentA, segmentB, maxStringLength } = buildApparatus(scene);

    const targetMaterial = new BABYLON.StandardMaterial("targetMaterial", scene);
    targetMaterial.diffuseColor  = new BABYLON.Color3(0.6, 0.4, 0.2);
    targetMaterial.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);

    const lute = buildProceduralLute(scene);
    lute.material = targetMaterial;
    lute.isVisible = false; // Start hidden

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

    // Target point: Middle of the bowl's top surface.
    // Bowl is the bulbous part away from the neck.
    let pEnd = new BABYLON.Vector3(0, -4, -13);
    let nEnd = new BABYLON.Vector3(0, 1, 0);
    const ray = new BABYLON.Ray(new BABYLON.Vector3(0, 0, -13), new BABYLON.Vector3(0, -1, 0));
    const pick = ray.intersectsMesh(lute);
    if (pick.hit) {
        pEnd.copyFrom(pick.pickedPoint);
        const normal = pick.getNormal(true, true);
        if (normal) nEnd.copyFrom(normal);
    }

    // Initial position from interactive demo (main.js line 76)
    const pStart = new BABYLON.Vector3(8, -5, 4); 
    const nStart = new BABYLON.Vector3(0, 1, 0); // Resting on the table

    let startTime = performance.now();
    
    scene.onBeforeRenderObservable.add(() => {
        const now = performance.now();
        const elapsed = (now - startTime) / 1000;
        const cycle = elapsed % 7.5; 

        let currentPos = new BABYLON.Vector3();
        let currentNormal = new BABYLON.Vector3();

        if (cycle < 1.5) {
            // 0-1.5s: Opening door. Lute hidden.
            pageHinge.rotation.y = BABYLON.Scalar.Lerp(0, 2 * Math.PI / 3, cycle / 1.5);
            lute.isVisible = false;
            currentPos.copyFrom(pStart);
            currentNormal.copyFrom(nStart);
        } else if (cycle < 2.5) {
            // 1.5-2.5s: Door fully open. Wait 1s. Lute hidden.
            pageHinge.rotation.y = 2 * Math.PI / 3;
            lute.isVisible = false;
            currentPos.copyFrom(pStart);
            currentNormal.copyFrom(nStart);
        } else if (cycle < 3.5) {
            // 2.5-3.5s: Door open. Lute visible. Wait 1s.
            pageHinge.rotation.y = 2 * Math.PI / 3;
            lute.isVisible = true;
            currentPos.copyFrom(pStart);
            currentNormal.copyFrom(nStart);
        } else if (cycle < 5.0) {
            // 3.5-5.0s: Move pointer to Lute bowl.
            pageHinge.rotation.y = 2 * Math.PI / 3;
            lute.isVisible = true;
            const t = (cycle - 3.5) / 1.5;
            const easedT = t * t * (3 - 2 * t);
            BABYLON.Vector3.LerpToRef(pStart, pEnd, easedT, currentPos);
            BABYLON.Vector3.LerpToRef(nStart, nEnd, easedT, currentNormal);
        } else {
            // 5.0-7.5s: Stay on target.
            pageHinge.rotation.y = 2 * Math.PI / 3;
            lute.isVisible = true;
            currentPos.copyFrom(pEnd);
            currentNormal.copyFrom(nEnd);
        }

        stickMesh.position.copyFrom(currentPos);
        
        const _fromVec = new BABYLON.Vector3(0, 1, 0);
        stickMesh.rotationQuaternion = BABYLON.Quaternion.FromUnitVectorsToRef(
            _fromVec,
            currentNormal.normalize(),
            stickMesh.rotationQuaternion || new BABYLON.Quaternion()
        );

        const distanceA = BABYLON.Vector3.Distance(currentPos, pulleyNode);
        const lengthB = Math.max(0, maxStringLength - distanceA);
        weightMesh.position.set(pulleyNode.x, pulleyNode.y - lengthB, pulleyNode.z);

        if (segmentA) BABYLON.MeshBuilder.CreateLines("segmentA", { points: [currentPos, pulleyNode], instance: segmentA });
        if (segmentB) BABYLON.MeshBuilder.CreateLines("segmentB", { points: [pulleyNode, weightMesh.position], instance: segmentB });
    });

    engine.runRenderLoop(() => { scene.render(); });
    window.addEventListener("resize", () => { engine.resize(); });
})();
