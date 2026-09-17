This folder is intentionally empty.

The source under frontend/src/ was changed (login screen + token-based
auth added), so the previously-committed bundle.js here is now out of
date and has been removed rather than shipped stale — it did not have
the login screen at all.

Before running or deploying the frontend, generate a fresh build:

    cd frontend
    npm install
    npm run build

That regenerates dist/bundle.js and dist/bundle.css from the current
source. index.html in this folder is already in place (hand-written,
not generated) and points at http://localhost:4000/api by default —
edit that one line for production, as described in DEPLOYMENT.md.
