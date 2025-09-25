#!/usr/bin/env python3
"""
Screenshot capture script for GlowDance Competition Portal Dashboard
"""
import asyncio
import os
from playwright.async_api import async_playwright
from pathlib import Path

async def capture_dashboard():
    """Capture screenshots of the dashboard and login pages"""
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=False)  # Set to False to see the browser
        context = await browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = await context.new_page()

        try:
            # Get current directory
            current_dir = Path(__file__).parent.absolute()

            # Capture the main index page
            index_path = f"file://{current_dir}/index.html"
            print(f"Loading: {index_path}")
            await page.goto(index_path)
            await page.wait_for_load_state('networkidle')
            await page.screenshot(path='index_screenshot.png', full_page=True)
            print("SUCCESS: Index page screenshot saved: index_screenshot.png")

            # Capture the login page
            login_path = f"file://{current_dir}/sample-login.html"
            print(f"Loading: {login_path}")
            await page.goto(login_path)
            await page.wait_for_load_state('networkidle')
            await page.screenshot(path='login_screenshot.png', full_page=True)
            print("SUCCESS: Login page screenshot saved: login_screenshot.png")

            # Capture the dashboard page
            dashboard_path = f"file://{current_dir}/sample-dashboard.html"
            print(f"Loading: {dashboard_path}")
            await page.goto(dashboard_path)
            await page.wait_for_load_state('networkidle')
            await page.screenshot(path='dashboard_screenshot.png', full_page=True)
            print("SUCCESS: Dashboard page screenshot saved: dashboard_screenshot.png")

            # Wait a bit to see the pages
            await page.wait_for_timeout(2000)

        except Exception as e:
            print(f"ERROR: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(capture_dashboard())