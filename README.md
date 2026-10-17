# Clinic — web client

The browser app for the clinic system: patients, visit history with notes and follow-ups, and the
admin screens for doctors, specializations and the audit log. It talks to the API in the sibling
repository [`ProjectHealth`](https://github.com/sudhakar317/ProjectHealth).

React 19 · TypeScript · Vite · React Router · TanStack Query · React Hook Form + Zod · Tailwind + shadcn/ui

## Getting started

Needs Node 20 and the backend running (see its README).

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`. The dev server proxies `/api`, `/oauth2`, `/login` and `/logout` to
the backend, so the browser only ever talks to one origin and there is no CORS to configure. Point
the proxy elsewhere with `BACKEND_URL`:

```bash
BACKEND_URL=http://10.0.0.5:8080 npm run dev
```

It listens on every interface, so a phone on the same network can open
`http://<this machine's IP>:5173`. See the backend README for the firewall rule and sign-in notes.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm test` | Unit and component tests, once (Vitest + Testing Library) |
| `npm run test:watch` | The same, re-running on change |
| `npm run typecheck` | TypeScript, including the tests |
| `npm run build` | Typecheck, then the production bundle in `dist/` |

## Conventions

**API calls** go through `src/api/` only. `apiFetch` adds the CSRF header and credentials, and turns
every failure into one of three errors: `NetworkError` (never reached the server),
`UnauthorizedError` (signs the user out), or `ApiError` (carries the server's message, field errors
and request id).

**Showing an error** goes through `src/lib/errors.ts`. Use `toastError(error, "delete the visit")`
after a failed action, and `describeError(error, "save the visit").description` for a form's general
error. Field errors from the server are shown beside their field. A server fault shows a reference
id the user can quote, which matches the backend's log line.

**Dates** are calendar days (`yyyy-mm-dd`). Use the helpers in `src/lib/datetime.ts` and never
`toISOString().slice(0, 10)`: that is the UTC date, which in India is yesterday until 05:30.

**Tests** run in the `Asia/Kolkata` time zone on purpose, so date bugs that only appear off UTC are
caught here rather than by a doctor after midnight.

## Deploying

`npm run build` produces static files in `dist/`. Serve them from the **same origin** as the API,
with `/api`, `/oauth2`, `/login` and `/logout` proxied to the backend; the session cookie and CSRF
token depend on it. Route every other path to `index.html` so deep links work.

Each page is its own chunk, loaded the first time it is opened, and libraries are split out so they
stay cached across releases.

## Linting

There is no ESLint yet. `typescript-eslint` supports TypeScript below 6.1 and this project is on
7.0, so it cannot be installed. Until that changes, `tsc` runs in strict mode with unused locals and
parameters as errors, and acts as the lint gate in CI.
