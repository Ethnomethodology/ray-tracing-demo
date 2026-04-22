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
                // Let's check how we can create a subdivided box.
                // We can use a Ribbon or multiple Grounds to create a subdivided box,
                // but maybe we can just create a custom function to subdivide a mesh.

                // IncreaseSubdivision function? Babylon doesn't have a built-in one for Box.

                // Let's check CreateGround
                const g = BABYLON.MeshBuilder.CreateGround("g", {width: 1, height: 1, subdivisions: 10}, scene);
                console.log("Ground vertices: " + g.getTotalVertices());
            }
        """)
        browser.close()

run()
