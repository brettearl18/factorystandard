import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

/**
 * Cloud Function to list all users with their roles
 * 
 * This allows staff/admin to see all users and their roles.
 */
export const listUsers = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated and is staff/admin
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  // Check if user is staff/admin
  const userRecord = await admin.auth().getUser(context.auth.uid);
  const userRole = userRecord.customClaims?.role;

  if (userRole !== "staff" && userRole !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only staff and admins can list users"
    );
  }

  const { roleFilter, limit: limitParam } = data;
  const limit = limitParam || 1000; // Default to 1000 users

  try {
    let nextPageToken: string | undefined;
    const allUsers: any[] = [];

    // List all users (paginated)
    do {
      const listUsersResult = await admin.auth().listUsers(limit, nextPageToken);
      
      listUsersResult.users.forEach((user) => {
        const userRole = user.customClaims?.role || null;
        
        // Filter by role if specified
        if (!roleFilter || userRole === roleFilter) {
          allUsers.push({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role: userRole,
            emailVerified: user.emailVerified,
            createdAt: user.metadata.creationTime,
            lastSignIn: user.metadata.lastSignInTime,
          });
        }
      });

      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    return {
      success: true,
      users: allUsers,
      count: allUsers.length,
    };
  } catch (error: any) {
    throw new functions.https.HttpsError(
      "internal",
      `Failed to list users: ${error.message}`
    );
  }
});

