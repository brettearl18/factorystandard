# Hosting Setup Guide

This guide covers two hosting options for the Factory Standards Next.js application:

1. **Vercel** (Recommended) - Easiest setup, best for Next.js
2. **Firebase Hosting** - Alternative if you prefer to keep everything in Firebase

## Option 1: Vercel Hosting (Recommended)

Vercel is made by the Next.js team and provides the best experience for Next.js applications with automatic deployments, preview URLs, and zero configuration.

### Prerequisites

- A Vercel account (sign up at https://vercel.com)
- GitHub/GitLab/Bitbucket repository (for automatic deployments)

### Step 1: Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

### Step 2: Deploy via Vercel Dashboard (Recommended)

1. **Go to [vercel.com](https://vercel.com)** and sign in
2. **Click "Add New Project"**
3. **Import your Git repository** (GitHub/GitLab/Bitbucket)
4. **Configure the project:**
   - Framework Preset: **Next.js** (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

5. **Add Environment Variables:**
   Click "Environment Variables" and add:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

6. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy your app
   - You'll get a URL like: `https://factory-standards.vercel.app`

### Step 3: Deploy via CLI (Alternative)

```bash
# Login to Vercel
vercel login

# Deploy (first time - will prompt for configuration)
vercel

# Deploy to production
vercel --prod
```

### Step 4: Set Up Automatic Deployments

1. **Connect your Git repository** in Vercel dashboard
2. **Every push to main/master** will automatically deploy to production
3. **Pull requests** will get preview deployments automatically

### Step 5: Custom Domain (Optional)

1. Go to your project in Vercel dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

### Vercel Advantages

- ✅ Zero configuration for Next.js
- ✅ Automatic deployments from Git
- ✅ Preview URLs for pull requests
- ✅ Built-in CDN and edge functions
- ✅ Free tier with generous limits
- ✅ Automatic HTTPS
- ✅ Analytics included

---

## Option 2: Firebase Hosting (Cloud Run)

Best when you want the entire stack under Firebase / Google Cloud (no Vercel required) while keeping full Next.js features.

### Prerequisites

- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud SDK (`gcloud components install beta`)
- Project initialized (`firebase init`) and authenticated (`firebase login`, `gcloud auth login`)

### Step 1: Build & Run in Docker

This repo now includes a production `Dockerfile`. It:
1. Installs dependencies
2. Runs `next build`
3. Starts the app with `next start` on port `8080` (Cloud Run default)

Optional: create `.env.production` with your `NEXT_PUBLIC_*` values for the build. Runtime ENV is managed in Cloud Run.

### Step 2: Deploy to Cloud Run

Use the helper script:

```bash
chmod +x deploy-cloud-run.sh
PROJECT_ID=your_project_id \
REGION=australia-southeast1 \
SERVICE_NAME=factory-standards-web \
./deploy-cloud-run.sh
```

The script will:
1. Build the Docker image via Cloud Build
2. Deploy it to Cloud Run (fully managed, public)
3. Run `firebase deploy --only hosting` so Hosting rewrites point to your Cloud Run service

After deploy, set the runtime env vars:

```bash
gcloud run services update factory-standards-web \
  --project your_project_id \
  --region australia-southeast1 \
  --set-env-vars NEXT_PUBLIC_FIREBASE_API_KEY=...,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...,etc \
  --platform managed
```

### Step 3: Firebase Hosting rewrites

`firebase.json` now contains:

```json
{
  "hosting": {
    "public": "public",
    "rewrites": [
      {
        "source": "**",
        "run": {
          "serviceId": "factory-standards-web",
          "region": "australia-southeast1"
        }
      }
    ]
  }
}
```

This makes Firebase Hosting act as the CDN/front door while Cloud Run serves the Next.js app.

### Pros / Cons

**Pros**
- ✅ Everything managed under Firebase/GCP
- ✅ Full Next.js SSR/ISR support
- ✅ Custom domains & SSL handled by Hosting

**Cons**
- ⚠️ Requires Docker + Cloud Run knowledge
- ⚠️ No automatic preview deployments (unless scripted)
- ⚠️ Need to manage Cloud Run env vars separately

---

## Recommendation

**Use Vercel** for the best Next.js experience. It's:
- Free for personal/small projects
- Zero configuration
- Automatic deployments
- Best performance for Next.js

Keep using Firebase for:
- Firestore database
- Cloud Functions
- Storage
- Authentication

You can use Vercel for hosting while keeping all your Firebase services.

---

## Environment Variables

Both hosting solutions need these environment variables. **Never commit these to Git!**

Get them from: Firebase Console → Project Settings → General → Your apps

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

---

## Post-Deployment Checklist

- [ ] Verify environment variables are set correctly
- [ ] Test authentication (login/logout)
- [ ] Test Firestore read/write operations
- [ ] Test file uploads to Firebase Storage
- [ ] Verify Cloud Functions are deployed
- [ ] Check Firestore rules are deployed
- [ ] Test on mobile devices
- [ ] Set up custom domain (if needed)
- [ ] Configure Firebase App Check (recommended for production)

---

## Troubleshooting

### Build fails on Vercel
- Check that all environment variables are set
- Verify `package.json` has correct build script
- Check build logs in Vercel dashboard

### Firebase Hosting shows blank page
- Verify `firebase.json` points to correct output directory
- Check that Next.js build completed successfully
- Ensure rewrites are configured correctly

### Environment variables not working
- Restart the deployment after adding variables
- Verify variable names start with `NEXT_PUBLIC_`
- Check that variables are set in the correct environment (production/preview)

---

## Next Steps

1. Choose your hosting provider (Vercel recommended)
2. Set up environment variables
3. Deploy your first version
4. Test all functionality
5. Set up custom domain (optional)
6. Enable Firebase App Check for production security

