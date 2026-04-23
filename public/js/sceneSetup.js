const setupSceneEnvironment = (scene, camera, pulleyNode) => {
    // Basic Scene Environment Setup (extracted from main.js)

    // Lighting
    const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
    hemiLight.intensity = 0.5;
    const dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-1, -2, -1), scene);
    dirLight.position = new BABYLON.Vector3(20, 40, 20);
    dirLight.intensity = 0.6;
    dirLight.shadowEnabled = true;

    // Materials
    const woodMaterial = new BABYLON.StandardMaterial("woodMat", scene);
    woodMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.4, 0.2);
    woodMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

    const metalMaterial = new BABYLON.StandardMaterial("metalMat", scene);
    metalMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    metalMaterial.specularColor = new BABYLON.Color3(0.8, 0.8, 0.8);

    // Common Static Elements
    // Table
    const tableTop = BABYLON.MeshBuilder.CreateBox("tableTop", { width: 40, depth: 40, height: 0.5 }, scene);
    tableTop.position.y = -5.25;
    tableTop.material = woodMaterial;

    const tableLeg1 = BABYLON.MeshBuilder.CreateBox("tableLeg1", { width: 1, depth: 1, height: 10 }, scene);
    tableLeg1.position.set(-18, -10.5, -18);
    tableLeg1.material = woodMaterial;

    const tableLeg2 = BABYLON.MeshBuilder.CreateBox("tableLeg2", { width: 1, depth: 1, height: 10 }, scene);
    tableLeg2.position.set(18, -10.5, -18);
    tableLeg2.material = woodMaterial;

    const tableLeg3 = BABYLON.MeshBuilder.CreateBox("tableLeg3", { width: 1, depth: 1, height: 10 }, scene);
    tableLeg3.position.set(-18, -10.5, 18);
    tableLeg3.material = woodMaterial;

    const tableLeg4 = BABYLON.MeshBuilder.CreateBox("tableLeg4", { width: 1, depth: 1, height: 10 }, scene);
    tableLeg4.position.set(18, -10.5, 18);
    tableLeg4.material = woodMaterial;

    const table = BABYLON.Mesh.MergeMeshes([tableTop, tableLeg1, tableLeg2, tableLeg3, tableLeg4], true, true, undefined, false, true);
    table.receiveShadows = true;

    // Door/Frame setup
    const doorFrameWidth = 16;
    const doorFrameHeight = 24;
    const doorFrameThickness = 1;

    const leftJamb = BABYLON.MeshBuilder.CreateBox("leftJamb", { width: doorFrameThickness, height: doorFrameHeight, depth: doorFrameThickness }, scene);
    leftJamb.position.set(-doorFrameWidth / 2, doorFrameHeight / 2 - 5, 0);

    const rightJamb = BABYLON.MeshBuilder.CreateBox("rightJamb", { width: doorFrameThickness, height: doorFrameHeight, depth: doorFrameThickness }, scene);
    rightJamb.position.set(doorFrameWidth / 2, doorFrameHeight / 2 - 5, 0);

    const topJamb = BABYLON.MeshBuilder.CreateBox("topJamb", { width: doorFrameWidth + doorFrameThickness, height: doorFrameThickness, depth: doorFrameThickness }, scene);
    topJamb.position.set(0, doorFrameHeight - 5, 0);

    const bottomJamb = BABYLON.MeshBuilder.CreateBox("bottomJamb", { width: doorFrameWidth + doorFrameThickness, height: doorFrameThickness, depth: doorFrameThickness }, scene);
    bottomJamb.position.set(0, -5, 0);

    const doorFrame = BABYLON.Mesh.MergeMeshes([leftJamb, rightJamb, topJamb, bottomJamb], true, true, undefined, false, true);
    doorFrame.material = woodMaterial;

    // The Pulley (eye position constraint)
    const pulley = BABYLON.MeshBuilder.CreateCylinder("pulley", { diameter: 1, height: 0.5 }, scene);
    pulley.rotation.z = Math.PI / 2;
    pulley.position.copyFrom(pulleyNode);
    pulley.material = metalMaterial;

    const pulleySupport = BABYLON.MeshBuilder.CreateBox("pulleySupport", { width: 0.2, height: pulleyNode.y + 5, depth: 0.5 }, scene);
    pulleySupport.position.set(pulleyNode.x, (pulleyNode.y - 5) / 2, pulleyNode.z);
    pulleySupport.material = woodMaterial;

    // Paper canvas on the frame door
    const paperWidth = doorFrameWidth - doorFrameThickness;
    const paperHeight = doorFrameHeight - doorFrameThickness;
    const paper = BABYLON.MeshBuilder.CreatePlane("paper", { width: paperWidth, height: paperHeight }, scene);
    paper.position.set(doorFrameWidth, doorFrameHeight / 2 - 5, 0);
    // Align with the Z axis as per original setup

    const paperMaterial = new BABYLON.StandardMaterial("paperMat", scene);
    paperMaterial.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.9); // Off-white
    paperMaterial.backFaceCulling = false;
    paper.material = paperMaterial;

    // Draw frame (the wooden panel representing the door)
    const drawFrame = BABYLON.MeshBuilder.CreateBox("drawFrame", { width: paperWidth + 1, height: paperHeight + 1, depth: 0.5 }, scene);
    drawFrame.position.copyFrom(paper.position);
    drawFrame.position.z += 0.3; // slightly behind paper
    drawFrame.material = woodMaterial;

    // Thread from pulley to stylus
    const thread = BABYLON.MeshBuilder.CreateLines("thread", {
        points: [pulleyNode, pulleyNode] // Initially zero length
    }, scene);
    thread.color = new BABYLON.Color3(0.8, 0.8, 0.8);

    // Stylus (wand/pointer)
    // The user wants the pointy end to be attached to the thread (towards origin)
    // and the thicker end to be held by the person (away from origin)
    const stylusGroup = new BABYLON.TransformNode("stylusGroup", scene);

    const stylusHandle = BABYLON.MeshBuilder.CreateCylinder("stylusHandle", { diameterTop: 0.4, diameterBottom: 0.1, height: 3 }, scene);
    stylusHandle.position.y = -1.5; // Offset so top (narrow end) is at origin, handle goes down

    const stylusTip = BABYLON.MeshBuilder.CreateCylinder("stylusTip", { diameterTop: 0.1, diameterBottom: 0.01, height: 0.5 }, scene);
    stylusTip.position.y = -3.25; // Stacked under handle (pointy tip furthest away if held by thread)

    const stylusMat = new BABYLON.StandardMaterial("stylusMat", scene);
    stylusMat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    stylusHandle.material = stylusMat;
    stylusTip.material = metalMaterial;

    stylusHandle.setParent(stylusGroup);
    stylusTip.setParent(stylusGroup);

    // Fix stylus coordinate system (align long axis with Z so lookAt works as expected)
    // Actually, in main.js we calculate rotation, so we just return the group
    // The handle is thick at y=0, narrow at y=3, tip is at y=3.25.
    // To make lookAt work well, we can align it as required in the main logic
    stylusGroup.rotation.x = Math.PI / 2; // Point along Z initially

    // Group all static meshes under a parent for easy manipulation if needed
    const environmentGroup = new BABYLON.TransformNode("environmentGroup", scene);
    table.setParent(environmentGroup);
    doorFrame.setParent(environmentGroup);
    pulley.setParent(environmentGroup);
    pulleySupport.setParent(environmentGroup);
    paper.setParent(environmentGroup);
    drawFrame.setParent(environmentGroup);

    return {
        table,
        doorFrame,
        pulley,
        pulleySupport,
        paper,
        drawFrame,
        thread,
        stylusGroup
    };
};

// Make sure it's available globally or export it if using modules.
if (typeof window !== 'undefined') {
    window.setupSceneEnvironment = setupSceneEnvironment;
}
