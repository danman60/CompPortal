#!/usr/bin/env markdown
# support_chat_embed_result

File Updated
- src/app/layout.tsx

Changes
- Added Crisp chat widget via Next.js `Script` with `afterInteractive` strategy.
- Placeholder website ID: `PLACEHOLDER_CRISP_ID` and purple theme.

Snippet
```tsx
import Script from 'next/script';

<Script
  id="crisp-widget"
  strategy="afterInteractive"
  dangerouslySetInnerHTML={{
    __html: `
      window.$crisp = [];
      window.CRISP_WEBSITE_ID = "PLACEHOLDER_CRISP_ID";
      (function(){
        var d=document; var s=d.createElement("script");
        s.src = "https://client.crisp.chat/l.js"; s.async = 1;
        d.getElementsByTagName("head")[0].appendChild(s);
      })();
      window.$crisp.push(["config", "color:theme", ["purple"]]);
    `,
  }}
/>;
```

Validation Checklist
- Script async; loads after interactive.
- Appears on all pages.
- Theme color configured.

