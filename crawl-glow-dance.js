const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = 'https://glowdancecomp.computitionhq.com';
const LOGIN_URL = `${BASE_URL}/login`;
const USERNAME = 'uxbridge dance academy';
const PASSWORD = 'bruciekins';
const OUTPUT_DIR = 'glow_output';

class GlowDanceCrawler {
  constructor() {
    this.browser = null;
    this.page = null;
    this.visitedUrls = new Set();
    this.urlsToVisit = new Set();
  }

  async init() {
    this.browser = await chromium.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    const context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    this.page = await context.newPage();

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  }

  async login() {
    await this.page.goto(LOGIN_URL, { waitUntil: 'networkidle' });

    // Debug: Take screenshot and log page content
    await this.page.screenshot({ path: path.join(OUTPUT_DIR, 'login-page.png') });

    // Find username field - try multiple selectors
    const usernameSelectors = [
      'input[name="username"]',
      'input[name="user"]',
      'input[name="login"]',
      'input[type="text"]',
      '#username',
      '#user',
      '#login'
    ];

    let usernameField = null;
    for (const selector of usernameSelectors) {
      try {
        usernameField = await this.page.$(selector);
        if (usernameField) {
          console.log(`Found username field with selector: ${selector}`);
          break;
        }
      } catch (e) {}
    }

    if (!usernameField) {
      // List all input fields for debugging
      const allInputs = await this.page.$$eval('input', inputs =>
        inputs.map(input => ({
          type: input.type,
          name: input.name,
          id: input.id,
          placeholder: input.placeholder,
          className: input.className
        }))
      );
      console.log('All input fields found:', JSON.stringify(allInputs, null, 2));
      throw new Error('Could not find username field');
    }

    // Find password field
    const passwordSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      '#password'
    ];

    let passwordField = null;
    for (const selector of passwordSelectors) {
      try {
        passwordField = await this.page.$(selector);
        if (passwordField) {
          console.log(`Found password field with selector: ${selector}`);
          break;
        }
      } catch (e) {}
    }

    if (!passwordField) {
      throw new Error('Could not find password field');
    }

    // Fill the form
    await usernameField.fill(USERNAME);
    await passwordField.fill(PASSWORD);

    // Find and click submit button
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Sign In")',
      '.login-btn',
      '#login-btn'
    ];

    let submitButton = null;
    for (const selector of submitSelectors) {
      try {
        submitButton = await this.page.$(selector);
        if (submitButton) {
          console.log(`Found submit button with selector: ${selector}`);
          break;
        }
      } catch (e) {}
    }

    if (!submitButton) {
      // Try to find any button in the form
      const allButtons = await this.page.$$eval('button, input[type="submit"]', buttons =>
        buttons.map(btn => ({
          type: btn.type,
          textContent: btn.textContent,
          value: btn.value,
          className: btn.className,
          id: btn.id
        }))
      );
      console.log('All buttons found:', JSON.stringify(allButtons, null, 2));
      throw new Error('Could not find submit button');
    }

    await submitButton.click();
    await this.page.waitForLoadState('networkidle');

    // Debug: Take screenshot after login attempt
    await this.page.screenshot({ path: path.join(OUTPUT_DIR, 'after-login.png') });

    // Verify login success - try multiple indicators
    const successSelectors = [
      '#topNav',
      '.welcome',
      '.dashboard',
      'nav',
      '.navbar',
      '.header',
      '.main-nav',
      '[data-testid="dashboard"]',
      '.user-menu',
      '.logout'
    ];

    let loginSuccess = false;
    for (const selector of successSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 3000 });
        console.log(`Login verified with selector: ${selector}`);
        loginSuccess = true;
        break;
      } catch (e) {}
    }

    // Also check if we're no longer on the login page
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/login')) {
      console.log(`Login appears successful - redirected to: ${currentUrl}`);
      loginSuccess = true;
    }

    // Check for authentication by looking for "Login" link in the page content
    // If still shows Login link, user is not authenticated
    try {
      const pageText = await this.page.textContent('body');
      if (pageText && (pageText.includes('| Login') || pageText.includes('Login |'))) {
        console.log('Still see login links - authentication may have failed');
        loginSuccess = false;
      }
    } catch (e) {}

    if (!loginSuccess) {
      // Check for error messages
      const errorMessages = await this.page.$$eval('.error, .alert, .warning, [class*="error"]', elements =>
        elements.map(el => el.textContent.trim()).filter(text => text)
      );

      if (errorMessages.length > 0) {
        console.log('Error messages found:', errorMessages);
      }

      console.log(`Current URL after login attempt: ${currentUrl}`);

      // Pause for manual intervention
      console.log('\n=== MANUAL LOGIN REQUIRED ===');
      console.log('Please manually log in using the browser window that opened.');
      console.log('After successful login, press Enter to continue...');

      // Wait for user input
      process.stdin.setRawMode(true);
      process.stdin.resume();

      return new Promise((resolve) => {
        process.stdin.on('data', () => {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          console.log('Continuing with manual login session...');
          resolve();
        });
      });
    }

    console.log('Login successful');

    // Navigate to dashboard/main page after login
    try {
      await this.page.goto(BASE_URL, { waitUntil: 'networkidle' });
      console.log('Navigated to main dashboard');

      // Take screenshot of main dashboard
      await this.page.screenshot({ path: path.join(OUTPUT_DIR, 'main-dashboard.png') });

      // Log the page content to understand structure
      const pageContent = await this.page.content();
      await fs.writeFile(path.join(OUTPUT_DIR, 'dashboard-source.html'), pageContent, 'utf-8');
      console.log('Dashboard HTML saved for inspection');

    } catch (e) {
      console.log('Could not navigate to main dashboard, staying on current page');
    }
  }

  async expandAllMenus() {
    // Expand hover menus
    const hoverElements = await this.page.$$('[onmouseover], .dropdown, .menu-item, nav li, .nav-item');
    for (const element of hoverElements) {
      try {
        await element.hover();
        await this.page.waitForTimeout(200);
      } catch (e) {}
    }

    // Click dropdown toggles
    const clickElements = await this.page.$$('.dropdown-toggle, .menu-toggle, [data-toggle], .expand, .accordion-header');
    for (const element of clickElements) {
      try {
        await element.click();
        await this.page.waitForTimeout(200);
      } catch (e) {}
    }

    // Click tabs
    const tabElements = await this.page.$$('.tab, .nav-tab, [role="tab"], .tab-link');
    for (const element of tabElements) {
      try {
        await element.click();
        await this.page.waitForTimeout(200);
      } catch (e) {}
    }
  }

  async collectLinks() {
    await this.expandAllMenus();

    // Wait a bit for any animations or dynamic content
    await this.page.waitForTimeout(2000);

    // Expand menus again after waiting
    await this.expandAllMenus();

    const links = await this.page.$$eval('a[href]', anchors =>
      anchors.map(a => ({
        href: a.href,
        text: a.textContent?.trim() || '',
        visible: !a.hidden && a.offsetParent !== null
      }))
      .filter(link => link.href && link.href.trim())
      .map(link => link.href)
    );

    // Also collect form actions as potential navigation targets
    const formActions = await this.page.$$eval('form[action]', forms =>
      forms.map(form => form.action).filter(action => action && action.trim())
    );

    // Look for onclick navigation and data attributes that might contain URLs
    const clickableElements = await this.page.$$eval('[onclick], [data-url], [data-href], [data-link]', elements =>
      elements.map(el => {
        const onclick = el.getAttribute('onclick') || '';
        const dataUrl = el.getAttribute('data-url') || '';
        const dataHref = el.getAttribute('data-href') || '';
        const dataLink = el.getAttribute('data-link') || '';

        // Extract URLs from onclick handlers
        const onclickMatch = onclick.match(/(?:location\.href|window\.location)\s*=\s*['"]([^'"]+)['"]/);
        const onclickUrl = onclickMatch ? onclickMatch[1] : '';

        return [dataUrl, dataHref, dataLink, onclickUrl].filter(url => url);
      })
      .flat()
      .filter(url => url)
    );

    const allUrls = [...links, ...formActions, ...clickableElements];

    console.log(`Found ${allUrls.length} total URLs before filtering`);

    let newUrls = 0;
    for (const url of allUrls) {
      if (this.shouldCrawlUrl(url)) {
        if (!this.urlsToVisit.has(url) && !this.visitedUrls.has(url)) {
          this.urlsToVisit.add(url);
          newUrls++;
          console.log(`Added URL to crawl: ${url}`);
        }
      }
    }

    console.log(`Added ${newUrls} new URLs to crawl queue`);
  }

  shouldCrawlUrl(url) {
    try {
      const urlObj = new URL(url);

      // Same domain check
      if (urlObj.hostname !== 'glowdancecomp.computitionhq.com') {
        return false;
      }

      // Exclude logout
      if (url.includes('/logout')) {
        return false;
      }

      // Exclude non-HTML resources
      const excludeExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.css', '.js', '.zip', '.doc', '.docx'];
      if (excludeExtensions.some(ext => url.toLowerCase().includes(ext))) {
        return false;
      }

      // Not already visited
      return !this.visitedUrls.has(url);

    } catch (e) {
      return false;
    }
  }

  getFilenameFromUrl(url) {
    try {
      const urlObj = new URL(url);
      let pathname = urlObj.pathname;

      // Remove leading slash and replace slashes with dashes
      pathname = pathname.replace(/^\//, '').replace(/\//g, '-');

      // Remove or replace special characters
      pathname = pathname.replace(/[^a-zA-Z0-9\-_]/g, '_');

      // Default filename if empty
      if (!pathname || pathname === '') {
        pathname = 'home';
      }

      return `${pathname}.html`;
    } catch (e) {
      return `page_${Date.now()}.html`;
    }
  }

  async extractForms() {
    return await this.page.$$eval('form', forms =>
      forms.map(form => ({
        action: form.action || '',
        method: form.method || 'get',
        fields: Array.from(form.elements).map(field => ({
          name: field.name || '',
          type: field.type || '',
          value: field.value || '',
          required: field.required || false,
          id: field.id || ''
        })).filter(field => field.name)
      }))
    );
  }

  async crawlPage(url) {
    if (this.visitedUrls.has(url)) {
      return;
    }

    console.log(`Crawling: ${url}`);
    this.visitedUrls.add(url);

    try {
      await this.page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Wait for dynamic content
      await this.page.waitForTimeout(1000);

      // Expand menus and tabs to reveal hidden content
      await this.expandAllMenus();

      // Wait for any animations or dynamic loading
      await this.page.waitForTimeout(500);

      // Get fully rendered HTML
      const html = await this.page.content();

      // Extract forms
      const forms = await this.extractForms();

      // Save HTML
      const filename = this.getFilenameFromUrl(url);
      const htmlPath = path.join(OUTPUT_DIR, filename);
      await fs.writeFile(htmlPath, html, 'utf-8');

      // Save forms if they exist
      if (forms && forms.length > 0) {
        const formsFilename = filename.replace('.html', '.json');
        const formsPath = path.join(OUTPUT_DIR, formsFilename);
        await fs.writeFile(formsPath, JSON.stringify(forms, null, 2), 'utf-8');
      }

      // Collect new links from this page
      await this.collectLinks();

    } catch (error) {
      console.error(`Error crawling ${url}:`, error.message);
    }

    // Delay between requests
    await this.page.waitForTimeout(500);
  }

  async crawl() {
    try {
      await this.init();
      await this.login();

      // Start with the current page after login
      const startUrl = this.page.url();
      this.urlsToVisit.add(startUrl);

      // Crawl all discovered URLs
      while (this.urlsToVisit.size > 0) {
        const url = this.urlsToVisit.values().next().value;
        this.urlsToVisit.delete(url);

        if (!this.visitedUrls.has(url)) {
          await this.crawlPage(url);
        }
      }

      console.log(`\nCrawling complete! Visited ${this.visitedUrls.size} pages.`);
      console.log(`Output saved to: ${OUTPUT_DIR}/`);

    } catch (error) {
      console.error('Crawling failed:', error);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run the crawler
(async () => {
  const crawler = new GlowDanceCrawler();
  await crawler.crawl();
})();