# Setup Instructions

## Firebase Configuration

This project uses Firebase for backend services. To run the project locally, you need to set up environment variables with your Firebase credentials.

### Step 1: Create `.env.local` file

In the root of the project (same level as `package.json`), create a new file called `.env.local`:

```bash
touch .env.local
```

### Step 2: Add Firebase credentials

Open `.env.local` and add the following environment variables:

```
VITE_FIREBASE_API_KEY=AIzaSyADGQECcbCCvLbXL54x9e6yUjMvBZj0COs
VITE_FIREBASE_AUTH_DOMAIN=spaced-invaders.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=spaced-invaders
VITE_FIREBASE_STORAGE_BUCKET=spaced-invaders.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1030601863744
VITE_FIREBASE_APP_ID=1:1030601863744:web:06ab76bccbbafb6a6f25a5
VITE_FIREBASE_MEASUREMENT_ID=G-QT9VSETW5H
```

### Step 3: Verify .env.local is ignored

Your `.gitignore` already includes `.env*` which protects `.env.local` from being accidentally committed to GitHub. Never commit this file.

### Step 4: Run the project

Once `.env.local` is created with the credentials, you can run:

```bash
npm install
npm run dev
```

The Vite dev server will automatically load the environment variables from `.env.local`.

## Security Notes

- **Never commit `.env.local`** to GitHub
- **Never share `.env.local`** publicly
- If the API key is ever exposed, regenerate it immediately in the Firebase Console
- Use `.env.example` as a template for which variables are needed (see the file for reference)

## Troubleshooting

If you see errors like `VITE_FIREBASE_API_KEY is undefined`, make sure:
1. `.env.local` exists in the project root
2. All environment variables are spelled correctly
3. Restart your dev server after creating/updating `.env.local`
