window.loadTeapotModel = function(scene, callback) {
    BABYLON.SceneLoader.ImportMeshAsync("", "models/", "teapot.glb", scene).then((result) => {
        const actualMeshes = result.meshes.filter(m => m instanceof BABYLON.Mesh && m.getTotalVertices() > 0);
        if (actualMeshes.length > 0) {
            // Apply wood material
            const material = new BABYLON.StandardMaterial("teapotWood", scene);
            material.diffuseColor = new BABYLON.Color3(0.5, 0.3, 0.1);
            material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            material.roughness = 0.8;
            material.backFaceCulling = true;

            actualMeshes.forEach(m => {
                m.material = material;
                m.computeWorldMatrix(true);
            });

            // Merge meshes
            const merged = BABYLON.Mesh.MergeMeshes(actualMeshes, true, true, undefined, false, true);
            if (merged) {
                merged.name = "targetTeapot";
                // Scale teapot up
                merged.scaling.set(15, 15, 15);
                merged.bakeCurrentTransformIntoVertices();
                // Rotate to stand upright
                merged.rotation.x = -Math.PI / 2;
                merged.rotation.y = Math.PI;
                merged.bakeCurrentTransformIntoVertices();
                // Rotate to lie down with spout pointing left
                merged.rotation.x = Math.PI / 2;
                merged.rotation.z = Math.PI / 2;
                merged.rotation.y = Math.PI;
                merged.bakeCurrentTransformIntoVertices();

                callback(merged);
            }
        }
    });
};
