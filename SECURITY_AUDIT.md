# Security Audit Report - Factory Standards

**Date:** November 23, 2025  
**Project:** Ormsby Factory Standards  
**Auditor:** AI Security Review

---

## 🔒 Security Strengths

### ✅ Authentication & Authorization
- ✅ Role-based access control (RBAC) implemented
- ✅ Custom claims for user roles (staff, admin, client, factory)
- ✅ Firebase Authentication with email/password
- ✅ Password reset functionality
- ✅ Token refresh for role updates

### ✅ Firestore Security Rules
- ✅ Staff/admin have appropriate read/write access
- ✅ Clients can only read their own guitars
- ✅ Client notes filtered by `visibleToClient` flag
- ✅ Notifications are user-scoped
- ✅ Invoice access restricted to owner

### ✅ Storage Security Rules
- ✅ File size limits enforced (10MB for photos, 20MB for invoices)
- ✅ Content type validation (images only for photos)
- ✅ Staff/admin write access properly restricted
- ✅ Invoice files properly scoped to client UID

### ✅ Cloud Functions
- ✅ All functions require authentication
- ✅ Role checks before sensitive operations
- ✅ Input validation on user creation
- ✅ Error handling without exposing internals

### ✅ Code Security
- ✅ Environment variables used for Firebase config
- ✅ No hardcoded API keys or secrets in code
- ✅ Proper error handling
- ✅ Input validation on forms

---

## ⚠️ Security Concerns & Recommendations

### 🔴 HIGH PRIORITY

#### 1. **Storage Rules - Client Access Too Permissive**
**Location:** `storage.rules` line 25

**Issue:**
```javascript
// Clients can read files for guitars assigned to them
// Note: This requires checking Firestore to verify clientUid
// For now, we'll allow read access if authenticated as client
allow read: if isClient() && request.auth != null;
```

**Problem:** Clients can read ALL guitar photos, not just their own. This allows any client to access photos from other clients' guitars.

**Recommendation:**
```javascript
// Should verify guitar ownership via Firestore
allow read: if isClient() && 
  exists(/databases/$(database)/documents/guitars/$(guitarId)) &&
  get(/databases/$(database)/documents/guitars/$(guitarId)).data.clientUid == request.auth.uid;
```

**Impact:** Medium - Clients could view other clients' guitar photos

---

#### 2. **No Automated Backup Strategy**
**Issue:** No automated Firestore backups configured

**Recommendation:**
1. **Enable Firestore Automated Backups:**
   ```bash
   gcloud firestore backups schedules create \
     --database='(default)' \
     --recurrence='daily' \
     --retention='30d' \
     --project=ormsby-factory-standard-runs
   ```

2. **Manual Export Script:**
   Create a scheduled Cloud Function or Cloud Scheduler job to export Firestore data daily to Cloud Storage.

3. **Storage Backups:**
   Enable versioning on Firebase Storage bucket for photo recovery.

**Impact:** High - Data loss risk if Firestore is accidentally deleted or corrupted

---

#### 3. **SMTP Password Stored in Plaintext**
**Location:** `src/types/settings.ts` line 34

**Issue:**
```typescript
smtpPassword?: string; // Note: In production, this should be encrypted
```

**Problem:** SMTP password stored in Firestore without encryption

**Recommendations:**
1. **Use Google Secret Manager:**
   - Store SMTP password in Secret Manager
   - Access via Cloud Functions only
   - Never store in Firestore

2. **Encrypt in Firestore:**
   - Use client-side encryption before storing
   - Use Firebase App Check to prevent unauthorized access

3. **Use OAuth2 for Gmail:**
   - Use Gmail API with OAuth2 instead of SMTP password
   - More secure and doesn't require password storage

**Impact:** Medium - If settings collection is compromised, SMTP credentials exposed

---

### 🟡 MEDIUM PRIORITY

#### 4. **Settings Collection Publicly Readable**
**Location:** `firestore.rules` line 71

**Issue:**
```javascript
allow read: if true; // Public read for branding on login page
```

**Problem:** Entire settings collection is publicly readable, including potentially sensitive config.

**Recommendation:**
- Create separate collections: `settings/branding` (public) and `settings/config` (staff only)
- Or filter fields: Only allow reading specific fields like `companyName`, `companyLogo`, `primaryColor`

**Impact:** Low-Medium - Depends on what's stored in settings

---

#### 5. **No Rate Limiting on Cloud Functions**
**Issue:** Cloud Functions don't have explicit rate limiting

**Recommendation:**
- Enable Firebase App Check to prevent abuse
- Add rate limiting in Cloud Functions (e.g., using Firebase Realtime Database or Firestore for tracking)
- Set Cloud Function quotas in Firebase Console

**Impact:** Medium - Potential for abuse/DoS

---

#### 6. **No Input Sanitization on User-Generated Content**
**Issue:** Notes, messages, and custom fields may contain malicious content

**Recommendation:**
- Sanitize HTML in notes before display
- Validate and sanitize all text inputs
- Consider using a library like DOMPurify for client-side sanitization

**Impact:** Low-Medium - XSS risk if content is rendered as HTML

---

#### 7. **Factory Workers Can List All Users**
**Location:** `functions/src/listUsers.ts` line 22

**Issue:** Factory workers can call `listUsers` function, exposing all user emails

**Recommendation:**
- Remove factory workers from `listUsers` access
- Factory workers don't need to see all users
- Only staff/admin should have this access

**Impact:** Low - Privacy concern, factory workers can see all user emails

---

### 🟢 LOW PRIORITY / BEST PRACTICES

#### 8. **No Firebase App Check**
**Recommendation:**
- Enable Firebase App Check to prevent abuse from unauthorized apps
- Protects against bot traffic and API abuse
- Free tier available

**Impact:** Low - Helps prevent abuse but not critical

---

#### 9. **Password Minimum Length**
**Location:** `src/components/client/AddClientModal.tsx` line 187

**Issue:** Minimum password length is only 6 characters

**Recommendation:**
- Increase to 8+ characters
- Add password complexity requirements
- Consider using Firebase Auth password policy

**Impact:** Low - Weak passwords easier to brute force

---

#### 10. **No Audit Logging**
**Recommendation:**
- Log sensitive operations (user creation, role changes, data deletion)
- Store audit logs in Firestore or Cloud Logging
- Track who did what and when

**Impact:** Low - Harder to investigate security incidents

---

#### 11. **No Data Retention Policy**
**Recommendation:**
- Define retention policies for archived guitars
- Automate deletion of old archived data
- Consider GDPR/data privacy requirements

**Impact:** Low - Compliance and storage cost concern

---

## 📋 Security Checklist

### Immediate Actions (High Priority)
- [ ] Fix Storage rules to restrict client access to own guitar photos only
- [ ] Set up automated Firestore backups
- [ ] Move SMTP password to Secret Manager or encrypt
- [ ] Remove factory workers from `listUsers` access

### Short-term (Medium Priority)
- [ ] Restrict settings collection public read access
- [ ] Enable Firebase App Check
- [ ] Add rate limiting to Cloud Functions
- [ ] Implement input sanitization for user content

### Long-term (Best Practices)
- [ ] Increase password requirements
- [ ] Implement audit logging
- [ ] Set up data retention policies
- [ ] Regular security reviews

---

## 🔐 Backup Strategy Recommendations

### Firestore Backups
1. **Automated Daily Backups:**
   ```bash
   # Enable via Firebase Console or gcloud CLI
   gcloud firestore backups schedules create \
     --database='(default)' \
     --recurrence='daily' \
     --retention='30d' \
     --project=ormsby-factory-standard-runs
   ```

2. **Manual Export Script:**
   Create `scripts/backup-firestore.ts` to export collections to Cloud Storage

3. **Export Schedule:**
   - Daily: Full export to Cloud Storage
   - Weekly: Long-term archive
   - Monthly: Offsite backup (download to secure location)

### Storage Backups
1. **Enable Versioning:**
   ```bash
   gsutil versioning set on gs://ormsby-factory-standard-runs.appspot.com
   ```

2. **Lifecycle Policies:**
   - Keep all versions for 30 days
   - Archive older versions to Coldline storage

### Recovery Testing
- [ ] Test Firestore restore process
- [ ] Test Storage file recovery
- [ ] Document recovery procedures
- [ ] Schedule quarterly backup tests

---

## 📊 Security Score

**Overall Security Rating: 7/10**

**Breakdown:**
- Authentication: 9/10 ✅
- Authorization: 8/10 ✅
- Data Protection: 6/10 ⚠️ (backup concerns)
- Secrets Management: 5/10 ⚠️ (SMTP password)
- Input Validation: 7/10 ✅
- Monitoring: 4/10 ⚠️ (no audit logs)

---

## 🚀 Next Steps

1. **Immediate:** Fix Storage rules client access
2. **This Week:** Set up automated backups
3. **This Month:** Move SMTP password to Secret Manager
4. **Ongoing:** Regular security reviews and updates

---

## 📚 Resources

- [Firebase Security Rules Best Practices](https://firebase.google.com/docs/rules/best-practices)
- [Firestore Backup & Restore](https://firebase.google.com/docs/firestore/manage-data/export-import)
- [Google Secret Manager](https://cloud.google.com/secret-manager)
- [Firebase App Check](https://firebase.google.com/docs/app-check)

