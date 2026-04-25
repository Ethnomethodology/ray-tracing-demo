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
    function initRayTracingScene(canvasId, showLabels = true, animateRay = false) {
        const canvas = document.getElementById(canvasId);
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

        // --- 6. Annotations (GUI) ---
        let advancedTexture = null;
        if (showLabels) {
            advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
        }

        function addLabel(name, targetMesh, localPos = BABYLON.Vector3.Zero()) {
            if (!showLabels || !advancedTexture) return;

            // Create an invisible anchor mesh at a specific 3D location relative to the target
            const anchor = new BABYLON.AbstractMesh(name + "_anchor", scene);
            anchor.parent = targetMesh;
            anchor.position.copyFrom(localPos);

            const label = new BABYLON.GUI.Rectangle();
            label.width = "140px";
            label.height = "40px";
            label.thickness = 0;
            label.background = "transparent";
            advancedTexture.addControl(label);
            
            const text = new BABYLON.GUI.TextBlock();
            text.text = name;
            text.color = "#333333";
            text.fontSize = 20;
            text.fontFamily = "Newsreader, serif";
            text.fontWeight = "500";
            label.addControl(text);
            
            label.linkWithMesh(anchor);
            label.linkOffsetX = 0;
            label.linkOffsetY = 0;
            return label;
        }

        // --- 1. Camera Model ---
        const cameraPos = new BABYLON.Vector3(0, 8, 14);
        const spherePos = new BABYLON.Vector3(0, -3.0, -11);

        BABYLON.SceneLoader.ImportMeshAsync("", "models/", "camera.glb", scene).then((result) => {
            const cameraModel = result.meshes[0];
            cameraModel.position.copyFrom(cameraPos);
            cameraModel.scaling.setAll(0.8);
            
            cameraModel.lookAt(spherePos);

            const boundingInfo = cameraModel.getHierarchyBoundingVectors();
            const center = BABYLON.Vector3.Center(boundingInfo.min, boundingInfo.max);
            
            let lensOrigin = center.clone();
            const meshes = cameraModel.getChildMeshes();
            const lensMesh = meshes.find(m => 
                m.name.toLowerCase().includes("lens") || 
                m.name.toLowerCase().includes("glass") ||
                m.name.toLowerCase().includes("optics")
            );

            if (lensMesh) {
                lensOrigin = lensMesh.getAbsolutePosition();
            } else {
                const forward = spherePos.subtract(cameraPos).normalize();
                const up = BABYLON.Vector3.Up();
                const right = BABYLON.Vector3.Cross(up, forward).normalize();
                const realUp = BABYLON.Vector3.Cross(forward, right).normalize();
                lensOrigin = center.add(forward.scale(1.2)).add(realUp.scale(-0.4));
            }

            cameraModel.lookAt(spherePos);

            const direction = spherePos.subtract(lensOrigin).normalize();
            const surfacePoint = spherePos.subtract(direction.scale(2.0)); 
            const totalDistance = BABYLON.Vector3.Distance(lensOrigin, surfacePoint);
            
            // --- 5. Visual Rays (Animated or Static) ---
            const bulbPos = new BABYLON.Vector3(0, 15, -11);
            let rayLine = null;
            let lightRayLine = null;
            
            if (!animateRay) {
                rayLine = BABYLON.MeshBuilder.CreateDashedLines("rayLine", {
                    points: [lensOrigin, surfacePoint],
                    dashSize: 1,
                    gapSize: 0.5
                }, scene);
                rayLine.color = new BABYLON.Color3(0, 0, 0);
            } else {
                // Sighting Ray (Camera -> Sphere)
                rayLine = BABYLON.MeshBuilder.CreateCylinder("rayLine", {
                    height: totalDistance,
                    diameter: 0.05
                }, scene);
                const rayMat = new BABYLON.StandardMaterial("rayMat", scene);
                rayMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
                rayMat.specularColor = new BABYLON.Color3(0, 0, 0);
                rayLine.material = rayMat;
                rayLine.position = lensOrigin.add(direction.scale(totalDistance / 2));
                rayLine.lookAt(surfacePoint);
                rayLine.rotate(BABYLON.Axis.X, Math.PI / 2);
                rayLine.setEnabled(false);

                // Shadow Ray (Sphere -> Bulb)
                const toBulbDir = bulbPos.subtract(surfacePoint).normalize();
                const toBulbDist = BABYLON.Vector3.Distance(surfacePoint, bulbPos) - 2.2; // Stop at the bulb surface
                lightRayLine = BABYLON.MeshBuilder.CreateCylinder("lightRayLine", {
                    height: toBulbDist,
                    diameter: 0.05
                }, scene);
                const lightRayMat = new BABYLON.StandardMaterial("lightRayMat", scene);
                lightRayMat.diffuseColor = new BABYLON.Color3(0.8, 0.6, 0.2); // Golden color for light ray
                lightRayMat.emissiveColor = new BABYLON.Color3(0.4, 0.3, 0.1);
                lightRayLine.material = lightRayMat;
                lightRayLine.position = surfacePoint.add(toBulbDir.scale(toBulbDist / 2));
                lightRayLine.lookAt(bulbPos);
                lightRayLine.rotate(BABYLON.Axis.X, Math.PI / 2);
                lightRayLine.setEnabled(false);
            }

            const arrowHeight = 0.6;
            const arrowHead = BABYLON.MeshBuilder.CreateCylinder("arrowHead", {
                diameterTop: 0,
                diameterBottom: 0.4,
                height: arrowHeight,
                tessellation: 12
            }, scene);
            
            const blackMat = new BABYLON.StandardMaterial("blackMat", scene);
            blackMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
            blackMat.specularColor = new BABYLON.Color3(0, 0, 0);
            arrowHead.material = blackMat;

            const lightArrowHead = BABYLON.MeshBuilder.CreateCylinder("lightArrowHead", {
                diameterTop: 0,
                diameterBottom: 0.4,
                height: arrowHeight,
                tessellation: 12
            }, scene);
            const goldMat = new BABYLON.StandardMaterial("goldMat", scene);
            goldMat.diffuseColor = new BABYLON.Color3(0.8, 0.6, 0.2);
            lightArrowHead.material = goldMat;
            lightArrowHead.setEnabled(false);

            if (!animateRay) {
                arrowHead.position = surfacePoint.subtract(direction.scale(arrowHeight / 2));
                arrowHead.lookAt(spherePos);
                arrowHead.rotate(BABYLON.Axis.X, Math.PI / 2); 
            } else {
                arrowHead.setEnabled(false);
                let progress = 0;
                scene.onBeforeRenderObservable.add(() => {
                    progress += 0.008; 
                    if (progress > 1.5) progress = 0; // Reset after pause

                    // Phase 1: Camera -> Sphere (0.0 to 0.6)
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
                    } 
                    // Phase 2: Sphere -> Bulb (0.6 to 1.2)
                    else if (progress <= 1.2) {
                        const p2 = Math.min((progress - 0.6) / 0.6, 1.0);
                        const toBulbDir = bulbPos.subtract(surfacePoint).normalize();
                        const toBulbDist = BABYLON.Vector3.Distance(surfacePoint, bulbPos) - 2.2;
                        const d2 = toBulbDist * p2;
                        const ep2 = surfacePoint.add(toBulbDir.scale(d2));

                        rayLine.setEnabled(true);
                        rayLine.scaling.y = 1.0;
                        rayLine.position = lensOrigin.add(direction.scale(totalDistance / 2));
                        arrowHead.setEnabled(true);

                        lightRayLine.setEnabled(p2 > 0.01);
                        lightRayLine.scaling.y = p2;
                        lightRayLine.position = surfacePoint.add(toBulbDir.scale(d2 / 2));

                        lightArrowHead.setEnabled(p2 > 0.01);
                        lightArrowHead.position = ep2.subtract(toBulbDir.scale(arrowHeight / 2));
                        lightArrowHead.lookAt(bulbPos);
                        lightArrowHead.rotate(BABYLON.Axis.X, Math.PI / 2);
                    }
                });
            }

            if (showLabels) {
                addLabel("Camera", cameraModel, new BABYLON.Vector3(-3, 4, -2));
                const rayMidPoint = new BABYLON.AbstractMesh("rayMidPoint", scene);
                rayMidPoint.position = lensOrigin.scale(0.25).add(surfacePoint.scale(0.75));
                addLabel("Ray", rayMidPoint, new BABYLON.Vector3(0, 1.5, 0));
            }
        });

        // --- 2. Image Plane ---
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
                const cell = BABYLON.MeshBuilder.CreatePlane(`cell_${x}_${y}`, { size: pixelSize }, scene);
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
        if (showLabels) addLabel("Image Plane", frameGroup, new BABYLON.Vector3(0, 6, 0));

        // --- 3. Subject ---
        if (typeof buildProceduralSphere === "function") {
            const sphere = buildProceduralSphere("subjectSphere", scene, { diameter: 4.0 });
            sphere.position.set(0, -3.0, -11);
            const sphereMaterial = new BABYLON.StandardMaterial("sphereMat", scene);
            sphereMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.4, 0.2);
            sphereMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
            sphereMaterial.specularPower = 32;
            sphere.material = sphereMaterial;
            if (showLabels) addLabel("Object", sphere, new BABYLON.Vector3(0, 3, 0));
        }

        // --- 4. Light Source ---
        const bulbPos = new BABYLON.Vector3(0, 15, -11);
        BABYLON.SceneLoader.ImportMeshAsync("", "models/", "bulb.glb", scene).then((result) => {
            const bulbModel = result.meshes[0];
            bulbModel.position.copyFrom(bulbPos);
            bulbModel.scaling.setAll(0.3);
            bulbModel.rotationQuaternion = BABYLON.Quaternion.RotationAxis(BABYLON.Axis.X, Math.PI);
            
            const pointLight = new BABYLON.PointLight("pointLight", bulbPos, scene);
            pointLight.intensity = 1.5;
            pointLight.diffuse = new BABYLON.Color3(1, 1, 0.9);
            pointLight.range = 35;
            if (showLabels) addLabel("Light", bulbModel, new BABYLON.Vector3(2, -4, 0));
        });

        engine.runRenderLoop(() => scene.render());
        window.addEventListener("resize", () => engine.resize());
    }

    // Initialize scenes
    initRayTracingScene("rayTracingCanvas", true, false);
    initRayTracingScene("rayTracingCanvasFinal", false, true);
})();
