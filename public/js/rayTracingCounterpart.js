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

        // --- 2. Image Plane ---
        const gridSize = 10;
        const resolution = 16;
        const pixelSize = gridSize / resolution;
        
        const cellMaterial = new BABYLON.StandardMaterial("cellMaterial", scene);
        cellMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        cellMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        cellMaterial.alpha = 0;
        cellMaterial.specularColor = new BABYLON.Color3(0, 0, 0);

        const paintedMat = new BABYLON.StandardMaterial("paintedMat", scene);
        paintedMat.diffuseColor = new BABYLON.Color3(0.5, 0.9, 0.5); // Lighter green
        paintedMat.emissiveColor = new BABYLON.Color3(0.4, 0.7, 0.4); // Self-illuminated green
        paintedMat.specularColor = new BABYLON.Color3(0, 0, 0);
        paintedMat.backFaceCulling = false; // Show on both sides

        const frameGroup = new BABYLON.TransformNode("frameGroup", scene);
        for (let x = 0; x < resolution; x++) {
            for (let y = 0; y < resolution; y++) {
                // Include canvasId to make cells uniquely identifiable for animation
                const cell = BABYLON.MeshBuilder.CreatePlane(`cell_${canvasId}_${x}_${y}`, { 
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
        if (showLabels) addLabel("Image Plane", frameGroup, new BABYLON.Vector3(0, 6, 0));

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
            
            // Intersection with the grid plane (z = 2.25)
            const tPlane = (2.25 - lensOrigin.z) / direction.z;
            const ix = lensOrigin.x + direction.x * tPlane;
            const iy = lensOrigin.y + direction.y * tPlane;
            const gridX = Math.round(ix / pixelSize + (resolution - 1) / 2);
            const gridY = Math.round(iy / pixelSize + (resolution - 1) / 2);

            // --- 5. Visual Rays (Animated or Static) ---
            const bulbPos = new BABYLON.Vector3(0, 15, -11);
            let rayLine = null;
            let lightRayLine = null;

            const blackMat = new BABYLON.StandardMaterial("blackMat", scene);
            blackMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
            blackMat.specularColor = new BABYLON.Color3(0, 0, 0);

            const goldMat = new BABYLON.StandardMaterial("goldMat", scene);
            goldMat.diffuseColor = new BABYLON.Color3(0.8, 0.6, 0.2);
            
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
                lightRayLine.material = blackMat;
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
            arrowHead.material = blackMat;

            const lightArrowHead = BABYLON.MeshBuilder.CreateCylinder("lightArrowHead", {
                diameterTop: 0,
                diameterBottom: 0.4,
                height: arrowHeight,
                tessellation: 12
            }, scene);
            lightArrowHead.material = blackMat; // Was goldMat, now black
            lightArrowHead.setEnabled(false);

            // --- 6. Secondary Recursive Ray (For Slide 2) ---
            const target2 = new BABYLON.Vector3(0, -1.0, -11); // Top of sphere
            const dir2 = target2.subtract(lensOrigin).normalize();
            const surf2 = target2; // Simplified
            const dist2 = BABYLON.Vector3.Distance(lensOrigin, surf2);
            
            // Grid intersection for Ray 2
            const tP2 = (2.25 - lensOrigin.z) / dir2.z;
            const i2x = lensOrigin.x + dir2.x * tP2;
            const i2y = lensOrigin.y + dir2.y * tP2;
            const g2X = Math.round(i2x / pixelSize + (resolution - 1) / 2);
            const g2Y = Math.round(i2y / pixelSize + (resolution - 1) / 2);

            const cubePos = new BABYLON.Vector3(-10, 5, -13);
            const cubeFace = new BABYLON.Vector3(-8.25, 3.95, -12.65); // Right face (facing the sphere)
            
            const bluePaintedMat = new BABYLON.StandardMaterial("bluePaintedMat", scene);
            bluePaintedMat.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.8);
            bluePaintedMat.specularColor = new BABYLON.Color3(0, 0, 0);

            // Create meshes for recursive path
            const r2_1 = BABYLON.MeshBuilder.CreateCylinder("r2_1", { height: dist2, diameter: 0.05 }, scene);
            r2_1.material = blackMat;
            r2_1.position = lensOrigin.add(dir2.scale(dist2/2));
            r2_1.lookAt(surf2);
            r2_1.rotate(BABYLON.Axis.X, Math.PI/2);
            r2_1.setEnabled(false);

            const r2_1_arrow = arrowHead.clone("r2_1_arrow");
            r2_1_arrow.setEnabled(false);

            const dist2_2 = BABYLON.Vector3.Distance(surf2, cubeFace);
            const dir2_2 = cubeFace.subtract(surf2).normalize();
            const r2_2 = BABYLON.MeshBuilder.CreateCylinder("r2_2", { height: dist2_2, diameter: 0.05 }, scene);
            r2_2.material = blackMat;
            r2_2.position = surf2.add(dir2_2.scale(dist2_2/2));
            r2_2.lookAt(cubeFace);
            r2_2.rotate(BABYLON.Axis.X, Math.PI/2);
            r2_2.setEnabled(false);

            const r2_2_arrow = arrowHead.clone("r2_2_arrow");
            r2_2_arrow.setEnabled(false);

            const dist2_3 = BABYLON.Vector3.Distance(cubeFace, bulbPos) - 2.1;
            const dir2_3 = bulbPos.subtract(cubeFace).normalize();
            const r2_3 = BABYLON.MeshBuilder.CreateCylinder("r2_3", { height: dist2_3, diameter: 0.05 }, scene);
            r2_3.material = blackMat;
            r2_3.position = cubeFace.add(dir2_3.scale(dist2_3/2));
            r2_3.lookAt(bulbPos);
            r2_3.rotate(BABYLON.Axis.X, Math.PI/2);
            r2_3.setEnabled(false);

            const r2_3_arrow = arrowHead.clone("r2_3_arrow");
            r2_3_arrow.setEnabled(false);

            // --- 7. Shadow Ray Path (For Slide 3) ---
            const target3 = new BABYLON.Vector3(0.5, -1.2, -11); // Slightly off-center top
            const dir3 = target3.subtract(lensOrigin).normalize();
            const dist3 = BABYLON.Vector3.Distance(lensOrigin, target3);
            
            // Grid intersection for Ray 3
            const tP3 = (2.25 - lensOrigin.z) / dir3.z;
            const i3x = lensOrigin.x + dir3.x * tP3;
            const i3y = lensOrigin.y + dir3.y * tP3;
            const g3X = Math.round(i3x / pixelSize + (resolution - 1) / 2);
            const g3Y = Math.round(i3y / pixelSize + (resolution - 1) / 2);

            const redCubeBottom = new BABYLON.Vector3(0.5, 4.25, -11); // Hit point on red cube bottom
            const dist3_2 = BABYLON.Vector3.Distance(target3, redCubeBottom);
            const dir3_2 = redCubeBottom.subtract(target3).normalize();

            // Meshes for Ray 3
            const r3_1 = BABYLON.MeshBuilder.CreateCylinder("r3_1", { height: dist3, diameter: 0.05 }, scene);
            r3_1.material = blackMat;
            r3_1.position = lensOrigin.add(dir3.scale(dist3/2));
            r3_1.lookAt(target3);
            r3_1.rotate(BABYLON.Axis.X, Math.PI/2);
            r3_1.setEnabled(false);

            const r3_1_arrow = arrowHead.clone("r3_1_arrow");
            r3_1_arrow.setEnabled(false);

            const r3_2 = BABYLON.MeshBuilder.CreateCylinder("r3_2", { height: dist3_2, diameter: 0.05 }, scene);
            r3_2.material = blackMat;
            r3_2.position = target3.add(dir3_2.scale(dist3_2/2));
            r3_2.lookAt(redCubeBottom);
            r3_2.rotate(BABYLON.Axis.X, Math.PI/2);
            r3_2.setEnabled(false);

            const r3_2_arrow = arrowHead.clone("r3_2_arrow");
            r3_2_arrow.setEnabled(false);

            if (!animateRay) {
                arrowHead.position = surfacePoint.subtract(direction.scale(arrowHeight / 2));
                arrowHead.lookAt(spherePos);
                arrowHead.rotate(BABYLON.Axis.X, Math.PI / 2); 
            } else {
                arrowHead.setEnabled(false);
                let progress = 0;
                let pixelPainted = false;
                let pixel2Painted = false;
                let pixel3Painted = false;

                scene.onBeforeRenderObservable.add(() => {
                    const cube = scene.getMeshByName("obstacleCube");
                    if (cube) cube.setEnabled(window.currentRayStep > 1 && window.currentRayStep < 3); // Hide blue in 3
                    const occluderLabel = scene.getMeshByName("Occluder_anchor");
                    if (occluderLabel) occluderLabel.setEnabled(window.currentRayStep > 1 && window.currentRayStep < 3);

                    const redCube = scene.getMeshByName("redCube");
                    if (redCube) redCube.setEnabled(window.currentRayStep === 3);

                    // --- Slide 3: Shadow Animation ---
                    if (window.currentRayStep === 3) {
                        progress += 0.01;
                        if (progress > 1.8) {
                            progress = 0;
                            const cell = scene.getMeshByName(`cell_${canvasId}_${g3X}_${g3Y}`);
                            if (cell) cell.material = cellMaterial;
                            pixel3Painted = false;
                        }

                        // Persist previous results
                        const c1 = scene.getMeshByName(`cell_${canvasId}_${gridX}_${gridY}`);
                        if (c1) c1.material = paintedMat;
                        const c2 = scene.getMeshByName(`cell_${canvasId}_${g2X}_${g2Y}`);
                        if (c2) c2.material = paintedMat;

                        // Hide other steps' rays
                        rayLine.setEnabled(false);
                        lightRayLine.setEnabled(false);
                        arrowHead.setEnabled(false);
                        lightArrowHead.setEnabled(false);
                        r2_1.setEnabled(false);
                        r2_1_arrow.setEnabled(false);
                        r2_2.setEnabled(false);
                        r2_2_arrow.setEnabled(false);
                        r2_3.setEnabled(false);
                        r2_3_arrow.setEnabled(false);

                        // Phase 1: Lens -> Sphere
                        if (progress <= 0.6) {
                            const p = progress / 0.6;
                            const ep = lensOrigin.add(dir3.scale(dist3 * p));
                            r3_1.setEnabled(true);
                            r3_1.scaling.y = p;
                            r3_1.position = lensOrigin.add(dir3.scale((dist3 * p) / 2));
                            r3_1_arrow.setEnabled(true);
                            r3_1_arrow.position = ep.subtract(dir3.scale(arrowHeight / 2));
                            r3_1_arrow.lookAt(target3);
                            r3_1_arrow.rotate(BABYLON.Axis.X, Math.PI / 2);
                            r3_2.setEnabled(false);
                            r3_2_arrow.setEnabled(false);
                        } 
                        // Phase 2: Sphere -> Red Cube Bottom
                        else if (progress <= 1.2) {
                            const p = (progress - 0.6) / 0.6;
                            const ep = target3.add(dir3_2.scale(dist3_2 * p));
                            
                            // Ensure Segment 1 is finalized
                            r3_1.setEnabled(true);
                            r3_1.scaling.y = 1.0;
                            r3_1.position = lensOrigin.add(dir3.scale(dist3 / 2));
                            r3_1_arrow.setEnabled(true);
                            r3_1_arrow.position = target3.subtract(dir3.scale(arrowHeight / 2));
                            r3_1_arrow.lookAt(target3);
                            r3_1_arrow.rotate(BABYLON.Axis.X, Math.PI / 2);

                            r3_2.setEnabled(true);
                            r3_2.scaling.y = p;
                            r3_2.position = target3.add(dir3_2.scale((dist3_2 * p) / 2));
                            r3_2_arrow.setEnabled(true);
                            r3_2_arrow.position = ep.subtract(dir3_2.scale(arrowHeight / 2));
                            r3_2_arrow.lookAt(redCubeBottom);
                            r3_2_arrow.rotate(BABYLON.Axis.X, Math.PI / 2);
                        }
                        // Phase 3: Paint Black
                        else if (progress > 1.2) {
                            // Finalize all segments
                            r3_1.setEnabled(true);
                            r3_1.scaling.y = 1.0;
                            r3_1.position = lensOrigin.add(dir3.scale(dist3 / 2));
                            r3_1_arrow.setEnabled(true);
                            r3_1_arrow.position = target3.subtract(dir3.scale(arrowHeight / 2));
                            r3_1_arrow.lookAt(target3);
                            r3_1_arrow.rotate(BABYLON.Axis.X, Math.PI / 2);

                            r3_2.setEnabled(true);
                            r3_2.scaling.y = 1.0;
                            r3_2.position = target3.add(dir3_2.scale(dist3_2 / 2));
                            r3_2_arrow.setEnabled(true);
                            r3_2_arrow.position = redCubeBottom.subtract(dir3_2.scale(arrowHeight / 2));
                            r3_2_arrow.lookAt(redCubeBottom);
                            r3_2_arrow.rotate(BABYLON.Axis.X, Math.PI / 2);

                            if (!pixel3Painted) {
                                const cell = scene.getMeshByName(`cell_${canvasId}_${g3X}_${g3Y}`);
                                if (cell) cell.material = blackMat;
                                pixel3Painted = true;
                            }
                        }
                        return;
                    }

                    // --- Slide 2: Recursive Path Animation ---
                    if (window.currentRayStep === 2) {
                        progress += 0.01;
                        if (progress > 2.2) {
                            progress = 0;
                            const cell = scene.getMeshByName(`cell_${canvasId}_${g2X}_${g2Y}`);
                            if (cell) cell.material = cellMaterial;
                            pixel2Painted = false;
                        }

                        // Persist Slide 1 result
                        const cell1 = scene.getMeshByName(`cell_${canvasId}_${gridX}_${gridY}`);
                        if (cell1) cell1.material = paintedMat;

                        // Hide other steps' rays
                        rayLine.setEnabled(false);
                        lightRayLine.setEnabled(false);
                        arrowHead.setEnabled(false);
                        lightArrowHead.setEnabled(false);
                        r3_1.setEnabled(false);
                        r3_1_arrow.setEnabled(false);
                        r3_2.setEnabled(false);
                        r3_2_arrow.setEnabled(false);

                        // Recursive Phases
                        if (progress <= 0.6) {
                            const p = progress / 0.6;
                            const ep = lensOrigin.add(dir2.scale(dist2 * p));
                            r2_1.setEnabled(true);
                            r2_1.scaling.y = p;
                            r2_1.position = lensOrigin.add(dir2.scale((dist2 * p) / 2));
                            r2_1_arrow.setEnabled(true);
                            r2_1_arrow.position = ep.subtract(dir2.scale(arrowHeight / 2));
                            r2_1_arrow.lookAt(target2);
                            r2_1_arrow.rotate(BABYLON.Axis.X, Math.PI / 2);
                            r2_2.setEnabled(false);
                            r2_2_arrow.setEnabled(false);
                            r2_3.setEnabled(false);
                            r2_3_arrow.setEnabled(false);
                        } else if (progress <= 1.2) {
                            const p = (progress - 0.6) / 0.6;
                            const ep = surf2.add(dir2_2.scale(dist2_2 * p));

                            // Ensure Segment 1 is finalized
                            r2_1.setEnabled(true);
                            r2_1.scaling.y = 1.0;
                            r2_1.position = lensOrigin.add(dir2.scale(dist2 / 2));
                            r2_1_arrow.setEnabled(true);
                            r2_1_arrow.position = target2.subtract(dir2.scale(arrowHeight / 2));
                            r2_1_arrow.lookAt(target2);
                            r2_1_arrow.rotate(BABYLON.Axis.X, Math.PI / 2);

                            r2_2.setEnabled(true);
                            r2_2.scaling.y = p;
                            r2_2.position = surf2.add(dir2_2.scale((dist2_2 * p) / 2));
                            r2_2_arrow.setEnabled(true);
                            r2_2_arrow.position = ep.subtract(dir2_2.scale(arrowHeight / 2));
                            r2_2_arrow.lookAt(cubeFace);
                            r2_2_arrow.rotate(BABYLON.Axis.X, Math.PI / 2);
                            r2_3.setEnabled(false);
                            r2_3_arrow.setEnabled(false);
                        } else if (progress <= 1.8) {
                            const p = (progress - 1.2) / 0.6;
                            const ep = cubeFace.add(dir2_3.scale(dist2_3 * p));

                            // Ensure Segments 1 & 2 are finalized
                            r2_1.setEnabled(true);
                            r2_1.scaling.y = 1.0;
                            r2_1.position = lensOrigin.add(dir2.scale(dist2 / 2));
                            r2_1_arrow.setEnabled(true);
                            r2_1_arrow.position = target2.subtract(dir2.scale(arrowHeight / 2));
                            r2_1_arrow.lookAt(target2);
                            r2_1_arrow.rotate(BABYLON.Axis.X, Math.PI / 2);

                            r2_2.setEnabled(true);
                            r2_2.scaling.y = 1.0;
                            r2_2.position = surf2.add(dir2_2.scale(dist2_2 / 2));
                            r2_2_arrow.setEnabled(true);
                            r2_2_arrow.position = cubeFace.subtract(dir2_2.scale(arrowHeight / 2));
                            r2_2_arrow.lookAt(cubeFace);
                            r2_2_arrow.rotate(BABYLON.Axis.X, Math.PI / 2);

                            r2_3.setEnabled(true);
                            r2_3.scaling.y = p;
                            r2_3.position = cubeFace.add(dir2_3.scale((dist2_3 * p) / 2));
                            r2_3_arrow.setEnabled(true);
                            r2_3_arrow.position = ep.subtract(dir2_3.scale(arrowHeight / 2));
                            r2_3_arrow.lookAt(bulbPos);
                            r2_3_arrow.rotate(BABYLON.Axis.X, Math.PI / 2);
                        } else if (progress > 1.8 && !pixel2Painted) {
                            const cell = scene.getMeshByName(`cell_${canvasId}_${g2X}_${g2Y}`);
                            if (cell) cell.material = paintedMat;
                            pixel2Painted = true;
                        }
                        return;
                    }

                    // --- Slide 1: Primary Ray Animation ---
                    // Hide other steps' rays
                    r2_1.setEnabled(false);
                    r2_1_arrow.setEnabled(false);
                    r2_2.setEnabled(false);
                    r2_2_arrow.setEnabled(false);
                    r2_3.setEnabled(false);
                    r2_3_arrow.setEnabled(false);
                    r3_1.setEnabled(false);
                    r3_1_arrow.setEnabled(false);
                    r3_2.setEnabled(false);
                    r3_2_arrow.setEnabled(false);

                    progress += 0.008; 
                    if (progress > 1.8) {
                        progress = 0;
                        if (pixelPainted) {
                            const cell = scene.getMeshByName(`cell_${canvasId}_${gridX}_${gridY}`);
                            if (cell) cell.material = cellMaterial;
                            pixelPainted = false;
                        }
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
                        const toBulbDir = bulbPos.subtract(surfacePoint).normalize();
                        const toBulbDist = BABYLON.Vector3.Distance(surfacePoint, bulbPos) - 2.2;
                        const d2 = toBulbDist * p2;
                        const ep2 = surfacePoint.add(toBulbDir.scale(d2));

                        // Finalize Slide 1 Segment 1
                        rayLine.setEnabled(true);
                        rayLine.scaling.y = 1.0;
                        rayLine.position = lensOrigin.add(direction.scale(totalDistance / 2));
                        arrowHead.setEnabled(true);
                        arrowHead.position = surfacePoint.subtract(direction.scale(arrowHeight / 2));
                        arrowHead.lookAt(spherePos);
                        arrowHead.rotate(BABYLON.Axis.X, Math.PI / 2);

                        lightRayLine.setEnabled(p2 > 0.01);
                        lightRayLine.scaling.y = p2;
                        lightRayLine.position = surfacePoint.add(toBulbDir.scale(d2 / 2));
                        lightArrowHead.setEnabled(p2 > 0.01);
                        lightArrowHead.position = ep2.subtract(toBulbDir.scale(arrowHeight / 2));
                        lightArrowHead.lookAt(bulbPos);
                        lightArrowHead.rotate(BABYLON.Axis.X, Math.PI / 2);
                    } else if (progress > 1.2 && !pixelPainted) {
                        const cell = scene.getMeshByName(`cell_${canvasId}_${gridX}_${gridY}`);
                        if (cell) {
                            cell.material = paintedMat;
                            pixelPainted = true;
                        }
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


        // --- 3. Subject & Obstacles ---
        if (typeof buildProceduralSphere === "function") {
            const sphere = buildProceduralSphere("subjectSphere", scene, { diameter: 4.0 });
            sphere.position.set(0, -3.0, -11);
            
            // Add blue cube obstacle
            const cube = BABYLON.MeshBuilder.CreateBox("obstacleCube", { size: 3.5 }, scene);
            cube.position.set(-10, 5, -13);
            const cubeMat = new BABYLON.StandardMaterial("cubeMat", scene);
            cubeMat.diffuseColor = new BABYLON.Color3(0.2, 0.4, 0.8); // Sober blue
            cubeMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            cube.material = cubeMat;

            // Add red cube (Slide 3 specific)
            const redCube = BABYLON.MeshBuilder.CreateBox("redCube", { size: 3.5 }, scene);
            redCube.position.set(0, 6, -11);
            const redCubeMat = new BABYLON.StandardMaterial("redCubeMat", scene);
            redCubeMat.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2); // Vibrant red
            redCubeMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            redCube.material = redCubeMat;
            redCube.setEnabled(false);

            const sphereMaterial = new BABYLON.StandardMaterial("sphereMat", scene);
            sphereMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.9, 0.5);
            sphereMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
            sphereMaterial.specularPower = 32;
            sphere.material = sphereMaterial;
            if (showLabels) {
                addLabel("Object", sphere, new BABYLON.Vector3(0, 3, 0));
                addLabel("Occluder", cube, new BABYLON.Vector3(0, 3, 0));
            }
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
    // Walkthrough logic for Ray Tracing section
    window.currentRayStep = 1;
    const totalRaySteps = 3;
    const raySteps = document.querySelectorAll('#raytracing-steps .step');
    const prevBtn = document.getElementById('prevRaytracingBtn');
    const nextBtn = document.getElementById('nextRaytracingBtn');
    const prevCanvasBtn = document.getElementById('raytracingPrev');
    const nextCanvasBtn = document.getElementById('raytracingNext');

    function updateRaySteps() {
        raySteps.forEach(step => {
            step.classList.toggle('active', parseInt(step.dataset.step) === window.currentRayStep);
        });
        if (prevBtn) prevBtn.disabled = window.currentRayStep === 1;
        if (nextBtn) nextBtn.disabled = window.currentRayStep === totalRaySteps;
        if (prevCanvasBtn) prevCanvasBtn.disabled = window.currentRayStep === 1;
        if (nextCanvasBtn) nextCanvasBtn.disabled = window.currentRayStep === totalRaySteps;
    }

    [nextBtn, nextCanvasBtn].forEach(btn => {
        if (btn) btn.addEventListener('click', () => {
            if (window.currentRayStep < totalRaySteps) {
                window.currentRayStep++;
                updateRaySteps();
            }
        });
    });

    [prevBtn, prevCanvasBtn].forEach(btn => {
        if (btn) btn.addEventListener('click', () => {
            if (window.currentRayStep > 1) {
                window.currentRayStep--;
                updateRaySteps();
            }
        });
    });

    updateRaySteps(); // Initial state
})();
