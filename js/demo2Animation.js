/**
 * demo2Animation.js
 * ───────────────────────
 * Custom Direct Illumination Animation & Static Scene
 * - Camera is a simple point
 * - Object is a glass sphere
 * - Light is a square
 */
(function () {
    // Initialize all six scenes
    initStaticScene();
    initIntersectionScene();
    initStaticScene2();
    initStaticScene3();
    initStaticScene4();
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
                title: "Camera",
                desc: "<p>The virtual <strong>Camera</strong> represents the eye or sensor position. In this scene, it is modeled as a single point in space (at coordinates <code>[0.0, 8.0, 14.0]</code>).</p><p>Unlike traditional rasterization engines that process geometry from a camera frustum, a ray tracer starts by casting rays outwards from this single point through each pixel on the image plane.</p>"
            },
            2: {
                title: "Image Plane",
                desc: "<p>The <strong>Image Plane</strong> is a virtual grid of pixels (represented here as a 16x16 frame). It is placed in front of the camera point.</p><p>For each pixel in this grid, the renderer determines the color by calculating the path of light passing through the pixel center. A higher resolution grid results in a sharper, higher quality rendered output.</p>"
            },
            3: {
                title: "Ray",
                desc: "<p>A <strong>Ray</strong> (specifically, a primary camera ray) is cast from the camera origin through a specific cell on the image plane into the 3D scene.</p><p>The algorithm calculates the ray's mathematical equation and checks for intersections with all geometric objects in the scene. The closest intersection point defines what the camera 'sees' through that pixel.</p>"
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

            // Deactivate all pills first
            document.querySelectorAll('.apparatus-pill').forEach(p => p.classList.remove('active'));

            // Update active pill state
            if (staticPills[index - 1]) {
                staticPills[index - 1].classList.add('active');
            }
        }

        function closeDrawer() {
            drawer.classList.add("translate-x-full");
            document.querySelectorAll('.apparatus-pill').forEach(p => p.classList.remove('active'));
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

    function initStaticScene2() {
        const canvas = document.getElementById("rayTracingCanvasStatic2");
        if (!canvas) return;

        const engine = new BABYLON.Engine(canvas, true, { alpha: true });
        engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

        const hemiLight = new BABYLON.HemisphericLight("staticHemiLight2", new BABYLON.Vector3(0, 1, 0), scene);
        hemiLight.intensity = 0.5;
        hemiLight.groundColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        const sceneCamera = new BABYLON.ArcRotateCamera(
            "staticSceneCamera2", -Math.PI / 5, Math.PI / 2.3, 28,
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
        const cameraPoint = BABYLON.MeshBuilder.CreateSphere("staticCameraPoint2", { diameter: 0.5 }, scene);
        cameraPoint.position.copyFrom(cameraPos);
        const camMat = new BABYLON.StandardMaterial("staticCamMat2", scene);
        camMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        camMat.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        cameraPoint.material = camMat;

        // --- 2. Image Plane ---
        const gridSize = 10;
        const resolution = 16;
        const pixelSize = gridSize / resolution;
        
        const cellMaterial = new BABYLON.StandardMaterial("staticCellMaterial2", scene);
        cellMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        cellMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        cellMaterial.alpha = 0;
        
        const frameGroup = new BABYLON.TransformNode("staticFrameGroup2", scene);
        for (let x = 0; x < resolution; x++) {
            for (let y = 0; y < resolution; y++) {
                const cell = BABYLON.MeshBuilder.CreatePlane(`staticCell2_${x}_${y}`, { 
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
        const glassSphere = BABYLON.MeshBuilder.CreateSphere("staticGlassSphere2", { diameter: 4.0, segments: 32 }, scene);
        glassSphere.position.copyFrom(spherePos);
        
        const glassMat = new BABYLON.StandardMaterial("staticGlassMat2", scene);
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
        const lightSquare = BABYLON.MeshBuilder.CreatePlane("staticLightSquare2", { size: 3.0 }, scene);
        lightSquare.position.copyFrom(lightPos);
        lightSquare.rotation.x = Math.PI / 2; 
        
        const lightMat = new BABYLON.StandardMaterial("staticLightMat2", scene);
        lightMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
        lightMat.disableLighting = true; 
        lightSquare.material = lightMat;

        // Show triangulated borders
        lightSquare.enableEdgesRendering();
        lightSquare.edgesWidth = 4.0;
        lightSquare.edgesColor = new BABYLON.Color4(0.2, 0.2, 0.2, 1);
        
        const pointLight = new BABYLON.PointLight("staticPointLight2", lightPos, scene);
        pointLight.intensity = 1.0;
        pointLight.diffuse = new BABYLON.Color3(1, 1, 1);

        // --- 5. Ray Paths (Static Camera Ray Only) ---
        const lensOrigin = cameraPoint.position;
        const direction = spherePos.subtract(lensOrigin).normalize();
        const surfacePoint = spherePos.subtract(direction.scale(2.0)); 
        const totalDistance = BABYLON.Vector3.Distance(lensOrigin, surfacePoint);

        const blackMat = new BABYLON.StandardMaterial("staticBlackMat2", scene);
        blackMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
        blackMat.specularColor = new BABYLON.Color3(0, 0, 0);

        // First ray cylinder
        const rayLine = BABYLON.MeshBuilder.CreateCylinder("staticRayLine2", {
            height: totalDistance,
            diameter: 0.05
        }, scene);
        rayLine.material = blackMat;
        rayLine.position = lensOrigin.add(direction.scale(totalDistance / 2));
        rayLine.lookAt(surfacePoint);
        rayLine.rotate(BABYLON.Axis.X, Math.PI / 2);

        // Arrowhead pointing at the sphere
        const arrowHeight = 0.6;
        const arrowHead = BABYLON.MeshBuilder.CreateCylinder("staticArrowHead2", {
            diameterTop: 0,
            diameterBottom: 0.4,
            height: arrowHeight,
            tessellation: 12
        }, scene);
        arrowHead.material = blackMat;
        arrowHead.position = surfacePoint.subtract(direction.scale(arrowHeight / 2));
        arrowHead.lookAt(spherePos);
        arrowHead.rotate(BABYLON.Axis.X, Math.PI / 2);

        // --- 6. Black dot on the square light's surface & Shadow Ray ---
        const lightDot = BABYLON.MeshBuilder.CreateSphere("staticLightDot2", { diameter: 0.3 }, scene);
        lightDot.position.copyFrom(lightPos);
        lightDot.material = blackMat;

        const shadowOrigin = surfacePoint;
        const shadowTarget = lightPos;
        const shadowDirection = shadowTarget.subtract(shadowOrigin).normalize();
        const shadowDistance = BABYLON.Vector3.Distance(shadowOrigin, shadowTarget);

        const shadowRayLine = BABYLON.MeshBuilder.CreateCylinder("staticShadowRayLine2", {
            height: shadowDistance,
            diameter: 0.05
        }, scene);
        shadowRayLine.material = blackMat;
        shadowRayLine.position = shadowOrigin.add(shadowDirection.scale(shadowDistance / 2));
        shadowRayLine.lookAt(shadowTarget);
        shadowRayLine.rotate(BABYLON.Axis.X, Math.PI / 2);

        const shadowArrowHead = BABYLON.MeshBuilder.CreateCylinder("staticShadowArrowHead2", {
            diameterTop: 0,
            diameterBottom: 0.4,
            height: arrowHeight,
            tessellation: 12
        }, scene);
        shadowArrowHead.material = blackMat;
        shadowArrowHead.position = shadowTarget.subtract(shadowDirection.scale(arrowHeight / 2));
        shadowArrowHead.lookAt(shadowTarget);
        shadowArrowHead.rotate(BABYLON.Axis.X, Math.PI / 2);

        // --- 7. Dynamic annotation pill positioning ---
        scene.onAfterRenderObservable.add(() => {
            const w    = engine.getRenderWidth();
            const h    = engine.getRenderHeight();
            const vp   = sceneCamera.viewport.toGlobal(w, h);
            const tf   = scene.getTransformMatrix();
            const rect = canvas.getBoundingClientRect();

            const shadowMid = shadowOrigin.add(shadowDirection.scale(shadowDistance * 0.45));

            const annotations = [
                { id: "shadow-pill-1", world: lightPos.add(new BABYLON.Vector3(2.0, 0.5, 0)) }, // next to light dot
                { id: "shadow-pill-2", world: shadowMid.add(new BABYLON.Vector3(1.2, 0.2, 0)) }   // next to shadow ray
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

        // --- 8. Pill click interaction logic & Drawer Component ---
        const shadowPills = [1, 2].map(i => document.getElementById(`shadow-pill-${i}`));
        
        const pillDescriptions2 = {
            1: {
                title: "Light Sample",
                desc: "<p>To calculate shadows and illumination, a ray tracer samples the light source. Here, the <strong>Light Sample</strong> is represented by the black dot on the square light's surface.</p><p>By casting a secondary ray from the surface intersection point to this specific light coordinate, the engine verifies if the path is clear or blocked by obstacles.</p>"
            },
            2: {
                title: "Shadow Ray",
                desc: "<p>A <strong>Shadow Ray</strong> is a secondary ray cast from the intersection point on the object's surface towards the light sample point.</p><p>If this ray reaches the light source without colliding with any blocking geometry, the point is lit. If a collision is detected along the path, the point lies in shadow. This mathematical check is the foundation of realistic direct illumination rendering.</p>"
            }
        };

        const drawer = document.getElementById("infoDrawer");
        const drawerNum = document.getElementById("drawerNum");
        const drawerTitle = document.getElementById("drawerTitle");
        const drawerContent = document.getElementById("drawerContent");

        function openDrawer2(index) {
            const data = pillDescriptions2[index];
            if (!data) return;

            drawerNum.textContent = index;
            drawerTitle.textContent = data.title;
            drawerContent.innerHTML = data.desc;

            // Open drawer UI
            drawer.classList.remove("translate-x-full");

            // Deactivate all pills first
            document.querySelectorAll('.apparatus-pill').forEach(p => p.classList.remove('active'));

            // Update active pill state
            if (shadowPills[index - 1]) {
                shadowPills[index - 1].classList.add('active');
            }
        }

        shadowPills.forEach((pill, index) => {
            if (pill) {
                pill.addEventListener('click', () => {
                    openDrawer2(index + 1);
                });
            }
        });

        engine.runRenderLoop(() => scene.render());
        window.addEventListener("resize", () => engine.resize());
    }

    function initStaticScene3() {
        const canvas = document.getElementById("rayTracingCanvasStatic3");
        if (!canvas) return;

        const engine = new BABYLON.Engine(canvas, true, { alpha: true });
        engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

        const hemiLight = new BABYLON.HemisphericLight("staticHemiLight3", new BABYLON.Vector3(0, 1, 0), scene);
        hemiLight.intensity = 0.5;
        hemiLight.groundColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        const sceneCamera = new BABYLON.ArcRotateCamera(
            "staticSceneCamera3", -Math.PI / 5, Math.PI / 2.3, 28,
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
        const cameraPoint = BABYLON.MeshBuilder.CreateSphere("staticCameraPoint3", { diameter: 0.5 }, scene);
        cameraPoint.position.copyFrom(cameraPos);
        const camMat = new BABYLON.StandardMaterial("staticCamMat3", scene);
        camMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        camMat.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        cameraPoint.material = camMat;

        // --- 2. Image Plane ---
        const gridSize = 10;
        const resolution = 16;
        const pixelSize = gridSize / resolution;
        
        const cellMaterial = new BABYLON.StandardMaterial("staticCellMaterial3", scene);
        cellMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        cellMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        cellMaterial.alpha = 0;
        
        const frameGroup = new BABYLON.TransformNode("staticFrameGroup3", scene);
        for (let x = 0; x < resolution; x++) {
            for (let y = 0; y < resolution; y++) {
                const cell = BABYLON.MeshBuilder.CreatePlane(`staticCell3_${x}_${y}`, { 
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
        const glassSphere = BABYLON.MeshBuilder.CreateSphere("staticGlassSphere3", { diameter: 4.0, segments: 32 }, scene);
        glassSphere.position.copyFrom(spherePos);
        
        const glassMat = new BABYLON.StandardMaterial("staticGlassMat3", scene);
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
        const lightSquare = BABYLON.MeshBuilder.CreatePlane("staticLightSquare3", { size: 3.0 }, scene);
        lightSquare.position.copyFrom(lightPos);
        lightSquare.rotation.x = Math.PI / 2; 
        
        const lightMat = new BABYLON.StandardMaterial("staticLightMat3", scene);
        lightMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
        lightMat.disableLighting = true; 
        lightSquare.material = lightMat;

        // Show triangulated borders
        lightSquare.enableEdgesRendering();
        lightSquare.edgesWidth = 4.0;
        lightSquare.edgesColor = new BABYLON.Color4(0.2, 0.2, 0.2, 1);
        
        const pointLight = new BABYLON.PointLight("staticPointLight3", lightPos, scene);
        pointLight.intensity = 1.0;
        pointLight.diffuse = new BABYLON.Color3(1, 1, 1);

        // --- 5. Ray Paths (Static Camera Ray Only) ---
        const lensOrigin = cameraPoint.position;
        const direction = spherePos.subtract(lensOrigin).normalize();
        const surfacePoint = spherePos.subtract(direction.scale(2.0)); 
        const totalDistance = BABYLON.Vector3.Distance(lensOrigin, surfacePoint);

        const blackMat = new BABYLON.StandardMaterial("staticBlackMat3", scene);
        blackMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
        blackMat.specularColor = new BABYLON.Color3(0, 0, 0);

        // First ray cylinder
        const rayLine = BABYLON.MeshBuilder.CreateCylinder("staticRayLine3", {
            height: totalDistance,
            diameter: 0.05
        }, scene);
        rayLine.material = blackMat;
        rayLine.position = lensOrigin.add(direction.scale(totalDistance / 2));
        rayLine.lookAt(surfacePoint);
        rayLine.rotate(BABYLON.Axis.X, Math.PI / 2);

        // Arrowhead pointing at the sphere
        const arrowHeight = 0.6;
        const arrowHead = BABYLON.MeshBuilder.CreateCylinder("staticArrowHead3", {
            diameterTop: 0,
            diameterBottom: 0.4,
            height: arrowHeight,
            tessellation: 12
        }, scene);
        arrowHead.material = blackMat;
        arrowHead.position = surfacePoint.subtract(direction.scale(arrowHeight / 2));
        arrowHead.lookAt(spherePos);
        arrowHead.rotate(BABYLON.Axis.X, Math.PI / 2);

        // Red intersection point dot
        const redMat = new BABYLON.StandardMaterial("staticRedMat3", scene);
        redMat.diffuseColor = new BABYLON.Color3(0.95, 0.25, 0.25);
        redMat.emissiveColor = new BABYLON.Color3(0.95, 0.25, 0.25);

        const intersectionPoint = BABYLON.MeshBuilder.CreateSphere("staticIntersectionPoint3", { diameter: 0.3 }, scene);
        intersectionPoint.position.copyFrom(surfacePoint);
        intersectionPoint.material = redMat;

        // --- 6. Reflection Ray ---
        const reflectDir = new BABYLON.Vector3(0, 0.85, 0.5).normalize();
        const reflectLength = 4.5;
        const reflectRayLine = BABYLON.MeshBuilder.CreateCylinder("staticReflectRayLine3", {
            height: reflectLength,
            diameter: 0.05
        }, scene);
        reflectRayLine.material = blackMat;
        reflectRayLine.position = surfacePoint.add(reflectDir.scale(reflectLength / 2));
        reflectRayLine.lookAt(surfacePoint.add(reflectDir));
        reflectRayLine.rotate(BABYLON.Axis.X, Math.PI / 2);

        // Reflection Arrowhead
        const reflectArrowHead = BABYLON.MeshBuilder.CreateCylinder("staticReflectArrowHead3", {
            diameterTop: 0,
            diameterBottom: 0.4,
            height: arrowHeight,
            tessellation: 12
        }, scene);
        reflectArrowHead.material = blackMat;
        reflectArrowHead.position = surfacePoint.add(reflectDir.scale(reflectLength - arrowHeight / 2));
        reflectArrowHead.lookAt(surfacePoint.add(reflectDir.scale(reflectLength)));
        reflectArrowHead.rotate(BABYLON.Axis.X, Math.PI / 2);

        // --- 7. Refraction Ray ---
        const refractDir = new BABYLON.Vector3(0, -0.65, -0.76).normalize();
        const normalOut = surfacePoint.subtract(spherePos);
        const maxInteriorDistance = -2 * BABYLON.Vector3.Dot(normalOut, refractDir);
        const refractLength = maxInteriorDistance - 0.25;

        const refractRayLine = BABYLON.MeshBuilder.CreateCylinder("staticRefractRayLine3", {
            height: refractLength,
            diameter: 0.05
        }, scene);
        refractRayLine.material = blackMat;
        refractRayLine.position = surfacePoint.add(refractDir.scale(refractLength / 2));
        refractRayLine.lookAt(surfacePoint.add(refractDir));
        refractRayLine.rotate(BABYLON.Axis.X, Math.PI / 2);

        // Refraction Arrowhead
        const refractArrowHead = BABYLON.MeshBuilder.CreateCylinder("staticRefractArrowHead3", {
            diameterTop: 0,
            diameterBottom: 0.4,
            height: arrowHeight,
            tessellation: 12
        }, scene);
        refractArrowHead.material = blackMat;
        refractArrowHead.position = surfacePoint.add(refractDir.scale(refractLength - arrowHeight / 2));
        refractArrowHead.lookAt(surfacePoint.add(refractDir.scale(refractLength)));
        refractArrowHead.rotate(BABYLON.Axis.X, Math.PI / 2);

        // --- 8. Dynamic annotation pill positioning ---
        scene.onAfterRenderObservable.add(() => {
            const w    = engine.getRenderWidth();
            const h    = engine.getRenderHeight();
            const vp   = sceneCamera.viewport.toGlobal(w, h);
            const tf   = scene.getTransformMatrix();
            const rect = canvas.getBoundingClientRect();

            const reflectMid = surfacePoint.add(reflectDir.scale(reflectLength * 0.5));
            const refractMid = surfacePoint.add(refractDir.scale(refractLength * 0.5));

            const annotations = [
                { id: "split-pill-1", world: reflectMid.add(new BABYLON.Vector3(-1.2, 0.2, -0.75)) }, // next to reflection ray
                { id: "split-pill-2", world: refractMid.add(new BABYLON.Vector3(1.2, -0.7, 0.2)) }, // next to refraction ray
                { id: "split-pill-3", world: surfacePoint.add(new BABYLON.Vector3(1.2, -0.6, 0.5)) }  // next to intersection point
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

        // --- 9. Pill click interaction logic & Drawer Component ---
        const splitPills = [1, 2, 3].map(i => document.getElementById(`split-pill-${i}`));
        
        const pillDescriptions3 = {
            1: {
                title: "Reflection Ray",
                desc: "<p>When a ray of light hits a reflective surface like glass, a portion of the light bounces back. The direction of the <strong>Reflection Ray</strong> is determined by the angle of incidence relative to the surface normal.</p><p>In a recursive ray tracer, this ray is cast back into the scene to calculate reflections of other objects, creating mirror-like effects.</p>"
            },
            2: {
                title: "Refraction Ray",
                desc: "<p>When light passes from one medium to another (e.g., from air into a glass sphere), it changes speed and bends. This is the <strong>Refraction Ray</strong>.</p><p>Its direction is determined by Snell's Law and the refractive indices of the media. By tracing this ray through the interior of the glass sphere, we calculate the bending of light and transparency.</p>"
            },
            3: {
                title: "Intersection Point",
                desc: "<p>The <strong>Intersection Point</strong> is the exact location in 3D space where the primary camera ray hits the surface of the glass sphere.</p><p>Finding this point requires solving the quadratic equation of the ray-sphere intersection. It acts as the starting origin for any secondary rays, such as reflection and refraction rays.</p>"
            }
        };

        const drawer = document.getElementById("infoDrawer");
        const drawerNum = document.getElementById("drawerNum");
        const drawerTitle = document.getElementById("drawerTitle");
        const drawerContent = document.getElementById("drawerContent");

        function openDrawer3(index) {
            const data = pillDescriptions3[index];
            if (!data) return;

            drawerNum.textContent = index;
            drawerTitle.textContent = data.title;
            drawerContent.innerHTML = data.desc;

            // Open drawer UI
            drawer.classList.remove("translate-x-full");

            // Deactivate all pills first
            document.querySelectorAll('.apparatus-pill').forEach(p => p.classList.remove('active'));

            // Update active pill state
            if (splitPills[index - 1]) {
                splitPills[index - 1].classList.add('active');
            }
        }

        splitPills.forEach((pill, index) => {
            if (pill) {
                pill.addEventListener('click', () => {
                    openDrawer3(index + 1);
                });
            }
        });

        engine.runRenderLoop(() => scene.render());
        window.addEventListener("resize", () => engine.resize());
    }

    function initStaticScene4() {
        const canvas = document.getElementById("rayTracingCanvasStatic4");
        if (!canvas) return;

        const engine = new BABYLON.Engine(canvas, true, { alpha: true });
        engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

        // Hemispheric ambient light for soft fills
        const hemiLight = new BABYLON.HemisphericLight("cornellHemiLight", new BABYLON.Vector3(0, 1, 0), scene);
        hemiLight.intensity = 0.35;
        hemiLight.diffuse = new BABYLON.Color3(0.9, 0.9, 0.9);
        hemiLight.groundColor = new BABYLON.Color3(0.2, 0.2, 0.2);

        // Point light representing the ceiling light source
        const pointLight = new BABYLON.PointLight("cornellPointLight", new BABYLON.Vector3(0, 4.0, 0), scene);
        pointLight.intensity = 0.8;
        pointLight.diffuse = new BABYLON.Color3(1, 1, 1);

        // Camera facing straight into the front opening of the box
        const sceneCamera = new BABYLON.ArcRotateCamera(
            "cornellCamera", -Math.PI / 2, Math.PI / 2, 16.5,
            new BABYLON.Vector3(0, 0, 0), scene
        );
        sceneCamera.inputs.removeByType("ArcRotateCameraMouseWheelInput");
        sceneCamera.attachControl(canvas, true);

        // Materials
        const redMat = new BABYLON.StandardMaterial("cornellRed", scene);
        redMat.diffuseColor = new BABYLON.Color3(0.8, 0.05, 0.05); // Cornell Red
        redMat.specularColor = new BABYLON.Color3(0, 0, 0);

        const greenMat = new BABYLON.StandardMaterial("cornellGreen", scene);
        greenMat.diffuseColor = new BABYLON.Color3(0.05, 0.6, 0.05); // Cornell Green
        greenMat.specularColor = new BABYLON.Color3(0, 0, 0);

        const whiteMat = new BABYLON.StandardMaterial("cornellWhite", scene);
        whiteMat.diffuseColor = new BABYLON.Color3(0.85, 0.85, 0.85); // Cornell White
        whiteMat.specularColor = new BABYLON.Color3(0, 0, 0);

        const lightMat = new BABYLON.StandardMaterial("cornellLight", scene);
        lightMat.emissiveColor = new BABYLON.Color3(1, 1, 1);
        lightMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
        lightMat.disableLighting = true;
        lightMat.backFaceCulling = false;

        // Build box walls (width 10, height 10, depth 10)
        // Floor
        const floor = BABYLON.MeshBuilder.CreatePlane("cornellFloor", { size: 10, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
        floor.position.set(0, -5, 0);
        floor.rotation.x = Math.PI / 2;
        floor.material = whiteMat;

        // Ceiling
        const ceiling = BABYLON.MeshBuilder.CreatePlane("cornellCeiling", { size: 10, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
        ceiling.position.set(0, 5, 0);
        ceiling.rotation.x = -Math.PI / 2;
        ceiling.material = whiteMat;

        // Left Wall (Red)
        const leftWall = BABYLON.MeshBuilder.CreatePlane("cornellLeftWall", { size: 10, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
        leftWall.position.set(-5, 0, 0);
        leftWall.rotation.y = Math.PI / 2;
        leftWall.material = redMat;

        // Right Wall (Green)
        const rightWall = BABYLON.MeshBuilder.CreatePlane("cornellRightWall", { size: 10, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
        rightWall.position.set(5, 0, 0);
        rightWall.rotation.y = -Math.PI / 2;
        rightWall.material = greenMat;

        // Back Wall (White)
        const backWall = BABYLON.MeshBuilder.CreatePlane("cornellBackWall", { size: 10, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
        backWall.position.set(0, 0, 5);
        backWall.rotation.y = Math.PI;
        backWall.material = whiteMat;

        // Ceiling Light Source (Emissive Square Plane)
        const lightSquare = BABYLON.MeshBuilder.CreatePlane("cornellLightSquare", { size: 3 }, scene);
        lightSquare.position.set(0, 4.95, 0);
        lightSquare.rotation.x = -Math.PI / 2;
        lightSquare.material = lightMat;

        // Show borders of the light square
        lightSquare.enableEdgesRendering();
        lightSquare.edgesWidth = 4.0;
        lightSquare.edgesColor = new BABYLON.Color4(0.2, 0.2, 0.2, 1);
        // Reflective Sphere
        const sphere = BABYLON.MeshBuilder.CreateSphere("cornellSphere", { diameter: 3.5, segments: 32 }, scene);
        sphere.position.set(-0.5, -3.25, 0.5);

        // Transparent glass sphere material (matching Fig. 1)
        const sphereMat = new BABYLON.StandardMaterial("cornellSphereMat", scene);
        sphereMat.disableLighting = true;
        sphereMat.emissiveColor = new BABYLON.Color3(0.95, 0.95, 0.95);
        sphereMat.alpha = 0.05;

        const fresnel = new BABYLON.FresnelParameters();
        fresnel.isEnabled = true;
        fresnel.bias = 0.1;
        fresnel.power = 2.0;
        fresnel.leftColor = BABYLON.Color3.White();
        fresnel.rightColor = BABYLON.Color3.Black();
        sphereMat.opacityFresnelParameters = fresnel;

        sphere.material = sphereMat;

        // --- 5. Ray Paths (Primary, Reflection, Refraction) ---
        const blackMat = new BABYLON.StandardMaterial("cornellBlackMat", scene);
        blackMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
        blackMat.specularColor = new BABYLON.Color3(0, 0, 0);
        blackMat.disableLighting = true;

        // Helper function to create an animated ray (cylinder and arrowhead)
        function createAnimRay(name, start, end, material, diameter = 0.05, arrowDiameter = 0.4, arrowHeight = 0.6) {
            const direction = end.subtract(start);
            const distance = direction.length();
            const dirNormalized = direction.normalize();

            // Cylinder (initially scaled to 1 height)
            const cylinder = BABYLON.MeshBuilder.CreateCylinder(name + "_line", {
                height: 1,
                diameter: diameter
            }, scene);
            cylinder.material = material;
            cylinder.setEnabled(false);

            // Arrowhead
            const arrow = BABYLON.MeshBuilder.CreateCylinder(name + "_arrow", {
                diameterTop: 0,
                diameterBottom: arrowDiameter,
                height: arrowHeight,
                tessellation: 12
            }, scene);
            arrow.material = material;
            arrow.setEnabled(false);

            return {
                start,
                end,
                direction: dirNormalized,
                totalDistance: distance,
                arrowHeight,
                cylinder,
                arrow,
                update: function (p) {
                    if (p <= 0) {
                        this.cylinder.setEnabled(false);
                        this.arrow.setEnabled(false);
                        return;
                    }
                    
                    const currentDist = p * this.totalDistance;
                    
                    if (currentDist <= this.arrowHeight) {
                        this.cylinder.setEnabled(false);
                        this.arrow.setEnabled(true);
                        this.arrow.position = this.start.add(this.direction.scale(currentDist - this.arrowHeight / 2));
                        this.arrow.lookAt(this.start.add(this.direction.scale(currentDist)));
                        this.arrow.rotate(BABYLON.Axis.X, Math.PI / 2);
                    } else {
                        this.cylinder.setEnabled(true);
                        this.arrow.setEnabled(true);
                        
                        const cylinderLength = currentDist - this.arrowHeight;
                        this.cylinder.scaling.y = cylinderLength;
                        this.cylinder.position = this.start.add(this.direction.scale(cylinderLength / 2));
                        this.cylinder.lookAt(this.start.add(this.direction.scale(cylinderLength)));
                        this.cylinder.rotate(BABYLON.Axis.X, Math.PI / 2);

                        this.arrow.position = this.start.add(this.direction.scale(currentDist - this.arrowHeight / 2));
                        this.arrow.lookAt(this.start.add(this.direction.scale(currentDist)));
                        this.arrow.rotate(BABYLON.Axis.X, Math.PI / 2);
                    }
                }
            };
        }

        // Helper function to create an animated interior ray (cylinder only, no arrowhead)
        function createAnimInsideRay(name, start, end, material, diameter = 0.05) {
            const direction = end.subtract(start);
            const distance = direction.length();
            const dirNormalized = direction.normalize();

            const cylinder = BABYLON.MeshBuilder.CreateCylinder(name + "_line", {
                height: 1,
                diameter: diameter
            }, scene);
            cylinder.material = material;
            cylinder.setEnabled(false);

            return {
                start,
                end,
                direction: dirNormalized,
                totalDistance: distance,
                cylinder,
                update: function (p) {
                    if (p <= 0) {
                        this.cylinder.setEnabled(false);
                        return;
                    }
                    this.cylinder.setEnabled(true);
                    
                    const cylinderLength = p * this.totalDistance;
                    this.cylinder.scaling.y = cylinderLength;
                    this.cylinder.position = this.start.add(this.direction.scale(cylinderLength / 2));
                    this.cylinder.lookAt(this.start.add(this.direction.scale(cylinderLength)));
                    this.cylinder.rotate(BABYLON.Axis.X, Math.PI / 2);
                }
            };
        }

        // Define path coordinates
        const O = new BABYLON.Vector3(0.0, 1.0, -10.0);             // Ray origin outside box
        const P1 = new BABYLON.Vector3(0.3, -2.0, -0.5);            // Hits sphere surface
        const P_refl_wall = new BABYLON.Vector3(-5.0, -1.0, 1.5);    // Hits Left Wall (Red)
        const P_light_refl = new BABYLON.Vector3(-0.5, 4.95, 0.0);   // Reflection hits Light Source
        
        const P2 = new BABYLON.Vector3(-1.3, -4.6, 1.3);            // Exits opposite surface of sphere
        const P_floor = new BABYLON.Vector3(-1.6, -5.0, 1.5);        // Hits Floor
        const P_refr_wall = new BABYLON.Vector3(5.0, -2.0, 3.5);     // Hits Right Wall (Green)
        const P_light_refr = new BABYLON.Vector3(0.5, 4.95, 0.0);    // Refraction hits Light Source

        // Instantiate animated rays
        const rays = {
            primary: createAnimRay("primaryRay", O, P1, blackMat),
            refl1: createAnimRay("reflRay1", P1, P_refl_wall, blackMat),
            refl2: createAnimRay("reflRay2", P_refl_wall, P_light_refl, blackMat),
            refr1: createAnimInsideRay("refrRay1", P1, P2, blackMat),
            refr2: createAnimRay("refrRay2", P2, P_floor, blackMat, 0.05, 0.35, 0.5),
            refr3: createAnimRay("refrRay3", P_floor, P_refr_wall, blackMat),
            refr4: createAnimRay("refrRay4", P_refr_wall, P_light_refr, blackMat)
        };

        let progress = 0;
        scene.onBeforeRenderObservable.add(() => {
            progress += 0.005;
            if (progress > 1.2) {
                progress = 0;
            }

            // 1. Primary Ray: 0.00 to 0.25
            let pPrim = 0;
            if (progress >= 0 && progress < 0.25) {
                pPrim = progress / 0.25;
            } else if (progress >= 0.25) {
                pPrim = 1.0;
            }
            rays.primary.update(pPrim);

            // 2. Reflection Path:
            // segment 1: 0.25 to 0.60
            let pRef1 = 0;
            if (progress >= 0.25 && progress < 0.60) {
                pRef1 = (progress - 0.25) / 0.35;
            } else if (progress >= 0.60) {
                pRef1 = 1.0;
            }
            rays.refl1.update(pRef1);

            // segment 2: 0.60 to 0.95
            let pRef2 = 0;
            if (progress >= 0.60 && progress < 0.95) {
                pRef2 = (progress - 0.60) / 0.35;
            } else if (progress >= 0.95) {
                pRef2 = 1.0;
            }
            rays.refl2.update(pRef2);

            // 3. Refraction Path:
            // segment 1 (inside): 0.25 to 0.45
            let pRefr1 = 0;
            if (progress >= 0.25 && progress < 0.45) {
                pRefr1 = (progress - 0.25) / 0.20;
            } else if (progress >= 0.45) {
                pRefr1 = 1.0;
            }
            rays.refr1.update(pRefr1);

            // segment 2 (exit to floor): 0.45 to 0.55
            let pRefr2 = 0;
            if (progress >= 0.45 && progress < 0.55) {
                pRefr2 = (progress - 0.45) / 0.10;
            } else if (progress >= 0.55) {
                pRefr2 = 1.0;
            }
            rays.refr2.update(pRefr2);

            // segment 3 (floor to wall): 0.55 to 0.75
            let pRefr3 = 0;
            if (progress >= 0.55 && progress < 0.75) {
                pRefr3 = (progress - 0.55) / 0.20;
            } else if (progress >= 0.75) {
                pRefr3 = 1.0;
            }
            rays.refr3.update(pRefr3);

            // segment 4 (wall to light): 0.75 to 0.95
            let pRefr4 = 0;
            if (progress >= 0.75 && progress < 0.95) {
                pRefr4 = (progress - 0.75) / 0.20;
            } else if (progress >= 0.95) {
                pRefr4 = 1.0;
            }
            rays.refr4.update(pRefr4);
        });

        engine.runRenderLoop(() => scene.render());
        window.addEventListener("resize", () => engine.resize());
    }

    function initIntersectionScene() {
        const canvas = document.getElementById("rayTracingCanvasIntersection");
        if (!canvas) return;

        const engine = new BABYLON.Engine(canvas, true, { alpha: true });
        engine.setHardwareScalingLevel(1 / window.devicePixelRatio);
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);

        const hemiLight = new BABYLON.HemisphericLight("intHemiLight", new BABYLON.Vector3(0, 1, 0), scene);
        hemiLight.intensity = 0.6;
        hemiLight.groundColor = new BABYLON.Color3(0.15, 0.15, 0.15);

        const sceneCamera = new BABYLON.ArcRotateCamera(
            "intCamera", -Math.PI / 2, Math.PI / 2, 22,
            new BABYLON.Vector3(0, 0.5, 0), scene
        );
        sceneCamera.inputs.removeByType("ArcRotateCameraMouseWheelInput");
        sceneCamera.attachControl(canvas, true);

        // Configure Orthographic projection to keep sections perfectly equally spaced regardless of screen width/aspect ratio
        sceneCamera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
        const updateOrtho = () => {
            const aspect = (engine.getRenderWidth() / (engine.getRenderHeight() || 1)) || 1.6;
            sceneCamera.orthoLeft = -15.0;
            sceneCamera.orthoRight = 15.0;
            sceneCamera.orthoTop = 15.0 / aspect;
            sceneCamera.orthoBottom = -15.0 / aspect;
        };
        updateOrtho();

        // --- 1. Three Spheres Side by Side (Diameter 4.0, same as Fig. 1) ---
        const pos1 = new BABYLON.Vector3(-10.0, 0, 0);
        const pos2 = new BABYLON.Vector3(0, 0, 0);
        const pos3 = new BABYLON.Vector3(10.0, 0, 0);

        const sphere1 = BABYLON.MeshBuilder.CreateSphere("intSphere1", { diameter: 4.0, segments: 32 }, scene);
        sphere1.position.copyFrom(pos1);

        const sphere2 = BABYLON.MeshBuilder.CreateSphere("intSphere2", { diameter: 4.0, segments: 32 }, scene);
        sphere2.position.copyFrom(pos2);

        const sphere3 = BABYLON.MeshBuilder.CreateSphere("intSphere3", { diameter: 4.0, segments: 32 }, scene);
        sphere3.position.copyFrom(pos3);

        // Glass material with Fresnel outline
        const glassMat = new BABYLON.StandardMaterial("intGlassMat", scene);
        glassMat.disableLighting = true;
        glassMat.emissiveColor = new BABYLON.Color3(0.95, 0.95, 0.95);
        glassMat.alpha = 0.05;

        const fresnel = new BABYLON.FresnelParameters();
        fresnel.isEnabled = true;
        fresnel.bias = 0.1;
        fresnel.power = 2.0;
        fresnel.leftColor = BABYLON.Color3.White();
        fresnel.rightColor = BABYLON.Color3.Black();
        glassMat.opacityFresnelParameters = fresnel;

        sphere1.material = glassMat;
        sphere2.material = glassMat;
        sphere3.material = glassMat;

        // --- 1.5. Separator Lines between cases ---
        const sepColor = new BABYLON.Color3(0.72, 0.69, 0.63); // Warm parchment-toned gray
        
        const sep1 = BABYLON.MeshBuilder.CreateDashedLines("sep1", {
            points: [new BABYLON.Vector3(-5.0, -4.0, 0), new BABYLON.Vector3(-5.0, 4.0, 0)],
            dashSize: 0.25,
            gapSize: 0.15
        }, scene);
        sep1.color = sepColor;

        const sep2 = BABYLON.MeshBuilder.CreateDashedLines("sep2", {
            points: [new BABYLON.Vector3(5.0, -4.0, 0), new BABYLON.Vector3(5.0, 4.0, 0)],
            dashSize: 0.25,
            gapSize: 0.15
        }, scene);
        sep2.color = sepColor;

        // --- 2. Ray Materials ---
        const rayMat = new BABYLON.StandardMaterial("intRayMat", scene);
        rayMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        rayMat.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        const hitDotMat = new BABYLON.StandardMaterial("intHitDotMat", scene);
        hitDotMat.diffuseColor = new BABYLON.Color3(0.95, 0.25, 0.25);
        hitDotMat.emissiveColor = new BABYLON.Color3(0.95, 0.25, 0.25);

        // --- 3. Ray 1 (Misses above Sphere 1, Y = 2.6) ---
        const ray1 = BABYLON.MeshBuilder.CreateCylinder("intRay1", { height: 1, diameter: 0.08 }, scene);
        ray1.material = rayMat;
        ray1.rotation.z = Math.PI / 2;

        const arrow1 = BABYLON.MeshBuilder.CreateCylinder("intArrow1", { diameterTop: 0, diameterBottom: 0.5, height: 0.8 }, scene);
        arrow1.material = rayMat;
        arrow1.rotation.z = Math.PI / 2;

        // --- 4. Ray 2 (Tangent to Sphere 2, Y = 2.0) ---
        const ray2 = BABYLON.MeshBuilder.CreateCylinder("intRay2", { height: 1, diameter: 0.08 }, scene);
        ray2.material = rayMat;
        ray2.rotation.z = Math.PI / 2;

        const arrow2 = BABYLON.MeshBuilder.CreateCylinder("intArrow2", { diameterTop: 0, diameterBottom: 0.5, height: 0.8 }, scene);
        arrow2.material = rayMat;
        arrow2.rotation.z = Math.PI / 2;

        const dotTangent = BABYLON.MeshBuilder.CreateSphere("intDotTangent", { diameter: 0.3 }, scene);
        dotTangent.position.set(0, 2.0, 0);
        dotTangent.material = hitDotMat;
        dotTangent.setEnabled(false);

        // --- 5. Ray 3 (Secant cutting through Sphere 3, Y = 0.8) ---
        const ray3 = BABYLON.MeshBuilder.CreateCylinder("intRay3", { height: 1, diameter: 0.08 }, scene);
        ray3.material = rayMat;
        ray3.rotation.z = Math.PI / 2;

        const arrow3 = BABYLON.MeshBuilder.CreateCylinder("intArrow3", { diameterTop: 0, diameterBottom: 0.5, height: 0.8 }, scene);
        arrow3.material = rayMat;
        arrow3.rotation.z = Math.PI / 2;

        const dotEntry = BABYLON.MeshBuilder.CreateSphere("intDotEntry", { diameter: 0.3 }, scene);
        dotEntry.position.set(11.833, 0.8, 0); // first hit on the right
        dotEntry.material = hitDotMat;
        dotEntry.setEnabled(false);

        const dotExit = BABYLON.MeshBuilder.CreateSphere("intDotExit", { diameter: 0.3 }, scene);
        dotExit.position.set(8.167, 0.8, 0); // second hit on the left
        dotExit.material = hitDotMat;
        dotExit.setEnabled(false);

        // --- 6. Animation Logic ---
        let progress = 0;

        scene.onBeforeRenderObservable.add(() => {
            progress += 0.007;
            if (progress > 1.25) {
                progress = 0;
            }

            const p = Math.min(progress / 1.0, 1.0);
            const length = p * 8.0;

            // Update Ray 1 (starts at X = -6.0, Y = 2.6, grows leftwards)
            ray1.scaling.y = Math.max(0.001, length);
            ray1.position.set(-6.0 - length / 2, 2.6, 0);
            arrow1.position.set(-6.0 - length, 2.6, 0);

            // Update Ray 2 (starts at X = 4.0, Y = 2.0, grows leftwards)
            ray2.scaling.y = Math.max(0.001, length);
            ray2.position.set(4.0 - length / 2, 2.0, 0);
            arrow2.position.set(4.0 - length, 2.0, 0);
            dotTangent.setEnabled(p >= 0.5);

            // Update Ray 3 (starts at X = 14.0, Y = 0.8, grows leftwards)
            ray3.scaling.y = Math.max(0.001, length);
            ray3.position.set(14.0 - length / 2, 0.8, 0);
            arrow3.position.set(14.0 - length, 0.8, 0);
            dotEntry.setEnabled(p >= 0.27);
            dotExit.setEnabled(p >= 0.73);
        });

        // --- 7. Dynamic label positioning ---
        scene.onAfterRenderObservable.add(() => {
            const w    = engine.getRenderWidth();
            const h    = engine.getRenderHeight();
            const vp   = sceneCamera.viewport.toGlobal(w, h);
            const tf   = scene.getTransformMatrix();
            const rect = canvas.getBoundingClientRect();

            const labels = [
                { id: "int-label-1", world: new BABYLON.Vector3(-10.0, -3.2, 0) }, // under sphere 1
                { id: "int-label-2", world: new BABYLON.Vector3(0.0, -3.2, 0) },   // under sphere 2
                { id: "int-label-3", world: new BABYLON.Vector3(10.0, -3.2, 0) }   // under sphere 3
            ];

            labels.forEach(({ id, world }) => {
                const s    = BABYLON.Vector3.Project(world, BABYLON.Matrix.Identity(), tf, vp);
                const elem = document.getElementById(id);
                if (!elem) return;
                elem.style.left       = (s.x / w) * rect.width  + "px";
                elem.style.top        = (s.y / h) * rect.height + "px";
                elem.style.visibility = (s.z > 0 && s.z < 1) ? "visible" : "hidden";
            });
        });

        engine.runRenderLoop(() => scene.render());
        window.addEventListener("resize", () => {
            engine.resize();
            updateOrtho();
        });
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
