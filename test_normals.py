from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:8000")
        page.wait_for_selector("#normalsBtn")
        page.click("#normalsBtn")
        page.wait_for_timeout(2000)
        page.screenshot(path="normals_all.png")

        page.select_option("#lutePartSelect", "neck")
        page.wait_for_timeout(1000)
        page.screenshot(path="normals_neck.png")

        page.select_option("#lutePartSelect", "pegbox")
        page.wait_for_timeout(1000)
        page.screenshot(path="normals_pegbox.png")

        browser.close()

run()
