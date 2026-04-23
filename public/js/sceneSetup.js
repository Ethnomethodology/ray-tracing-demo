/**
 * buildApparatus(scene, opts)
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates every physical component of Dürer's apparatus and returns references
 * to all of them.  Called by both the interactive scene (main.js) and the
 * read-only annotated preview (apparatusPreview.js) so nothing is duplicated.
 *
 * opts.drawingTexture  – pass the DynamicTexture when you want the page to
 *                        show the drawing surface (main scene).  Omit / null
 *                        for a plain white page (preview).
 */
window.buildApparatus = function (scene, opts = {}) {
    const { drawingTexture = null } = opts;

    // ── Lighting ──────────────────────────────────────────────────────────────
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;
    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(0, -1, 0), scene);
    dirLight.intensity = 0.6;
    dirLight.position = new BABYLON.Vector3(0, 20, -10);

    // ── Table ─────────────────────────────────────────────────────────────────
    const tableMaterial = new BABYLON.StandardMaterial("tableMaterial", scene);
    tableMaterial.diffuseColor = new BABYLON.Color3(0.35, 0.22, 0.12);

    const tableMesh = BABYLON.MeshBuilder.CreateBox("tableMesh", { width: 12, height: 0.5, depth: 25 }, scene);
    tableMesh.position.y = -5.25;
    tableMesh.position.z = -7.5;
    tableMesh.material = tableMaterial;

    const legHeight = 9.75;
    [
        new BABYLON.Vector3( 5.5, -legHeight / 2,  11.5),
        new BABYLON.Vector3(-5.5, -legHeight / 2,  11.5),
        new BABYLON.Vector3( 5.5, -legHeight / 2, -11.5),
        new BABYLON.Vector3(-5.5, -legHeight / 2, -11.5),
    ].forEach((pos, i) => {
        const leg = BABYLON.MeshBuilder.CreateCylinder(`tableLeg${i}`, { diameter: 0.6, height: legHeight }, scene);
        leg.parent   = tableMesh;
        leg.position = pos;
        leg.material = tableMaterial;
    });

    // ── Wall (hidden – used for ArcRotateCamera collision plane) ─────────────
    const wallMesh = BABYLON.MeshBuilder.CreatePlane("wallMesh", { width: 40, height: 30 }, scene);
    wallMesh.position.z  = 16;
    wallMesh.rotation.y  = Math.PI;
    wallMesh.isVisible   = false;

    // ── Frame (Dürer's picture-plane) ─────────────────────────────────────────
    const gridSize  = 10;
    const frameHalf = gridSize / 2;

    const gridPlane = BABYLON.MeshBuilder.CreatePlane("gridPlane", {
        size: gridSize,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
    }, scene);
    gridPlane.position = BABYLON.Vector3.Zero();

    const planeMaterial = new BABYLON.StandardMaterial("planeMaterial", scene);
    planeMaterial.alpha           = 0.15;
    planeMaterial.backFaceCulling = false;
    gridPlane.material = planeMaterial;

    // Frame borders
    const bt = 0.2;
    const frameBorderMaterial = new BABYLON.StandardMaterial("frameBorderMat", scene);
    frameBorderMaterial.diffuseColor  = new BABYLON.Color3(0.02, 0.02, 0.02);
    frameBorderMaterial.specularColor = new BABYLON.Color3(0.2,  0.2,  0.2);

    const makeBorder = (name, w, h, d, pos) => {
        const b = BABYLON.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
        b.parent   = gridPlane;
        b.position = pos;
        b.material = frameBorderMaterial;
        return b;
    };
    const borderBottom = makeBorder("borderBottom", gridSize + bt * 2, bt, bt, new BABYLON.Vector3(0, -frameHalf + bt / 2, 0));
    const borderTop    = makeBorder("borderTop",    gridSize + bt * 2, bt, bt, new BABYLON.Vector3(0,  frameHalf + bt / 2, 0));
    const borderLeft   = makeBorder("borderLeft",   bt, gridSize, bt, new BABYLON.Vector3(-frameHalf - bt / 2, 0, 0));
    const borderRight  = makeBorder("borderRight",  bt, gridSize, bt, new BABYLON.Vector3( frameHalf + bt / 2, 0, 0));

    // ── Hinged Page ───────────────────────────────────────────────────────────
    const pageHinge = new BABYLON.TransformNode("pageHinge", scene);
    pageHinge.parent   = gridPlane;
    pageHinge.position = new BABYLON.Vector3(-frameHalf, 0, 0);
    pageHinge.rotation.y = 2 * Math.PI / 3; // open by default

    const pageMesh = BABYLON.MeshBuilder.CreateBox("pageMesh", { width: gridSize, height: gridSize, depth: 0.02 }, scene);
    pageMesh.parent      = pageHinge;
    pageMesh.position    = new BABYLON.Vector3(frameHalf, 0, -0.06);
    pageMesh.isPickable  = false;

    if (drawingTexture) {
        // Interactive scene – multi-material: front = drawing, back = plain white
        const pageInner = new BABYLON.StandardMaterial("pageInner", scene);
        pageInner.diffuseTexture  = drawingTexture;
        pageInner.emissiveColor   = new BABYLON.Color3(1, 1, 1);
        pageInner.disableLighting = true;

        const pageOuter = new BABYLON.StandardMaterial("pageOuter", scene);
        pageOuter.diffuseColor    = new BABYLON.Color3(1, 1, 1);
        pageOuter.emissiveColor   = new BABYLON.Color3(1, 1, 1);
        pageOuter.disableLighting = true;

        const multi = new BABYLON.MultiMaterial("pageMultiMat", scene);
        multi.subMaterials.push(pageInner, pageOuter, pageOuter);
        pageMesh.material = multi;

        pageMesh.subMeshes = [];
        const vc = pageMesh.getTotalVertices();
        new BABYLON.SubMesh(0, 0, vc,  0,  6, pageMesh);
        new BABYLON.SubMesh(1, 0, vc,  6,  6, pageMesh);
        new BABYLON.SubMesh(2, 0, vc, 12, 24, pageMesh);
    } else {
        // Preview – plain warm-white page
        const pageMat = new BABYLON.StandardMaterial("pageMat", scene);
        pageMat.diffuseColor  = new BABYLON.Color3(1, 1, 0.95);
        pageMat.emissiveColor = new BABYLON.Color3(0.9, 0.9, 0.85);
        pageMesh.material = pageMat;
    }

    const pageBorderPoints = [
        new BABYLON.Vector3(-frameHalf, -frameHalf, 0),
        new BABYLON.Vector3( frameHalf, -frameHalf, 0),
        new BABYLON.Vector3( frameHalf,  frameHalf, 0),
        new BABYLON.Vector3(-frameHalf,  frameHalf, 0),
        new BABYLON.Vector3(-frameHalf, -frameHalf, 0),
    ];
    const pageBorder = BABYLON.MeshBuilder.CreateTube("pageBorder",
        { path: pageBorderPoints, radius: 0.1, cap: BABYLON.Mesh.CAP_ALL }, scene);
    pageBorder.parent      = pageMesh;
    pageBorder.position.z  = 0.011;
    pageBorder.material    = frameBorderMaterial;
    pageBorder.isPickable  = false;

    // ── Pulley / Hook on wall ─────────────────────────────────────────────────
    const pulleyNode      = new BABYLON.Vector3(0, 10, 15.5);
    const maxStringLength = 35.7;

    const pulleyMaterial = new BABYLON.StandardMaterial("pulleyMaterial", scene);
    pulleyMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);

    const pulleyMesh = BABYLON.MeshBuilder.CreateCylinder("pulleyMesh", { diameter: 0.8, height: 0.2 }, scene);
    pulleyMesh.position.copyFrom(pulleyNode);
    pulleyMesh.rotation.x = Math.PI / 2;
    pulleyMesh.material   = pulleyMaterial;

    const weightMaterial = new BABYLON.StandardMaterial("weightMaterial", scene);
    weightMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);

    const weightMesh = BABYLON.MeshBuilder.CreateCylinder("weightMesh", { diameter: 0.4, height: 0.8 }, scene);
    weightMesh.material = weightMaterial;
    weightMesh.position.set(pulleyNode.x, pulleyNode.y - 5, pulleyNode.z);

    // ── String lines (updatable each frame by main.js) ────────────────────────
    const origin   = BABYLON.Vector3.Zero();
    let segmentA = BABYLON.MeshBuilder.CreateLines("segmentA",
        { points: [origin, pulleyNode], updatable: true }, scene);
    segmentA.color = new BABYLON.Color3(0.3, 0.3, 0.3);

    let segmentB = BABYLON.MeshBuilder.CreateLines("segmentB",
        { points: [pulleyNode, weightMesh.position], updatable: true }, scene);
    segmentB.color = new BABYLON.Color3(0.3, 0.3, 0.3);

    // ── Stylus ────────────────────────────────────────────────────────────────
    const stickMesh = BABYLON.MeshBuilder.CreateCylinder("stickMesh",
        { diameterTop: 0.02, diameterBottom: 0.15, height: 3.5 }, scene);
    // Flip: narrow tip at Y=0 (joint / touches mesh), wide handle at Y=3.5
    stickMesh.bakeTransformIntoVertices(BABYLON.Matrix.RotationX(Math.PI));
    stickMesh.bakeTransformIntoVertices(BABYLON.Matrix.Translation(0, 1.75, 0));

    const stickMaterial = new BABYLON.StandardMaterial("stickMaterial", scene);
    stickMaterial.diffuseColor  = new BABYLON.Color3(1, 0.1, 0.1);
    stickMaterial.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
    stickMaterial.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    stickMesh.material  = stickMaterial;
    stickMesh.isPickable = false;

    // Ball knob (Dürer pommel)
    const stylusKnob = BABYLON.MeshBuilder.CreateSphere("stylusKnob", { diameter: 0.28, segments: 10 }, scene);
    stylusKnob.parent    = stickMesh;
    stylusKnob.position  = new BABYLON.Vector3(0, 3.5, 0);
    stylusKnob.material  = stickMaterial;
    stylusKnob.isPickable = false;

    return {
        // frame
        gridSize, gridPlane, planeMaterial, frameBorderMaterial,
        borderBottom, borderTop, borderLeft, borderRight,
        // page
        pageHinge, pageMesh, pageBorder,
        // pulley / string
        pulleyNode, maxStringLength, pulleyMesh, weightMesh,
        segmentA, segmentB,
        // stylus
        stickMesh, stylusKnob,
        // table (rarely needed externally but exposed for completeness)
        tableMesh, wallMesh,
    };
};
