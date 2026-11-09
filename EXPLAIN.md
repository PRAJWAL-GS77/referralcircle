# ReferralCircle Viva Reference Notes

## Phase 1: Server Scaffolding & Google Authentication

- **Architecture & Security**: Initialized Express backend with layered security (`helmet` for headers, `cors` origin-whitelisting, `express-mongo-sanitize` against query injection, and `express-rate-limit` to thwart brute-force attacks).
- **Centralized Error & Validation Pipeline**: Built a reusable Zod schema validation middleware returning consistent `400 VALIDATION_ERROR` payloads and a central error-handling middleware preventing stack trace leaks in production.
- **Google OAuth Verification Flow**: Client sends Google Identity Services `idToken` to `POST /api/auth/google`. Server verifies token signature with `google-auth-library`, extracts claims (`sub`, `email`, `name`, `avatar`), and upserts the `User` document in MongoDB.
- **Stateful JWT Session & Invalidation**: Signs a 7-day JWT containing `userId` and `tokenVersion`. Protected routes verify both the cryptographic signature and that `tokenVersion` matches the DB record, allowing immediate global revocation via `POST /api/auth/logout-all`.
- **Automated Verification**: Implemented 9 unit and integration tests with Vitest and Supertest covering `/health`, Zod input validation, token expiry/format checks, and session invalidation with mocked Google ID token verification.

## Phase 2: Contact Management, Templates, Settings, and Data Isolation

- **Contact & Template Domain Modeling**: Implemented Mongoose models for `Contact`, `Template`, and `Outreach` featuring compound indexes on `(userId, status)`, `(userId, nextEligibleAt)`, and text indexes on `name`, `company`, and `tags`.
- **Strict User Scoping & Privacy Enforcement**: Every database query and mutation strictly includes `userId: req.userId`. Accessing or deleting another user's contact or template intentionally returns `404 NOT_FOUND` (never `403 FORBIDDEN`) to prevent resource enumeration.
- **Dynamic Template Rendering**: Provided `GET /api/templates/:id/render?contactId=` to dynamically inject contact attributes (`{{contactName}}`, `{{company}}`, `{{role}}`) and user signature (`{{myName}}`) into outreach drafts.
- **Dynamic Cooldown Recalculation**: Updating `defaultCooldownDays` in `/api/settings` automatically recalculates `nextEligibleAt` for all contacts in `awaiting_response` status that do not possess a contact-specific override.
- **RFC-Compliant CSV Export**: Built `GET /api/export/contacts.csv` generating escaped CSV output for student backups.
- **Production-Guarded Demo Seeding**: Created `npm run seed` generating 12 realistic contacts across various networking stages and outreach histories, strictly aborting execution when `NODE_ENV=production`.
