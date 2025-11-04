# HellverseChat Email Setup Guide

## For Public Signup (Recommended)

### Option 1: Resend Service (Best for Public Sites)
**Pros:** Professional, no personal email needed, free tier available
**Setup:**
1. Go to [resend.com](https://resend.com) and sign up (free)
2. Get your API key from the dashboard
3. In Railway, set: `RESEND_API_KEY=re_xxxxxxxxxx`
4. Done! Anyone can sign up and receive verification emails

### Option 2: Dedicated Gmail Account
**Pros:** Free, easy setup
**Setup:**
1. Create a new Gmail account like `hellversechat@gmail.com`
2. Enable 2-factor authentication
3. Generate an App Password
4. In Railway, set:
   - `EMAIL_USER=hellversechat@gmail.com`
   - `EMAIL_PASS=your-app-password`

### Option 3: Your Personal Email (Quick Test)
**Pros:** Immediate setup if you already have Gmail
**Cons:** All emails come from your personal account
**Setup:**
1. In Railway, replace the placeholder values:
   - `EMAIL_USER=your-actual-email@gmail.com`
   - `EMAIL_PASS=your-app-password`

## Current Status
- ✅ Universal email system implemented
- ✅ Supports Gmail, Outlook, Yahoo, iCloud, etc.
- ✅ Resend service integration ready
- ❌ Railway still has placeholder credentials
- ❌ Need to choose and configure one option above

## Testing
After setup, test with:
```bash
node test-signup.js
```

The system will automatically detect your provider and use the correct settings!