# Firebase Setup Guide

This guide will walk you through setting up Firebase for the Factory Standards application.

## Prerequisites

- Node.js 20+ installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- A Firebase account (create one at https://console.firebase.google.com)

## Step 1: Initialize Firebase Project

1. **Login to Firebase:**
   ```bash
   firebase login
   ```

2. **Initialize Firebase in this project:**
   ```bash
   firebase init
   ```

   When prompted, select:
   - ✅ Firestore
   - ✅ Functions
   - ✅ Hosting
   - Use an existing project or create a new one
   - Choose your preferred language (TypeScript for functions)
   - Use ESLint: Yes
   - Install dependencies: Yes

3. **Or use the setup script:**
   ```bash
   chmod +x scripts/setup-firebase.sh
   ./scripts/setup-firebase.sh
   ```

## Step 2: Configure Environment Variables

1. **Get your Firebase config:**
   - Go to Firebase Console → Project Settings → General
   - Scroll to "Your apps" section
   - Click the web icon (</>) to add a web app
   - Copy the config values

2. **Create `.env.local` file in the project root:**
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

## Step 3: Set Up Firebase Authentication

1. **Enable Email/Password Authentication:**
   - Go to Firebase Console → Authentication → Sign-in method
   - Enable "Email/Password"
   - (Optional) Enable "Email link (passwordless sign-in)"

2. **Create test users:**
   - Go to Authentication → Users
   - Click "Add user"
   - Create users with different roles (we'll set roles in the next step)

## Step 4: Set User Roles (Custom Claims)

User roles are stored as custom claims in Firebase Auth. You need to set these for each user.

### Option A: Using Cloud Function (Recommended for Production)

1. **Deploy the Cloud Function:**
   ```bash
   cd functions
   npm install
   cd ..
   firebase deploy --only functions
   ```

2. **Call the function from your app** (you'll need to build a UI for this, or use the Firebase Console)

### Option B: Using Admin SDK Script

1. **Get Service Account Key:**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save the JSON file securely

2. **Set environment variable:**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   ```

3. **Run the script:**
   ```bash
   npx ts-node scripts/set-user-role.ts user@example.com staff
   ```

   Replace `user@example.com` with the actual user email and `staff` with the desired role (`staff`, `client`, or `admin`).

### Option C: Using Firebase Console (Manual)

For development/testing, you can manually set custom claims using the Firebase Admin SDK in a Node.js script or Cloud Function.

**Important:** After setting custom claims, users must **sign out and sign in again** for the changes to take effect.

## Step 5: Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

This deploys the security rules defined in `firestore.rules`.

## Step 6: Set Up Firestore Indexes (if needed)

If you get index errors when querying, Firebase will provide a link to create the required indexes. Or you can define them in `firestore.indexes.json` and deploy:

```bash
firebase deploy --only firestore:indexes
```

## Step 7: Seed Initial Data (Optional)

To create sample data for testing:

1. **Set up Admin SDK credentials** (see Step 4, Option B)

2. **Run the seed script:**
   ```bash
   npx ts-node scripts/seed-data.ts
   ```

3. **Update client UIDs:**
   - The seed script creates guitars with placeholder client UIDs
   - Update these in Firestore Console with actual user UIDs

## Step 8: Test the Setup

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Test authentication:**
   - Navigate to `/login`
   - Sign in with a test user
   - Verify you're redirected based on your role

3. **Test Firestore access:**
   - As staff: Navigate to `/runs/[runId]/board`
   - As client: Navigate to `/my-guitars`

## Troubleshooting

### "Permission denied" errors
- Check that Firestore rules are deployed
- Verify user has the correct role custom claim
- Ensure user has signed out and back in after role change

### "Missing or insufficient permissions"
- Check Firestore rules syntax
- Verify the user's role in Firebase Console → Authentication → Users → [User] → Custom claims

### Functions not deploying
- Ensure you're in the correct Firebase project: `firebase use [project-id]`
- Check that functions dependencies are installed: `cd functions && npm install`

### Environment variables not working
- Ensure `.env.local` is in the project root (not in `src/`)
- Restart the Next.js dev server after changing `.env.local`
- Check that variable names start with `NEXT_PUBLIC_`

## Next Steps

- Create your first Run and Stages in Firestore
- Add guitars to the run
- Test the drag-and-drop functionality on the Run Board
- Set up production deployment

## Security Notes

- Never commit `.env.local` or service account keys to git
- Review Firestore rules regularly
- Use Firebase App Check in production to prevent abuse
- Consider implementing rate limiting for Cloud Functions

