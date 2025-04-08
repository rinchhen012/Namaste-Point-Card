const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

/**
 * Cloud Function to validate online order delivery codes
 *
 * This function checks if a code is valid, not used yet, and assigns a point to the user.
 */
exports.validateOnlineCode = functions.https.onCall(async (data, context) => {
  // First, ensure the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to validate codes"
    );
  }

  const { code, userId } = data;

  if (!code || !userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Code and userId are required"
    );
  }

  // Reference to the code document in Firestore
  const codeRef = admin.firestore().collection("unique_order_codes").doc(code);

  try {
    // Run the validation in a transaction to ensure atomicity
    return await admin.firestore().runTransaction(async (transaction) => {
      const codeDoc = await transaction.get(codeRef);

      // Check if the code exists
      if (!codeDoc.exists) {
        return {
          success: false,
          message: "Invalid code",
        };
      }

      const codeData = codeDoc.data();

      // Check if the code has already been used
      if (codeData.used) {
        return {
          success: false,
          message: "This code has already been used",
        };
      }

      // Check if the code has expired (for example, valid for 7 days)
      const createdAt = codeData.createdAt.toDate();
      const now = new Date();
      const diffDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

      if (diffDays > 7) {
        return {
          success: false,
          message: "This code has expired",
        };
      }

      // Code is valid, now update the code status and add a point to user
      const userRef = admin.firestore().collection("users").doc(userId);

      // Get the current user data
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();
      const currentPoints = userData.points || 0;

      // Update the code as used
      transaction.update(codeRef, {
        used: true,
        usedBy: userId,
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Add a point to the user
      transaction.update(userRef, {
        points: currentPoints + 1,
      });

      // Add to points history
      const historyRef = admin.firestore().collection("points_history").doc();
      transaction.set(historyRef, {
        userId,
        points: 1,
        type: "earn",
        source: "delivery_order",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        metadata: {
          code,
          orderType: codeData.orderType || "delivery",
          deliveryPartner: codeData.deliveryPartner || "unknown",
        },
      });

      return {
        success: true,
        message: "Code validated successfully!",
        pointsAdded: 1,
        currentPoints: currentPoints + 1,
      };
    });
  } catch (error) {
    console.error("Error validating code:", error);
    throw new functions.https.HttpsError(
      "internal",
      "An error occurred while validating the code"
    );
  }
});
