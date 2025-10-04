const { chromium } = require('playwright');

async function detailedTest() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Starting detailed CompPortal test...');

    let consoleMessages = [];
    let networkErrors = [];

    // Capture console messages
    page.on('console', msg => {
        consoleMessages.push({
            type: msg.type(),
            text: msg.text(),
            timestamp: new Date().toISOString()
        });
    });

    // Capture network failures
    page.on('requestfailed', request => {
        networkErrors.push({
            url: request.url(),
            failure: request.failure(),
            timestamp: new Date().toISOString()
        });
    });

    try {
        // Navigate to the production site
        console.log('1. Loading production site...');
        await page.goto('https://beautiful-bonbon-cde2fe.netlify.app/sample-dashboard.html');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000); // Let JS fully load

        // Check console errors after initial load
        console.log('\n=== Initial Page Load Console Messages ===');
        consoleMessages.forEach(msg => {
            if (msg.type === 'error') {
                console.log(`❌ ERROR: ${msg.text}`);
            } else if (msg.type === 'warning') {
                console.log(`⚠️  WARNING: ${msg.text}`);
            }
        });

        // Check network errors
        if (networkErrors.length > 0) {
            console.log('\n=== Network Errors ===');
            networkErrors.forEach(err => {
                console.log(`❌ NETWORK ERROR: ${err.url} - ${err.failure}`);
            });
        }

        // Test dashboard card links instead of top navigation
        console.log('\n2. Testing dashboard card links...');

        const cardTests = [
            { name: 'Studio Profile', selector: 'a:has-text("View Details")' },
            { name: 'Manage Dancers', selector: 'a:has-text("Manage Dancers")' },
            { name: 'Reservations', selector: 'a:has-text("View Reservations")' },
            { name: 'Reports', selector: 'a:has-text("View Reports")' }
        ];

        for (const test of cardTests) {
            console.log(`\n   Testing ${test.name} card link...`);

            try {
                const linkElement = page.locator(test.selector).first();

                if (await linkElement.count() === 0) {
                    console.log(`     ❌ ${test.name} link not found`);
                    continue;
                }

                // Get the href before clicking
                const href = await linkElement.getAttribute('href');
                console.log(`     Link href: ${href || 'No href attribute'}`);

                // Clear console messages
                consoleMessages = [];

                // Click the link
                await linkElement.click();
                await page.waitForTimeout(2000);

                const currentUrl = page.url();
                console.log(`     Current URL after click: ${currentUrl}`);

                // Check for new errors
                const newErrors = consoleMessages.filter(msg => msg.type === 'error');
                if (newErrors.length > 0) {
                    console.log(`     Console errors after click:`);
                    newErrors.forEach(error => console.log(`       ${error.text}`));
                } else {
                    console.log(`     ✅ No console errors`);
                }

                // Take screenshot
                const filename = `${test.name.toLowerCase().replace(' ', '-')}-link-test.png`;
                await page.screenshot({ path: filename, fullPage: true });
                console.log(`     Screenshot: ${filename}`);

            } catch (error) {
                console.log(`     ❌ Error testing ${test.name}: ${error.message}`);
            }
        }

        // Test the top navigation more carefully
        console.log('\n3. Testing top navigation elements...');

        const navButtons = await page.locator('nav a, nav button').all();
        console.log(`   Found ${navButtons.length} navigation elements`);

        for (let i = 0; i < navButtons.length; i++) {
            const button = navButtons[i];
            const text = await button.textContent();
            const href = await button.getAttribute('href');
            const onclick = await button.getAttribute('onclick');

            console.log(`   Nav element ${i + 1}: "${text}" href="${href}" onclick="${onclick}"`);
        }

        // Check if this is a single-page app with JavaScript routing
        console.log('\n4. Checking for JavaScript routing...');
        const scripts = await page.locator('script[src]').all();
        console.log(`   Found ${scripts.length} external scripts`);

        for (const script of scripts) {
            const src = await script.getAttribute('src');
            console.log(`   Script: ${src}`);
        }

        console.log('\n=== Final Summary ===');
        console.log(`Total console messages: ${consoleMessages.length}`);
        console.log(`Total network errors: ${networkErrors.length}`);

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
}

detailedTest();