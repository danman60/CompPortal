## Task: Support Ticket Chat Embed (Crisp Widget)

**Context:**
- File: src/app/layout.tsx (root layout)
- Integration: Crisp chat widget (or similar like Intercom/Tawk.to)
- Pattern: Simple script tag injection

**Requirements:**
1. Add Crisp chat widget to bottom-right corner
2. Script loads asynchronously
3. Widget appears on all pages
4. Customizable widget color (purple to match branding)
5. Only show for authenticated users (optional - can show for all)

**Deliverables:**
- Updated layout.tsx with Crisp script
- Widget configuration inline
- Loading script tag with proper async/defer

**Implementation:**
```tsx
// In src/app/layout.tsx, add to <head> or before </body>

<Script
  id="crisp-widget"
  strategy="afterInteractive"
  dangerouslySetInnerHTML={{
    __html: `
      window.$crisp = [];
      window.CRISP_WEBSITE_ID = "YOUR_CRISP_WEBSITE_ID";
      (function() {
        d = document;
        s = d.createElement("script");
        s.src = "https://client.crisp.chat/l.js";
        s.async = 1;
        d.getElementsByTagName("head")[0].appendChild(s);
      })();

      // Customize colors
      window.$crisp.push(["config", "color:theme", ["purple"]]);
    `
  }}
/>
```

**Alternative (Tawk.to):**
```tsx
<Script
  id="tawk-widget"
  strategy="afterInteractive"
  src="https://embed.tawk.to/YOUR_TAWK_ID/default"
  async
/>
```

**Notes:**
- Use placeholder ID "PLACEHOLDER_CRISP_ID" (Claude will replace with actual)
- Widget should appear in bottom-right
- Mobile-friendly (collapses to chat icon)
- Don't block page load (async)

**Codex will**: Add script integration to layout
**Claude will**: Replace placeholder ID with actual Crisp account, test widget
