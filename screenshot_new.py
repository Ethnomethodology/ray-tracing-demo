from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:8000")
        page.wait_for_timeout(3000)

        # Let's take a screenshot of the normals to verify they look correct
        page.click("#normalsBtn")
        page.wait_for_timeout(1000)
        page.select_option("#lutePartSelect", "neck")
        page.screenshot(path="new_normals_neck.png")

        page.select_option("#lutePartSelect", "pegbox")
        page.wait_for_timeout(1000)
        page.screenshot(path="new_normals_pegbox.png")

        page.select_option("#lutePartSelect", "fb")
        page.wait_for_timeout(1000)
        page.screenshot(path="new_normals_fb.png")

        # Now let's try the fast-forward animator and see the pointillist drawing!
        page.click("#normalsBtn") # turn off normals
        page.wait_for_timeout(500)
        page.click("#fastForwardBtn")
        page.wait_for_timeout(3000)
        page.screenshot(path="new_drawing.png")

        browser.close()

run()
