"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBackups = exports.restoreFirestore = exports.backupFirestore = exports.sendTestEmails = exports.setClientRole = exports.getUserInfo = exports.listUsers = exports.resetUserPassword = exports.createUser = exports.lookupUserByEmail = exports.setUserRole = exports.onInvoiceUpdated = exports.onRunUpdateCommentCreated = exports.onNoteCommentCreated = exports.onRunUpdateCreated = exports.onGuitarStageChange = void 0;
const admin = require("firebase-admin");
admin.initializeApp();
// Firestore triggers: stage change + run update → email clients via Mailgun
var onGuitarStageChange_1 = require("./onGuitarStageChange");
Object.defineProperty(exports, "onGuitarStageChange", { enumerable: true, get: function () { return onGuitarStageChange_1.onGuitarStageChange; } });
var onRunUpdateCreated_1 = require("./onRunUpdateCreated");
Object.defineProperty(exports, "onRunUpdateCreated", { enumerable: true, get: function () { return onRunUpdateCreated_1.onRunUpdateCreated; } });
// Firestore triggers: notify staff when comments or payment approvals come in
var onNoteCommentCreated_1 = require("./onNoteCommentCreated");
Object.defineProperty(exports, "onNoteCommentCreated", { enumerable: true, get: function () { return onNoteCommentCreated_1.onNoteCommentCreated; } });
var onRunUpdateCommentCreated_1 = require("./onRunUpdateCommentCreated");
Object.defineProperty(exports, "onRunUpdateCommentCreated", { enumerable: true, get: function () { return onRunUpdateCommentCreated_1.onRunUpdateCommentCreated; } });
var onInvoiceUpdated_1 = require("./onInvoiceUpdated");
Object.defineProperty(exports, "onInvoiceUpdated", { enumerable: true, get: function () { return onInvoiceUpdated_1.onInvoiceUpdated; } });
// Export the setUserRole function
var setUserRole_1 = require("./setUserRole");
Object.defineProperty(exports, "setUserRole", { enumerable: true, get: function () { return setUserRole_1.setUserRole; } });
// Export the lookupUserByEmail function
var lookupUser_1 = require("./lookupUser");
Object.defineProperty(exports, "lookupUserByEmail", { enumerable: true, get: function () { return lookupUser_1.lookupUserByEmail; } });
// Export the createUser function
var createUser_1 = require("./createUser");
Object.defineProperty(exports, "createUser", { enumerable: true, get: function () { return createUser_1.createUser; } });
// Export the resetUserPassword function
var resetUserPassword_1 = require("./resetUserPassword");
Object.defineProperty(exports, "resetUserPassword", { enumerable: true, get: function () { return resetUserPassword_1.resetUserPassword; } });
// Export the listUsers function
var listUsers_1 = require("./listUsers");
Object.defineProperty(exports, "listUsers", { enumerable: true, get: function () { return listUsers_1.listUsers; } });
// Export the getUserInfo function
var getUserInfo_1 = require("./getUserInfo");
Object.defineProperty(exports, "getUserInfo", { enumerable: true, get: function () { return getUserInfo_1.getUserInfo; } });
// Export the setClientRole function
var setClientRole_1 = require("./setClientRole");
Object.defineProperty(exports, "setClientRole", { enumerable: true, get: function () { return setClientRole_1.setClientRole; } });
// Export sendTestEmails (admin only)
var sendTestEmails_1 = require("./sendTestEmails");
Object.defineProperty(exports, "sendTestEmails", { enumerable: true, get: function () { return sendTestEmails_1.sendTestEmails; } });
// Export the backupFirestore function
var backupFirestore_1 = require("./backupFirestore");
Object.defineProperty(exports, "backupFirestore", { enumerable: true, get: function () { return backupFirestore_1.backupFirestore; } });
// Export the restoreFirestore function
var restoreFirestore_1 = require("./restoreFirestore");
Object.defineProperty(exports, "restoreFirestore", { enumerable: true, get: function () { return restoreFirestore_1.restoreFirestore; } });
// Export the listBackups function
var listBackups_1 = require("./listBackups");
Object.defineProperty(exports, "listBackups", { enumerable: true, get: function () { return listBackups_1.listBackups; } });
//# sourceMappingURL=index.js.map