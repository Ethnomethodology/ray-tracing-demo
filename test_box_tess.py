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
                const cyl = BABYLON.MeshBuilder.CreateCylinder("c", {
                    height: 2, diameter: Math.sqrt(2), tessellation: 4, subdivisions: 10
                }, scene);
                cyl.rotation.y = Math.PI / 4;
                console.log("Cylinder as Box vertices: " + cyl.getTotalVertices());

                // Inspect how the vertices are structured
                const positions = cyl.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                console.log("Positions length: " + positions.length);
            }
        """)
        browser.close()

run()
