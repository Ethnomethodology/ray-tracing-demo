from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.goto("http://localhost:8000")
        page.wait_for_timeout(2000)

        # Inject script to evaluate dot products specifically for pegs
        page.evaluate("""
            () => {
                const pulleyNode = new BABYLON.Vector3(0, 10, 15.5);
                const targetMesh = scene.getMeshByName("targetMesh");
                const children = targetMesh.getChildren();

                let pegMesh = null;

                children.forEach(c => {
                    // Check if it's the merged pegs
                    if (c.name.startsWith("lpeg0_")) pegMesh = c;
                    // Oh actually, they were merged, so the name depends on how MergeMeshes handled it. Let's look for "lpeg" prefix and find the merged one or just check all
                });

                // Let's just iterate over all children and print their names and culling stats
                children.forEach(mesh => {
                    if (!mesh) return;

                    mesh.computeWorldMatrix(true);
                    const matrix = mesh.getWorldMatrix();

                    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                    const normals = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);

                    if (!positions || !normals) return;

                    let total = positions.length / 3;
                    let culled = 0;

                    const tempV = new BABYLON.Vector3();
                    const tempN = new BABYLON.Vector3();

                    let minDot = 1;
                    let maxDot = -1;

                    for(let i=0; i<total; i++) {
                        const localX = positions[i * 3];
                        const localY = positions[i * 3 + 1];
                        const localZ = positions[i * 3 + 2];
                        BABYLON.Vector3.TransformCoordinatesFromFloatsToRef(localX, localY, localZ, matrix, tempV);

                        const nx = normals[i * 3];
                        const ny = normals[i * 3 + 1];
                        const nz = normals[i * 3 + 2];
                        BABYLON.Vector3.TransformNormalFromFloatsToRef(nx, ny, nz, matrix, tempN);

                        const toPulley = pulleyNode.subtract(tempV);
                        const dot = BABYLON.Vector3.Dot(tempN.normalize(), toPulley.normalize());

                        if (dot < minDot) minDot = dot;
                        if (dot > maxDot) maxDot = dot;

                        if (dot < -0.1) {
                            culled++;
                        }
                    }
                    console.log(`${mesh.name}: Total vertices: ${total}, Culled: ${culled}. Dot range: [${minDot.toFixed(2)}, ${maxDot.toFixed(2)}]`);
                });
            }
        """)
        browser.close()

run()
