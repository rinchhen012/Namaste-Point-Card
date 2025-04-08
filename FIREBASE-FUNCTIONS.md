# Firebase Functions Setup Guide

This guide explains how to set up and deploy Firebase Functions for the Namaste Point Card application.

## Prerequisites

1. A Firebase project on the Blaze (pay-as-you-go) plan
2. Node.js v16 or later
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
// Test validateOnlineCode function
validateOnlineCode({ code: "NAMASTE-SAMPLE1" }, { auth: { uid: "user123" } });

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
firebase deploy --only functions:validateOnlineCode
```

## Function Details

### Customer-Facing Functions

#### validateOnlineCode

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
    const validateOnlineCode = httpsCallable(functions, "validateOnlineCode");
    const result = await validateOnlineCode({ code });
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
