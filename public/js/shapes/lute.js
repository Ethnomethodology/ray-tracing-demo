window.buildProceduralLute = function(scene) {

        const partMap = {};
        // ── Mathematical profile: teardrop outline (round bottom → tapered top) ──
        const R = 2.5;    // bulbous bottom radius
        const L = 6.0;    // body length
        const neckR = 0.45;   // half-width at neck join
        const STEPS = 60; // Reduced to balance rings with neck subdivisions

        const profile = [];
        for (let i = 0; i <= STEPS; i++) {
            const y = (i / STEPS) * L;
            let x;
            if (y <= R) {
                x = Math.sqrt(R * R - Math.pow(R - y, 2));
            } else {
                const t = (y - R) / (L - R);
                x = R - (R - neckR) * t;
            }
            profile.push(new BABYLON.Vector3(x, y, 0));
        }

        const parts = [];

        // 1. Ribbed bowl — half-lathe gives the classic staved back
        const bowl = BABYLON.MeshBuilder.CreateLathe("lbowl", {
            shape: profile, arc: 0.5, tessellation: 32, // Reduced to balance with neck
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, scene);
        // Do not convert to flat shaded, as it doubles the edges for wireframe
        partMap.bowl = bowl;
        parts.push(bowl);

        const topPlate = BABYLON.MeshBuilder.CreateLathe("ltop", {
            shape: profile, arc: 1.0, tessellation: 64,
            sideOrientation: BABYLON.Mesh.DOUBLESIDE
        }, scene);
        topPlate.scaling.z = 0.001;

        // Set soundboard normals to point consistently outwards (towards the viewer/upwards)
        // Since it's a flattened lathe, the original normals were radial (pointing sideways).
        // We replace them with a constant vector (0, 0, -1).
        const topNormals = topPlate.getVerticesData(BABYLON.VertexBuffer.NormalKind);
        if (topNormals) {
            for (let i = 0; i < topNormals.length; i += 3) {
                topNormals[i] = 0;     // X
                topNormals[i + 1] = 0; // Y
                topNormals[i + 2] = -1; // Z (pointing towards viewer)
            }
            topPlate.setVerticesData(BABYLON.VertexBuffer.NormalKind, topNormals);
        }
        partMap.top = topPlate;
        parts.push(topPlate);

        // 3. Soundhole disc (dark plug)
        const holeY = R + (L - R) * 0.4;
        const holeR = 0.65;
        const hole = BABYLON.MeshBuilder.CreateCylinder("lhole", {
            height: 0.05, diameter: holeR * 2, tessellation: 32
        }, scene);
        hole.rotation.x = Math.PI / 2;
        hole.position.set(0, holeY, -0.01);
        partMap.hole = hole;
        parts.push(hole);

        // 4. Rosette rings
        const rings = [];
        [0.75, 0.85, 0.95].forEach((r, idx) => {
            const ring = BABYLON.MeshBuilder.CreateTorus("lring" + idx, {
                diameter: r * 2, thickness: 0.04, tessellation: 32
            }, scene);
            ring.rotation.x = Math.PI / 2;
            ring.position.set(0, holeY, -0.015);
            parts.push(ring);
            rings.push(ring);
        });
        // We'll merge rings into one logical part for simplicity
        const mergedRings = BABYLON.Mesh.MergeMeshes(rings, true, true, undefined, false, false);
        partMap.rings = mergedRings;

        // 5. Bridge
        const bridgeY = R * 0.4;
        const bridge = BABYLON.MeshBuilder.CreateBox("lbridge", {
            width: 2.4, height: 0.15, depth: 0.1
        }, scene);
        bridge.position.set(0, bridgeY, -0.05);
        partMap.bridge = bridge;
        parts.push(bridge);

        // 6. Neck
        const neckHeight = 3.6;
        const neckWidth = neckR * 2;
        // Use a Cylinder with subdivisions for the neck to get internal vertices
        const neck = BABYLON.MeshBuilder.CreateCylinder("lneck", {
            diameter: neckWidth,
            height: neckHeight,
            tessellation: 32, // Matches bowl ribs
            subdivisions: 40  // Increased to balance with bowl rings
        }, scene);

        // Cylinder height is along Y by default, which matches the box height orientation
        // Flatten the front face to make it D-shaped instead of circular
        const neckPositions = neck.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        if (neckPositions) {
            // The fingerboard is at Z=0.08 world. Neck is at Z=0.2 world.
            // So the flat face should be at local Z = 0.08 - 0.2 = -0.12
            const flatZLocal = -0.12; 
            for (let i = 0; i < neckPositions.length; i += 3) {
                if (neckPositions[i + 2] < flatZLocal) {
                    neckPositions[i + 2] = flatZLocal;
                }
            }
            neck.setVerticesData(BABYLON.VertexBuffer.PositionKind, neckPositions);
            // Recompute normals for the new D-shape
            BABYLON.VertexData.ComputeNormals(neckPositions, neck.getIndices(), neck.getVerticesData(BABYLON.VertexBuffer.NormalKind));
        }

        neck.position.set(0, L + neckHeight / 2, 0.08); // Moved up from 0.2
        
        // We do NOT override the normals anymore. The native cylinder normals will point outwards!
        partMap.neck = neck;
        parts.push(neck);

        // 7. Fingerboard (flat dark plate over neck)
        const fbStartY = holeY + holeR + 0.15;
        const fbEndY = L + neckHeight;
        const fbHeight = fbEndY - fbStartY;
        const fbWidthBottom = neckR * 2 + 0.25;
        const fbWidthTop = neckR * 2 - 0.05;

        // Use a Ground with subdivisions to get vertices across the surface.
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

        fb.position.set(0, fbStartY + fbHeight / 2, -0.04); // Moved up from 0.08

        partMap.fb = fb;
        parts.push(fb);
        fb.computeWorldMatrix(true);

        // 8. Hollow Tapered Pegbox (Extruded U-channel)
        const pegboxOverlap = 0.12;
        const pegboxHeight = 2.4;
        const pegboxWidth = neckR * 2; 
        const pegboxDepth = 0.25;
        const wallThickness = 0.05;

        const w = pegboxWidth / 2;
        const d = pegboxDepth / 2;
        const t = wallThickness;

        const pbGroup = new BABYLON.TransformNode("lpegboxGroup", scene);

        // Helper to create a tapered plate (for floor and walls)
        const createTaperedPlate = (name, width, height, depth, taper) => {
            const plate = BABYLON.MeshBuilder.CreateBox(name, { width: width, height: height, depth: depth }, scene);
            const pos = plate.getVerticesData(BABYLON.VertexBuffer.PositionKind);
            for (let i = 0; i < pos.length; i += 3) {
                const y = pos[i + 1];
                const normY = (y / (height / 2) + 1) / 2; // 0 at bottom, 1 at top
                const scale = taper + (1 - taper) * normY;
                pos[i] *= scale; // Taper width
            }
            plate.setVerticesData(BABYLON.VertexBuffer.PositionKind, pos);
            BABYLON.VertexData.ComputeNormals(pos, plate.getIndices(), plate.getVerticesData(BABYLON.VertexBuffer.NormalKind));
            return plate;
        };

        // Floor (The back of the trough - positioned at local -Z to appear on top after tilt)
        const pbFloor = createTaperedPlate("lpbFloor", pegboxWidth, pegboxHeight, wallThickness, 0.5);
        pbFloor.position.z = -(d - t/2);
        pbFloor.parent = pbGroup;

        // Side Walls (tapered distance from center)
        const pbLeft = BABYLON.MeshBuilder.CreateBox("lpbLeft", { width: t, height: pegboxHeight, depth: pegboxDepth }, scene);
        const lpPos = pbLeft.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        for (let i = 0; i < lpPos.length; i += 3) {
            const y = lpPos[i + 1];
            const normY = (y / (pegboxHeight / 2) + 1) / 2;
            const scale = 0.5 + 0.5 * normY;
            lpPos[i] += (-w * scale + t / 2); 
        }
        pbLeft.setVerticesData(BABYLON.VertexBuffer.PositionKind, lpPos);
        BABYLON.VertexData.ComputeNormals(lpPos, pbLeft.getIndices(), pbLeft.getVerticesData(BABYLON.VertexBuffer.NormalKind));
        pbLeft.parent = pbGroup;

        const pbRight = BABYLON.MeshBuilder.CreateBox("lpbRight", { width: t, height: pegboxHeight, depth: pegboxDepth }, scene);
        const rpPos = pbRight.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        for (let i = 0; i < rpPos.length; i += 3) {
            const y = rpPos[i + 1];
            const normY = (y / (pegboxHeight / 2) + 1) / 2;
            const scale = 0.5 + 0.5 * normY;
            rpPos[i] += (w * scale - t / 2);
        }
        pbRight.setVerticesData(BABYLON.VertexBuffer.PositionKind, rpPos);
        BABYLON.VertexData.ComputeNormals(rpPos, pbRight.getIndices(), pbRight.getVerticesData(BABYLON.VertexBuffer.NormalKind));
        pbRight.parent = pbGroup;

        // Tip Cap
        const pbTip = BABYLON.MeshBuilder.CreateBox("lpbTip", { width: pegboxWidth * 0.5, height: t, depth: pegboxDepth }, scene);
        pbTip.position.y = -pegboxHeight / 2;
        pbTip.parent = pbGroup;

        // Final Pegbox Assembly (Merge for ray-tracing)
        const pegbox = BABYLON.Mesh.MergeMeshes([pbFloor, pbLeft, pbRight, pbTip], true, true, undefined, false, false);
        pegbox.name = "lpegbox";
        pegbox.setPivotMatrix(BABYLON.Matrix.Translation(0, -pegboxHeight / 2, 0), false);
        pegbox.position.set(0, fbEndY - pegboxOverlap, -0.02); 
        pegbox.rotation.x = -115 * (Math.PI / 180);
        pegbox.computeWorldMatrix(true);
        partMap.pegbox = pegbox;
        parts.push(pegbox);

        // 9. Tuning pegs (8 total: 4 pairs)
        const pegs = [];
        for (let i = 0; i < 4; i++) {
            // h starts near the top (neck) and moves towards the tip
            const h = pegboxHeight / 2 - 0.4 - i * 0.5;
            [-1, 1].forEach((side, si) => {
                const actualY = h - (si === 1 ? 0.25 : 0);
                const normalizedY = (actualY / (pegboxHeight / 2) + 1) / 2;
                const taperScale = 0.5 + 0.5 * normalizedY;
                const currentWidth = pegboxWidth * taperScale;

                const peg = BABYLON.MeshBuilder.CreateCylinder("lpeg" + i + "_" + si, {
                    height: currentWidth * 1.2, diameter: 0.08, tessellation: 8
                }, scene);
                peg.rotation.z = Math.PI / 2;
                // Position pegs so they pass through the side walls of the hollow box
                peg.position.set(0, actualY, 0); 
                peg.parent = pegbox;          // stay parented — world matrix is correct
                peg.computeWorldMatrix(true); // force propagation through parent chain
                parts.push(peg);
                pegs.push(peg);
            });
        }
        // Merge pegs for simplicity
        const mergedPegs = BABYLON.Mesh.MergeMeshes(pegs, true, true, undefined, false, false);
        partMap.pegs = mergedPegs;



        // 10. Frets (gut strings tied around neck — logarithmic spacing)
        const numFrets = 9;
        const frets = [];
        for (let i = 0; i < numFrets; i++) {
            const fretDist = Math.pow((i + 1) / (numFrets + 1), 0.8) * fbHeight * 0.85;
            const fretY = fbEndY - fretDist;
            const t = (fretY - fbStartY) / fbHeight;
            const w = (neckR * 2 + 0.25) * (1 - t) + (neckR * 2 - 0.05) * t;
            const fret = BABYLON.MeshBuilder.CreateCylinder("lfret" + i, {
                height: w * 0.98, diameter: 0.018, tessellation: 8
            }, scene);
            fret.rotation.z = Math.PI / 2;
            fret.position.set(0, fretY, -0.035);
            parts.push(fret);
            frets.push(fret);
        }
        const mergedFrets = BABYLON.Mesh.MergeMeshes(frets, true, true, undefined, false, false);
        partMap.frets = mergedFrets;

        // 11. Strings (8 tubes from bridge to pegbox pegs)
        const numStrings = 8;
        const strings = [];
        for (let i = 0; i < numStrings; i++) {
            const xBot = -1.0 + (i * 2.0 / (numStrings - 1));
            const xTop = -(pegboxWidth - 0.2) / 2 + (i * (pegboxWidth - 0.2) / (numStrings - 1));
            
            // Map string i to peg row and side
            const pegRow = Math.floor(i / 2);
            const pegSide = (i % 2 === 0) ? -1 : 1;
            const pegH = pegboxHeight / 2 - 0.4 - pegRow * 0.5;
            const pegOffset = (pegSide === 1 ? 0.25 : 0);
            
            // Local peg position for string attachment (on top surface of pegbox)
            const actualY = pegH - pegOffset;
            const normalizedY = (actualY / (pegboxHeight / 2) + 1) / 2;
            const taperScale = 0.5 + 0.5 * normalizedY;
            const currentWidth = pegboxWidth * taperScale;

            const localPegPos = new BABYLON.Vector3(0, actualY, 0.05);
            const worldPegPos = BABYLON.Vector3.TransformCoordinates(localPegPos, pegbox.getWorldMatrix());

            const stringPath = [
                new BABYLON.Vector3(xBot, bridgeY, -0.1),
                new BABYLON.Vector3(xTop, fbEndY,  -0.06), // Moved up from 0.05
                worldPegPos
            ];
            const str = BABYLON.MeshBuilder.CreateTube("lstr" + i, {
                path: stringPath, radius: 0.008, tessellation: 4
            }, scene);
            parts.push(str);
            strings.push(str);
        }
        const mergedStrings = BABYLON.Mesh.MergeMeshes(strings, true, true, undefined, false, false);
        partMap.strings = mergedStrings;

        // Force all world matrices before merge
        const finalParts = Object.values(partMap);
        finalParts.forEach(p => p.computeWorldMatrix(true));

        // Merge everything into a single mesh for the raycasting pipeline
        // We use disposeSource = false so we can still use the parts for visualization
        const merged = BABYLON.Mesh.MergeMeshes(finalParts, false, true, undefined, false, false);
        if (!merged) return null;

        // Hide source parts and parent them to the merged mesh so they follow its transform
        finalParts.forEach(p => {
            p.setEnabled(false);
            p.parent = merged;
        });
        currentLuteParts = partMap;

        // Lie the lute down on the table, neck pointing straight towards the frame
        merged.rotation.x = Math.PI / 2;
        merged.rotation.y = 0;
        merged.rotation.z = 0;

        return merged;
    };
