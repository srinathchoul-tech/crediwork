<<<<<<< HEAD
# crediwork
A Contribution tracking platform where everyone gets justice
=======

  # CrediWork website generation

  This is a code bundle for CrediWork website generation. The original project is available at https://www.figma.com/design/QFMC9x8kcVL70NTBfhiHqV/CrediWork-website-generation.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  
  ## Firebase setup
  
  1. Copy `.env.example` to `.env`.
  2. Fill `VITE_FIREBASE_*` keys from your Firebase project.
  3. Restart the dev server.
  
  Without these values, the app runs in demo mode using seeded tracking data.
  
  ## Cloud Functions (Phase 2)
  
  1. `npm --prefix functions install`
  2. `npm --prefix functions run build`
  3. Deploy functions: `firebase deploy --only functions`
  
  Implemented callable functions:
  - `syncGithubContributions`
  - `syncGoogleDocsContributions`
  - `recordPeerValidation`
  - `generateTaskPlan` (Gemini-based task generation)

  Set Gemini key before deploy:
  - `firebase functions:secrets:set GEMINI_API_KEY`
  
>>>>>>> 37c8b07 (Initial commit)
