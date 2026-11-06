# YOGAMETRIX — frontend integration handoff

## Frontend work added in this revision

The expanded backend APIs now have corresponding React interfaces in the dashboard:

- **Asana management:** create, list and edit asanas; configure sequence, max marks, group, reference image URL and instructions.
- **Age groups:** create, list, edit and delete competition age bands.
- **Stages:** create, list and edit stages; marshal can update stage status.
- **Groups:** create, list and edit groups; attach stage, age group, marshal and chief judge; allocate participants; start/complete group operations for admin/marshal.
- **Users and officials:** create and edit role-based accounts, activate/deactivate accounts and reset passwords.
- **Official assignments:** assign judges/chief judges/marshals to competition, stage and group; judges can view their own assignments.
- **Participants:** create, list, edit and delete (admin) participant records; capture DOB, gender, contact, verification and registration status; marshal can postpone participants.
- **Registration review:** list registrations and approve/reject as admin or marshal.
- **Judge scoring:** existing score entry and judge submission history remain connected to the backend.
- **Chief Judge scrutiny:** view judge-wise scores and calculated results; authorized users can correct marks with a reason, approve and publish results.
- **Live scoreboard:** existing Socket.IO-backed published scoreboard remains available.
- **Certificates:** create and list certificate records.
- **Reports:** view report totals and download the participant CSV using the authenticated API.
- **Audit and feedback:** view audit history and mark feedback as reviewed.
- **Public portal:** unauthenticated published chest-number result lookup and public feedback submission.
- **Competition settings:** edit/delete competitions and configure dates, status, judge count, mark range, high/low exclusion and approval requirement.

## Backend/UI alignment notes

The frontend calls the routes currently implemented in `server/src/routes/api.js`. UI controls are role-gated to match the API's `allow(...)` restrictions where applicable. The backend remains the authority for permissions and validation.

## Not implemented by the current backend, so not represented as completed UI

- Branded certificate PDF rendering/signing (the API stores certificate records only).
- PDF and Excel exports (the available export endpoint is CSV participant export).
- Participant photo/document upload storage (the current model has URL fields only; no upload endpoint/storage provider).
- Bulk registration, automatic DOB/age-group verification and automatic chest-number allocation.
- Full participant queue/resume state machine and per-asana progression controls.
- Offline-first judge scoring and reconciliation after network loss.
- Public brochure pages such as About, History, Benefits, Manual, Team, Contributors and policies.
- Official scoring-rule validation, tie-break rules and full end-to-end event simulation.

## Verification performed for this revision

- TypeScript's JSX transpiler parsed `App.jsx`, `Management.jsx` and `PublicPortal.jsx` with zero syntax diagnostics.
- Backend JavaScript syntax checks and ZIP integrity checks are run before packaging.
- A full Vite production build and live MongoDB/browser integration test could not be completed in this environment because frontend dependency installation did not finish. Please run `npm install` and `npm run build` locally, then test against a disposable MongoDB database.

## Production caution

Back up the database before migration. Validate judge count, high/low exclusion, approval and rounding with the governing competition rulebook. Replace demo credentials and secrets. Test all roles with separate accounts before client review or live competition use.


## Live scoreboard and authentication follow-up

- The dashboard top bar now includes a visible Logout action; the existing login page and token-backed session remain in place.
- `/scoreboard` is available without signing in and can be opened from the login page. It shows published results only.
- The public scoreboard groups results by participant and asana, shows each active judge's name and mark, identifies the excluded highest/lowest marks, displays each final asana score, and sums published asana scores into a cumulative participant total/rank.
- Judge-wise breakdowns query only `submitted` and `approved` score records. Rejected score records are not displayed.
- A corrected mark recalculates the asana result and returns it to provisional/unpublished state so the corrected result must pass approval and publication again.
- The score total remains the **sum** of marks after configured high/low exclusions, not an average.
