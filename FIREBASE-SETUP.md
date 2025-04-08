# Firebase Setup Guide for Namaste Point Card

This guide will walk you through setting up Firebase for the Namaste Point Card application.

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter a project name (e.g., "Namaste Point Card")
4. Configure Google Analytics (optional but recommended)
5. Click "Create project"

## Step 2: Register Your Web App

1. From the project dashboard, click the web icon (</>) to add a web app
2. Give your app a nickname (e.g., "Namaste Point Card Web")
3. Check the "Also set up Firebase Hosting" option if you plan to deploy using Firebase Hosting
4. Click "Register app"
5. Copy the Firebase configuration object (you'll need this for your `.env` file)

## Step 3: Enable Required Firebase Services

### Authentication

1. In the Firebase Console, go to "Authentication" and click "Get started"
2. Enable the following providers:
   - Email/Password
   - Google
   - Apple (if desired)
3. Configure the providers according to your needs

### Firestore Database

1. Go to "Firestore Database" and click "Create database"
2. Choose a starting mode (recommend "Start in production mode" and configure rules later)
3. Select a location for your database (choose a region close to your users in Tokyo)
4. Click "Enable"

### Storage

1. Go to "Storage" and click "Get started"
2. Accept the default rules (you'll modify them later) and click "Next"
3. Select a location (same as your Firestore database) and click "Done"

### Functions

1. Go to "Functions" and click "Get started"
2. If prompted, upgrade your project to the Blaze plan (Firebase Functions requires a pay-as-you-go plan)
3. Install the Firebase CLI on your development machine:
   ```
   npm install -g firebase-tools
   ```
4. Initialize Firebase Functions in your project:
   ```
   firebase login
   firebase init functions
   ```

## Step 4: Set Up Environment Variables

1. Create a `.env` file in the root of your project
2. Add the following variables with values from your Firebase project:

```
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Application Settings
VITE_APP_NAME=Namaste Point Card
VITE_RESTAURANT_LATITUDE=35.6812
VITE_RESTAURANT_LONGITUDE=139.6314
VITE_GEOFENCE_RADIUS=100
```

## Step 5: Deploy Security Rules

### Firestore Rules

1. Create a `firestore.rules` file with the following content:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Check if the user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Check if the requesting user is the owner of the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Check if the user is an admin
    function isAdmin() {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // User profiles
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isAuthenticated() && request.auth.uid == userId;
      allow update: if isOwner(userId) || isAdmin();
    }

    // Rewards available to all users
    match /rewards/{rewardId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // Redemptions
    match /redemptions/{redemptionId} {
      allow read: if isAuthenticated() && (
        request.auth.uid == resource.data.userId || isAdmin()
      );
      allow create: if isAuthenticated() && request.auth.uid == request.resource.data.userId;
      allow update: if isAdmin();
    }

    // Points transactions
    match /points_transactions/{transactionId} {
      allow read: if isAuthenticated() && (
        request.auth.uid == resource.data.userId || isAdmin()
      );
      allow create: if isAuthenticated() && request.auth.uid == request.resource.data.userId;
      allow update, delete: if isAdmin();
    }

    // Online order codes
    match /online_order_codes/{codeId} {
      allow read: if isAdmin();
      allow write: if isAdmin();
    }
  }
}
```

2. Deploy the rules:

```
firebase deploy --only firestore:rules
```

### Storage Rules

1. Create a `storage.rules` file with the following content:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Default deny
    match /{allPaths=**} {
      allow read, write: if false;
    }

    // Public assets like reward images
    match /public/{allImages=**} {
      allow read: if true;
      allow write: if request.auth != null &&
        request.auth.token.role == 'admin';
    }

    // User profile pictures
    match /users/{userId}/{allImages=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Admin-only storage
    match /admin/{allFiles=**} {
      allow read, write: if request.auth != null &&
        request.auth.token.role == 'admin';
    }
  }
}
```

2. Deploy the rules:

```
firebase deploy --only storage:rules
```

## Step 6: Deploy Cloud Functions

1. Navigate to your `functions` directory
2. Deploy the functions:

```
firebase deploy --only functions
```

## Step 7: Initialize Admin User

To create your first admin user:

1. Create a regular user through your app
2. Go to Firestore in the Firebase Console
3. Find the user document in the `users` collection
4. Add the field `role` with the value `admin`

## Step 8: Deploy Web App (Optional)

If you're using Firebase Hosting:

1. Build your application:

```
npm run build
```

2. Deploy to Firebase Hosting:

```
firebase deploy --only hosting
```

## Firebase Emulator for Development

For local development, you can use Firebase Emulators:

1. Install the Firebase CLI if you haven't already:

```
npm install -g firebase-tools
```

2. Initialize emulators:

```
firebase init emulators
```

3. Start the emulators:

```
firebase emulators:start
```

4. Connect your app to the emulators by updating your Firebase configuration file.
