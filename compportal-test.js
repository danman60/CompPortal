const { chromium } = require('playwright');

async function testCompPortal() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Starting CompPortal navigation test...');

    try {
        // Navigate to the production site
        console.log('1. Navigating to production site...');
        await page.goto('https://beautiful-bonbon-cde2fe.netlify.app/sample-dashboard.html');
        await page.waitForLoadState('networkidle');

        // Take screenshot of initial page
        await page.screenshot({ path: 'initial-dashboard.png', fullPage: true });
        console.log('✅ Initial screenshot taken: initial-dashboard.png');

        // Get initial console messages
        let consoleMessages = [];
        page.on('console', msg => {
            consoleMessages.push(`${msg.type()}: ${msg.text()}`);
        });

        // Test navigation buttons
        const navigationTests = [
            { name: 'Dashboard', expected: '/sample-dashboard.html' },
            { name: 'Studios', expected: '/studios' },
            { name: 'Dancers', expected: '/dancers' },
            { name: 'Reservations', expected: '/reservations' },
            { name: 'Reports', expected: '/reports' }
        ];

        for (const test of navigationTests) {
            console.log(`\n2. Testing ${test.name} navigation...`);

            try {
                // Look for navigation button
                const button = await page.locator(`nav a:has-text("${test.name}"), button:has-text("${test.name}"), [data-nav="${test.name.toLowerCase()}"]`).first();

                if (await button.count() === 0) {
                    console.log(`❌ ${test.name} button not found`);
                    continue;
                }

                // Clear previous console messages
                consoleMessages = [];

                // Click the button
                await button.click();
                await page.waitForLoadState('networkidle', { timeout: 10000 });

                // Get current URL
                const currentUrl = page.url();
                console.log(`   Current URL: ${currentUrl}`);

                // Check if navigation was successful
                const isCorrectPage = currentUrl.includes(test.expected) ||
                                     (test.name === 'Dashboard' && currentUrl.includes('dashboard'));

                if (isCorrectPage) {
                    console.log(`✅ ${test.name} navigation successful`);
                } else {
                    console.log(`⚠️  ${test.name} navigation unclear - check manually`);
                }

                // Take screenshot
                const filename = `${test.name.toLowerCase()}-page.png`;
                await page.screenshot({ path: filename, fullPage: true });
                console.log(`   Screenshot taken: ${filename}`);

                // Check for console errors
                const errors = consoleMessages.filter(msg => msg.startsWith('error:'));
                if (errors.length > 0) {
                    console.log(`   Console errors found:`);
                    errors.forEach(error => console.log(`     ${error}`));
                } else {
                    console.log(`   No console errors found`);
                }

                // Wait a moment between tests
                await page.waitForTimeout(1000);

            } catch (error) {
                console.log(`❌ Error testing ${test.name}: ${error.message}`);
            }
        }

        console.log('\n3. Test completed!');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
}

testCompPortal();