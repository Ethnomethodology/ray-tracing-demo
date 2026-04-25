/**
 * rayTracingCounterpart.js
 * ───────────────────────
 * Interactive 3D scene showing the computational transition:
 * - Camera model replaces the Dürer's sighting point.
 * - 16x16 pixel grid replaces the wooden frame.
 * - Bulb model replaces the ambient lighting.
 * - Sphere remains the subject.
 */
(function () {
    const canvas = document.getElementById("rayTracingCanvas");
    if (!canvas) return;

    const engine = new BABYLON.Engine(canvas, true, { alpha: true });
    engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

    // Camera for the scene view (not the physical camera model)
    const isMobile = window.innerWidth <= 900;
    const defaultRadius = isMobile ? 54 : 45;
    const sceneCamera = new BABYLON.ArcRotateCamera(
        "sceneCamera", -Math.PI / 5, Math.PI / 2.3, defaultRadius,
        new BABYLON.Vector3(0, 2.0, -2.0), scene
    );
    sceneCamera.attachControl(canvas, true);

    // Standard Lighting
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.5;

    // --- 1. Camera Model (replaces the nail) ---
    const cameraPos = new BABYLON.Vector3(0, 10, 15.5);
    // Table top is at -5.0. Sphere radius is 2.0 (diameter 4).
    // Center Y is at -3 to sit on the table.
    const spherePos = new BABYLON.Vector3(0, -3.0, -11);

    BABYLON.SceneLoader.ImportMeshAsync("", "models/", "camera.glb", scene).then((result) => {
        const cameraModel = result.meshes[0];
        cameraModel.position.copyFrom(cameraPos);
        cameraModel.scaling.setAll(0.8); // Scaled down to 1/10th of previous size (8.0 -> 0.8)
        
        // Orient camera towards the sphere
        cameraModel.lookAt(spherePos);
    });

    // --- 2. Image Plane (16x16 spreadsheet grid) ---
    const gridSize = 10;
    const resolution = 16;
    const pixelSize = gridSize / resolution;
    
    const cellMaterial = new BABYLON.StandardMaterial("cellMaterial", scene);
    cellMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
    cellMaterial.alpha = 0.2;
    cellMaterial.specularColor = new BABYLON.Color3(0, 0, 0);

    const frameGroup = new BABYLON.TransformNode("frameGroup", scene);
    for (let x = 0; x < resolution; x++) {
        for (let y = 0; y < resolution; y++) {
            const cell = BABYLON.MeshBuilder.CreatePlane(`cell_${x}_${y}`, {
                size: pixelSize
            }, scene);
            cell.parent = frameGroup;
            cell.position.x = (x - (resolution - 1) / 2) * pixelSize;
            cell.position.y = (y - (resolution - 1) / 2) * pixelSize;
            cell.position.z = 0;
            cell.material = cellMaterial;
            
            // Blue borders like a spreadsheet
            cell.enableEdgesRendering();
            cell.edgesWidth = 4.0;
            cell.edgesColor = new BABYLON.Color4(0.2, 0.4, 1.0, 1.0);
        }
    }
    frameGroup.position.set(0, 0, 2.25); // Image plane at default height, halfway in Z

    // --- 3. Subject (Sphere) ---
    if (typeof buildProceduralSphere === "function") {
        const sphere = buildProceduralSphere("subjectSphere", scene, { diameter: 4.0 });
        sphere.position.set(0, -3.0, -11);
        const sphereMaterial = new BABYLON.StandardMaterial("sphereMat", scene);
        sphereMaterial.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8);
        sphereMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
        sphereMaterial.specularPower = 32;
        sphere.material = sphereMaterial;

        // --- 5. Visual Ray (from camera to sphere surface) ---
        const dist = BABYLON.Vector3.Distance(cameraPos, spherePos);
        const direction = spherePos.subtract(cameraPos).normalize();
        const surfacePoint = spherePos.subtract(direction.scale(2.0)); // Radius is 2.0
        
        const rayLine = BABYLON.MeshBuilder.CreateDashedLines("rayLine", {
            points: [cameraPos, surfacePoint],
            dashSize: 1,
            gapSize: 0.5
        }, scene);
        rayLine.color = new BABYLON.Color3(0, 0, 0); // Black ray
    }

    // --- 4. Light Source (Bulb Model) ---
    const bulbPos = new BABYLON.Vector3(0, 15, -11);
    BABYLON.SceneLoader.ImportMeshAsync("", "models/", "bulb.glb", scene).then((result) => {
        const bulbModel = result.meshes[0];
        bulbModel.position.copyFrom(bulbPos);
        bulbModel.scaling.setAll(0.3); // 1/5th of 1.5
        
        // Make it upside down (base at top, glass at bottom)
        bulbModel.rotationQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X, Math.PI);
        
        const pointLight = new BABYLON.PointLight("pointLight", bulbPos, scene);
        pointLight.intensity = 1.5;
        pointLight.diffuse = new BABYLON.Color3(1, 1, 0.9);
        pointLight.range = 35;
    });

    // Simple table for context
    const tableMaterial = new BABYLON.StandardMaterial("tableMaterial", scene);
    tableMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.15, 0.12); // Slightly lighter
    const tableMesh = BABYLON.MeshBuilder.CreateBox("tableMesh", { width: 15, height: 0.5, depth: 30 }, scene);
    tableMesh.position.y = -5.25;
    tableMesh.position.z = -7.5;
    tableMesh.material = tableMaterial;

    // Optional: Slow auto-rotation and pixel pulse
    let time = 0;
    scene.onBeforeRenderObservable.add(() => {
        time += 0.02;
    });

    engine.runRenderLoop(() => scene.render());
    window.addEventListener("resize", () => engine.resize());
})();
