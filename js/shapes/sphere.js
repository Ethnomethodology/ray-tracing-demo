window.buildProceduralSphere = function(nameOrScene, sceneOrOptions, options = {}) {
    let name = "targetSphere";
    let scene;
    let finalOptions = { diameter: 8, segments: 64 };

    if (typeof nameOrScene === "string") {
        name = nameOrScene;
        scene = sceneOrOptions;
        if (options.diameter) finalOptions.diameter = options.diameter;
    } else {
        scene = nameOrScene;
        if (sceneOrOptions && sceneOrOptions.diameter) finalOptions.diameter = sceneOrOptions.diameter;
    }

    return BABYLON.MeshBuilder.CreateSphere(name, finalOptions, scene);
};
