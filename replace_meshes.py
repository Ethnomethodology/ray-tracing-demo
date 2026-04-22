import re

with open("public/js/main.js", "r") as f:
    code = f.read()

# 1. Replace the neck (Box -> Cylinder)
neck_search = """        // Use a Box with subdivisions for the neck to get internal vertices
        const neck = BABYLON.MeshBuilder.CreateBox("lneck", {
            width: neckWidth,
            height: neckHeight,
            depth: neckWidth, // Semi-cylindrical look after scaling
            subdivisions: 15
        }, scene);

        neck.scaling.z = 0.5; // Flatten to semi-circle-ish profile
        neck.position.set(0, L + neckHeight / 2, 0.2);

        // Set neck normals to point upwards
        const neckNormals = neck.getVerticesData(BABYLON.VertexBuffer.NormalKind);
        if (neckNormals) {
            for (let i = 0; i < neckNormals.length; i += 3) {
                neckNormals[i] = 0;
                neckNormals[i + 1] = 0;
                neckNormals[i + 2] = -1;
            }
            neck.setVerticesData(BABYLON.VertexBuffer.NormalKind, neckNormals);
        }
        partMap.neck = neck;"""

neck_replace = """        // Use a Cylinder with subdivisions for the neck to get internal vertices
        const neck = BABYLON.MeshBuilder.CreateCylinder("lneck", {
            diameter: neckWidth,
            height: neckHeight,
            tessellation: 16,
            subdivisions: 20
        }, scene);

        // Cylinder height is along Y by default, which matches the box height orientation
        neck.scaling.z = 0.5; // Flatten to semi-circle-ish profile
        neck.position.set(0, L + neckHeight / 2, 0.2);

        // We do NOT override the normals anymore. The native cylinder normals will point outwards!
        // This fixes the culling logic.
        partMap.neck = neck;"""

code = code.replace(neck_search, neck_replace)

# 2. Replace the fingerboard (Box -> Ground)
fb_search = """        // Use a Box with subdivisions instead of a Cylinder to get vertices across the surface
        const fb = BABYLON.MeshBuilder.CreateBox("lfb", {
            width: fbWidthBottom,
            height: fbHeight,
            depth: 0.15, // Physical thickness
            subdivisions: 20 // High density for the playing surface
        }, scene);

        // Taper the box: narrow the top vertices
        const fbPositions = fb.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        if (fbPositions) {
            for (let i = 0; i < fbPositions.length; i += 3) {
                const y = fbPositions[i + 1]; // Local Y is the length of the box
                const normalizedY = (y / (fbHeight / 2) + 1) / 2; // 0 at bottom, 1 at top
                const scale = 1 - (1 - (fbWidthTop / fbWidthBottom)) * normalizedY;
                fbPositions[i] *= scale; // Scale X (width) based on height
            }
            fb.setVerticesData(BABYLON.VertexBuffer.PositionKind, fbPositions);
        }

        fb.position.set(0, fbStartY + fbHeight / 2, 0.08);

        // Set fingerboard normals to point consistently outwards (towards the viewer/upwards)
        const fbNormals = fb.getVerticesData(BABYLON.VertexBuffer.NormalKind);
        if (fbNormals) {
            for (let i = 0; i < fbNormals.length; i += 3) {
                fbNormals[i] = 0;
                fbNormals[i + 1] = 0;
                fbNormals[i + 2] = -1;
            }
            fb.setVerticesData(BABYLON.VertexBuffer.NormalKind, fbNormals);
        }
        partMap.fb = fb;"""

# We can make a thin box using multiple grounds, or just one Ground because only the top is visible from the front.
# Or we can make a custom ribbon!
# Wait, for a box with subdivisions, we can construct it using CreateCylinder with tessellation 4, and it works, but cylinder only subdivides along height.
# Ribbon is best for a tapered box with subdivisions.
fb_replace = """        // Use a Ground with subdivisions to get vertices across the surface.
        // We use Ground because it natively supports grid subdivisions and the fingerboard is essentially a flat plate.
        const fb = BABYLON.MeshBuilder.CreateGround("lfb", {
            width: fbWidthBottom,
            height: fbHeight,
            subdivisions: 25 // High density for the playing surface
        }, scene);

        // Ground's height runs along Z by default, and it faces up (+Y).
        // We need it to run along Y and face -Z to match the old Box orientation.
        fb.rotation.x = -Math.PI / 2;
        fb.bakeCurrentTransformIntoVertices();

        // Taper the ground: narrow the top vertices
        const fbPositions = fb.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        if (fbPositions) {
            for (let i = 0; i < fbPositions.length; i += 3) {
                const y = fbPositions[i + 1]; // Local Y is now the length
                const normalizedY = (y / (fbHeight / 2) + 1) / 2; // 0 at bottom, 1 at top
                const scale = 1 - (1 - (fbWidthTop / fbWidthBottom)) * normalizedY;
                fbPositions[i] *= scale; // Scale X (width) based on height
            }
            fb.setVerticesData(BABYLON.VertexBuffer.PositionKind, fbPositions);
            // Recompute normals after deformation
            BABYLON.VertexData.ComputeNormals(fbPositions, fb.getIndices(), fb.getVerticesData(BABYLON.VertexBuffer.NormalKind));
        }

        fb.position.set(0, fbStartY + fbHeight / 2, 0.08);

        partMap.fb = fb;"""

code = code.replace(fb_search, fb_replace)


# 3. Replace the pegbox (Box -> Ground)
# Since pegbox is visible from sides and front, a single ground is not enough. We should use a Cylinder with tessellation 4 to make a box, and let it subdivide along the height, which gives points along its length!
pegbox_search = """        // 8. Pegbox (angled box)
        const pegboxOverlap = 0.12;
        const pegboxHeight = 2.4;
        const pegboxWidth = neckR * 2 - 0.05; // Matches fingerboard top width
        const pegbox = BABYLON.MeshBuilder.CreateBox("lpegbox", {
            width: pegboxWidth,
            height: pegboxHeight,
            depth: 0.25,
            subdivisions: 10 // Increased density for sampling
        }, scene);
        pegbox.setPivotMatrix(BABYLON.Matrix.Translation(0, -pegboxHeight / 2, 0), false);
        pegbox.position.set(0, fbEndY - pegboxOverlap, 0.1); // Shifted to match neck move
        pegbox.rotation.x = -115 * (Math.PI / 180);
        pegbox.computeWorldMatrix(true);
        partMap.pegbox = pegbox;"""

pegbox_replace = """        // 8. Pegbox (angled box)
        const pegboxOverlap = 0.12;
        const pegboxHeight = 2.4;
        const pegboxWidth = neckR * 2 - 0.05; // Matches fingerboard top width

        // Use a Cylinder to create a Box with subdivisions along its height!
        const pegbox = BABYLON.MeshBuilder.CreateCylinder("lpegbox", {
            height: pegboxHeight,
            diameter: 1, // Will scale to width/depth later
            tessellation: 4, // 4 sides = box
            subdivisions: 15 // Increased density for sampling along its length
        }, scene);

        // Rotate so flat sides align with X and Z axes (instead of corners)
        pegbox.rotation.y = Math.PI / 4;
        pegbox.bakeCurrentTransformIntoVertices();

        // Scale to match box dimensions
        // diameter is 1, so after rotation by 45 deg, the width/depth bounding box is 1.
        // wait, the bounding box of a unit square rotated by 45deg is sqrt(2).
        // Let's just scale the vertices directly so its width = pegboxWidth, depth = 0.25
        const pScaleX = pegboxWidth / Math.sqrt(0.5);
        const pScaleZ = 0.25 / Math.sqrt(0.5);
        pegbox.scaling.x = pScaleX;
        pegbox.scaling.z = pScaleZ;
        pegbox.bakeCurrentTransformIntoVertices();

        pegbox.setPivotMatrix(BABYLON.Matrix.Translation(0, -pegboxHeight / 2, 0), false);
        pegbox.position.set(0, fbEndY - pegboxOverlap, 0.1); // Shifted to match neck move
        pegbox.rotation.x = -115 * (Math.PI / 180);
        pegbox.computeWorldMatrix(true);
        partMap.pegbox = pegbox;"""

code = code.replace(pegbox_search, pegbox_replace)

with open("public/js/main.js", "w") as f:
    f.write(code)
