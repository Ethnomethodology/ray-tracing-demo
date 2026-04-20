/**
 * Dürer's Perspective Machine - Phase 5: Laboratory Refinement
 * Premium environment, UI logic, and UX improvements.
 */

const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });

const createScene = function() {
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(1, 1, 1, 1); // Laboratory White

    // 1. ArcRotateCamera setup
    const camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 4, Math.PI / 2.5, 50, new BABYLON.Vector3(0, 0, -5), scene);
    camera.attachControl(canvas, true);
    camera.wheelPrecision = 50;
    camera.lowerRadiusLimit = 5;
    camera.upperRadiusLimit = 60;

    // 2. Lighting setup
    const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.8;
    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-1, -2, -1), scene);
    dirLight.intensity = 0.3;

    // 3. Environment: The Table
    const tableMesh = BABYLON.MeshBuilder.CreateBox("tableMesh", { width: 15, height: 0.5, depth: 20 }, scene);
    tableMesh.position.y = -5.25; // Top surface exactly at Y = -5
    tableMesh.position.z = -1.66; // Maintain 1:2 ratio around the grid (z=-5)
    const tableMaterial = new BABYLON.StandardMaterial("tableMaterial", scene);
    tableMaterial.diffuseColor = new BABYLON.Color3(0.9, 0.85, 0.8); // Light wood/parchment
    tableMesh.material = tableMaterial;

    // 4. Create targetMesh (TorusKnot)
    const targetMesh = BABYLON.MeshBuilder.CreateTorusKnot("targetMesh", {
        radius: 1.5,
        tube: 0.4,
        radialSegments: 128,
        tubularSegments: 64,
        p: 2,
        q: 3
    }, scene);
    targetMesh.position = new BABYLON.Vector3(0, 0, 0);

    const targetMaterial = new BABYLON.StandardMaterial("targetMaterial", scene);
    targetMaterial.diffuseColor = new BABYLON.Color3(0.38, 0.4, 0.95);
    targetMaterial.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    targetMesh.material = targetMaterial;

    // 5. Create gridPlane (Dürer's Frame)
    const gridSize = 10;
    const gridPlane = BABYLON.MeshBuilder.CreatePlane("gridPlane", {
        size: gridSize,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE
    }, scene);
    gridPlane.position = new BABYLON.Vector3(0, 0, -5); // Bottom edge is at Y = -5

    // Setup DynamicTexture for the drawing engine
    const textureSize = 1024;
    const drawingTexture = new BABYLON.DynamicTexture("drawingTexture", { width: textureSize, height: textureSize }, scene);
    const ctx = drawingTexture.getScene().getEngine().getRenderingCanvas().getContext('2d'); // This is not correct, we need the texture ctx
    const textureCtx = drawingTexture.getContext();
    drawingTexture.hasAlpha = true;
    
    // Initial clear/fill function
    const clearCanvas = () => {
        textureCtx.fillStyle = "rgba(255, 255, 255, 0.3)";
        textureCtx.fillRect(0, 0, textureSize, textureSize);
        drawingTexture.update();
    };
    clearCanvas();

    const planeMaterial = new BABYLON.StandardMaterial("planeMaterial", scene);
    planeMaterial.diffuseTexture = drawingTexture;
    planeMaterial.useAlphaFromDiffusetexture = true;
    planeMaterial.alpha = 0.4; // Transparency polish
    planeMaterial.backFaceCulling = false;
    gridPlane.material = planeMaterial;

    // Frame Border
    const frameHalf = gridSize / 2;
    const framePoints = [
        new BABYLON.Vector3(-frameHalf, -frameHalf, 0),
        new BABYLON.Vector3(frameHalf, -frameHalf, 0),
        new BABYLON.Vector3(frameHalf, frameHalf, 0),
        new BABYLON.Vector3(-frameHalf, frameHalf, 0),
        new BABYLON.Vector3(-frameHalf, -frameHalf, 0)
    ];
    const frameBorder = BABYLON.MeshBuilder.CreateLines("frameBorder", { points: framePoints }, scene);
    frameBorder.parent = gridPlane;
    frameBorder.color = new BABYLON.Color3(0.2, 0.2, 0.2);

    // 6. Create stylus (stickMesh)
    const stickMesh = BABYLON.MeshBuilder.CreateSphere("stickMesh", { diameter: 0.2 }, scene);
    const stickMaterial = new BABYLON.StandardMaterial("stickMaterial", scene);
    stickMaterial.diffuseColor = new BABYLON.Color3(1, 0, 0);
    stickMaterial.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
    stickMesh.material = stickMaterial;
    stickMesh.isPickable = false;
    stickMesh.position = new BABYLON.Vector3(0, 0, 0);

    // 7. Raycasting Interaction
    scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
            const pickInfo = scene.pick(scene.pointerX, scene.pointerY, (mesh) => mesh === targetMesh);
            if (pickInfo.hit && pickInfo.pickedPoint) {
                stickMesh.position.copyFrom(pickInfo.pickedPoint);
            }
        }
    });

    // 8. Pulley and String System
    // PulleyNode adjusted for better table clearance
    const pulleyNode = new BABYLON.Vector3(0, 8, -25);
    const maxStringLength = 50.0;

    const pulleyMesh = BABYLON.MeshBuilder.CreateCylinder("pulleyMesh", { diameter: 0.8, height: 0.2 }, scene);
    pulleyMesh.position.copyFrom(pulleyNode);
    pulleyMesh.rotation.z = Math.PI / 2;
    const pulleyMaterial = new BABYLON.StandardMaterial("pulleyMaterial", scene);
    pulleyMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1);
    pulleyMesh.material = pulleyMaterial;

    const weightMesh = BABYLON.MeshBuilder.CreateCylinder("weightMesh", { diameter: 0.4, height: 0.8 }, scene);
    const weightMaterial = new BABYLON.StandardMaterial("weightMaterial", scene);
    weightMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    weightMesh.material = weightMaterial;

    let segmentA = BABYLON.MeshBuilder.CreateLines("segmentA", { points: [stickMesh.position, pulleyNode], updatable: true }, scene);
    segmentA.color = new BABYLON.Color3(0.3, 0.3, 0.3);

    let segmentB = BABYLON.MeshBuilder.CreateLines("segmentB", { points: [pulleyNode, weightMesh.position], updatable: true }, scene);
    segmentB.color = new BABYLON.Color3(0.3, 0.3, 0.3);

    scene.onBeforeRenderObservable.add(() => {
        const distanceA = BABYLON.Vector3.Distance(stickMesh.position, pulleyNode);
        const lengthB = maxStringLength - distanceA;
        weightMesh.position.set(pulleyNode.x, pulleyNode.y - lengthB, pulleyNode.z);

        segmentA = BABYLON.MeshBuilder.CreateLines("segmentA", { points: [stickMesh.position, pulleyNode], instance: segmentA });
        segmentB = BABYLON.MeshBuilder.CreateLines("segmentB", { points: [pulleyNode, weightMesh.position], instance: segmentB });
    });

    // 9. Core Drawing Function (DRY)
    const drawPointAtStick = () => {
        const direction = stickMesh.position.subtract(pulleyNode);
        const ray = new BABYLON.Ray(pulleyNode, direction.normalize(), 100);
        const hit = ray.intersectsMesh(gridPlane);
        
        if (hit.hit) {
            const uv = hit.getTextureCoordinates();
            if (uv) {
                const x = uv.x * textureSize;
                const y = (1 - uv.y) * textureSize;

                textureCtx.fillStyle = "#000000";
                textureCtx.beginPath();
                textureCtx.arc(x, y, 4, 0, Math.PI * 2);
                textureCtx.fill();
                drawingTexture.update();
            }
        }
    };

    // Pointillist Drawing Interaction
    scene.onPointerObservable.add((pointerInfo) => {
        if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
            if (!isAnimating) drawPointAtStick();
        }
    });

    // 10. Auto-Animator Logic
    let isAnimating = false;
    let dotsDrawn = 0;
    let animationInterval = null;

    const toggleAnimation = () => {
        const animateBtn = document.getElementById("animateBtn");
        const resetBtn = document.getElementById("resetBtn");

        if (isAnimating) {
            // Stop logic
            clearInterval(animationInterval);
            isAnimating = false;
            animateBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Animate';
            resetBtn.disabled = false;
        } else {
            // Start logic
            isAnimating = true;
            dotsDrawn = 0;
            animateBtn.textContent = "Stop";
            resetBtn.disabled = true;

            const positions = targetMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
            
            animationInterval = setInterval(() => {
                if (dotsDrawn >= 1000) {
                    toggleAnimation();
                    return;
                }

                // Pick a random vertex and transform to world space
                const vertexIndex = Math.floor(Math.random() * (positions.length / 3)) * 3;
                const localPos = new BABYLON.Vector3(
                    positions[vertexIndex], 
                    positions[vertexIndex + 1], 
                    positions[vertexIndex + 2]
                );
                
                targetMesh.computeWorldMatrix(true);
                const worldPos = BABYLON.Vector3.TransformCoordinates(localPos, targetMesh.getWorldMatrix());

                stickMesh.position.copyFrom(worldPos);
                drawPointAtStick();
                dotsDrawn++;
            }, 10);
        }
    };

    document.getElementById("animateBtn").addEventListener("click", toggleAnimation);

    // 11. UI Controller
    const resetScene = () => {
        // Clear dots with proper alpha wipe
        textureCtx.clearRect(0, 0, textureSize, textureSize);
        clearCanvas();

        // Reset Camera
        const targetPos = new BABYLON.Vector3(0, 0, -5);
        
        // Animation
        const animationAlpha = new BABYLON.Animation("cameraAlpha", "alpha", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        const animationBeta = new BABYLON.Animation("cameraBeta", "beta", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        const animationRadius = new BABYLON.Animation("cameraRadius", "radius", 30, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        
        const keysAlpha = [{ frame: 0, value: camera.alpha }, { frame: 30, value: Math.PI / 4 }];
        const keysBeta = [{ frame: 0, value: camera.beta }, { frame: 30, value: Math.PI / 2.5 }];
        const keysRadius = [{ frame: 0, value: camera.radius }, { frame: 30, value: 50 }];
        
        animationAlpha.setKeys(keysAlpha);
        animationBeta.setKeys(keysBeta);
        animationRadius.setKeys(keysRadius);
        
        camera.animations = [animationAlpha, animationBeta, animationRadius];
        scene.beginAnimation(camera, 0, 30, false);
        
        camera.setTarget(targetPos);
    };

    document.getElementById("resetBtn").addEventListener("click", resetScene);

    return scene;
};

const scene = createScene();
engine.runRenderLoop(() => { scene.render(); });
window.addEventListener("resize", () => { engine.resize(); });
