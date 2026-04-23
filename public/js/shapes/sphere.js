window.buildProceduralSphere = function(scene) {
    return BABYLON.MeshBuilder.CreateSphere("targetSphere", { diameter: 8, segments: 64 }, scene);
};
