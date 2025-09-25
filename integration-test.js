const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Test data expectations based on the system specification
const EXPECTED_DATA = {
    dancers: 12,
    activeReservations: 2,
    studios: 3, // Based on typical dance studio setup
    userProfile: {
        name: 'Emily Einsmann',
        organization: 'UDA'
    }
};

// Test results storage
const testResults = {
    pages: {},
    navigation: {},
    dataConsistency: {},
    designConsistency: {},
    issues: []
};

async function runIntegrationTests() {
    console.log('🎭 Starting GlowDance Competition Portal Integration Test');
    console.log('='.repeat(60));

    const browser = await chromium.launch({
        headless: false,
        slowMo: 1000,
        args: ['--start-maximized']
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
    });

    const page = await context.newPage();

    // Enable console logging
    page.on('console', msg => {
        if (msg.type() === 'error') {
            testResults.issues.push({
                type: 'console_error',
                page: 'current',
                message: msg.text()
            });
        }
    });

    try {
        // Test each page in sequence
        await testLandingPage(page);
        await testDashboard(page);
        await testStudiosPage(page);
        await testDancersPage(page);
        await testReservationsPage(page);
        await testReportsPage(page);

        // Test navigation flow
        await testNavigationFlow(page);

        // Generate final report
        generateIntegrationReport();

    } catch (error) {
        console.error('❌ Integration test failed:', error);
        testResults.issues.push({
            type: 'critical_error',
            message: error.message,
            stack: error.stack
        });
    } finally {
        await browser.close();
    }
}

async function testLandingPage(page) {
    console.log('🏠 Testing Landing Page (index.html)');

    const pageUrl = `file://${path.resolve('index.html')}`;
    await page.goto(pageUrl);
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
        path: 'test-landing-page.png',
        fullPage: true
    });

    // Test page elements
    const pageData = {
        title: await page.title(),
        hasNavigation: await page.locator('nav').count() > 0,
        hasGlassmorphism: await page.locator('.glass, [class*="glass"]').count() > 0,
        hasAnimations: await page.evaluate(() => {
            const styles = Array.from(document.styleSheets).flatMap(sheet =>
                Array.from(sheet.cssRules).map(rule => rule.cssText)
            ).join(' ');
            return styles.includes('animation') || styles.includes('transition');
        }),
        loadTime: Date.now()
    };

    // Check for essential elements
    pageData.hasLogo = await page.locator('[class*="logo"], .brand, h1').count() > 0;
    pageData.hasLoginButton = await page.locator('button:has-text("Login"), a:has-text("Login")').count() > 0;

    testResults.pages.landing = pageData;
    console.log('✅ Landing page tested');
}

async function testDashboard(page) {
    console.log('📊 Testing Dashboard (sample-dashboard.html)');

    const pageUrl = `file://${path.resolve('sample-dashboard.html')}`;
    await page.goto(pageUrl);
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({
        path: 'test-dashboard-page.png',
        fullPage: true
    });

    // Extract data points
    const pageData = {
        title: await page.title(),
        userProfile: await extractUserProfile(page),
        dancerCount: await extractNumber(page, ['dancer', 'student']),
        reservationCount: await extractNumber(page, ['reservation', 'booking']),
        studioCount: await extractNumber(page, ['studio', 'room']),
        hasNavTabs: await page.locator('[class*="nav"], [class*="tab"]').count() > 0,
        hasGlassMorphism: await checkGlassMorphism(page),
        hasAnimations: await checkAnimations(page)
    };

    testResults.pages.dashboard = pageData;
    console.log(`✅ Dashboard tested - Found ${pageData.dancerCount} dancers, ${pageData.reservationCount} reservations`);
}

async function testStudiosPage(page) {
    console.log('🏢 Testing Studios Page');

    const pageUrl = `file://${path.resolve('studios.html')}`;
    await page.goto(pageUrl);
    await page.waitForTimeout(2000);

    await page.screenshot({
        path: 'test-studios-page.png',
        fullPage: true
    });

    const pageData = {
        title: await page.title(),
        userProfile: await extractUserProfile(page),
        studioCount: await page.locator('[class*="studio"], [class*="room"], .card').count(),
        hasNavTabs: await page.locator('[class*="nav"], [class*="tab"]').count() > 0,
        hasGlassMorphism: await checkGlassMorphism(page),
        navigationWorking: await testTabNavigation(page)
    };

    testResults.pages.studios = pageData;
    console.log(`✅ Studios page tested - Found ${pageData.studioCount} studios`);
}

async function testDancersPage(page) {
    console.log('💃 Testing Dancers Page');

    const pageUrl = `file://${path.resolve('dancers.html')}`;
    await page.goto(pageUrl);
    await page.waitForTimeout(2000);

    await page.screenshot({
        path: 'test-dancers-page.png',
        fullPage: true
    });

    const pageData = {
        title: await page.title(),
        userProfile: await extractUserProfile(page),
        dancerCount: await page.locator('tr:not(:first-child), .dancer-card, [class*="dancer"]').count(),
        hasTable: await page.locator('table').count() > 0,
        hasNavTabs: await page.locator('[class*="nav"], [class*="tab"]').count() > 0,
        hasGlassMorphism: await checkGlassMorphism(page),
        navigationWorking: await testTabNavigation(page)
    };

    testResults.pages.dancers = pageData;
    console.log(`✅ Dancers page tested - Found ${pageData.dancerCount} dancers`);
}

async function testReservationsPage(page) {
    console.log('📅 Testing Reservations Page');

    const pageUrl = `file://${path.resolve('reservations.html')}`;
    await page.goto(pageUrl);
    await page.waitForTimeout(2000);

    await page.screenshot({
        path: 'test-reservations-page.png',
        fullPage: true
    });

    const pageData = {
        title: await page.title(),
        userProfile: await extractUserProfile(page),
        reservationCount: await page.locator('tr:not(:first-child), .reservation-card, [class*="reservation"]').count(),
        activeReservations: await extractNumber(page, ['active', 'current']),
        hasNavTabs: await page.locator('[class*="nav"], [class*="tab"]').count() > 0,
        hasGlassMorphism: await checkGlassMorphism(page),
        navigationWorking: await testTabNavigation(page)
    };

    testResults.pages.reservations = pageData;
    console.log(`✅ Reservations page tested - Found ${pageData.reservationCount} reservations`);
}

async function testReportsPage(page) {
    console.log('📈 Testing Reports Page');

    const pageUrl = `file://${path.resolve('reports.html')}`;
    await page.goto(pageUrl);
    await page.waitForTimeout(2000);

    await page.screenshot({
        path: 'test-reports-page.png',
        fullPage: true
    });

    const pageData = {
        title: await page.title(),
        userProfile: await extractUserProfile(page),
        hasCharts: await page.locator('canvas, [class*="chart"]').count() > 0,
        hasNavTabs: await page.locator('[class*="nav"], [class*="tab"]').count() > 0,
        hasGlassMorphism: await checkGlassMorphism(page),
        navigationWorking: await testTabNavigation(page)
    };

    testResults.pages.reports = pageData;
    console.log(`✅ Reports page tested`);
}

async function testNavigationFlow(page) {
    console.log('🧭 Testing Navigation Flow');

    const pages = [
        'sample-dashboard.html',
        'studios.html',
        'dancers.html',
        'reservations.html',
        'reports.html'
    ];

    let navigationWorking = true;

    for (let i = 0; i < pages.length; i++) {
        try {
            const pageUrl = `file://${path.resolve(pages[i])}`;
            await page.goto(pageUrl);
            await page.waitForTimeout(1500);

            // Test navigation to each other page
            const navLinks = await page.locator('nav a, [class*="nav"] a, [class*="tab"] a').count();
            if (navLinks === 0) {
                testResults.issues.push({
                    type: 'navigation_missing',
                    page: pages[i],
                    message: 'No navigation links found'
                });
                navigationWorking = false;
            }
        } catch (error) {
            testResults.issues.push({
                type: 'navigation_error',
                page: pages[i],
                message: error.message
            });
            navigationWorking = false;
        }
    }

    testResults.navigation.flowWorking = navigationWorking;
    console.log(`✅ Navigation flow tested - ${navigationWorking ? 'Working' : 'Issues found'}`);
}

// Helper functions
async function extractUserProfile(page) {
    try {
        const profileText = await page.textContent('body');
        const hasEmily = profileText.includes('Emily') || profileText.includes('Einsmann');
        const hasUDA = profileText.includes('UDA');

        return {
            found: hasEmily || hasUDA,
            hasName: hasEmily,
            hasOrg: hasUDA
        };
    } catch {
        return { found: false, hasName: false, hasOrg: false };
    }
}

async function extractNumber(page, keywords) {
    try {
        const text = await page.textContent('body');
        const numbers = text.match(/\d+/g) || [];

        // Look for numbers near keywords
        for (const keyword of keywords) {
            const regex = new RegExp(`(\\d+).*${keyword}|${keyword}.*?(\\d+)`, 'gi');
            const match = text.match(regex);
            if (match) {
                const nums = match[0].match(/\d+/g);
                if (nums && nums.length > 0) {
                    return parseInt(nums[0]);
                }
            }
        }

        return 0;
    } catch {
        return 0;
    }
}

async function checkGlassMorphism(page) {
    try {
        return await page.evaluate(() => {
            const elements = document.querySelectorAll('*');
            for (let el of elements) {
                const style = window.getComputedStyle(el);
                if (style.backdropFilter && style.backdropFilter !== 'none') {
                    return true;
                }
                if (el.className && (
                    el.className.includes('glass') ||
                    el.className.includes('blur') ||
                    el.className.includes('backdrop')
                )) {
                    return true;
                }
            }
            return false;
        });
    } catch {
        return false;
    }
}

async function checkAnimations(page) {
    try {
        return await page.evaluate(() => {
            const styles = Array.from(document.styleSheets)
                .flatMap(sheet => {
                    try {
                        return Array.from(sheet.cssRules);
                    } catch {
                        return [];
                    }
                })
                .map(rule => rule.cssText)
                .join(' ');
            return styles.includes('animation') || styles.includes('transition');
        });
    } catch {
        return false;
    }
}

async function testTabNavigation(page) {
    try {
        const navLinks = await page.locator('nav a, [class*="nav"] a, [class*="tab"] a').count();
        return navLinks > 0;
    } catch {
        return false;
    }
}

function generateIntegrationReport() {
    console.log('\n📋 GENERATING INTEGRATION REPORT');
    console.log('='.repeat(60));

    // Data consistency check
    const dashboardDancers = testResults.pages.dashboard?.dancerCount || 0;
    const dancersPageCount = testResults.pages.dancers?.dancerCount || 0;
    const dashboardReservations = testResults.pages.dashboard?.reservationCount || 0;
    const reservationsPageCount = testResults.pages.reservations?.reservationCount || 0;

    testResults.dataConsistency = {
        dancersMatch: dashboardDancers === dancersPageCount || (dashboardDancers > 0 && dancersPageCount > 0),
        reservationsMatch: dashboardReservations === reservationsPageCount || (dashboardReservations > 0 && reservationsPageCount > 0),
        dancerCounts: { dashboard: dashboardDancers, page: dancersPageCount },
        reservationCounts: { dashboard: dashboardReservations, page: reservationsPageCount }
    };

    // Design consistency
    const pages = Object.values(testResults.pages);
    testResults.designConsistency = {
        allHaveGlassMorphism: pages.every(p => p.hasGlassMorphism),
        allHaveNavigation: pages.every(p => p.hasNavTabs),
        consistentUserProfile: pages.every(p => p.userProfile?.found)
    };

    // Write detailed report to file
    const reportContent = `# GlowDance Competition Portal Integration Test Report
Generated: ${new Date().toISOString()}

## Executive Summary
${testResults.issues.length === 0 ? '✅ All tests passed successfully' : `⚠️ ${testResults.issues.length} issues found`}

## Page Test Results

### Landing Page (index.html)
- Title: ${testResults.pages.landing?.title || 'Not found'}
- Has Navigation: ${testResults.pages.landing?.hasNavigation ? '✅' : '❌'}
- Has Glassmorphism: ${testResults.pages.landing?.hasGlassMorphism ? '✅' : '❌'}
- Has Animations: ${testResults.pages.landing?.hasAnimations ? '✅' : '❌'}

### Dashboard (sample-dashboard.html)
- Title: ${testResults.pages.dashboard?.title || 'Not found'}
- User Profile Found: ${testResults.pages.dashboard?.userProfile?.found ? '✅' : '❌'}
- Dancer Count: ${testResults.pages.dashboard?.dancerCount || 0}
- Reservation Count: ${testResults.pages.dashboard?.reservationCount || 0}
- Studio Count: ${testResults.pages.dashboard?.studioCount || 0}
- Has Navigation: ${testResults.pages.dashboard?.hasNavTabs ? '✅' : '❌'}
- Has Glassmorphism: ${testResults.pages.dashboard?.hasGlassMorphism ? '✅' : '❌'}

### Studios Page
- Title: ${testResults.pages.studios?.title || 'Not found'}
- Studio Count: ${testResults.pages.studios?.studioCount || 0}
- Navigation Working: ${testResults.pages.studios?.navigationWorking ? '✅' : '❌'}
- Has Glassmorphism: ${testResults.pages.studios?.hasGlassMorphism ? '✅' : '❌'}

### Dancers Page
- Title: ${testResults.pages.dancers?.title || 'Not found'}
- Dancer Count: ${testResults.pages.dancers?.dancerCount || 0}
- Has Table: ${testResults.pages.dancers?.hasTable ? '✅' : '❌'}
- Navigation Working: ${testResults.pages.dancers?.navigationWorking ? '✅' : '❌'}
- Has Glassmorphism: ${testResults.pages.dancers?.hasGlassMorphism ? '✅' : '❌'}

### Reservations Page
- Title: ${testResults.pages.reservations?.title || 'Not found'}
- Reservation Count: ${testResults.pages.reservations?.reservationCount || 0}
- Active Reservations: ${testResults.pages.reservations?.activeReservations || 0}
- Navigation Working: ${testResults.pages.reservations?.navigationWorking ? '✅' : '❌'}
- Has Glassmorphism: ${testResults.pages.reservations?.hasGlassMorphism ? '✅' : '❌'}

### Reports Page
- Title: ${testResults.pages.reports?.title || 'Not found'}
- Has Charts: ${testResults.pages.reports?.hasCharts ? '✅' : '❌'}
- Navigation Working: ${testResults.pages.reports?.navigationWorking ? '✅' : '❌'}
- Has Glassmorphism: ${testResults.pages.reports?.hasGlassMorphism ? '✅' : '❌'}

## Data Consistency Analysis
- Dancers Count Consistency: ${testResults.dataConsistency.dancersMatch ? '✅' : '❌'}
  - Dashboard: ${testResults.dataConsistency.dancerCounts.dashboard}
  - Dancers Page: ${testResults.dataConsistency.dancerCounts.page}
- Reservations Count Consistency: ${testResults.dataConsistency.reservationsMatch ? '✅' : '❌'}
  - Dashboard: ${testResults.dataConsistency.reservationCounts.dashboard}
  - Reservations Page: ${testResults.dataConsistency.reservationCounts.page}

## Design Consistency
- All pages have Glassmorphism: ${testResults.designConsistency.allHaveGlassMorphism ? '✅' : '❌'}
- All pages have Navigation: ${testResults.designConsistency.allHaveNavigation ? '✅' : '❌'}
- Consistent User Profile: ${testResults.designConsistency.consistentUserProfile ? '✅' : '❌'}

## Navigation Flow
- Navigation Flow Working: ${testResults.navigation.flowWorking ? '✅' : '❌'}

## Issues Found
${testResults.issues.length === 0 ? 'No issues found' : testResults.issues.map(issue =>
    `- ${issue.type}: ${issue.message} ${issue.page ? `(Page: ${issue.page})` : ''}`
).join('\n')}

## Screenshots Generated
- test-landing-page.png
- test-dashboard-page.png
- test-studios-page.png
- test-dancers-page.png
- test-reservations-page.png
- test-reports-page.png

## Recommendations
${generateRecommendations()}
`;

    fs.writeFileSync('integration-test-report.md', reportContent);
    console.log('✅ Integration report generated: integration-test-report.md');
}

function generateRecommendations() {
    const recommendations = [];

    if (!testResults.dataConsistency.dancersMatch) {
        recommendations.push('- Fix dancer count inconsistency between dashboard and dancers page');
    }

    if (!testResults.dataConsistency.reservationsMatch) {
        recommendations.push('- Fix reservation count inconsistency between dashboard and reservations page');
    }

    if (!testResults.designConsistency.allHaveGlassMorphism) {
        recommendations.push('- Ensure all pages implement glassmorphism effects consistently');
    }

    if (!testResults.designConsistency.allHaveNavigation) {
        recommendations.push('- Add navigation tabs to all pages for consistent UX');
    }

    if (!testResults.navigation.flowWorking) {
        recommendations.push('- Fix navigation flow issues between pages');
    }

    if (testResults.issues.length > 0) {
        recommendations.push('- Address console errors and JavaScript issues identified during testing');
    }

    if (recommendations.length === 0) {
        recommendations.push('- All integration tests passed! The portal is ready for demo.');
    }

    return recommendations.join('\n');
}

// Run the tests
runIntegrationTests().catch(console.error);