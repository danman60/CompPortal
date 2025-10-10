#!/usr/bin/env markdown
# n8n Setup for Email → Chat Reply (Option A)

Goal
- When you reply to the admin notification email in your inbox, n8n grabs that email and POSTs it to the app at `/api/email/inbound`. The subject includes a token like `CHT-ABC123` so the app can attach your reply to the right conversation.

Prereqs
- App deployed with environment:
  - `INBOUND_EMAIL_SECRET=your-secret-here`
  - `EMAIL_FROM` set to your support mailbox (e.g., `Support <support@yourdomain>`)
  - `SUPPORT_EMAIL` set to your admin address (e.g., `danieljohnabrahamson@gmail.com`)
  - SMTP env set (SMTP_HOST/PORT/USER/PASS/SECURE)

Workflow Outline (in n8n)
1) Trigger: IMAP Email (n8n’s IMAP Email Node)
   - IMAP host: your PrivateEmail IMAP (e.g., `imap.privateemail.com`)
   - Port: 993 (TLS)
   - User/Pass: for your support mailbox (support@yourdomain)
   - Options:
     - Filter for Unread only
     - (Optional) Custom search string: `SUBJECT "CHT-"` to only process chat replies
     - Mark as read or move to a `Processed` folder after handling

2) Function Node: Prepare JSON Body
   - Code example:
     ```js
     // Input: IMAP node item (with fields like `subject`, `text`, `html`)
     const subject = $json.subject || '';
     const text = $json.text || $json.html || '';
     return [{ subject, text }];
     ```

3) HTTP Request Node: POST to Inbound Endpoint
   - Method: POST
   - URL: `https://your-app.com/api/email/inbound`
   - Headers:
     - `Content-Type: application/json`
     - `X-Webhook-Secret: your-secret-here` (must match `INBOUND_EMAIL_SECRET`)
   - Body: JSON
     ```json
     {
       "subject": "{{$json["subject"]}}",
       "text": "{{$json["text"]}}"
     }
     ```
   - On success: 200 OK with `{ ok: true }` or `{ ok: true, skipped: ... }`

How It Threads
- The app sends notification emails with a subject that contains `CHT-XXXXXX`.
- Your inbox reply should keep the subject intact (mail clients do this by default).
- n8n POSTs `subject` and `text` to the inbound API, which extracts the token and stores your reply in `chat_messages`.
- The widget polls `getMessages` every 5s and shows your reply.

Tips
- Keep the subject token intact for threading.
- If you want to add a small signature delimiter, it’s fine—only the raw text is saved.
- You can adjust n8n to only process messages from your own address (From filter) if needed.

