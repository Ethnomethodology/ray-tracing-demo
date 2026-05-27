/**
 * demo2Animation.js
 * ───────────────────────
 * Custom Direct Illumination Animation
 * - Camera is a simple point
 * - Object is a glass sphere
 * - Light is a square
 */
(function () {
    const canvas = document.getElementById("rayTracingCanvasFinal");
    if (!canvas) return;

    const engine = new BABYLON.Engine(canvas, true, { alpha: true });
    engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

    const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.5;
    hemiLight.groundColor = new BABYLON.Color3(0.1, 0.1, 0.1);

    scene.environmentTexture = BABYLON.CubeTexture.CreateFromPrefilteredData("https://playground.babylonjs.com/textures/environment.dds", scene);
    scene.environmentIntensity = 0.8;

    const sceneCamera = new BABYLON.ArcRotateCamera(
        "sceneCamera", -Math.PI / 5, Math.PI / 2.3, 28,
        new BABYLON.Vector3(0, 4.0, -2.0), scene
    ); 
    sceneCamera.setPosition(new BABYLON.Vector3(22.65, 3.1, -18.45));
    sceneCamera.beta = 1.6;
    sceneCamera.inputs.removeByType("ArcRotateCameraMouseWheelInput");
    sceneCamera.attachControl(canvas, true);

    const cameraPos = new BABYLON.Vector3(0, 8, 14);
    const spherePos = new BABYLON.Vector3(0, -3.0, -11);
    const lightPos = new BABYLON.Vector3(0, 9.6, -11);

    // --- 1. Camera Point ---
    const cameraPoint = BABYLON.MeshBuilder.CreateSphere("cameraPoint", { diameter: 0.5 }, scene);
    cameraPoint.position.copyFrom(cameraPos);
    const camMat = new BABYLON.StandardMaterial("camMat", scene);
    camMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    camMat.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    cameraPoint.material = camMat;

    // --- 2. Image Plane ---
    const gridSize = 10;
    const resolution = 16;
    const pixelSize = gridSize / resolution;
    
    const cellMaterial = new BABYLON.StandardMaterial("cellMaterial", scene);
    cellMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);
    cellMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    cellMaterial.alpha = 0;
    
    const paintedMat = new BABYLON.StandardMaterial("paintedMat", scene);
    paintedMat.diffuseColor = new BABYLON.Color3(0.5, 0.9, 0.5); 
    paintedMat.emissiveColor = new BABYLON.Color3(0.4, 0.7, 0.4); 
    paintedMat.backFaceCulling = false;

    const frameGroup = new BABYLON.TransformNode("frameGroup", scene);
    for (let x = 0; x < resolution; x++) {
        for (let y = 0; y < resolution; y++) {
            const cell = BABYLON.MeshBuilder.CreatePlane(`cell_${x}_${y}`, { 
                size: pixelSize,
                sideOrientation: BABYLON.Mesh.DOUBLESIDE
            }, scene);
            cell.parent = frameGroup;
            cell.position.x = (x - (resolution - 1) / 2) * pixelSize;
            cell.position.y = (y - (resolution - 1) / 2) * pixelSize;
            cell.position.z = 0;
            cell.material = cellMaterial;
            cell.enableEdgesRendering();
            cell.edgesWidth = 4.0;
            cell.edgesColor = new BABYLON.Color4(0.2, 0.4, 1.0, 1.0);
        }
    }
    frameGroup.position.set(0, 0, 2.25); 

    // --- 3. Glass Sphere ---
    const glassSphere = BABYLON.MeshBuilder.CreateSphere("glassSphere", { diameter: 4.0, segments: 32 }, scene);
    glassSphere.position.copyFrom(spherePos);
    
    const glassMat = new BABYLON.PBRMaterial("glassMat", scene);
    glassMat.alpha = 0.5;
    glassMat.microSurface = 1.0; 
    glassMat.reflectivityColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    glassMat.albedoColor = new BABYLON.Color3(0.85, 0.9, 1.0);
    glassMat.environmentIntensity = 1.0;
    glassMat.subSurface.isRefractionEnabled = true;
    glassMat.subSurface.indexOfRefraction = 1.52;
    glassMat.subSurface.tintColor = new BABYLON.Color3(0.8, 0.9, 1.0);
    glassSphere.material = glassMat;

    // --- 4. Square Light Source ---
    const lightSquare = BABYLON.MeshBuilder.CreatePlane("lightSquare", { size: 3.0 }, scene);
    lightSquare.position.copyFrom(lightPos);
    lightSquare.rotation.x = Math.PI / 2; // Face downwards
    
    const lightMat = new BABYLON.StandardMaterial("lightMat", scene);
    lightMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
    lightMat.disableLighting = true; 
    lightSquare.material = lightMat;

    // Show triangulated borders
    lightSquare.enableEdgesRendering();
    lightSquare.edgesWidth = 4.0;
    lightSquare.edgesColor = new BABYLON.Color4(0.2, 0.2, 0.2, 1);
    
    
    const pointLight = new BABYLON.PointLight("pointLight", lightPos, scene);
    pointLight.intensity = 1.0;
    pointLight.diffuse = new BABYLON.Color3(1, 1, 1);

    // --- 5. Ray Paths ---
    const lensOrigin = cameraPoint.position;
    const direction = spherePos.subtract(lensOrigin).normalize();
    const surfacePoint = spherePos.subtract(direction.scale(2.0)); 
    const totalDistance = BABYLON.Vector3.Distance(lensOrigin, surfacePoint);
    
    const tPlane = (2.25 - lensOrigin.z) / direction.z;
    const ix = lensOrigin.x + direction.x * tPlane;
    const iy = lensOrigin.y + direction.y * tPlane;
    const gridX = Math.round(ix / pixelSize + (resolution - 1) / 2);
    const gridY = Math.round(iy / pixelSize + (resolution - 1) / 2);

    const blackMat = new BABYLON.StandardMaterial("blackMat", scene);
    blackMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
    blackMat.specularColor = new BABYLON.Color3(0, 0, 0);

    const rayLine = BABYLON.MeshBuilder.CreateCylinder("rayLine", {
        height: totalDistance,
        diameter: 0.05
    }, scene);
    rayLine.material = blackMat;
    rayLine.position = lensOrigin.add(direction.scale(totalDistance / 2));
    rayLine.lookAt(surfacePoint);
    rayLine.rotate(BABYLON.Axis.X, Math.PI / 2);
    rayLine.setEnabled(false);

    const toLightDir = lightPos.subtract(surfacePoint).normalize();
    const toLightDist = BABYLON.Vector3.Distance(surfacePoint, lightPos);
    
    const lightRayLine = BABYLON.MeshBuilder.CreateCylinder("lightRayLine", {
        height: toLightDist,
        diameter: 0.05
    }, scene);
    lightRayLine.material = blackMat;
    lightRayLine.position = surfacePoint.add(toLightDir.scale(toLightDist / 2));
    lightRayLine.lookAt(lightPos);
    lightRayLine.rotate(BABYLON.Axis.X, Math.PI / 2);
    lightRayLine.setEnabled(false);

    const arrowHeight = 0.6;
    const arrowHead = BABYLON.MeshBuilder.CreateCylinder("arrowHead", {
        diameterTop: 0,
        diameterBottom: 0.4,
        height: arrowHeight,
        tessellation: 12
    }, scene);
    arrowHead.material = blackMat;
    arrowHead.setEnabled(false);

    const lightArrowHead = BABYLON.MeshBuilder.CreateCylinder("lightArrowHead", {
        diameterTop: 0,
        diameterBottom: 0.4,
        height: arrowHeight,
        tessellation: 12
    }, scene);
    lightArrowHead.material = blackMat;
    lightArrowHead.setEnabled(false);

    // --- 6. Animation Logic ---
    let progress = 0;
    let pixelPainted = false;

    function resetAnimation() {
        progress = 0;
        pixelPainted = false;
        rayLine.setEnabled(false);
        lightRayLine.setEnabled(false);
        arrowHead.setEnabled(false);
        lightArrowHead.setEnabled(false);
        
        for (let x = 0; x < resolution; x++) {
            for (let y = 0; y < resolution; y++) {
                const cell = scene.getMeshByName(`cell_${x}_${y}`);
                if (cell) cell.material = cellMaterial;
            }
        }
    }

    scene.onBeforeRenderObservable.add(() => {
        // --- Update Camera Info ---
        if (showCameraParams && sceneCamera) {
            const camInfo = document.getElementById("cameraInfo");
            if (camInfo) {
                const pos = sceneCamera.position;
                camInfo.textContent = `CAMERA PARAMETERS
Position: [${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}]
Alpha:    ${sceneCamera.alpha.toFixed(2)}
Beta:     ${sceneCamera.beta.toFixed(2)}
Zoom:     ${sceneCamera.radius.toFixed(2)}`;
            }
        }

        progress += 0.008; 
        
        if (progress > 1.8) {
            resetAnimation();
            return;
        }

        if (progress <= 0.6) {
            const p1 = Math.min(progress / 0.6, 1.0);
            const d1 = totalDistance * p1;
            const ep1 = lensOrigin.add(direction.scale(d1));
            
            rayLine.setEnabled(p1 > 0.01);
            rayLine.scaling.y = p1;
            rayLine.position = lensOrigin.add(direction.scale(d1 / 2));
            
            arrowHead.setEnabled(p1 > 0.01);
            arrowHead.position = ep1.subtract(direction.scale(arrowHeight / 2));
            arrowHead.lookAt(spherePos);
            arrowHead.rotate(BABYLON.Axis.X, Math.PI / 2);
            
            lightRayLine.setEnabled(false);
            lightArrowHead.setEnabled(false);
        } else if (progress <= 1.2) {
            const p2 = Math.min((progress - 0.6) / 0.6, 1.0);
            const d2 = toLightDist * p2;
            const ep2 = surfacePoint.add(toLightDir.scale(d2));

            rayLine.setEnabled(true);
            rayLine.scaling.y = 1.0;
            rayLine.position = lensOrigin.add(direction.scale(totalDistance / 2));
            
            arrowHead.setEnabled(true);
            arrowHead.position = surfacePoint.subtract(direction.scale(arrowHeight / 2));
            arrowHead.lookAt(spherePos);
            arrowHead.rotate(BABYLON.Axis.X, Math.PI / 2);

            lightRayLine.setEnabled(p2 > 0.01);
            lightRayLine.scaling.y = p2;
            lightRayLine.position = surfacePoint.add(toLightDir.scale(d2 / 2));
            
            lightArrowHead.setEnabled(p2 > 0.01);
            lightArrowHead.position = ep2.subtract(toLightDir.scale(arrowHeight / 2));
            lightArrowHead.lookAt(lightPos);
            lightArrowHead.rotate(BABYLON.Axis.X, Math.PI / 2);
        } else if (progress > 1.2 && !pixelPainted) {
            const cell = scene.getMeshByName(`cell_${gridX}_${gridY}`);
            if (cell) {
                cell.material = paintedMat;
                pixelPainted = true;
            }
        }
    });

    let showCameraParams = false;
    const cameraParamsBtn = document.getElementById("cameraParamsBtn");
    if (cameraParamsBtn) {
        cameraParamsBtn.addEventListener("click", (e) => {
            showCameraParams = !showCameraParams;
            const btn = e.target.closest('#cameraParamsBtn');
            if (showCameraParams) {
                btn.classList.add("bg-stone-300"); // Visual active state for tailwind btn
            } else {
                btn.classList.remove("bg-stone-300");
            }
            document.getElementById("cameraInfo").style.display = showCameraParams ? "block" : "none";
        });
    }

    engine.runRenderLoop(() => scene.render());
    window.addEventListener("resize", () => engine.resize());

})();
