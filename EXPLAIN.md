# ReferralCircle Viva Reference Notes

## Phase 1: Server Scaffolding & Google Authentication

- **Architecture & Security**: Initialized Express backend with layered security (`helmet` for headers, `cors` origin-whitelisting, `express-mongo-sanitize` against query injection, and `express-rate-limit` to thwart brute-force attacks).
- **Centralized Error & Validation Pipeline**: Built a reusable Zod schema validation middleware returning consistent `400 VALIDATION_ERROR` payloads and a central error-handling middleware preventing stack trace leaks in production.
- **Google OAuth Verification Flow**: Client sends Google Identity Services `idToken` to `POST /api/auth/google`. Server verifies token signature with `google-auth-library`, extracts claims (`sub`, `email`, `name`, `avatar`), and upserts the `User` document in MongoDB.
- **Stateful JWT Session & Invalidation**: Signs a 7-day JWT containing `userId` and `tokenVersion`. Protected routes verify both the cryptographic signature and that `tokenVersion` matches the DB record, allowing immediate global revocation via `POST /api/auth/logout-all`.
- **Automated Verification**: Implemented 9 unit and integration tests with Vitest and Supertest covering `/health`, Zod input validation, token expiry/format checks, and session invalidation with mocked Google ID token verification.
