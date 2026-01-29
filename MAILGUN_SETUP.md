# Mailgun Email Notifications

The project can email clients when:

1. **A guitar moves to a new stage** – the guitar’s owner gets an email with the stage change (e.g. “Neck Carve” → “Finishing”).
2. **A run update is posted** – if the update is visible to clients, every client with a guitar in that run gets an email with the update title and message.

Emails are sent by **Cloud Functions** (Firestore triggers). If Mailgun is not configured, the functions still run but skip sending (no errors).

## 1. Get Mailgun credentials

1. Sign up at [mailgun.com](https://www.mailgun.com) and add a **sending domain** (e.g. `mg.yourdomain.com`).
2. In Mailgun Dashboard → **Sending** → **Domain settings** → **API keys**:
   - **Domain name** (e.g. `mg.yourdomain.com`) → use as `mailgun.domain`.
   - Use the **Private API key** for `mailgun.api_key` (the one that lets you “Send” / access the API).  
     Do **not** use the “Public API key” (starts with `pubkey-`) — that’s for client-side validation only and cannot send email.
3. If you use Mailgun’s **EU region**, note the API host (e.g. `https://api.eu.mailgun.net`) for `mailgun.api_host`.

## 2. Configure Firebase Functions

Set the Mailgun config for your Firebase project:

```bash
firebase functions:config:set \
  mailgun.api_key="YOUR_MAILGUN_API_KEY" \
  mailgun.domain="mg.yourdomain.com"
```

Optional:

```bash
# From name in emails (default: "Ormsby Guitars")
firebase functions:config:set mailgun.from_name="Ormsby Guitars"

# From address (default: noreply@<domain>)
firebase functions:config:set mailgun.from_email="updates@mg.yourdomain.com"

# Portal URL – makes "View in the portal" a clickable button in emails (recommended)
firebase functions:config:set mailgun.portal_url="https://ormsby-factory-standard-runs.web.app"

# EU region
firebase functions:config:set mailgun.api_host="https://api.eu.mailgun.net"
```

Check config:

```bash
firebase functions:config:get
```

## 3. Deploy functions

After setting config, deploy (or redeploy) functions so the triggers and Mailgun code are live:

```bash
cd functions
npm run build
firebase deploy --only functions
```

For a full list of every email (subject, recipient, and content), see **[EMAIL_TEMPLATES.md](EMAIL_TEMPLATES.md)**.

## 4. What gets triggered

| Trigger | When | Who gets emailed |
|--------|------|-------------------|
| **onGuitarStageChange** | A guitar document’s `stageId` is updated | The guitar’s owner (`clientUid`), using their Firebase Auth email (or client profile email) |
| **onRunUpdateCreated** | A new document is created under `runs/{runId}/updates` with `visibleToClients: true` | Every client who has a guitar in that run |

Email content is plain HTML + plain text and includes the guitar/run name, stage or update title/message, and a note to log in to the portal.

## 5. Send test emails

To send sample **stage change** and **run update** emails to any address (e.g. your own):

1. Deploy functions (so `sendTestEmails` is available).
2. Log in to the app as **admin** or **staff**.
3. Go to **Settings** → **Admin Settings** → **Email** tab.
4. In **Send test emails (Mailgun)**, enter the address (e.g. `brett.earl@gmail.com`) and click **Send test emails**.

Both sample emails use the same HTML layout and content as the real triggers. If Mailgun is not configured, the button will show an error.

## 6. Troubleshooting

- **No emails** – Confirm `firebase functions:config:get` shows `mailgun.api_key` and `mailgun.domain`. Redeploy functions after changing config.
- **Mailgun errors** – Check Cloud Functions logs: Firebase Console → Functions → Logs, or `firebase functions:log`. Mailgun returns 401 for bad API key, 404 for wrong domain.
- **EU region** – If your Mailgun account is EU, set `mailgun.api_host="https://api.eu.mailgun.net"`.
- **Domain verification** – Mailgun must show your sending domain as verified; otherwise messages may be refused or go to spam.
