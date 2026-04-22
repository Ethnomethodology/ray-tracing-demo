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
                    height: 2, diameter: 1, tessellation: 8, subdivisions: 15
                }, scene);
                console.log("Cylinder vertices: " + cyl.getTotalVertices());
                console.log("Cyl subdivisions parameter works for CreateCylinder!");
            }
        """)
        browser.close()

run()
