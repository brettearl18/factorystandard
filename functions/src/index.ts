import * as admin from "firebase-admin";

admin.initializeApp();

// Firestore triggers: stage change + run update → email clients via Mailgun
export { onGuitarStageChange } from "./onGuitarStageChange";
export { onRunUpdateCreated } from "./onRunUpdateCreated";

// Custom Shop: thank-you to client + notify staff
export { onCustomShopRequestCreated } from "./onCustomShopRequestCreated";

// Firestore triggers: notify staff when comments or payment approvals come in
export { onNoteCommentCreated } from "./onNoteCommentCreated";
export { onRunUpdateCommentCreated } from "./onRunUpdateCommentCreated";
export { onInvoiceUpdated } from "./onInvoiceUpdated";
export { onGuitarGalleryUpload } from "./onGuitarGalleryUpload";

// Export the setUserRole function
export { setUserRole } from "./setUserRole";

// Export the lookupUserByEmail function
export { lookupUserByEmail } from "./lookupUser";

// Export the createUser function
export { createUser } from "./createUser";

// Export the resetUserPassword function
export { resetUserPassword } from "./resetUserPassword";

// Staff/admin: update Auth + profile display name
export { updateUserDisplayName } from "./updateUserDisplayName";

// Export the listUsers function
export { listUsers } from "./listUsers";

// Export the getUserInfo function
export { getUserInfo } from "./getUserInfo";// Export the setClientRole function
export { setClientRole } from "./setClientRole";// Export sendTestEmails (admin only)
export { sendTestEmails } from "./sendTestEmails";// Export the backupFirestore function
export { backupFirestore } from "./backupFirestore";// Export the restoreFirestore function
export { restoreFirestore } from "./restoreFirestore";// Export the listBackups function
export { listBackups } from "./listBackups";