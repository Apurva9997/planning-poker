# Admin Feature Setup Guide

This guide explains how to set up the admin login feature with Google Sign-In and configure admin users.

## Prerequisites

1. Firebase project with Authentication enabled
2. Google Sign-In provider enabled in Firebase Authentication
3. Neon PostgreSQL database

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable "Google" as a sign-in provider
   - Add your domain to authorized domains if needed

### 2. Get Firebase Configuration

1. Go to Project Settings > General
2. Scroll down to "Your apps" section
3. Click on the web app icon (</>) to add a web app
4. Copy the Firebase configuration object

### 3. Set Environment Variables

Add the following environment variables to your Netlify site:

**Frontend (Build-time variables):**
- `VITE_FIREBASE_API_KEY` - Your Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Your Firebase auth domain (e.g., `your-project.firebaseapp.com`)
- `VITE_FIREBASE_PROJECT_ID` - Your Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Your Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Your Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` - Your Firebase app ID

**Backend (Serverless Functions):**
- `FIREBASE_SERVICE_ACCOUNT` - JSON string of your Firebase service account credentials

### 4. Get Firebase Service Account

1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Convert the JSON to a string and set it as `FIREBASE_SERVICE_ACCOUNT` environment variable

**Note:** In production, you can also use Firebase Admin SDK's default credentials if running on Google Cloud.

## Database Setup

The database tables will be created automatically when the API is first called. The following tables are created:

- `admin_users` - Stores admin user information
- `session_history` - Stores planning poker session history

## Adding Admin Users

### Option 1: Via Database (Recommended)

Connect to your Neon PostgreSQL database and run:

```sql
INSERT INTO admin_users (uid, email, display_name)
VALUES ('firebase-user-uid', 'user@example.com', 'Admin Name');
```

To get a user's Firebase UID:
1. Have them sign in via Google on your app
2. Check Firebase Console > Authentication > Users
3. Copy their UID

### Option 2: Via Environment Variable (Future Enhancement)

You can modify the code to read admin UIDs from an environment variable for easier management.

## Testing Admin Login

1. Ensure you've added your Firebase UID to the `admin_users` table
2. Start your development server: `npm run dev`
3. Click "Admin Login" on the homepage
4. Sign in with Google
5. If your UID is in the database, you'll be authenticated as an admin
6. Click "Analytics" to view the analytics dashboard

## Features

### Admin Login
- Optional Google Sign-In for admins only
- Non-admin users cannot sign in (no sign-in option shown)
- Admin status verified via Firebase token and database check

### Session History
- Automatically tracks sessions when admins create rooms
- Stores:
  - Room code
  - Creation and end times
  - Player count
  - Number of rounds

### Analytics Dashboard
- Total sessions
- Total rooms created
- Total players across all sessions
- Average session duration
- Average players per session
- Recent session history

## Security Notes

1. **Firebase Token Verification**: All admin endpoints verify Firebase ID tokens
2. **Database Check**: Even with a valid token, users must be in the `admin_users` table
3. **CORS**: Admin endpoints respect CORS headers
4. **Environment Variables**: Never commit Firebase credentials to version control

## Troubleshooting

### "Unauthorized" error when signing in
- Check that your Firebase UID is in the `admin_users` table
- Verify Firebase service account credentials are correct
- Check browser console for Firebase errors

### Analytics dashboard shows no data
- Ensure you've created rooms while logged in as an admin
- Check that sessions are being created in the `session_history` table
- Verify database connection

### Firebase Admin initialization fails
- Check that `FIREBASE_SERVICE_ACCOUNT` environment variable is set correctly
- Verify the JSON is properly formatted (escaped quotes if needed)
- Check Netlify function logs for detailed error messages

