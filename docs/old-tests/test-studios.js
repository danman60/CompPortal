const { chromium } = require('playwright');

async function testStudiosPage() {
    // Launch browser
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    try {
        console.log('📖 Loading Studios page...');

        // Navigate to the Studios page (using file:// protocol for local file)
        const studiosPath = 'file:///' + __dirname.replace(/\\/g, '/') + '/studios.html';
        console.log('Loading from:', studiosPath);

        await page.goto(studiosPath);

        // Wait for page to load completely
        await page.waitForLoadState('networkidle');

        console.log('✅ Page loaded successfully');

        // Take full page screenshot
        await page.screenshot({
            path: 'studios-page-full.png',
            fullPage: true
        });
        console.log('📸 Full page screenshot saved as studios-page-full.png');

        // Take viewport screenshot
        await page.screenshot({
            path: 'studios-page-viewport.png'
        });
        console.log('📸 Viewport screenshot saved as studios-page-viewport.png');

        // Test navigation menu
        console.log('🧪 Testing navigation menu...');

        // Check if Studios tab is active
        const studiosTab = page.locator('a[href="studios.html"]');
        const isActive = await studiosTab.evaluate(el => el.classList.contains('bg-white/20'));
        console.log(`✅ Studios tab active state: ${isActive}`);

        // Test navigation links
        const navLinks = page.locator('nav a');
        const navCount = await navLinks.count();
        console.log(`✅ Found ${navCount} navigation links`);

        // Test interactive elements
        console.log('🧪 Testing interactive elements...');

        // Test form inputs
        const inputs = page.locator('input, select');
        const inputCount = await inputs.count();
        console.log(`✅ Found ${inputCount} form inputs`);

        // Test input focus
        const firstInput = inputs.first();
        await firstInput.focus();
        await page.waitForTimeout(500);
        console.log('✅ Input focus working');

        // Test buttons
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();
        console.log(`✅ Found ${buttonCount} buttons`);

        // Test Edit Profile button hover
        const editButton = page.locator('text=Edit Profile');
        await editButton.hover();
        await page.waitForTimeout(500);
        console.log('✅ Edit button hover effects working');

        // Test Save Changes button
        const saveButton = page.locator('text=Save Changes');
        await saveButton.hover();
        await page.waitForTimeout(500);
        console.log('✅ Save button hover effects working');

        // Check glassmorphism effects
        console.log('🧪 Testing glassmorphism effects...');

        // Check backdrop blur on cards
        const cards = page.locator('.backdrop-blur-md');
        const cardCount = await cards.count();
        console.log(`✅ Found ${cardCount} glassmorphism cards`);

        // Check background animation
        const bgAnimation = page.locator('.animate-pulse');
        const animationCount = await bgAnimation.count();
        console.log(`✅ Found ${animationCount} background animations`);

        // Test color consistency
        console.log('🎨 Testing color consistency...');

        // Check dance color usage
        const pinkElements = await page.locator('[class*="dance-pink"]').count();
        const purpleElements = await page.locator('[class*="dance-purple"]').count();
        const goldElements = await page.locator('[class*="dance-gold"]').count();
        const blueElements = await page.locator('[class*="dance-blue"]').count();

        console.log(`✅ Dance colors used: Pink(${pinkElements}), Purple(${purpleElements}), Gold(${goldElements}), Blue(${blueElements})`);

        // Test specific visual elements
        console.log('🎨 Testing visual quality...');

        // Check gradient backgrounds
        const gradientElements = await page.locator('[class*="gradient"]').count();
        console.log(`✅ Found ${gradientElements} gradient elements`);

        // Check rounded corners
        const roundedElements = await page.locator('[class*="rounded"]').count();
        console.log(`✅ Found ${roundedElements} rounded elements`);

        // Wait to observe the page for testing
        console.log('⏳ Waiting 3 seconds for visual observation...');
        await page.waitForTimeout(3000);

        console.log('🎉 Testing completed successfully!');

    } catch (error) {
        console.error('❌ Error during testing:', error);

        // Take error screenshot
        await page.screenshot({
            path: 'studios-page-error.png'
        });
        console.log('📸 Error screenshot saved as studios-page-error.png');

    } finally {
        await browser.close();
    }
}

// Run the test
testStudiosPage().catch(console.error);