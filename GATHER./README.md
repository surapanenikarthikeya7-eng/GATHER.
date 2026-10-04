# GATHER.

GATHER. currently opens on its premium, responsive login page. Email/password and Google sign-in use Firebase Authentication; the browser does not send or persist passwords outside Firebase.

## Configure Firebase

1. Create a Firebase web app and enable **Email/Password** and **Google** under Authentication providers.
2. Copy `client/.env.example` to `client/.env.local` and enter the web app configuration values from Firebase:

   ```text
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   ```

3. Add `localhost` to the authorized domains in Firebase Authentication. Set `VITE_GATHER_HOME_URL` when the future GATHER. home page is available.

Firebase returns the signed-in user's UID, name, email address, and profile photo. The React authentication context exposes that identity and a Firebase sign-out function. The sign-in view remains on the page after authentication until a home URL is configured.

## Run locally

From the project root:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. Build the client with `npm run build`.

The existing recipe API stores its application data in the local SQLite file under `database/`. Its protected routes validate Firebase ID tokens using Firebase Admin Application Default Credentials. No database login is needed for the GATHER. login page.
