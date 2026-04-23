from playwright.sync_api import sync_playwright
import time

def take_screenshot():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto('http://localhost:8000')
        time.sleep(5) # Wait for babylon to render
        page.screenshot(path='screenshot.png')
        browser.close()

if __name__ == "__main__":
    take_screenshot()
