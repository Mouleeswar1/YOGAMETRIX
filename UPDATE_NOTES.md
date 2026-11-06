# YOGAMETRIX update notes

## Included changes

- Added a visible Logout action to the authenticated dashboard top bar.
- Added a public `/scoreboard` page that does not require login.
- Added a Live scoreboard link on the login page.
- The scoreboard groups published results by participant and displays each asana, judge names, judge marks, high/low exclusion labels, final asana score, cumulative total and computed rank.
- Added a public scoreboard API route before authentication middleware. It returns published results only.
- Judge-wise breakdowns include only `submitted` and `approved` score records; rejected records are not shown.
- Corrected judge marks trigger result recalculation and reset the result to provisional/unpublished so it must be approved and published again.
- Preserved the agreed scoring rule: sum the valid marks after excluding the highest and lowest marks.

## Validation

- Node.js syntax checks passed for the backend JavaScript files.
- Babel JSX parsing passed for `App.jsx`, `PublicPortal.jsx` and `Management.jsx`.
- A full Vite production build could not be verified in this environment because the uploaded `node_modules` archive contains Windows Rollup native binaries, while this build environment requires the Linux Rollup binary. Run `npm install` in `client` on your machine, then `npm run build`.

## Environment and security

- The uploaded `server/.env` file was intentionally not included in this ZIP to avoid distributing database credentials or JWT secrets.
- Copy `server/.env.example` to `server/.env` and enter your own `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_ORIGIN`.
- Do not commit `.env` files or use demo credentials in production.
- `node_modules` is omitted. Install dependencies with `npm install` in `server` and `client`.
