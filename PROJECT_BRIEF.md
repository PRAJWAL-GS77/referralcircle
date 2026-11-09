# PROJECT: ReferralCircle (Professional Referral Organiser)
Students request job referrals but struggle to track conversations and follow up respectfully. This is a PRIVATE contact and outreach tracker with relationship context and response status. Core rule: prevent repeated follow-ups within a user-defined cooldown period.

## Stack (fixed)
- client/: Vite + React (JavaScript), Tailwind CSS, React Router, TanStack Query, axios, react-hot-toast, Recharts (analytics), lucide-react icons.
- server/: Node 22 + Express (REST API), Mongoose, MongoDB Atlas, Zod validation, helmet, cors, express-rate-limit, express-mongo-sanitize, jsonwebtoken, google-auth-library, dotenv, morgan, nodemon.
- Tests: Vitest or Jest + Supertest (server), focused on cooldown logic and auth.
- Deploy: client on Vercel, server on Render, DB on Atlas.
- Structure: monorepo with client/ and server/. Server uses routes -> controllers -> services -> models, plus middleware/ (auth, validate, errorHandler) and utils/.

## Auth (Google sign-in only)
- Frontend uses Google Identity Services to obtain a Google ID token.
- POST /api/auth/google sends the ID token. Server verifies it with google-auth-library, upserts the User, and returns our own JWT (7 days) containing userId and tokenVersion.
- Client stores the JWT and sends it as Authorization: Bearer. auth middleware verifies the JWT and that tokenVersion matches the user's.
- POST /api/auth/logout-all increments user.tokenVersion, invalidating all sessions. Normal logout clears the client token.
- Every query is scoped by userId. A user can never read or modify another user's data (return 404, not 403, for other users' records).

## Data models (Mongoose, timestamps on all)
User: googleId, email, name, avatar, tokenVersion (default 0), settings { defaultCooldownDays (default 7, min 1), maxFollowUps (default 5, fixed rule, min 1) }.
Contact: userId, name (required), company, role, email, linkedinUrl, phone, relationshipType (enum: alumni, former_colleague, professor, friend_referral, cold_contact, other), relationshipStrength (enum: cold, warm, strong), howWeMet (free text), tags [string], notes, status (enum: not_contacted, contacted, awaiting_response, replied, referral_given, declined, no_response; default not_contacted), referralOutcome (enum: none, referral_given, interview, offer; default none), cooldownDays (nullable per-contact override), followUpCount (default 0), lastOutreachAt, lastReplyAt, nextEligibleAt (nullable).
Outreach: userId, contactId, direction (enum: sent, received), kind (enum: initial, followup, reply), channel (enum: email, linkedin, whatsapp, phone, in_person, other), messageSummary (required), messageBody (optional), overrideReason (optional), sentAt (default now, not in the future).
Template: userId, title, kind (initial/followup/thank_you), body with placeholders like {{contactName}}, {{company}}, {{myName}}.
Indexes: Contact (userId, status), (userId, nextEligibleAt), text index on name/company/tags; Outreach (contactId, sentAt).

## THE COOLDOWN RULE (core feature, enforced on the SERVER)
effectiveCooldownDays = contact.cooldownDays ?? user.settings.defaultCooldownDays.
Implement the logic in a pure, unit-tested function in server/src/services/cooldown.service.js. Never put it in a controller or in React only.
POST /api/contacts/:id/outreach (direction=sent):
1. If this is the first ever sent outreach: allowed (kind=initial).
2. Otherwise it is a follow-up. If followUpCount >= maxFollowUps (5): reject with 422 and code MAX_FOLLOWUPS_REACHED. No override possible.
3. If now < nextEligibleAt: reject with 409 and code COOLDOWN_ACTIVE, including nextEligibleAt and daysLeft in the JSON. Unless the body has override=true AND overrideReason (min 10 chars). Then allow it and store overrideReason on the Outreach.
4. On success: followUpCount += 1 for follow-ups, lastOutreachAt = sentAt, nextEligibleAt = sentAt + effectiveCooldownDays, status = awaiting_response.
Logging a received reply (direction=received, kind=reply): set lastReplyAt, status = replied, followUpCount = 0, nextEligibleAt = null (cooldown and count reset).
If cooldown settings change, recompute nextEligibleAt for affected contacts with a clear rule. Use UTC everywhere and show local time in the UI.
"Due for follow-up" = status awaiting_response AND nextEligibleAT <= now AND followUpCount < max.

## API (all under /api, JSON, consistent shape)
Success: { data, meta? }. Error: { error: { code, message, details? } } with correct HTTP codes (400 validation, 401, 404, 409, 422, 429, 500).
Auth: POST /auth/google, GET /auth/me, POST /auth/logout-all.
Settings: GET/PATCH /settings.
Contacts: GET /contacts (search q, filter status/tag/relationshipType/strength/dueOnly, sort, page, limit), POST, GET /:id, PATCH /:id, DELETE /:id (also deletes its outreach).
Outreach: GET /contacts/:id/outreach, POST /contacts/:id/outreach, DELETE /outreach/:id (recompute contact fields).
Templates: full CRUD under /templates, plus GET /templates/:id/render?contactId=.
Dashboard: GET /dashboard (counts by status, due-for-follow-up list, upcoming eligible dates, recent activity).
Analytics: GET /analytics (response rate by channel, status funnel, avg days to reply, referrals/interviews/offers, outreach per week).
Export: GET /export/contacts.csv.
GET /health for deployment.
All input validated with Zod (body, params, query). Central error middleware. No stack traces in production.

## Frontend pages (React, clean/minimal, premium feel)
Login (Google button), Dashboard (stat cards, due-for-follow-up list, analytics charts), Contacts (search, filters, sort, pagination, status badges, "available in X days" chips), Contact Detail (profile, relationship context, outreach timeline, "Log outreach" modal), Add/Edit Contact form, Templates, Settings (default cooldown, logout-everywhere, export CSV, delete account).
UI rules: mobile-first responsive (works from 360px up), clean minimal design with a calm neutral palette plus one accent colour, consistent spacing, rounded cards, subtle transitions, loading skeletons, empty states, toast errors, form validation with inline messages, accessible (labels, focus rings, keyboard nav), dark mode toggle.
Cooldown UX: when a follow-up is blocked, the "Log follow-up" button shows "Available in N days" with the date. An "Override with reason" option opens a confirm dialog requiring a reason. After 5 follow-ups the button is disabled with an explanation.

## Working rules
- Phase by phase. Only do the phase I name. Keep each explanation SHORT (max 8 lines). Building is the priority.
- Be credit-efficient: don't re-read the whole repo, don't rewrite files that work, don't re-explain the brief, don't create extra docs unless asked.
- Beginner-friendly: tell me exactly which terminal command to run (Windows 11 PowerShell), which .env values to fill and where to get them.
- Add brief comments only where the logic is non-obvious (cooldown, auth). Keep a running EXPLAIN.md with 3-6 bullet points per phase for my viva (what was built, why, how data flows).
- After each phase: run the app or tests, fix errors yourself, then give me a 5-item checklist to verify manually. Then stop and wait.
- Never commit secrets. Keep .env.example files updated. Initialise git and make one commit per phase.
