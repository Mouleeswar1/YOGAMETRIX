# YOGAMETRIX — Expanded Competition Platform Foundation

This package extends the uploaded YOGAMETRIX React/Vite + Express/MongoDB application while preserving the original client UI, branding assets and working starter flows.

## Included in this package

- React/Vite dashboard now includes frontend workflows for asanas, age groups, stages, groups, user management, official assignments, registration review, score scrutiny/correction, approval/publication, marshal controls, certificates, reports/CSV, audit logs and feedback. A public chest-number results and feedback portal is also included.
- Expanded MongoDB models for users, competitions, age groups, stages, groups, participants, participant-to-group membership, registrations, assignments, asanas, scores, results, audit logs, feedback and certificates.
- Public API routes for competition listing, published chest-number result lookup and feedback.
- Admin APIs for user management, competition configuration, age groups, stages, groups, official assignments, registration review, score correction audit, result approval/publication, feedback and audit logs.
- Judge score submission with competition-configurable required judge count and high/low mark exclusion settings.
- Marshal group start/completion and participant postponement endpoints.
- CSV participant report export.
- Certificate record creation and listing (not a branded PDF certificate renderer).
- Frontend integration for the backend routes above, with role-based module visibility and operational forms/actions.
- Published-only scoreboard and public result visibility.

## Important implementation boundary

This is an expanded, runnable development foundation, **not a verified production-equivalent clone of YCSAS**. Some requested areas are not implemented by the current backend and therefore remain outside the working UI:
- Public information pages (Home, About, History, Benefits, Requirements, Manual, Team, Contributors, Well Wishers, Contact, policies).
- Fully separate participant, yoga-centre, volunteer, judge, chief-judge, marshal and display dashboard experiences (the current UI is a shared shell with role-filtered modules).
- Bulk registration, photo/document upload storage, DOB evidence review and automatic age-group allocation.
- Complete participant queue sequencing, postponement/resumption state machine and per-asana progression.
- Full scrutiny sheets, judge sheets, PDF/XLSX exports, ranking/tie-break rules and branded certificate PDF generation.
- Offline-first judge workflow, reconnection reconciliation, alert/buzzer behavior and YouTube streaming integration.
- Automated test suite, deployment hardening, security review and load testing.

These are not represented as complete merely because supporting API models or endpoints exist. Scoring rules and tie-break behavior must be approved by the relevant competition authority before production use.

## Technology

- Node.js 20+
- React 18 + Vite
- Express
- MongoDB + Mongoose
- JWT + bcrypt
- Socket.IO

## Setup

1. Copy `server/.env.example` to `server/.env`.
2. Set `MONGODB_URI`, a long random `JWT_SECRET`, and `CLIENT_ORIGIN`.
3. Install and run the backend:
   ```powershell
   cd server
   npm install
   npm run seed
   npm run dev
   ```
4. In another terminal:
   ```powershell
   cd client
   npm install
   npm run dev
   ```
5. Open `http://localhost:5173`; API defaults to `http://localhost:5000`.

For LAN/mobile access, set `client/.env` to `VITE_API_URL=http://YOUR_COMPUTER_LAN_IP:5000/api` and set `CLIENT_ORIGIN=http://YOUR_COMPUTER_LAN_IP:5173` in `server/.env` (or explicitly allow both localhost and the LAN origin in CORS). Restart both Vite and Express after changing environment files.


## Using the new frontend modules

After signing in, open **Competition Management** in the left sidebar. The available tabs depend on the signed-in role. An administrator can open **Asanas** to add/edit asanas, configure their sequence, maximum marks, optional group, image URL and instructions. The same workspace includes age groups, stages, groups, users, assignments, registration review, score scrutiny, certificates, reports, audit logs and feedback where the account role is permitted.

The public pages do not require login: open `/scoreboard` for the live published scoreboard, `/public-results` for chest-number lookup, or `/public-feedback` to submit feedback.

## Demo accounts

The existing development seed creates demo users. Do not deploy these credentials. Change them immediately and use a unique production secret. Run the seed only against a disposable development database; inspect `server/src/seed.js` before running it against any database containing real data.

## New API groups

- `/api/public/*` (wired to the public results and feedback portal)
- `/api/age-groups`
- `/api/stages`
- `/api/groups`
- `/api/users`
- `/api/registrations`
- `/api/assignments`
- `/api/scores`
- `/api/results`
- `/api/marshal/*`
- `/api/certificates`
- `/api/reports/*`
- `/api/audit-logs`
- `/api/feedback`

All private endpoints require a bearer token. Role restrictions are applied on sensitive operations.

## Before production

1. Verify every scoring rule, including ties, minimum judge count, missing marks, disqualification, deductions and rounding.
2. Add upload storage (S3-compatible or equivalent), file type/size validation and malware scanning.
3. Configure HTTPS, strict CORS, secrets management, database backups and monitoring.
4. Add automated API and browser tests.
5. Complete the remaining UI and reporting work listed above.
