# Namaste Point Card - Admin Interface

This document provides information about the admin interface for the Namaste Point Card application.

## Overview

The admin interface allows restaurant staff and administrators to:

- View analytics and stats about the loyalty program
- Create and manage delivery coupons
- Manage rewards and their settings
- View and manage users

## Admin Access

The admin interface uses a simple username/password authentication system that is separate from the main user authentication. This makes it easy for restaurant staff to access the admin features without needing to create Firebase user accounts.

### Default Admin Credentials

```
Username: admin
Password: namaste2024
```

⚠️ **Security Note**: For production, you should change these credentials by updating the `AdminAuthContext.tsx` file.

## Accessing the Admin Interface

1. Navigate to the `/admin/login` path in the application
2. Enter the admin username and password
3. Upon successful authentication, you'll be redirected to the admin dashboard

## Features

### Dashboard

The dashboard provides a quick overview of:

- Total users and active users
- Points issued and redeemed
- Recent activity in the loyalty program

### Coupon Management

The coupon management section allows admins to:

- Create new delivery coupons with custom prefixes
- Set expiration dates for coupons
- Generate single or multiple coupons at once
- View coupon usage status
- Deactivate coupons when needed

### User Management

The user management section allows admins to:

- View all users in the system
- Adjust user points manually

### Rewards Management

The rewards management section allows admins to:

- Create new rewards
- Edit existing rewards
- Set point costs for rewards
- Activate or deactivate rewards

## Development Mode

In development mode, you can use the same admin login credentials mentioned above. The application stores the authentication state in session storage, so you'll remain logged in until you explicitly log out or close the browser.

## Security Considerations

Since we're using a simple username/password approach stored in the client-side code, there are some important security points to consider:

1. **Change Default Credentials**: Before deploying to production, change the default username and password in `src/contexts/AdminAuthContext.tsx`.

2. **Consider Environment Variables**: For better security, you could store the admin credentials as environment variables instead of hardcoding them.

3. **Session Storage**: Admin authentication state is stored in the browser's session storage, which means it will be cleared when the browser is closed.

4. **Backend Validation**: Even though there's client-side authentication, all admin API calls and database operations should also be validated on the server side.

5. **HTTPS Only**: Always ensure your application is served over HTTPS to prevent credential theft during transmission.

## Extending Admin Functionality

If you need to add new admin features:

1. Create a new component in the `src/pages/admin` directory
2. Update the routes in `App.tsx` to include your new component
3. Add a link to your new page in the `AdminLayout.tsx` sidebar

## Customizing Admin Styling

The admin interface uses Tailwind CSS for styling. The primary color for the admin interface is orange (bg-orange-600) to distinguish it from the main application.

To change the admin styling:

1. Update colors in `AdminLayout.tsx` for the header and sidebar
2. Modify button colors in the various admin components

## Architecture

The admin interface is completely separate from the main user-facing application:

- Separate entry point (`src/admin.tsx`) and HTML file (`admin.html`)
- Uses HashRouter for better handling of route refreshes in development
- Dedicated build process that creates a separate deployment artifact
- Enhanced security with admin-only authentication
- No references to admin features in the main app

## Running the Admin Interface

### Development Mode

To install dependencies (only needed once):

```bash
npm install
# Install cross-env for environment variable handling
npm install --save-dev cross-env
```

To run the admin interface in development mode:

```bash
npm run dev:admin
```

This will start the development server and open the admin interface in your browser. The development version uses HashRouter (URLs with #), which prevents issues with page refreshes in development.

### Production Build

To build the admin interface for production:

```bash
npm run build:admin
```

To build both the main app and admin interface:

```bash
npm run build:all
```

## Deployment

When deploying both applications:

1. The main user app will be accessible at the root domain: `https://namaste-point-card.web.app/`
2. The admin interface will be accessible at: `https://namaste-point-card.web.app/admin/` or a completely separate domain for enhanced security

### Deployment Instructions

For Firebase deployment, you can use the following commands:

```bash
# Build both applications
npm run build:all

# Deploy main application
firebase deploy --only hosting:main

# Deploy admin application (if using separate hosting target)
firebase deploy --only hosting:admin
```

## Routing and Page Refreshes

- In development mode, the admin app uses HashRouter to prevent issues with page refreshes.
- This means that URLs will have a hash (#) in them (e.g. `http://localhost:5173/admin.html#/coupons`).
- In production, you can choose to keep the HashRouter or configure server redirects to handle direct URL access.

## Security

The admin interface is protected and only accessible to users with the admin role. Access control is enforced at multiple levels:

1. Authentication-based access control on the client side
2. Firestore security rules on the server side
3. Separation of concerns with dedicated admin endpoints
4. Completely separate bundle for admin code, so users never download admin functionality
