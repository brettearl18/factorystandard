# Scripts Directory

Utility scripts for Firebase setup and data management.

## Available Scripts

### `setup-firebase.sh`
Interactive script to initialize Firebase in the project.

```bash
./scripts/setup-firebase.sh
```

### `quick-setup.sh`
Quick setup script that installs dependencies and checks configuration.

```bash
./scripts/quick-setup.sh
```

### `set-user-role.ts`
Set user roles (custom claims) for Firebase Auth users.

**Prerequisites:**
- Firebase Admin SDK credentials (service account key)
- Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable

**Usage:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
npx ts-node scripts/set-user-role.ts user@example.com staff
```

**Roles:**
- `staff` - Can access run boards and manage guitars
- `client` - Can only view their own guitars
- `admin` - Full access, can set user roles

### `backfill-audit-logs.ts`
Backfill audit logs with backdated entries (past logins / view_my_guitars). Uses Firebase Admin SDK.

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
npx tsx scripts/backfill-audit-logs.ts [--days=30] [--users=client|all]
```

- `--days=N` – spread entries over the last N days (default: 30).
- `--users=client` – only client-role users (default); `--users=all` – every user.

### `seed-data.ts`
Create sample data for development/testing.

**Prerequisites:**
- Firebase Admin SDK credentials
- At least one client user created in Firebase Auth

**Usage:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
npx ts-node scripts/seed-data.ts
```

**Note:** After running, update the `clientUid` fields in the created guitars with actual Firebase Auth user IDs.

## Getting Service Account Key

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the JSON file securely
4. Set environment variable:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
   ```

**⚠️ Security Warning:** Never commit service account keys to git!

