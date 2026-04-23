import time
from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000")

        # Initial state: finish disabled, play enabled
        assert page.locator("#fastForwardBtn").is_disabled()

        # Click Play -> finish should be enabled
        page.locator("#animateBtn").click()
        assert not page.locator("#fastForwardBtn").is_disabled()

        # Click Pause -> finish should be disabled
        page.locator("#animateBtn").click()
        assert page.locator("#fastForwardBtn").is_disabled()

        # Click Play again, then finish -> finish should disable itself
        page.locator("#animateBtn").click()
        page.locator("#fastForwardBtn").click()
        assert page.locator("#fastForwardBtn").is_disabled()

        # Click Play again, then reset -> finish should be disabled
        page.locator("#animateBtn").click()
        page.locator("#stopBtn").click()
        assert page.locator("#fastForwardBtn").is_disabled()

        print("Finish button logic verified!")
        browser.close()

if __name__ == "__main__":
    main()
