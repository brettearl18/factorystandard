# Pre-Launch Checklist

## ✅ Completed
- [x] Environment variables configured on Cloud Run
- [x] Firebase project set up
- [x] Firestore rules deployed
- [x] Storage rules deployed
- [x] Dockerfile created
- [x] Deployment script ready

## 🔧 Code & Build
- [ ] **Commit recent fixes** (archived runs bug fix)
- [ ] **Run final build test** - `npm run build` should succeed
- [ ] **Fix any TypeScript errors**
- [ ] **Test locally** - Ensure all features work in development

## 🔐 Security & Rules
- [ ] **Review Firestore security rules** - Ensure they're production-ready
- [ ] **Review Storage security rules** - Verify file upload permissions
- [ ] **Deploy latest Firestore rules** - `firebase deploy --only firestore:rules`
- [ ] **Deploy latest Storage rules** - `firebase deploy --only storage`
- [ ] **Verify Cloud Functions are deployed** (if using any)

## 🌐 Deployment
- [ ] **Deploy to Cloud Run** - Run `./deploy-cloud-run.sh`
- [ ] **Verify Cloud Run service is running** - Check logs for errors
- [ ] **Deploy Firebase Hosting** - `firebase deploy --only hosting`
- [ ] **Test production URL** - Verify site loads correctly

## 🧪 Testing
- [ ] **Authentication** - Test login/logout
- [ ] **User roles** - Verify staff/client/admin permissions work
- [ ] **Runs** - Create, view, edit, archive runs
- [ ] **Guitars** - Create, view, edit, archive guitars
- [ ] **Notes** - Add notes with different types
- [ ] **Photos** - Upload and view photos
- [ ] **Invoices** - Upload invoices, record payments
- [ ] **Notifications** - Verify notifications work for staff and clients
- [ ] **Client view** - Test "View as Client" mode
- [ ] **Archive functionality** - Verify archived items show/hide correctly

## 📱 Cross-Platform
- [ ] **Test on desktop browsers** (Chrome, Firefox, Safari)
- [ ] **Test on mobile devices** (iOS, Android)
- [ ] **Test responsive design** - Verify UI works on different screen sizes

## 🔍 Performance & Monitoring
- [ ] **Check Cloud Run logs** - Look for errors or warnings
- [ ] **Monitor Firestore usage** - Check for excessive reads/writes
- [ ] **Set up error monitoring** (optional - Firebase Crashlytics or similar)
- [ ] **Verify image optimization** - Check thumbnail loading

## 📋 Documentation
- [ ] **Update README** with production URL
- [ ] **Document any manual setup steps** for new deployments
- [ ] **Note any known issues or limitations**

## 🚀 Final Steps
- [ ] **Set up custom domain** (if needed)
- [ ] **Configure SSL certificate** (Firebase Hosting handles this automatically)
- [ ] **Set up backup strategy** (Firestore exports, etc.)
- [ ] **Create admin user accounts** for production
- [ ] **Test with real data** (if possible, or use staging data)

## ⚠️ Important Notes

### Environment Variables Required
All these must be set on Cloud Run:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### Deployment Command
```bash
PROJECT_ID=ormsby-factory-standard-runs ./deploy-cloud-run.sh
```

### Post-Deployment Verification
1. Visit the Firebase Hosting URL
2. Test login with a test account
3. Verify all major features work
4. Check browser console for errors
5. Monitor Cloud Run logs for issues

### Rollback Plan
If something goes wrong:
1. Check Cloud Run logs: `gcloud run services logs read factory-standards-web --project ormsby-factory-standard-runs --region australia-southeast1`
2. Redeploy previous version if needed
3. Check Firestore/Storage rules if permissions fail

