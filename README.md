# Namaste Point Card - Loyalty PWA

A bilingual (Japanese/English) Progressive Web App for loyalty points management for Namaste Indian Restaurant.

## Project Overview

This PWA allows customers to earn loyalty points in two primary ways:

1. **Online:** Scanning unique codes provided with delivery orders via Demaecan, Uber Eats, etc.
2. **In-Store:** Scanning a static QR code during restaurant visits (validated by geolocation).

Points can be redeemed for various rewards applicable to future in-store visits or direct pickup orders.

## Features

- **Bilingual Interface:** Full support for Japanese and English
- **Multiple Authentication Methods:** Email/password, Google, Apple, LINE
- **Point Earning:**
  - QR code scanning for delivery orders
  - Geolocation-verified in-store visits
  - Manual code entry as fallback
- **Rewards & Redemption:**
  - Browse available rewards
  - Redeem points for in-store or direct order rewards
  - Time-limited redemption codes
- **User Profile:**
  - View points balance
  - Track point history
  - Manage language preferences
- **Admin Interface:**
  - User management
  - Reward creation and management
  - Generate unique order codes
  - View statistics and analytics
- **PWA Capabilities:**
  - Installable on iOS/Android home screen
  - Offline support
  - Push notifications
  - Camera access for QR scanning
  - Geolocation for in-store validation

## Technology Stack

- **Frontend:** React, TypeScript, Tailwind CSS
- **Backend:** Firebase (Authentication, Firestore, Cloud Functions, Storage, Hosting)
- **PWA Features:** Service Workers, Web App Manifest
- **Localization:** i18next
- **QR Scanning:** Camera API, qr-scanner
- **Cloud Functions:** Node.js v20, TypeScript

## Project Structure

```
namaste-point-card/
├── public/                  # Static assets
│   ├── icons/               # App icons for PWA
│   ├── manifest.json        # Web App Manifest
│   └── service-worker.js    # Service worker for offline support
├── src/
│   ├── assets/              # Images, fonts, etc.
│   ├── components/          # Reusable UI components
│   │   ├── Layout/          # Layout components (header, navigation)
│   │   └── Scanner/         # QR scanner components
│   ├── contexts/            # React context providers
│   ├── firebase/            # Firebase configuration and services
│   ├── hooks/               # Custom React hooks
│   ├── locales/             # i18n translations
│   │   ├── en/              # English translations
│   │   └── ja/              # Japanese translations
│   ├── pages/               # Main app screens
│   │   ├── admin/           # Admin interface pages
│   │   └── ...              # User-facing pages
│   ├── services/            # API and business logic
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   ├── App.tsx              # Main app component with routing
│   └── main.tsx             # Application entry point
├── firestore.rules          # Firestore security rules
├── storage.rules            # Firebase Storage security rules
├── functions/               # Firebase Cloud Functions
│   ├── src/                 # TypeScript source files
│   │   ├── index.ts         # Main functions entry point
│   │   └── seed.ts          # Database seeding utility
│   ├── package.json         # Functions dependencies
│   └── tsconfig.json        # TypeScript configuration
├── firebase.json            # Firebase configuration
├── FIREBASE-FUNCTIONS.md    # Firebase Functions documentation
├── README-ADMIN.md          # Admin interface documentation
├── DEPLOY-GUIDE.md          # Deployment guide
└── ...
```

## Getting Started

### Prerequisites

- Node.js (v20 or later)
- npm or yarn
- Firebase project with:
  - Authentication enabled (email/password, Google, Apple)
  - Firestore database
  - Cloud Functions (Blaze plan required)
  - Firebase Hosting
  - Firebase Storage

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/namaste-point-card.git
   cd namaste-point-card
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create `.env` file (based on `.env.example`):
   ```
   cp .env.example .env
   ```
4. Fill in your Firebase configuration in the `.env` file

5. Start the development server:
   ```
   npm run dev
   ```

### Firebase Setup

1. Update Firestore security rules:

   ```
   firebase deploy --only firestore:rules
   ```

2. Deploy Cloud Functions:

   ```
   cd functions
   npm install
   npm run build
   firebase deploy --only functions
   ```

3. Deploy to Firebase Hosting:
   ```
   npm run build
   firebase deploy --only hosting
   ```

For detailed instructions on setting up and working with Firebase Functions, see [FIREBASE-FUNCTIONS.md](FIREBASE-FUNCTIONS.md).

For information about the admin interface, see [README-ADMIN.md](README-ADMIN.md).

For production deployment instructions, see [DEPLOY-GUIDE.md](DEPLOY-GUIDE.md).

## Cloud Functions

This application uses Firebase Cloud Functions for several key features:

1. **validateOnlineOrderCode**: Validates online order codes and awards points
2. **checkInAtStore**: Verifies user location for in-store visits
3. **generateOnlineOrderCodes**: Admin function to create new order codes
4. **getAdminStats**: Provides statistics for the admin dashboard

## Data Model

### Firestore Collections

- **users**: User profiles and point balances
- **online_order_codes**: Delivery order codes for validation
- **rewards**: Available rewards and their details
- **redemptions**: Records of redeemed rewards
- **points_transactions**: History of point transactions
- **admin_activity**: Logs of administrative actions

## License

[MIT License](LICENSE)

## Restaurant Information

- **Name:** ナマステ成増店 (Namaste Narimasu)
- **Address:** 〒 175-0094, 東京都, 板橋区, 成増２丁目 5-3, グリーンビル 102
- **Phone:** 03-6684-8269
- **Website:** www.namastenarimasu.com
- **Delivery Partners:** Demaecan, Uber Eats, Menu, Wolt
