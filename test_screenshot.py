import sys
from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto('http://localhost:8000')
        # Wait a bit for Babylon.js to load and render the scene
        time.sleep(3)
        page.screenshot(path='screenshot.png')
        browser.close()

if __name__ == '__main__':
    run()
