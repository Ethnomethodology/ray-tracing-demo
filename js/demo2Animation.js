/**
 * demo2Animation.js
 * ───────────────────────
 * Custom Direct Illumination Animation & Static Scene
 * - Camera is a simple point
 * - Object is a glass sphere
 * - Light is a square
 */
(function () {
    // Initialize both scenes
    initStaticScene();
    initAnimatedScene();

    function initStaticScene() {
        const canvas = document.getElementById("rayTracingCanvas");
        if (!canvas) return;

        const engine = new BABYLON.Engine(canvas, true, { alpha: true });
        engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

        const hemiLight = new BABYLON.HemisphericLight("staticHemiLight", new BABYLON.Vector3(0, 1, 0), scene);
        hemiLight.intensity = 0.5;
        hemiLight.groundColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        const sceneCamera = new BABYLON.ArcRotateCamera(
            "staticSceneCamera", -Math.PI / 5, Math.PI / 2.3, 28,
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
        const cameraPoint = BABYLON.MeshBuilder.CreateSphere("staticCameraPoint", { diameter: 0.5 }, scene);
        cameraPoint.position.copyFrom(cameraPos);
        const camMat = new BABYLON.StandardMaterial("staticCamMat", scene);
        camMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        camMat.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        cameraPoint.material = camMat;

        // --- 2. Image Plane ---
        const gridSize = 10;
        const resolution = 16;
        const pixelSize = gridSize / resolution;
        
        const cellMaterial = new BABYLON.StandardMaterial("staticCellMaterial", scene);
        cellMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        cellMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        cellMaterial.alpha = 0;
        
        const frameGroup = new BABYLON.TransformNode("staticFrameGroup", scene);
        for (let x = 0; x < resolution; x++) {
            for (let y = 0; y < resolution; y++) {
                const cell = BABYLON.MeshBuilder.CreatePlane(`staticCell_${x}_${y}`, { 
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
        const glassSphere = BABYLON.MeshBuilder.CreateSphere("staticGlassSphere", { diameter: 4.0, segments: 32 }, scene);
        glassSphere.position.copyFrom(spherePos);
        
        const glassMat = new BABYLON.StandardMaterial("staticGlassMat", scene);
        glassMat.disableLighting = true; 
        glassMat.emissiveColor = new BABYLON.Color3(0.95, 0.95, 0.95); 
        glassMat.alpha = 0.05; 

        // Use Fresnel parameters to create glass-like edges
        const fresnel = new BABYLON.FresnelParameters();
        fresnel.isEnabled = true;
        fresnel.bias = 0.1;
        fresnel.power = 2.0;
        fresnel.leftColor = BABYLON.Color3.White();  
        fresnel.rightColor = BABYLON.Color3.Black(); 
        glassMat.opacityFresnelParameters = fresnel;

        glassSphere.material = glassMat;

        // --- 4. Square Light Source ---
        const lightSquare = BABYLON.MeshBuilder.CreatePlane("staticLightSquare", { size: 3.0 }, scene);
        lightSquare.position.copyFrom(lightPos);
        lightSquare.rotation.x = Math.PI / 2; 
        
        const lightMat = new BABYLON.StandardMaterial("staticLightMat", scene);
        lightMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
        lightMat.disableLighting = true; 
        lightSquare.material = lightMat;

        // Show triangulated borders
        lightSquare.enableEdgesRendering();
        lightSquare.edgesWidth = 4.0;
        lightSquare.edgesColor = new BABYLON.Color4(0.2, 0.2, 0.2, 1);
        
        const pointLight = new BABYLON.PointLight("staticPointLight", lightPos, scene);
        pointLight.intensity = 1.0;
        pointLight.diffuse = new BABYLON.Color3(1, 1, 1);

        // --- 5. Ray Paths (Static Camera Ray Only) ---
        const lensOrigin = cameraPoint.position;
        const direction = spherePos.subtract(lensOrigin).normalize();
        const surfacePoint = spherePos.subtract(direction.scale(2.0)); 
        const totalDistance = BABYLON.Vector3.Distance(lensOrigin, surfacePoint);

        const blackMat = new BABYLON.StandardMaterial("staticBlackMat", scene);
        blackMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
        blackMat.specularColor = new BABYLON.Color3(0, 0, 0);

        // First ray cylinder
        const rayLine = BABYLON.MeshBuilder.CreateCylinder("staticRayLine", {
            height: totalDistance,
            diameter: 0.05
        }, scene);
        rayLine.material = blackMat;
        rayLine.position = lensOrigin.add(direction.scale(totalDistance / 2));
        rayLine.lookAt(surfacePoint);
        rayLine.rotate(BABYLON.Axis.X, Math.PI / 2);

        // Arrowhead pointing at the sphere
        const arrowHeight = 0.6;
        const arrowHead = BABYLON.MeshBuilder.CreateCylinder("staticArrowHead", {
            diameterTop: 0,
            diameterBottom: 0.4,
            height: arrowHeight,
            tessellation: 12
        }, scene);
        arrowHead.material = blackMat;
        arrowHead.position = surfacePoint.subtract(direction.scale(arrowHeight / 2));
        arrowHead.lookAt(spherePos);
        arrowHead.rotate(BABYLON.Axis.X, Math.PI / 2);

        // --- 6. Dynamic annotation pill positioning ---
        scene.onAfterRenderObservable.add(() => {
            const w    = engine.getRenderWidth();
            const h    = engine.getRenderHeight();
            const vp   = sceneCamera.viewport.toGlobal(w, h);
            const tf   = scene.getTransformMatrix();
            const rect = canvas.getBoundingClientRect();

            const rayPoint = cameraPos.add(surfacePoint.subtract(cameraPos).scale(0.78));

            const annotations = [
                { id: "static-pill-1", world: cameraPos.add(new BABYLON.Vector3(1.5, 0.5, 0)) }, // next to camera
                { id: "static-pill-2", world: new BABYLON.Vector3(0, 6.7, 2.25) },              // on top of screen (moved up)
                { id: "static-pill-3", world: rayPoint.add(new BABYLON.Vector3(0, 1.2, 0)) },    // on top of ray (moved left along ray)
                { id: "static-pill-4", world: new BABYLON.Vector3(0, 0.0, -11) },              // on top of sphere
                { id: "static-pill-5", world: lightPos.add(new BABYLON.Vector3(2.5, 0.5, 0)) }   // next to light
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

        // --- 7. Pill click interaction logic & Drawer Component ---
        const staticPills = [1, 2, 3, 4, 5].map(i => document.getElementById(`static-pill-${i}`));
        
        const pillDescriptions = {
            1: {
                title: "Camera Model",
                desc: "<p>The virtual <strong>Camera</strong> represents the eye or sensor position. In this scene, it is modeled as a single point in space (at coordinates <code>[0.0, 8.0, 14.0]</code>).</p><p>Unlike traditional rasterization engines that process geometry from a camera frustum, a ray tracer starts by casting rays outwards from this single point through each pixel on the image plane.</p>"
            },
            2: {
                title: "Image Plane / Pixel Grid",
                desc: "<p>The <strong>Image Plane</strong> is a virtual grid of pixels (represented here as a 16x16 frame). It is placed in front of the camera point.</p><p>For each pixel in this grid, the renderer determines the color by calculating the path of light passing through the pixel center. A higher resolution grid results in a sharper, higher quality rendered output.</p>"
            },
            3: {
                title: "Primary Ray",
                desc: "<p>A <strong>Primary Ray</strong> (or Camera Ray) is cast from the camera origin through a specific cell on the image plane into the 3D scene.</p><p>The algorithm calculates the ray's mathematical equation and checks for intersections with all geometric objects in the scene. The closest intersection point defines what the camera 'sees' through that pixel.</p>"
            },
            4: {
                title: "Glass Sphere",
                desc: "<p>The subject of our scene is a <strong>Glass Sphere</strong>. In a ray tracer, spheres are represented mathematically, allowing for perfect, infinitely smooth intersection calculations.</p><p>Here, the sphere uses a custom unlit Fresnel material, making the edges visible as white borders while the center remains transparent to represent thin glass.</p>"
            },
            5: {
                title: "Light Source",
                desc: "<p>The <strong>Light Source</strong> is a flat, square emitting surface. When a primary ray hits an object, the renderer casts a secondary 'shadow ray' from the hit point to the light source.</p><p>If the path to the light is clear, the point is illuminated. If another object blocks the path, the point is in shadow. The triangulated borders show the grid lines of the square light.</p>"
            }
        };

        const drawer = document.getElementById("infoDrawer");
        const drawerNum = document.getElementById("drawerNum");
        const drawerTitle = document.getElementById("drawerTitle");
        const drawerContent = document.getElementById("drawerContent");
        const closeBtn = document.getElementById("closeDrawerBtn");

        function openDrawer(index) {
            const data = pillDescriptions[index];
            if (!data) return;

            drawerNum.textContent = index;
            drawerTitle.textContent = data.title;
            drawerContent.innerHTML = data.desc;

            // Open drawer UI
            drawer.classList.remove("translate-x-full");

            // Update active pill state
            staticPills.forEach((p, i) => {
                if (p) {
                    if (i === index - 1) p.classList.add('active');
                    else p.classList.remove('active');
                }
            });
        }

        function closeDrawer() {
            drawer.classList.add("translate-x-full");

            // Deactivate all pills upon closing the drawer
            staticPills.forEach(p => {
                if (p) p.classList.remove('active');
            });
        }

        staticPills.forEach((pill, index) => {
            if (pill) {
                pill.addEventListener('click', () => {
                    openDrawer(index + 1);
                });
            }
        });

        if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

        engine.runRenderLoop(() => scene.render());
        window.addEventListener("resize", () => engine.resize());
    }

    function initAnimatedScene() {
        const canvas = document.getElementById("rayTracingCanvasFinal");
        if (!canvas) return;

        const engine = new BABYLON.Engine(canvas, true, { alpha: true });
        engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

        const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
        hemiLight.intensity = 0.5;
        hemiLight.groundColor = new BABYLON.Color3(0.1, 0.1, 0.1);

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
        
        const glassMat = new BABYLON.StandardMaterial("glassMat", scene);
        glassMat.disableLighting = true; 
        glassMat.emissiveColor = new BABYLON.Color3(0.95, 0.95, 0.95); 
        glassMat.alpha = 0.05; 

        // Use Fresnel so the edges are visible but the center is clear (like thin glass)
        const fresnel = new BABYLON.FresnelParameters();
        fresnel.isEnabled = true;
        fresnel.bias = 0.1;
        fresnel.power = 2.0;
        fresnel.leftColor = BABYLON.Color3.White();  
        fresnel.rightColor = BABYLON.Color3.Black(); 
        glassMat.opacityFresnelParameters = fresnel;

        glassSphere.material = glassMat;

        // --- 4. Square Light Source ---
        const lightSquare = BABYLON.MeshBuilder.CreatePlane("lightSquare", { size: 3.0 }, scene);
        lightSquare.position.copyFrom(lightPos);
        lightSquare.rotation.x = Math.PI / 2; 
        
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
                    btn.classList.add("bg-stone-300"); 
                } else {
                    btn.classList.remove("bg-stone-300");
                }
                document.getElementById("cameraInfo").style.display = showCameraParams ? "block" : "none";
            });
        }

        engine.runRenderLoop(() => scene.render());
        window.addEventListener("resize", () => engine.resize());
    }
})();
