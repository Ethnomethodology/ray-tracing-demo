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
                // Ground approach
                const fbWidthBottom = 2;
                const fbWidthTop = 1;
                const fbHeight = 5;

                const ground = BABYLON.MeshBuilder.CreateGround("g", {
                    width: fbWidthBottom, height: fbHeight, subdivisions: 20
                }, scene);

                console.log("Ground vertices: " + ground.getTotalVertices());
            }
        """)
        browser.close()

run()
