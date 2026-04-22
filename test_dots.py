from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.goto("http://localhost:8000")
        page.wait_for_timeout(2000)

        # Inject script to test normals via scene traversal
        page.evaluate("""
            () => {
                const targetMesh = scene.getMeshByName("targetMesh");
                const matrix = targetMesh.getWorldMatrix();
                const tempV = new BABYLON.Vector3();
                const tempN = new BABYLON.Vector3();
                const pulleyNode = new BABYLON.Vector3(0, 10, 15.5);

                const positions = targetMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                const normals = targetMesh.getVerticesData(BABYLON.VertexBuffer.NormalKind);

                let total = positions.length / 3;
                let culled = 0;
                let culledNormals = [];

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
                console.log(`Total vertices: ${total}, Culled: ${culled}`);
            }
        """)
        browser.close()

run()
