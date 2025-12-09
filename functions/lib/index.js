"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listBackups = exports.restoreFirestore = exports.backupFirestore = exports.getUserInfo = exports.listUsers = exports.resetUserPassword = exports.createUser = exports.lookupUserByEmail = exports.setUserRole = exports.onGuitarStageChange = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
/**
 * Cloud Function triggered when a guitar's stage changes.
 * This can be used to send notifications or perform other actions.
 */
exports.onGuitarStageChange = functions.firestore
    .document("guitars/{guitarId}")
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const guitarId = context.params.guitarId;
    // Check if stage changed
    if (before.stageId !== after.stageId) {
        // Log the stage change (you can extend this to send notifications)
        console.log(`Guitar ${guitarId} moved from stage ${before.stageId} to ${after.stageId}`);
        // Optional: Create a notification document
        // await admin.firestore().collection("notifications").add({
        //   guitarId,
        //   clientUid: guitar.clientUid,
        //   oldStageId: before.stageId,
        //   newStageId: after.stageId,
        //   createdAt: admin.firestore.FieldValue.serverTimestamp(),
        // });
    }
    return null;
});
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