# Email templates – list and content

All emails are sent via Mailgun from Cloud Functions and use a shared **HTML layout**:

- **Header:** Dark bar with brand name (from `mailgun.from_name`) and "Build updates".
- **Content:** White card with the message (welcome, guitar stage change, or run update).
- **Footer:** CTA button or text ("Log in" / "View your guitar in the portal" / "View update in the portal") and "— [Brand name]".

If you set `mailgun.portal_url` (e.g. `https://ormsby-factory-standard-runs.web.app`), the CTA is a blue button linking to the portal; otherwise it's plain text.

---

## 1. Welcome / "You have a login and password"

**Trigger:** Staff create a new **client** user via the `createUser` Cloud Function (e.g. from the admin UI).

**Recipient:** The new user's email address.

**Subject:** `Your [From name] portal login`  
Example: `Your Ormsby Guitars portal login`

**Plain text (fallback):** Not generated; HTML only.

**HTML content (inside shared layout):**
- Greeting: "Hi,"
- Line: "Your account is set up. You have a login and password for the [Brand] portal."
- Log-in email in a monospace block.
- If a temporary password was set: "Your temporary password: [password]" and "We recommend changing it after your first login."
- If no password was set: "Set your password using the link below" with the Firebase password-reset link.
- Line: "Log in below to view your guitars and build updates."
- CTA: "Log in" (button if `portal_url` set).
- Signature: "— [From name]"

**Note:** Only sent when the new user's role is `client` and Mailgun is configured. If Mailgun is not configured, user creation still succeeds; the welcome email is skipped.

---

## 2. Guitar stage change

**Trigger:** A guitar's `stageId` is updated in Firestore (e.g. staff moves the guitar to a new column on the run board).

**Recipient:** The guitar's owner (Firebase Auth email, or client profile email).

**Subject:** `Update: [Model – Finish] – [New stage label]`  
Example: `Update: Hype GTR – Interstellar – Finishing`

**Plain text (fallback):**
```
Your guitar [Model – Finish] ([Run name]) has moved from [Old stage] to [New stage]. Log in to the portal for details.
```

**HTML content (inside shared layout):**
- Greeting: "Hi,"
- Line: "Your guitar build has moved to a new stage."
- Card: Guitar **Model – Finish**, run name, progress line "Old stage → **New stage**" (new stage in blue).
- CTA: "View your guitar in the portal" (button if `portal_url` set).
- Signature: "— [From name]"

---

## 3. Run update (visible to clients)

**Trigger:** A new document is created under `runs/{runId}/updates` with `visibleToClients: true` (staff posts an update and leaves "Visible to clients" checked).

**Recipient:** Every client who has at least one guitar in that run (Firebase Auth or client profile email).

**Subject:** `[Run name]: [Update title]`  
Example: `Perth Run #7 – March 2026: Week 3 progress`

**Plain text (fallback):**
```
[Run name]: [Update title]

[Author name]:
[Message body]

Log in to the portal for full details.
```

**HTML content (inside shared layout):**
- Greeting: "Hi,"
- Line: **Author name** posted an update to **Run name**.
- Update title (bold, larger)
- Message body (paragraphs)
- CTA: "View update in the portal" (button if `portal_url` set).
- Signature: "— [From name]"

---

## Optional config

- **Portal URL:** Set `mailgun.portal_url` (e.g. `https://ormsby-factory-standard-runs.web.app`) so "Log in" in the emails is a clickable link. If unset, the CTA is plain text.
- **From name:** Set `mailgun.from_name` (e.g. "Ormsby Guitars") so the signature and from name match your brand.
