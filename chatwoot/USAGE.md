# Chatwoot Support Chat - Usage Guide

## Overview

CompPortal now includes integrated support chat powered by Chatwoot, allowing **Studio Directors (SD)** and **Competition Directors (CD)** to get help directly within the app.

## Chat Paths

### For Studio Directors (SD)
Studio Directors see a **choice modal** when clicking the Support button:

1. **Technical Support** → Routes to Super Admin (developer)
   - Portal bugs or issues
   - Feature requests
   - Technical problems

2. **Competition Director Questions** → Routes to Competition Director
   - Entry questions
   - Reservation questions
   - Competition rules
   - Event-specific questions

### For Competition Directors (CD)
Competition Directors are **automatically routed** to Technical Support (Super Admin):
- Portal issues
- Feature requests
- Technical problems

### For Super Admin (SA)
The support chat button **does not appear** for Super Admin users. SA has direct access to the Chatwoot dashboard.

## How It Works

### User Experience
1. Click the **floating purple-blue Support button** in the bottom-right corner
2. For SD: Select the appropriate chat path from the modal
3. For CD: Chat widget opens immediately
4. Type your message and send
5. Receive responses via:
   - **In-app chat** (real-time if receiver is online)
   - **Email** (if receiver is offline)

### Receiver Experience
All chat messages are delivered to the appropriate **Chatwoot inbox**. Receivers can respond via:
- **Chatwoot dashboard** (http://159.89.115.95:3000)
- **Email replies** (automatically synced to chat)

## Chatwoot Dashboard Access

### Login URL
http://159.89.115.95:3000

### Inboxes
The Chatwoot instance has **3 separate inboxes**:

1. **SD → Tech Support** (Token: `AqBFyfVtETJEV6Ve5qe86C7S`)
   - Studio Directors asking technical questions
   - Assigned to: Super Admin

2. **SD → CD Questions** (Token: `Q5OzfrxnEMEQxS4MHp7rnZa`)
   - Studio Directors asking competition-related questions
   - Assigned to: Competition Director

3. **CD → Tech Support** (Token: `irbhliLmxlGRoPAxqyIiZhrY`)
   - Competition Directors asking technical questions
   - Assigned to: Super Admin

### Managing Conversations
- **View all conversations**: Select inbox from sidebar
- **Respond**: Type in the message box
- **Assign to team member**: Click "Assign" button
- **Mark as resolved**: Click "Resolve" when done
- **Add internal notes**: Use the "Note" tab (not visible to users)

## User Context

Each chat message includes the user's:
- **Name** (first + last name)
- **Email** (for follow-up)
- **User ID** (for database lookups)
- **Role** (Studio Director or Competition Director)

This information appears automatically in the Chatwoot conversation sidebar.

## Email Integration

### Sending Email Replies
1. User sends chat message
2. If receiver is offline, Chatwoot sends **email notification**
3. Receiver can **reply directly to the email**
4. Email reply appears in chat conversation
5. User sees the response in-app or via email

### Email Configuration
Chatwoot uses the email configured in the `.env` file (see `chatwoot/.env.example`). Email settings:
- **SMTP Host**: Configured in Chatwoot environment
- **From Address**: `noreply@compsync.net`
- **Reply-To**: Conversation-specific address

## Troubleshooting

### Chat button not appearing
- **Check user role**: Chat only shows for SD and CD (not SA)
- **Check login status**: Must be logged in
- **Clear cache**: Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)

### Widget not loading
- **Check Chatwoot server**: Visit http://159.89.115.95:3000
- **Check console errors**: Open browser DevTools → Console
- **Verify tokens**: Check `.env.local` for correct tokens

### Messages not sending
- **Check internet connection**
- **Verify Chatwoot server status**: `docker-compose ps` on server
- **Check Chatwoot logs**: `docker-compose logs -f chatwoot`

### Email replies not working
- **Verify SMTP configuration** in Chatwoot `.env`
- **Check email credentials** (SMTP_USER, SMTP_PASS)
- **Test email sending** from Chatwoot dashboard

## Technical Details

### Widget Implementation
- **ChatwootWidget.tsx**: Core widget loader with SDK injection
- **SupportChatButton.tsx**: Role-based chat selector with modal
- **SupportChatWrapper.tsx**: User context wrapper with tRPC integration
- **Dashboard layout.tsx**: Global integration across all pages

### Security
- **Tokens**: Public tokens safe for client-side use (scoped to specific inboxes)
- **User verification**: User identity verified via Chatwoot's built-in system
- **Data privacy**: Messages stored on self-hosted Chatwoot server

### Performance
- **Lazy loading**: Widget script loads asynchronously
- **Cleanup**: Widget properly unmounts when navigating away
- **Hydration**: Prevents SSR/client mismatch with mounted state check

## Future Enhancements

Potential improvements for future waves:
- [ ] Add chat history view for users
- [ ] Implement typing indicators
- [ ] Add file attachment support
- [ ] Create admin analytics dashboard
- [ ] Add canned responses for common questions
- [ ] Implement chatbot for FAQ automation

## Support

For issues with the Chatwoot integration itself:
- **Developer**: Contact Super Admin directly
- **Deployment issues**: Check `chatwoot/DEPLOY.md`
- **Configuration**: See `chatwoot/.env.example`

---

**Wave 4.1: Chatwoot Integration** - Complete ✅
