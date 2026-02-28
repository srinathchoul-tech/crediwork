# Contribution Tracking Integration Roadmap

## Phase 1 (Implemented)
- Firebase-ready frontend data layer with demo fallback.
- Unified tracking types (`members`, `events`, `tasks`, `integrations`).
- Scoring engine and platform share analytics.
- Dashboard, Contributions, Integrate, Reports, Notifications wired to shared tracking data.

## Phase 2 (Implemented)
- Firebase Auth integration:
  - Google provider
  - GitHub provider
- Cloud Functions callable sync endpoints:
  - `syncGithubContributions`
  - `syncGoogleDocsContributions`
  - `recordPeerValidation`
- Firestore event ingestion with idempotent event ids.
- Frontend Connect buttons now perform auth + sync on success.

## Phase 3
- Add ingestion workers/schedulers:
- GitHub: full commit/PR/review timeline (not just merged PR and comments).
- Google Docs/Drive: comments/suggestions API pipeline with document-level attribution.
- Figma: OAuth + file and comment activity ingestion.
- Normalize into `events` collection:
  - `memberId`, `platform`, `type`, `createdAt`, `metadata`.
- Add idempotency using external event ids.

## Phase 4
- Add score recomputation job:
  - Trigger on new `events`.
  - Store weekly snapshot in `score_snapshots/{teamId}/{week}`.
- Add audit logs and admin override for disputed points.

## Firestore Suggested Collections
- `members`
- `events`
- `tasks`
- `integrations`
- `score_snapshots`
- `config/team`
