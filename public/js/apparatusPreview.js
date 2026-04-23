/**
 * apparatusPreview.js
 * ───────────────────
 * Annotated, interactive 3D scene showing Dürer's apparatus without any target
 * object.  Reuses buildApparatus() from sceneSetup.js — zero code duplication.
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
    const { stickMesh, pulleyNode, weightMesh, segmentA, segmentB } =
        buildApparatus(scene);

    // Place stylus at a static position (no object to hover over)
    const staticPos = new BABYLON.Vector3(-2, -5, -10);
    stickMesh.position.copyFrom(staticPos);
    const towardPulley = pulleyNode.subtract(staticPos).normalize();
    stickMesh.rotationQuaternion = BABYLON.Quaternion.FromUnitVectorsToRef(
        new BABYLON.Vector3(0, 1, 0), towardPulley, new BABYLON.Quaternion()
    );

    engine.runRenderLoop(() => scene.render());
    window.addEventListener("resize", () => engine.resize());

    // ── Dynamic annotation pill positioning ──────────────────────────────────
    // World-space anchors for each numbered pill
    const stringMid = new BABYLON.Vector3(
        (staticPos.x + pulleyNode.x) * 0.38,
        (staticPos.y + pulleyNode.y) * 0.38,
        (staticPos.z + pulleyNode.z) * 0.38
    );
    const annotations = [
        { id: "pill-1", world: stringMid },
        { id: "pill-2", world: pulleyNode.clone() },
        { id: "pill-3", world: staticPos.clone() },
        { id: "pill-4", world: new BABYLON.Vector3(0, 0.5, 0) },
        { id: "pill-5", world: new BABYLON.Vector3(-4.2, 0.5, -0.5) },
    ];

    scene.onAfterRenderObservable.add(() => {
        const w    = engine.getRenderWidth();
        const h    = engine.getRenderHeight();
        const vp   = camera.viewport.toGlobal(w, h);
        const tf   = scene.getTransformMatrix();
        const rect = canvas.getBoundingClientRect();

        annotations.forEach(({ id, world }) => {
            const s    = BABYLON.Vector3.Project(world, BABYLON.Matrix.Identity(), tf, vp);
            const pill = document.getElementById(id);
            if (!pill) return;
            pill.style.left       = (s.x / w) * rect.width  + "px";
            pill.style.top        = (s.y / h) * rect.height + "px";
            pill.style.visibility = (s.z > 0 && s.z < 1) ? "visible" : "hidden";
        });
    });
})();
