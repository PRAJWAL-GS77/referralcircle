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

## Phase 3: The Cooldown Rule, Outreach Logging, Dashboard, & Analytics

- **Pure Cooldown Engine (`cooldown.service.js`)**: Isolated all rate-limiting and outreach business logic into pure, side-effect-free functions. Enforces contact-level cooldown overrides over user defaults, calculates remaining days, and strictly prevents more than 5 follow-ups (`422 MAX_FOLLOWUPS_REACHED`).
- **Override Mechanism**: When `now < nextEligibleAt`, outreach is blocked (`409 COOLDOWN_ACTIVE`) unless explicitly bypassed with `override: true` and an explanatory reason of at least 10 characters, persisted on the `Outreach` model.
- **Bi-Directional State Synchronization**: Logging a sent message bumps `followUpCount` and schedules `nextEligibleAt`. Logging a received reply immediately clears the cooldown and resets the follow-up counter back to 0.
- **Event Sourcing Deletion Replay**: Deleting an outreach record (`DELETE /api/outreach/:id`) chronologically replays the contact's remaining outreach timeline to safely restore its accurate historical status, counts, and eligibility dates.
- **Operational Dashboard & Funnel Analytics**: Implemented `GET /api/dashboard` (status counts, due-for-follow-up list, upcoming milestones) and `GET /api/analytics` (channel response rates, recruitment funnel conversion, average reply latency in days).
- **Comprehensive Test Suite**: Developed 35 automated tests (10 pure unit tests for cooldown boundaries, UTC edge cases, and overrides + 25 Supertest API tests).

## Phase 4: Frontend Scaffolding, Contacts Management, & Cooldown UX

- **Single-Page Application Stack**: Scaffolded `client/` using Vite, React 18, Tailwind CSS, TanStack Query, React Router, and Axios.
- **Resilient Network Layer**: Implemented Axios request and response interceptors automatically injecting `Authorization: Bearer <token>` and intercepting HTTP 401 to clear stale sessions and redirect to `/login`.
- **Mobile-First Responsive Layout**: Built an accessible, responsive navigation shell supporting a fixed sidebar on desktop and a slide-over mobile drawer supporting viewports from 360px upwards.
- **Deep Cooldown UI/UX Integration**: In `LogOutreachModal.jsx`, follow-up outreach buttons dynamically reflect eligibility:
  - If inside cooldown: displays "Available in N days (Date)" with a toggleable override form requiring >= 10 character explanation.
  - If limit reached: locks interface with an anti-spam warning preventing more than 5 follow-ups.
- **Optimistic State & Cache Management**: Leveraged TanStack Query (`useQuery`, `useMutation`, `invalidateQueries`) to instantly synchronize contact status, follow-up counts, and timeline events upon outreach creations or deletions.
- **Production Build Verification**: Verified clean bundle generation via Vite with loading skeletons, empty states, and toast notifications.

## Phase 5: Dashboard Analytics, Templates System, Settings & Dark Mode

- **Recharts Analytics & Funnel Visualization**: Built `DashboardPage.jsx` visualizing pipeline progress (funnel drop-offs from initial contact to offer), response rate per communication channel, and longitudinal outreach volume using responsive SVGs.
- **Dynamic Template Substitution**: Created `TemplatesPage.jsx` and seamlessly wired template rendering into `LogOutreachModal.jsx`, allowing students to draft standardized messages where server replaces placeholders (`{{contactName}}`, `{{company}}`, `{{role}}`, `{{myName}}`) upon selection.
- **Account Governance & Global Invalidation**: Implemented `SettingsPage.jsx` allowing users to tune default cooldown thresholds, export data to CSV, invalidate all active device sessions via `tokenVersion` increments, and permanently erase all user records via cascading deletion.
- **Tailwind Dark Mode Architecture**: Implemented `ThemeContext.jsx` applying class-based dark styling (`dark:bg-slate-950`, `dark:text-white`) with automated system preference detection and localStorage persistence.
- **Accessibility & Responsive Compliance**: Verified fluid responsive behavior across mobile (360px), tablet (768px), and desktop (1280px), equipped inputs with explicit labels and `aria-label` attributes, and added visible focus rings for keyboard navigation.
