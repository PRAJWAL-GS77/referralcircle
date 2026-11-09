# ReferralCircle Viva Reference Notes & Cheat-Sheet

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

## Phase 6: Production Hardening, Documentation & Deployment Guide
- **Multi-Layered Security Auditing**: Configured production CORS origin verification with comma-separated whitelist support, isolated auth-endpoint rate limiters (20 attempts/15 min), and validated that stack traces never leave the server in production.
- **Complete Technical Specification**: Documented architecture flowcharts, relational database entities, Windows PowerShell installation steps, and API contracts in `README.md`.
- **Cloud Readiness**: Authored step-by-step production deployment instructions for Render (Node API) and Vercel (React Vite SPA) paired with MongoDB Atlas Network Access and Google OAuth Authorized Origins.

---

# 🎓 Viva Cheat-Sheet: Likely Questions & Model Answers

### Q1: Why use JWT with `tokenVersion` instead of traditional session cookies or pure stateless JWTs?
> **Answer**:
> - **Pure Stateless JWTs** have a major security flaw: once issued, they cannot be revoked before expiration without maintaining a heavy distributed blacklist. If a user logs into a public library computer, their token remains valid even if they click logout.
> - **Traditional Session Cookies** require database reads on every single request or sticky sessions that complicate horizontal scaling on serverless/container hosts like Render or Vercel.
> - **Our Hybrid (`tokenVersion`) Solution**: By storing a small integer `tokenVersion` in the user's DB record and embedding it in the JWT payload, verification remains lightweight: we verify the signature, ensure `decoded.tokenVersion === user.tokenVersion`, and can instantly invalidate *every* active session across all devices simultaneously by simply incrementing `tokenVersion` (`$inc: { tokenVersion: 1 }`).

### Q2: Why enforce the Cooldown Rule strictly on the backend rather than in React?
> **Answer**:
> - **Client-side validation is solely for User Experience (UX)**: Any user with basic web knowledge can bypass React frontend checks by sending direct HTTP requests using Postman, curl, or browser DevTools.
> - **Data Integrity & Etiquette Guarantee**: ReferralCircle is built specifically to prevent students from burning bridges with professional alumni. By placing the business logic in `cooldown.service.js` on the server and throwing HTTP `409 COOLDOWN_ACTIVE` and `422 MAX_FOLLOWUPS_REACHED`, no client or script can ever bypass the cooldown period or exceed the 5-follow-up ceiling without the explicit, audited server override.

### Q3: Why is `cooldown.service.js` written as pure functions?
> **Answer**:
> - **Deterministic Testing**: Pure functions depend exclusively on their inputs (`contact`, `userSettings`, `now`) and produce zero side-effects. This allowed us to write 10 rigorous, instantaneous unit tests covering tricky boundaries (exact millisecond boundary, custom overrides vs global defaults, invalid override length, UTC offsets) without spinning up a mock database.
> - **Reusability**: The same pure logic is used both when validating a new incoming outreach request and when replaying historical timelines during event deletions.

### Q4: Why return `404 Not Found` instead of `403 Forbidden` when accessing another user's contact?
> **Answer**:
> - **Defense Against Resource Enumeration (IDOR)**: If an attacker probes `GET /api/contacts/672cb5e634ab9c3491df2801` and receives `403 Forbidden`, the server has confirmed that the contact ID *exists in the database* and belongs to another person.
> - Returning `404 Not Found` treats the resource as if it doesn't exist at all, eliminating information leakage and preventing attackers from mapping out IDs in the system.

### Q5: What database indexes were created in MongoDB and why?
> **Answer**:
> - **`(userId, status)` (Compound Index)**: Speeds up the most frequent query: filtering a user's contacts by pipeline stage (e.g., `Awaiting Response` or `Replied`).
> - **`(userId, nextEligibleAt)` (Compound Index)**: Essential for the Dashboard "Due for Follow-up" query (`status = awaiting_response AND nextEligibleAt <= now`), converting a slow full-collection scan ($O(N)$) into an index seek ($O(\log N)$).
> - **`Text Index (name, company, tags)`**: Powers the search bar, enabling multi-field keyword matching with relevance weights.
> - **Outreach Index `(contactId, sentAt: -1)`**: Ensures the chronological communication timeline loads instantly regardless of how many total outreach records exist in the database.

### Q6: Why use Zod for validation rather than relying on Mongoose schemas alone?
> **Answer**:
> - **Fail-Fast Boundary Validation**: Zod validates incoming request data (body, query parameters, route IDs) *before* it reaches the controller or database layer. If a route ID is not a valid 24-character hexadecimal ObjectId, Zod rejects it immediately at the middleware gate, preventing internal CastErrors.
> - **Detailed Client Feedback**: Zod produces structured, field-specific error messages (`details: [{ field: 'name', message: 'Name cannot be empty' }]`), allowing the frontend to render inline error messages right next to the corresponding form input.

### Q7: How does the Event Sourcing timeline deletion work?
> **Answer**:
> - If a student accidentally logs a follow-up or a reply, simply deleting the row in a relational/document model could leave the parent Contact in an inconsistent state (e.g., status still showing `replied` even though the reply was removed).
> - Instead, our backend uses **timeline replay**: when an outreach record is deleted, `deleteOutreach` loads all remaining chronological outreach events for that contact and runs them through `recomputeContactFromOutreachHistory`. This safely recalculates `lastOutreachAt`, `lastReplyAt`, `followUpCount`, `status`, and `nextEligibleAt` back to their true historical state.
