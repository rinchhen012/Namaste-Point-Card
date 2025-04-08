# Namaste Point Card - Deployment Guide

This guide provides step-by-step instructions for deploying the Namaste Point Card application to production.

## Prerequisites

- Firebase project (Blaze plan)
- Node.js v16 or later
- Firebase CLI (`npm install -g firebase-tools`)
- Git

## Step 1: Clone and Configure

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/namaste-point-card.git
   cd namaste-point-card
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `.env` file with production settings:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_USE_MOCK_AUTH=false
   ```

## Step 2: Firebase Setup

1. Login to Firebase:

   ```bash
   firebase login
   ```

2. Initialize Firebase (if not already done):

   ```bash
   firebase init
   ```

   Select the following services:

   - Firestore
   - Functions
   - Hosting
   - Storage

3. Deploy Firestore security rules:

   ```bash
   firebase deploy --only firestore:rules
   ```

4. Deploy Storage security rules:
   ```bash
   firebase deploy --only storage:rules
   ```

## Step 3: Set Up Firebase Functions

1. Install Functions dependencies:

   ```bash
   cd functions
   npm install
   ```

2. Build Functions:

   ```bash
   npm run build
   ```

3. Deploy Functions:
   ```bash
   firebase deploy --only functions
   ```

## Step 4: Initialize Database

1. Start the Firebase shell:

   ```bash
   firebase functions:shell
   ```

2. Import the seed module and create initial data:

   ```js
   const seed = require("./lib/seed");
   seed.createInitialData();
   ```

3. Create an admin user:
   ```js
   seed.createAdminUser("admin@example.com", "securepassword");
   ```

## Step 5: Deploy Frontend

1. Build the application:

   ```bash
   cd ..  # Back to project root
   npm run build
   ```

2. Deploy to Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```

## Step 6: Configure Authentication

1. Go to the Firebase Console > Authentication > Sign-in method
2. Enable the following providers:
   - Email/Password
   - Google
   - Apple (requires Apple Developer account)

## Step 7: Set Up Domain (Optional)

1. Go to Firebase Console > Hosting > Add custom domain
2. Follow the instructions to connect your domain

## Step 8: Test the Application

1. Visit your Firebase Hosting URL or custom domain
2. Verify that you can:
   - Register a new account
   - Login with existing account
   - Navigate between pages
   - Scan and validate codes
   - Redeem rewards
   - Access admin interface (with admin account)

## Production Considerations

### Environment Variables

For production, make sure to:

1. Set `VITE_USE_MOCK_AUTH=false` in your `.env` file
2. Provide real Firebase credentials

### Firebase Pricing

Remember that using Firebase Functions and some other services requires the Blaze (pay-as-you-go) plan. Monitor your usage to avoid unexpected charges.

### Security

1. Regularly update the application dependencies:

   ```bash
   npm audit
   npm update
   ```

2. Review Firebase security rules periodically
3. Rotate admin credentials regularly

### Monitoring

1. Set up Firebase Alerts for unusual activities
2. Configure Firebase Performance Monitoring
3. Set up Firebase Crashlytics for error tracking

## Updating the Application

To update the application in production:

1. Make your changes and test locally
2. Build the updated application:

   ```bash
   npm run build
   ```

3. Deploy the updates:
   ```bash
   firebase deploy
   ```

For specific components:

- Frontend only: `firebase deploy --only hosting`
- Functions only: `firebase deploy --only functions`
- Security rules: `firebase deploy --only firestore:rules,storage:rules`
