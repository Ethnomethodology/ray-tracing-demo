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
                const cyl1 = BABYLON.MeshBuilder.CreateCylinder("c1", {
                    height: 2, diameter: 1, tessellation: 4, subdivisions: 10
                }, scene);
                console.log(`Cyl1 vertices: ${cyl1.getTotalVertices()}`);

                const ground1 = BABYLON.MeshBuilder.CreateGround("g1", {
                    width: 2, height: 2, subdivisions: 10
                }, scene);
                console.log(`Ground1 vertices: ${ground1.getTotalVertices()}`);

                // Let's check what CreateBox does
                const box1 = BABYLON.MeshBuilder.CreateBox("b1", {
                    width: 2, height: 2, depth: 2, subdivisions: 10
                }, scene);
                console.log(`Box1 vertices: ${box1.getTotalVertices()}`);
            }
        """)
        browser.close()

run()
