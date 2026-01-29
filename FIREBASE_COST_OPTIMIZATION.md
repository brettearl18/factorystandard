# Firebase Cost Optimization

This project is tuned to keep Firebase (and GCP) costs low. Below is what’s in place and what you can do in the console.

## Firestore

### Query limits (in code)
- **Audit logs:** Last 200 entries only; older data is removed via TTL.
- **Notifications:** 30 most recent per user.
- **Invoices:** 100 per client; 200 for accounting “all invoices” list.
- **Guitars (dashboard):** 100 most recent.
- **Notes:** Limited per query (e.g. 1 for client dashboard).

### TTL (Time To Live) for audit logs
Audit log documents include an `expireAt` field (90 days after `createdAt`). To avoid paying for old data:

1. Open [Firebase Console](https://console.firebase.google.com) → your project → **Firestore** → **Data**.
2. Select the **auditLogs** collection.
3. Open the **TTL** tab (or **Indexes** and look for TTL).
4. Create a TTL policy on the **expireAt** field so documents are deleted automatically after that time.

Without this policy, old audit docs stay in Firestore and you pay for storage and any reads.

### Indexes
Only the composite indexes you need are in `firestore.indexes.json`. Avoid adding extra indexes; each one has a storage cost.

---

## Cloud Functions

### Callable functions (cheap settings)
These run with **128 MB** memory and **30 s** timeout to reduce cost:

- `setClientRole`, `setUserRole`, `createUser`, `getUserInfo`, `listUsers`, `lookupUserByEmail`, `resetUserPassword`

Heavier functions (backup/restore/listBackups) use 256–512 MB and longer timeouts where needed.

### Invocations
- Callable functions use **allow unauthenticated** at IAM only so the CORS preflight succeeds; auth is enforced inside the function. Don’t remove that or callables from the web app will fail.

---

## Storage

### File size limits (in rules)
- Guitar photos, gallery, temp, run images: **10 MB** per file.
- Invoice/receipt uploads: **10 MB** (client), **20 MB** (staff PDFs).
- Branding: **5 MB** (logos etc.), **10 MB** (background).

Keeping these limits avoids large files and high storage/egress cost.

### Lifecycle for temp files (optional)
Paths like `guitars/temp/color-inspiration/*` are temporary. To delete them automatically:

1. Open [Google Cloud Console](https://console.cloud.google.com) → **Cloud Storage** → your Firebase bucket (e.g. `your-project.appspot.com`).
2. Go to the **Lifecycle** tab.
3. Add a rule: e.g. delete objects under `guitars/temp/` after **1 day** (age = 1).

This keeps storage small and costs low.

---

## Hosting & Cloud Run

- The app is served by **Cloud Run**; Firebase Hosting rewrites to it. Cloud Run scales to zero when idle, so you only pay when requests are handled.
- Use a **single** Cloud Run service and avoid extra services unless you need them.

---

## Budget & alerts

1. [GCP Billing](https://console.cloud.google.com/billing) → **Budgets & alerts**.
2. Create a budget for your project (e.g. $10–50/month).
3. Set alerts at 50% and 90% so you notice before overspend.

---

## Summary

| Area           | What we did / you can do                          |
|----------------|----------------------------------------------------|
| Firestore      | Low query limits; TTL on `auditLogs.expireAt`      |
| Cloud Functions| 128 MB / 30 s for callables                       |
| Storage        | 10 MB (and 5 MB for branding) limits; lifecycle for temp |
| Hosting        | Single Cloud Run service, scale to zero           |
| Billing        | Budget + alerts in GCP                            |

Enabling **Firestore TTL** on `auditLogs` and (optionally) **Storage lifecycle** on `guitars/temp/` will have the biggest impact on keeping costs down over time.
