/**
 * Import function triggers from their respective submodules:
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config();

import * as admin from 'firebase-admin';
import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Reference to Firestore database
const db = admin.firestore();

// Define interfaces for request data
interface ValidateCodeData {
  code: string;
  userId?: string;
}

interface QRCheckInData {
  qrCode: string;
  latitude: number;
  longitude: number;
}

interface GenerateCodesData {
  count?: number;
  prefix?: string;
  pointsAwarded?: number;
  expiryDays?: number;
}

interface GetAdminStatsData {
  // No specific data needed
}

interface AddAdminRoleData {
  email: string;
}

// Interface for createDeliveryCoupons function
interface CreateDeliveryCouponsData {
  codePrefix: string;
  count: number;
  expiryDays: number;
}

// Interface for store info update
interface StoreInfoData {
  storeInfo: {
    name: string;
    address: { en: string; ja: string };
    phone: string;
    email: string;
    hours: { en: string; ja: string };
    website: string;
    googleMapsUrl: string;
    imageUrl?: string;
  };
  create: boolean;
}

// Interface for FAQ item management
interface FAQItemData {
  id?: string;
  question: { en: string; ja: string };
  answer: { en: string; ja: string };
  action: 'create' | 'update' | 'delete';
}

/**
 * Validates an online order code and awards points to the user
 *
 * @param code - The online order code to validate
 * @returns A success/failure message and points awarded
 */
export const validateOnlineOrderCode = onCall(
  async (request: CallableRequest<ValidateCodeData>) => {
    // Check if user is authenticated
    if (!request.auth) {
      return { success: false, message: 'Authentication required' };
    }

    const { code } = request.data;
    if (!code) {
      return { success: false, message: 'No code provided' };
    }

    // Get the user ID from the authenticated context
    const userId = request.auth.uid;

    try {
      // Use a transaction to ensure atomicity
      const result = await db.runTransaction(async (transaction) => {
        // Query for the code
        const codeQuery = db.collection('online_order_codes').where('code', '==', code);
        const codeSnapshot = await transaction.get(codeQuery);

        // Check if code exists
        if (codeSnapshot.empty) {
          return { success: false, message: 'Invalid code' };
        }

        const codeDoc = codeSnapshot.docs[0];
        const codeData = codeDoc.data();

        // Check if code is already used
        if (codeData.isUsed) {
          return { success: false, message: 'Code already used' };
        }

        // Check if code is expired
        const now = admin.firestore.Timestamp.now();
        if (codeData.expiresAt.toMillis() < now.toMillis()) {
          return { success: false, message: 'Code has expired' };
        }

        // Update code to mark as used
        transaction.update(codeDoc.ref, {
          isUsed: true,
          usedAt: now,
          userId: userId
        });

        // Add points to user
        const userRef = db.collection('users').doc(userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
          return { success: false, message: 'User not found' };
        }

        const userData = userDoc.data();
        const currentPoints = userData?.points || 0;
        const pointsToAdd = codeData.pointsAwarded || 5;

        transaction.update(userRef, {
          points: currentPoints + pointsToAdd,
          lastVisit: now
        });

        // Record points transaction
        const transactionRef = db.collection('points_transactions').doc();
        transaction.set(transactionRef, {
          userId: userId,
          points: pointsToAdd,
          type: 'online-order',
          createdAt: now,
          codeId: codeDoc.id
        });

        return {
          success: true,
          message: 'Code redeemed successfully!',
          points: pointsToAdd
        };
      });

      return result;
    } catch (error) {
      console.error('Error validating code:', error);
      return { success: false, message: 'An error occurred while processing the code' };
    }
  }
);

/**
 * Validates a QR code check-in based on the code, geolocation, and time constraints
 *
 * @param qrCode - The QR code scanned from the restaurant
 * @param latitude - User's current latitude
 * @param longitude - User's current longitude
 * @returns Success or failure message
 */
export const validateQRCheckIn = onCall(
  async (request: CallableRequest<QRCheckInData>) => {
    // Check if user is authenticated
    if (!request.auth) {
      return { success: false, message: 'Authentication required' };
    }

    const { qrCode, latitude, longitude } = request.data;
    if (!qrCode) {
      return { success: false, message: 'QR code is required' };
    }

    if (latitude === undefined || longitude === undefined) {
      return { success: false, message: 'Location data required' };
    }

    // Get the user ID from the authenticated context
    const userId = request.auth.uid;

    try {
      // Verify the QR code is valid (matches our restaurant codes)
      // In a real implementation, you might have multiple locations, each with a unique QR code
      // For simplicity, we'll use a hardcoded list of valid codes here
      const validQRCodes = {
        'NAMASTE-TOKYO-MAIN': { lat: 35.6812, lng: 139.6314 },
        'NAMASTE-OSAKA-MAIN': { lat: 34.6937, lng: 135.5022 }
      };

      // Check if the QR code is valid
      if (!Object.keys(validQRCodes).includes(qrCode)) {
        return { success: false, message: 'Invalid QR code' };
      }

      // Get the location associated with this QR code
      const locationData = validQRCodes[qrCode as keyof typeof validQRCodes];
      const restaurantLat = locationData.lat;
      const restaurantLng = locationData.lng;
      const maxDistanceInMeters = 100; // 100 meters radius

      // Calculate distance between user and restaurant
      const distance = calculateDistance(
        latitude,
        longitude,
        restaurantLat,
        restaurantLng
      );

      // Check if user is within the radius
      if (distance > maxDistanceInMeters) {
        return {
          success: false,
          message: 'You must be at the restaurant to check in',
          distance: Math.round(distance)
        };
      }

      // Get the user document to check their last QR check-in time
      const userRef = db.collection('users').doc(userId);
      let userDoc;
      try {
        userDoc = await userRef.get();
      } catch (userError) {
        console.error('Error fetching user document:', userError);
        return {
          success: false,
          message: 'Failed to access user data. Please try again later.',
          error: 'user_access_error'
        };
      }

      if (!userDoc.exists) {
        return { success: false, message: 'User not found' };
      }

      const userData = userDoc.data();

      // Check if user has already checked in with this QR code recently (within 22 hours)
      if (userData?.lastQRCheckIn && userData.lastQRCheckIn.qrCode === qrCode) {
        const lastCheckInTime = userData.lastQRCheckIn.timestamp.toMillis();
        const now = Date.now();
        const hoursSinceLastCheckIn = (now - lastCheckInTime) / (1000 * 60 * 60);

        // If less than 22 hours have passed, reject the check-in
        if (hoursSinceLastCheckIn < 22) {
          return {
            success: false,
            message: 'You have already checked in today. Please come back tomorrow!'
          };
        }
      }

      // Award points for check-in (using a transaction for atomicity)
      try {
        await db.runTransaction(async (transaction) => {
          // Get latest user document within the transaction
          const latestUserDoc = await transaction.get(userRef);
          if (!latestUserDoc.exists) {
            throw new Error('User not found');
          }

          const latestUserData = latestUserDoc.data();
          const currentPoints = latestUserData?.points || 0;
          const pointsToAdd = 1; // 1 point for check-in

          // Update user points and last QR check-in
          transaction.update(userRef, {
            points: currentPoints + pointsToAdd,
            lastQRCheckIn: {
              timestamp: admin.firestore.Timestamp.now(),
              qrCode: qrCode
            }
          });

          // Record points transaction
          transaction.set(db.collection('points_transactions').doc(), {
            userId: userId,
            points: pointsToAdd,
            type: 'in-store',
            createdAt: admin.firestore.Timestamp.now(),
            location: new admin.firestore.GeoPoint(latitude, longitude),
            note: 'QR code check-in',
            metadata: {
              qrCode: qrCode
            }
          });
        });
      } catch (transactionError: any) {
        console.error('Transaction error during check-in:', transactionError);

        // Handle permission errors
        if (transactionError.code === 'permission-denied') {
          return {
            success: false,
            message: 'You do not have permission to check in. Please contact support.',
            error: 'permission_denied'
          };
        }

        // Handle missing index errors
        if (transactionError.message && transactionError.message.includes('index')) {
          console.error('Missing index error. Please check Firestore indexes.');
          return {
            success: false,
            message: 'Service configuration error. Please try again later.',
            error: 'missing_index'
          };
        }

        return {
          success: false,
          message: 'Failed to process check-in. Please try again later.',
          error: 'transaction_error'
        };
      }

      return {
        success: true,
        message: 'Check-in successful! 1 point added to your account.'
      };
    } catch (error: any) {
      console.error('Error validating QR check-in:', error);

      // Provide more specific error messages based on error type
      if (error.code === 'permission-denied') {
        return {
          success: false,
          message: 'You do not have permission to perform this action.',
          error: 'permission_denied'
        };
      }

      if (error.message && error.message.includes('index')) {
        console.error('Missing index error. Please check Firestore indexes.');
        return {
          success: false,
          message: 'Service configuration error. Please try again later.',
          error: 'missing_index'
        };
      }

      return {
        success: false,
        message: 'An error occurred during check-in. Please try again later.',
        error: 'unknown_error'
      };
    }
  }
);

/**
 * Generates a batch of unique online order codes
 * Admin only function
 */
export const generateOnlineOrderCodes = onCall(
  async (request: CallableRequest<GenerateCodesData>) => {
    // Check if user is authenticated and is an admin
    if (!request.auth) {
      return { success: false, message: 'Authentication required' };
    }

    try {
      // Check if user is an admin
      const userDoc = await db.collection('users').doc(request.auth.uid).get();
      if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        return { success: false, message: 'Admin access required' };
      }

      const { count = 1, prefix = 'NAMASTE', pointsAwarded = 5, expiryDays = 60 } = request.data;

      if (count < 1 || count > 100) {
        return { success: false, message: 'Count must be between 1 and 100' };
      }

      const codes: string[] = [];
      const batch = db.batch();
      const now = admin.firestore.Timestamp.now();

      // Calculate expiry date (default 60 days = 2 months)
      const expiryDate = new Date(now.toMillis());
      expiryDate.setDate(expiryDate.getDate() + expiryDays);
      const expiresAt = admin.firestore.Timestamp.fromDate(expiryDate);

      // Generate codes
      for (let i = 0; i < count; i++) {
        // Generate a unique code
        const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase();
        const code = `${prefix}-${randomChars}`;

        // Create a document for the code
        const codeRef = db.collection('online_order_codes').doc();
        batch.set(codeRef, {
          code,
          isUsed: false,
          createdAt: now,
          expiresAt,
          pointsAwarded
        });

        codes.push(code);
      }

      // Commit the batch
      await batch.commit();

      return {
        success: true,
        message: `Generated ${count} codes`,
        codes
      };
    } catch (error) {
      console.error('Error generating codes:', error);
      return { success: false, message: 'An error occurred while generating codes' };
    }
  }
);

/**
 * Gets admin dashboard statistics
 * Admin only function
 */
export const getAdminStats = onCall(
  async (request: CallableRequest<GetAdminStatsData>) => {
    // Check if user is authenticated and is an admin
    if (!request.auth) {
      return { success: false, message: 'Authentication required' };
    }

    try {
      // Check if user is an admin
      const userDoc = await db.collection('users').doc(request.auth.uid).get();
      if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        return { success: false, message: 'Admin access required' };
      }

      // Get total user count
      const usersSnapshot = await db.collection('users').count().get();
      const totalUsers = usersSnapshot.data().count;

      // Get active users (visited in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoTimestamp = admin.firestore.Timestamp.fromDate(thirtyDaysAgo);

      const activeUsersSnapshot = await db.collection('users')
        .where('lastVisit', '>=', thirtyDaysAgoTimestamp)
        .count()
        .get();
      const activeUsers = activeUsersSnapshot.data().count;

      // Get total points issued
      const pointsSnapshot = await db.collection('points_transactions')
        .where('points', '>', 0)
        .get();
      let totalPoints = 0;
      pointsSnapshot.forEach(doc => {
        totalPoints += doc.data().points;
      });

      // Get total redemptions
      const redemptionsSnapshot = await db.collection('redemptions').count().get();
      const totalRedemptions = redemptionsSnapshot.data().count;

      return {
        success: true,
        totalUsers,
        activeUsers,
        totalPoints,
        totalRedemptions
      };
    } catch (error) {
      console.error('Error getting admin stats:', error);
      return { success: false, message: 'An error occurred while getting admin stats' };
    }
  }
);

/**
 * Helper function to calculate distance between two coordinates in meters
 * Uses the Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Add user admin claims
export const addAdminRole = onCall(
  async (request: CallableRequest<AddAdminRoleData>) => {
    // Check if the request is made by an admin
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Only authenticated users can add admin roles'
      );
    }

    // Get the user's custom claims to check if they're an admin
    const callerUid = request.auth.uid;
    const callerUserRecord = await admin.auth().getUser(callerUid);
    const callerCustomClaims = callerUserRecord.customClaims;

    // Only allow existing admins to create new admins
    // For the first admin, you'll need to manually update in Firebase Console
    if (!callerCustomClaims?.admin) {
      throw new HttpsError(
        'permission-denied',
        'Only admins can add admin roles'
      );
    }

    try {
      // Get the user by email
      const { email } = request.data;
      if (!email) {
        throw new HttpsError(
          'invalid-argument',
          'Email is required'
        );
      }

      // Get the user
      const user = await admin.auth().getUserByEmail(email);

      // Set admin custom claim
      await admin.auth().setCustomUserClaims(user.uid, {
        admin: true
      });

      // Update the user's role field in Firestore
      await admin.firestore().collection('users').doc(user.uid).update({
        role: 'admin'
      });

      return {
        result: `${email} has been made an admin`,
        success: true
      };
    } catch (error) {
      throw new HttpsError(
        'internal',
        'Error making the user an admin',
        error
      );
    }
  }
);

// Interface for createInitialAdmin request body
interface InitialAdminRequest {
  secretKey: string;
  email: string;
  password: string;
}

// Create the initial admin user with email and password
export const createInitialAdmin = onRequest(async (req, res) => {
  // This function should only be callable in development or via a secure console
  // Not for production use

  // Only allow POST method
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // Access config values in a safer way
  const configAdminKey = process.env.ADMIN_SETUP_KEY;

  // Check secret key to authorize this operation
  const { secretKey, email, password } = req.body as InitialAdminRequest;

  if (!configAdminKey || secretKey !== configAdminKey) {
    res.status(403).send('Unauthorized');
    return;
  }

  if (!email || !password) {
    res.status(400).send('Email and password are required');
    return;
  }

  try {
    // Check if user already exists
    try {
      await admin.auth().getUserByEmail(email);
      res.status(400).send('User already exists');
      return;
    } catch (error) {
      // User doesn't exist, continue creating
    }

    // Create user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: true
    });

    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      admin: true
    });

    // Create user document in Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email,
      displayName: 'Admin User',
      role: 'admin',
      points: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).send({
      message: 'Admin user created successfully',
      uid: userRecord.uid
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).send('Error creating admin user');
  }
});

/**
 * Calculate a validation checksum for a coupon code
 * Returns a single character (0-9, A-Z) checksum
 */
function calculateChecksum(code: string): string {
  // Simple but effective algorithm:
  // 1. Sum the character codes
  // 2. Add the position-weighted values (multiply each char code by its position)
  // 3. Apply a prime multiplier for additional complexity
  // 4. Take modulo 36 to get a value 0-35
  // 5. Convert to character (0-9, A-Z)

  let sum = 0;
  const PRIME = 17; // A prime number for better distribution

  for (let i = 0; i < code.length; i++) {
    const charCode = code.charCodeAt(i);
    sum += charCode + (charCode * (i + 1));
  }

  sum = (sum * PRIME) % 36;

  // Convert to alphanumeric character (0-9, A-Z)
  if (sum < 10) {
    return sum.toString();
  } else {
    // 10 -> A, 11 -> B, etc.
    return String.fromCharCode(55 + sum); // ASCII 'A' is 65, so 55 + 10 = 65
  }
}

/**
 * Creates delivery coupon codes with a checksum character
 * Admin only function
 */
export const createDeliveryCoupons = onCall(
  async (request: CallableRequest<CreateDeliveryCouponsData>) => {
    // Check if user is authenticated and is an admin
    if (!request.auth) {
      return { success: false, message: 'Authentication required' };
    }

    try {
      // Check if user is an admin
      const userDoc = await db.collection('users').doc(request.auth.uid).get();
      if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        return { success: false, message: 'Admin access required' };
      }

      const { codePrefix, count, expiryDays } = request.data;

      if (count < 1 || count > 300) {
        return { success: false, message: 'Count must be between 1 and 300' };
      }

      const generatedCodes: string[] = []; // Array to store generated codes
      const batch = [];

      // Query existing codes to check for uniqueness
      const couponsRef = db.collection('delivery_coupons');
      const existingCodesSnapshot = await couponsRef.get();
      const existingCodes = new Set<string>();

      // Build a set of existing codes for efficient lookups
      existingCodesSnapshot.forEach(doc => {
        const data = doc.data();
        existingCodes.add(data.code);
      });

      // Calculate expiry date
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);
      const expiresAt = admin.firestore.Timestamp.fromDate(expiryDate);

      for (let i = 0; i < count; i++) {
        let fullCode: string;
        let isUnique = false;

        // Keep generating new codes until we get a unique one
        while (!isUnique) {
          // Generate secure random string
          const buffer = require('crypto').randomBytes(4);
          const randomString = buffer.toString('hex').substring(0, 8).toUpperCase();

          const baseCode = `${codePrefix}-${randomString}`;

          // Calculate and append the checksum character
          const checksum = calculateChecksum(baseCode);
          fullCode = `${baseCode}${checksum}`;

          // Check if this code already exists in the database or was just generated
          isUnique = !existingCodes.has(fullCode) && !generatedCodes.includes(fullCode);
        }

        generatedCodes.push(fullCode!); // Store the generated unique code
        existingCodes.add(fullCode!); // Add to our set to prevent duplicates within this batch

        // Create coupon document
        const couponData = {
          code: fullCode!,
          used: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: expiresAt
        };

        // Add to batch operations
        batch.push(db.collection('delivery_coupons').add(couponData));
      }

      // Execute all adds in parallel
      await Promise.all(batch);

      return {
        success: true,
        count,
        codes: generatedCodes,
        message: `Generated ${count} delivery coupon codes`
      };
    } catch (error) {
      console.error('Error creating delivery coupons:', error);
      return {
        success: false,
        message: 'An error occurred while generating coupon codes',
        error: String(error)
      };
    }
  }
);

// Update store information (admin only)
export const updateStoreInfo = onCall(
  async (request: CallableRequest<StoreInfoData>) => {
    // Check if the request is made by an authenticated user
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Only authenticated users can update store information'
      );
    }

    // Get the user's custom claims to check if they're an admin
    const callerUid = request.auth.uid;
    const callerUserRecord = await admin.auth().getUser(callerUid);
    const callerCustomClaims = callerUserRecord.customClaims;

    // Only allow admins to update store information
    if (!callerCustomClaims?.admin) {
      throw new HttpsError(
        'permission-denied',
        'Only admins can update store information'
      );
    }

    try {
      const { storeInfo, create } = request.data;

      // Validate required fields
      if (!storeInfo.name || !storeInfo.address || !storeInfo.phone ||
          !storeInfo.email || !storeInfo.hours || !storeInfo.website ||
          !storeInfo.googleMapsUrl) {
        throw new HttpsError(
          'invalid-argument',
          'Missing required store information fields'
        );
      }

      // Reference to the store info document
      const storeInfoRef = db.collection('settings').doc('storeInfo');

      if (create) {
        // Create new document
        await storeInfoRef.set(storeInfo);
      } else {
        // Update existing document
        await storeInfoRef.update(storeInfo);
      }

      return {
        success: true,
        message: 'Store information updated successfully'
      };
    } catch (error) {
      console.error('Error updating store information:', error);
      throw new HttpsError(
        'internal',
        'Error updating store information',
        error
      );
    }
  }
);

// Get store information for all users (public access)
export const getStoreInfoForUser = onCall(
  async (request: CallableRequest<void>) => {
    try {
      // Reference to the store info document
      const storeInfoRef = db.collection('settings').doc('storeInfo');
      const storeInfoDoc = await storeInfoRef.get();

      if (storeInfoDoc.exists) {
        return {
          success: true,
          storeInfo: storeInfoDoc.data()
        };
      } else {
        // Return default values to prevent UI crashes
        return {
          success: true,
          storeInfo: {
            name: 'Namaste Restaurant',
            address: { en: '', ja: '' },
            phone: '',
            email: '',
            hours: { en: '', ja: '' },
            website: '',
            googleMapsUrl: '',
            imageUrl: ''
          }
        };
      }
    } catch (error) {
      console.error('Error getting store information for user:', error);
      throw new HttpsError(
        'internal',
        'Failed to fetch store information',
        error
      );
    }
  }
);

// Get FAQ items for all users (public access)
export const getFAQsForUser = onCall(
  async (request: CallableRequest<void>) => {
    try {
      // Reference to the FAQs collection
      const faqsRef = db.collection('faqs');
      const querySnapshot = await faqsRef.orderBy('createdAt', 'asc').get();

      const faqs: any[] = [];
      querySnapshot.forEach((doc) => {
        faqs.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return {
        success: true,
        faqs: faqs
      };
    } catch (error) {
      console.error('Error getting FAQ items for user:', error);
      throw new HttpsError(
        'internal',
        'Failed to fetch FAQ items',
        error
      );
    }
  }
);

// Manage FAQ items (admin only)
export const manageFAQItem = onCall(
  async (request: CallableRequest<FAQItemData>) => {
    // Check if the request is made by an authenticated user
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Only authenticated users can manage FAQ items'
      );
    }

    // Get the user's custom claims to check if they're an admin
    const callerUid = request.auth.uid;
    const callerUserRecord = await admin.auth().getUser(callerUid);
    const callerCustomClaims = callerUserRecord.customClaims;

    // Only allow admins to manage FAQ items
    if (!callerCustomClaims?.admin) {
      throw new HttpsError(
        'permission-denied',
        'Only admins can manage FAQ items'
      );
    }

    try {
      const { id, question, answer, action } = request.data;

      // Reference to the FAQs collection
      const faqsRef = db.collection('faqs');

      switch (action) {
        case 'create':
          // Validate required fields
          if (!question || !answer) {
            throw new HttpsError(
              'invalid-argument',
              'Missing required FAQ fields'
            );
          }

          // Create new FAQ item
          const newFAQRef = await faqsRef.add({
            question,
            answer,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });

          return {
            success: true,
            message: 'FAQ item created successfully',
            id: newFAQRef.id
          };

        case 'update':
          // Validate required fields
          if (!id || !question || !answer) {
            throw new HttpsError(
              'invalid-argument',
              'Missing required FAQ fields'
            );
          }

          // Update existing FAQ item
          await faqsRef.doc(id).update({
            question,
            answer,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          return {
            success: true,
            message: 'FAQ item updated successfully'
          };

        case 'delete':
          // Validate required fields
          if (!id) {
            throw new HttpsError(
              'invalid-argument',
              'Missing FAQ ID for deletion'
            );
          }

          // Delete FAQ item
          await faqsRef.doc(id).delete();

          return {
            success: true,
            message: 'FAQ item deleted successfully'
          };

        default:
          throw new HttpsError(
            'invalid-argument',
            'Invalid action specified'
          );
      }
    } catch (error) {
      console.error('Error managing FAQ item:', error);
      throw new HttpsError(
        'internal',
        'Error managing FAQ item',
        error
      );
    }
  }
);
