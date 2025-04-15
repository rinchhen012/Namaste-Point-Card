#!/bin/bash

# Check if web-push is installed
if ! command -v npx &> /dev/null; then
  echo "Error: npx is required but not installed."
  echo "Please install Node.js and npm first."
  exit 1
fi

echo "Generating VAPID keys for web push notifications..."
echo "=================================================="

# Generate VAPID keys using web-push
VAPID_KEYS=$(npx web-push generate-vapid-keys --json)

# Extract public and private keys
PUBLIC_KEY=$(echo $VAPID_KEYS | grep -o '"publicKey":"[^"]*"' | sed 's/"publicKey":"//;s/"//')
PRIVATE_KEY=$(echo $VAPID_KEYS | grep -o '"privateKey":"[^"]*"' | sed 's/"privateKey":"//;s/"//')

if [ -z "$PUBLIC_KEY" ] || [ -z "$PRIVATE_KEY" ]; then
  echo "Error: Failed to generate VAPID keys."
  exit 1
fi

echo "VAPID keys successfully generated!"
echo ""
echo "Public Key: $PUBLIC_KEY"
echo "Private Key: $PRIVATE_KEY"
echo ""

# Check if .env file exists
ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
  # Check if the keys are already in the file
  if grep -q "VITE_VAPID_PUBLIC_KEY" "$ENV_FILE"; then
    # Update existing keys
    sed -i.bak "s|VITE_VAPID_PUBLIC_KEY=.*|VITE_VAPID_PUBLIC_KEY=$PUBLIC_KEY|g" "$ENV_FILE"
    echo "Updated VITE_VAPID_PUBLIC_KEY in $ENV_FILE"
  else
    # Add new keys
    echo "" >> "$ENV_FILE"
    echo "# Push Notification Configuration" >> "$ENV_FILE"
    echo "VITE_VAPID_PUBLIC_KEY=$PUBLIC_KEY" >> "$ENV_FILE"
    echo "Added VITE_VAPID_PUBLIC_KEY to $ENV_FILE"
  fi
  echo ""
  echo "NOTE: Keep your private key secure! It should be configured in your Firebase project."
  echo "You can add this private key in the Firebase Cloud Functions environment variables."
else
  echo "No .env file found. Please create one and add the following:"
  echo ""
  echo "# Push Notification Configuration"
  echo "VITE_VAPID_PUBLIC_KEY=$PUBLIC_KEY"
  echo ""
  echo "NOTE: Keep your private key secure! It should be configured in your Firebase project."
  echo "You can add this private key in the Firebase Cloud Functions environment variables."
fi

# Instructions for Firebase Functions
echo ""
echo "To configure the private key in Firebase Functions, run:"
echo "firebase functions:config:set vapid.private_key=\"$PRIVATE_KEY\""
echo ""
echo "Done! Your push notification environment is now configured."
