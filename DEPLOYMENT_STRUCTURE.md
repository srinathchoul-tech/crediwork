# CrediWork Deployment Structure

This project is already split by folder:

- Frontend (Vite + React): `src/`
- Backend (Firebase Cloud Functions): `functions/src/`

Use this file as the quick map.

## Frontend Files

### App entry and routing
- `src/main.tsx`
- `src/app/App.tsx`
- `src/app/routes.ts`

### Auth and guards
- `src/app/auth/AuthContext.tsx`
- `src/app/lib/auth.ts`
- `src/app/components/auth/RouteGuards.tsx`
- `src/app/pages/AuthPage.tsx`

### Client pages
- `src/app/pages/Dashboard.tsx`
- `src/app/pages/Integrate.tsx`
- `src/app/pages/Reports.tsx`
- `src/app/pages/Notifications.tsx`
- `src/app/pages/Contributions.tsx`
- `src/app/pages/MyProfile.tsx`
- `src/app/pages/NotFound.tsx`

### Admin pages
- `src/app/pages/admin/AdminLeaderboard.tsx`
- `src/app/pages/admin/AdminTeamManagement.tsx`
- `src/app/pages/admin/AdminWorkloadRedistribution.tsx`
- `src/app/pages/admin/AdminAnalyticsReports.tsx`

### Layout and shared UI
- `src/app/components/Layout.tsx`
- `src/app/components/AdminLayout.tsx`
- `src/app/components/ui/*`
- `src/app/components/figma/ImageWithFallback.tsx`

### Frontend data/hooks/types
- `src/app/hooks/useTrackingData.ts`
- `src/app/types/tracking.ts`
- `src/app/lib/firebase.ts`
- `src/app/lib/trackingApi.ts`
- `src/app/lib/cloudFunctions.ts`
- `src/app/lib/scoring.ts`
- `src/app/lib/demoData.ts`

### Frontend styles
- `src/styles/index.css`
- `src/styles/theme.css`
- `src/styles/tailwind.css`
- `src/styles/fonts.css`

## Backend Files (Firebase Functions)

### Cloud Functions source
- `functions/src/index.ts`

### Backend config
- `functions/package.json`
- `functions/tsconfig.json`

## Deployment Config Files

- `firebase.json` (Firebase hosting/functions config)
- `vite.config.ts` (frontend build config)
- `package.json` (root scripts)

## Separate Deploy Commands

### Frontend only (Vercel or static hosting)
1. `npm run build`
2. Deploy `dist/`

### Backend only (Firebase Functions)
1. `npm --prefix functions run build`
2. `firebase deploy --only functions`

### Firebase full deploy (frontend + backend)
1. `npm run build`
2. `firebase deploy --only hosting,functions`

