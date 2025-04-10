# Namaste Point Card - Firebase Functions

This directory contains the Firebase Cloud Functions for the Namaste Point Card application.

## Functions Overview

### User Functions

- **validateOnlineOrderCode** - Validates an online order code and awards points to the user
- **checkInAtStore** - Validates a user's geolocation for in-store check-in and awards points

### Admin Functions

- **generateOnlineOrderCodes** - Generates unique online order codes with specified prefix and points
- **getAdminStats** - Retrieves dashboard statistics for admin interface

## Setup and Deployment

### Prerequisites

- Node.js 20.x
- Firebase CLI: `npm install -g firebase-tools`
- Firebase project with Blaze plan (required for Cloud Functions)

### Local Development

1. Install dependencies:

```bash
cd functions
npm install
```

2. Build and watch for changes:

```bash
npm run build:watch
```

3. Run Firebase emulators:

```bash
firebase emulators:start
```

### Testing Functions Locally

You can test the functions using the Firebase shell:

```bash
firebase functions:shell
```

Then call the functions:

```js
validateOnlineOrderCode(
  { code: "NAMASTE-SAMPLE1" },
  { auth: { uid: "user123" } }
);
```

### Seeding Initial Data

This project includes a seed script to create initial data. To use it:

1. Start the Firebase shell:

```bash
firebase functions:shell
```

2. Call the seed function:

```js
const seed = require("./lib/seed");
seed.createInitialData();
```

To create an admin user:

```js
seed.createAdminUser("admin@example.com", "securepassword");
```

### Deployment

To deploy all functions:

```bash
firebase deploy --only functions
```

To deploy a specific function:

```bash
firebase deploy --only functions:validateOnlineOrderCode
```

## Function Details

### validateOnlineOrderCode

Cloud callable function that validates an online order code and awards points to the user.

**Parameters:**

- `code` (string): The online order code to validate

**Returns:**

- `{ success: boolean, message: string, points?: number }`

### checkInAtStore

Cloud callable function that validates a user's geolocation for in-store check-in.

**Parameters:**

- `latitude` (number): User's current latitude
- `longitude` (number): User's current longitude

**Returns:**

- `{ success: boolean, message: string, distance?: number }`

### generateOnlineOrderCodes

Admin-only Cloud callable function that generates unique online order codes.

**Parameters:**

- `count` (number): Number of codes to generate (default: 1, max: 100)
- `prefix` (string): Prefix for the codes (default: 'NAMASTE')
- `pointsAwarded` (number): Points awarded for each code (default: 5)
- `expiryDays` (number): Number of days until the codes expire (default: 7)

**Returns:**

- `{ success: boolean, message: string, codes?: string[] }`

### getAdminStats

Admin-only Cloud callable function that retrieves dashboard statistics.

**Parameters:** (none)

**Returns:**

- `{ success: boolean, totalUsers: number, activeUsers: number, totalPoints: number, totalRedemptions: number }`

## Security

All functions include authentication checks. Admin functions additionally verify that the user has the admin role before processing requests.
