# Firebase Functions Setup Guide

This guide explains how to set up and deploy Firebase Functions for the Namaste Point Card application.

## Prerequisites

1. A Firebase project on the Blaze (pay-as-you-go) plan
2. Node.js v20 or later
3. Firebase CLI installed: `npm install -g firebase-tools`

## Local Development Setup

1. Log in to Firebase:

   ```bash
   firebase login
   ```

2. Install dependencies:

   ```bash
   cd functions
   npm install
   ```

3. Start the TypeScript compiler in watch mode:

   ```bash
   npm run build:watch
   ```

4. In a separate terminal, start the Firebase emulators:
   ```bash
   firebase emulators:start
   ```

## Testing Functions Locally

You can test the functions using the Firebase shell:

```bash
firebase functions:shell
```

Example function calls:

```js
// Test validateOnlineOrderCode function
validateOnlineOrderCode(
  { code: "NAMASTE-SAMPLE1" },
  { auth: { uid: "user123" } }
);

// Test checkInAtStore function
checkInAtStore(
  { latitude: 35.6812, longitude: 139.6314 },
  { auth: { uid: "user123" } }
);

// Test admin functions (need admin user)
generateOnlineOrderCodes(
  { count: 5, prefix: "TEST" },
  { auth: { uid: "adminUserId" } }
);
```

## Initializing Your Database

This project includes a seed script to create initial data. To use it:

1. Start the Firebase shell:

```bash
firebase functions:shell
```

2. Import the seed module and call the seed function:

```js
const seed = require("./lib/seed");
seed.createInitialData();
```

3. Create an admin user:

```js
seed.createAdminUser("admin@example.com", "securepassword");
```

## Deploying Functions

To deploy all functions:

```bash
firebase deploy --only functions
```

To deploy a specific function:

```bash
firebase deploy --only functions:validateOnlineOrderCode
```

## Function Details

### Customer-Facing Functions

#### validateOnlineOrderCode

This function validates an online order code and awards points to the user.

- **Trigger**: HTTPS Callable
- **Authentication**: Required
- **Parameters**:
  - `code` (string): The online order code to validate
- **Returns**:
  - `{ success: boolean, message: string, points?: number }`

#### checkInAtStore

This function validates a user's geolocation for in-store check-in and awards points.

- **Trigger**: HTTPS Callable
- **Authentication**: Required
- **Parameters**:
  - `latitude` (number): User's current latitude
  - `longitude` (number): User's current longitude
- **Returns**:
  - `{ success: boolean, message: string, distance?: number }`

### Admin Functions

#### generateOnlineOrderCodes

This admin-only function generates unique online order codes.

- **Trigger**: HTTPS Callable
- **Authentication**: Required (Admin only)
- **Parameters**:
  - `count` (number): Number of codes to generate (default: 1, max: 100)
  - `prefix` (string): Prefix for the codes (default: 'NAMASTE')
  - `pointsAwarded` (number): Points awarded for each code (default: 5)
  - `expiryDays` (number): Number of days until the codes expire (default: 7)
- **Returns**:
  - `{ success: boolean, message: string, codes?: string[] }`

#### getAdminStats

This admin-only function retrieves dashboard statistics.

- **Trigger**: HTTPS Callable
- **Authentication**: Required (Admin only)
- **Parameters**: (none)
- **Returns**:
  - `{ success: boolean, totalUsers: number, activeUsers: number, totalPoints: number, totalRedemptions: number }`

## Usage in the Application

### From the User App

```typescript
import { getFunctions, httpsCallable } from "firebase/functions";
import { functions } from "./firebase/config";

// Validate an online order code
const validateCode = async (code: string) => {
  try {
    const validateOnlineOrderCode = httpsCallable(
      functions,
      "validateOnlineOrderCode"
    );
    const result = await validateOnlineOrderCode({ code });
    const data = result.data as {
      success: boolean;
      message: string;
      points?: number;
    };
    return data;
  } catch (error) {
    console.error("Error validating code:", error);
    throw error;
  }
};

// Check in at the store
const checkIn = async (latitude: number, longitude: number) => {
  try {
    const checkInAtStore = httpsCallable(functions, "checkInAtStore");
    const result = await checkInAtStore({ latitude, longitude });
    const data = result.data as { success: boolean; message: string };
    return data;
  } catch (error) {
    console.error("Error checking in:", error);
    throw error;
  }
};
```

### From the Admin App

```typescript
import { getFunctions, httpsCallable } from "firebase/functions";
import { functions } from "./firebase/config";

// Generate online order codes
const generateCodes = async (
  count: number,
  prefix: string,
  points: number,
  expiryDays: number
) => {
  try {
    const generateOnlineOrderCodes = httpsCallable(
      functions,
      "generateOnlineOrderCodes"
    );
    const result = await generateOnlineOrderCodes({
      count,
      prefix,
      pointsAwarded: points,
      expiryDays,
    });
    const data = result.data as {
      success: boolean;
      message: string;
      codes?: string[];
    };
    return data;
  } catch (error) {
    console.error("Error generating codes:", error);
    throw error;
  }
};

// Get admin dashboard stats
const getStats = async () => {
  try {
    const getAdminStats = httpsCallable(functions, "getAdminStats");
    const result = await getAdminStats();
    const data = result.data as {
      success: boolean;
      totalUsers: number;
      activeUsers: number;
      totalPoints: number;
      totalRedemptions: number;
    };
    return data;
  } catch (error) {
    console.error("Error getting stats:", error);
    throw error;
  }
};
```

## Monitoring and Logs

You can view function logs and monitor performance in the Firebase Console:

1. Go to Functions in the Firebase Console
2. Click on a function name to view its logs
3. Use the "Logs" tab to see the function's execution logs
4. Use the "Usage" tab to monitor function performance and cost

# Server-Side Code Generation Implementation

This document outlines the steps to move coupon code generation from client-side to server-side using Firebase Cloud Functions.

## What we've done so far

1. Created a new Cloud Function called `createDeliveryCoupons` that securely generates coupon codes
2. Updated the client-side `createCoupon` function to call this Cloud Function
3. Removed client-side code generation from the `AdminCoupons.tsx` component

## Deployment Steps

Due to version compatibility issues between Firebase Functions v1 and v2 in the current implementation, here's how to properly deploy the function:

1. **Fix TypeScript Configuration**: Since migrating all functions to v2 would be a larger task, for now you can temporarily disable TypeScript checking during deploy:

   ```bash
   cd functions
   firebase deploy --only functions:createDeliveryCoupons --force
   ```

2. **Alternative Approach**: If the above doesn't work, you may need to revert the functions to using v1 syntax:

   ```typescript
   // Change this:
   export const createDeliveryCoupons = onCall(
     async (request: CallableRequest<CreateDeliveryCouponsData>) => {

   // To this:
   export const createDeliveryCoupons = functions.https.onCall(
     async (data: CreateDeliveryCouponsData, context: CallableContext) => {
       // And change all occurrences of request.data to data
       // And all occurrences of request.auth to context.auth
   ```

## Security Benefits

Moving code generation to the server-side provides several security benefits:

1. **Reduced Attack Surface**: The client no longer contains cryptographic code or security-sensitive logic.
2. **Stronger Entropy**: Server-side code can use more robust random number generation.
3. **Prevention of Code Manipulation**: Users cannot modify the code generation logic to create predictable or duplicate codes.
4. **Consistent Implementation**: Code generation logic is maintained in a single place.
5. **Access Control**: Authentication and authorization checks are performed server-side.

## Future Improvements

For a more comprehensive security approach:

1. **Rate Limiting**: Add rate limiting to prevent abuse of the function.
2. **Logging**: Implement detailed logging for all code generation events.
3. **Complete Migration**: Consider migrating all Firebase Functions to v2 syntax for consistency.
4. **Code Validation**: Implement additional validation checks for generated codes.

## Testing

To verify the function is working correctly:

1. Generate a batch of codes from the admin interface
2. Check in Firebase Console that the codes were created in the Firestore database
3. Verify that the codes have the expected format and include the checksum
4. Test code redemption flow to ensure codes are valid

# Firebase Functions Migration Guide: v1 to v2

## Migration Status

✅ **Completed:**

- The `createDeliveryCoupons` function is fully migrated and deployed as a v2 function
- All functions have been rewritten in v2 syntax in the codebase

🚧 **Pending:**

- The existing v1 functions need to be properly migrated to v2 following the Firebase guidelines

## Migration Steps for Existing Functions

Firebase doesn't support direct in-place upgrades from v1 to v2 functions. Instead, you need to follow these steps to properly migrate the remaining functions:

### 1. Deploy v2 Functions with New Names

First, deploy your v2 functions with temporary new names:

```typescript
// Original v1 function
export const validateOnlineOrderCode = functions.https.onCall(...);

// Temporary v2 function with a new name
export const validateOnlineOrderCodeV2 = onCall(...);
```

### 2. Update Client Code

Update your client code to use the new v2 functions:

```typescript
// In your client code, change from:
const validateCode = httpsCallable(functions, "validateOnlineOrderCode");

// To:
const validateCode = httpsCallable(functions, "validateOnlineOrderCodeV2");
```

### 3. Delete v1 Functions

Once you've verified the v2 functions are working properly, delete the v1 functions:

```bash
firebase functions:delete validateOnlineOrderCode validateQRCheckIn generateOnlineOrderCodes getAdminStats addAdminRole
```

### 4. Rename v2 Functions

Finally, rename the v2 functions back to their original names:

```typescript
// Change from temporary name
export const validateOnlineOrderCodeV2 = onCall(...);

// Back to original name
export const validateOnlineOrderCode = onCall(...);
```

And redeploy.

## Recommended Migration Order

1. `createInitialAdmin` (HTTP function)
2. `addAdminRole` (Callable function)
3. `getAdminStats` (Callable function)
4. `generateOnlineOrderCodes` (Callable function)
5. `validateQRCheckIn` (Callable function)
6. `validateOnlineOrderCode` (Callable function)

## Benefits of v2 Functions

- **Better Performance**: Faster cold starts and scaling
- **Improved Security**: Enhanced authentication and authorization
- **Cost Efficiency**: More flexible billing and better control
- **TypeScript Support**: Better type safety with modern syntax
- **Environment Variables**: Direct support for .env files

## Configuration Changes

The v2 migration included several important changes:

1. **Environment Variables**:

   - Added dotenv package
   - Created .env file for secure configuration
   - Updated .gitignore to protect sensitive data

2. **Error Handling**:

   - Updated to use new HttpsError

3. **Request Handling**:
   - Updated to use CallableRequest pattern

## Deployment Verification

After each function migration, verify it works properly:

```bash
# Test the function
firebase functions:shell
> myFunction({param: 'value'})

# Check logs
firebase functions:log --only myFunction
```
