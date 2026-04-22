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
                // If we want a solid box, we can combine grounds or just use Cylinder.
                // For Cylinder with tessellation 4, does it look like a box? Yes, but rotated by 45 degrees.
                const cyl = BABYLON.MeshBuilder.CreateCylinder("c", {
                    height: 2, diameter: Math.sqrt(2), tessellation: 4, subdivisions: 20
                }, scene);
                cyl.rotation.y = Math.PI / 4;
                cyl.bakeCurrentTransformIntoVertices();

                // Then we scale it
                cyl.scaling.x = 2; // width
                cyl.scaling.z = 0.5; // depth
                cyl.bakeCurrentTransformIntoVertices();

                console.log("Cylinder mapped to box has vertices: " + cyl.getTotalVertices());
                // Only 124 vertices for subdivisions: 20
                // Wait, subdivisions for cylinder only divides along the height! The caps and sides don't get subdivided horizontally!

                // What about CreateGround for the fingerboard? It's just a plate anyway. It doesn't need to be thick. Or we can use ExtrudePolygon.
                // Or maybe CreateBox is fine if we tessellate it?
                // We can't tessellate a box easily.

                // We can use CreateGround for the top surface, and that's enough since it's the only visible part!
                const fbGround = BABYLON.MeshBuilder.CreateGround("fbg", {width: 1, height: 1, subdivisions: 20}, scene);
                console.log("Ground vertices: " + fbGround.getTotalVertices());
            }
        """)
        browser.close()

run()
