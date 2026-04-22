from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.goto("http://localhost:8000")
        page.wait_for_timeout(2000)

        page.evaluate("""
            () => {
                const pulleyNode = new BABYLON.Vector3(0, 10, 15.5);
                const targetMesh = scene.getMeshByName("targetMesh");
                const children = targetMesh.getChildren();

                let neckMesh = null;
                let pegboxMesh = null;
                let fbMesh = null;

                children.forEach(c => {
                    if (c.name === "lneck") neckMesh = c;
                    if (c.name === "lpegbox") pegboxMesh = c;
                    if (c.name === "lfb") fbMesh = c;
                });

                const checkMeshes = { 'neck': neckMesh, 'pegbox': pegboxMesh, 'fb': fbMesh };

                for (const [partName, mesh] of Object.entries(checkMeshes)) {
                    if (!mesh) {
                        console.log(`${partName} not found!`);
                        continue;
                    }

                    mesh.computeWorldMatrix(true);
                    const matrix = mesh.getWorldMatrix();

                    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                    const normals = mesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);

                    if (!positions || !normals) {
                        console.log(`${partName} no vertex data!`);
                        continue;
                    }

                    let total = positions.length / 3;
                    let culled = 0;

                    const tempV = new BABYLON.Vector3();
                    const tempN = new BABYLON.Vector3();

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

                        if (dot < -0.1) {
                            culled++;
                        }
                    }
                    console.log(`${partName}: Total vertices: ${total}, Culled: ${culled}`);
                }
            }
        """)
        browser.close()

run()
