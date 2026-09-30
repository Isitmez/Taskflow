# TaskFlow Frontend

React and TypeScript web interface for TaskFlow. Connects to the NestJS API and provides workspace, project, task, and comment management in Turkish.

## Run locally

Start the backend in `../Login` first:

```sh
npm run start:dev
```

Then, in this directory:

```sh
npm ci
npm run dev
```

Open **http://localhost:3001**. The default backend URL is **http://localhost:3000**. The backend already permits the `http://localhost:3001` origin. Always open that hostname, not `127.0.0.1`, to match its CORS allowlist.

For a different backend, copy `.env.example` to `.env.local`, set `VITE_API_URL`, and ensure the backend CORS allowlist includes your frontend origin. Vite variables are public; never put secrets in them. Use Node.js 22.12+ or a compatible newer version.

On Windows, use `npm.cmd` if PowerShell blocks the npm script wrapper.

```sh
npm run build
npm run preview
npm test
```

## Features

- Registration, login, profile name editing, logout, and automatic refresh-token rotation.
- Workspace creation, switching, renaming, deletion, and membership management.
- Project creation, editing, archiving, and deletion.
- Board and list views with search, status/priority filters, assigned-to-me filter, and sorting.
- Task creation, editing, assignments, deadlines, statuses, priorities, and deletion.
- Comments with author editing and role-aware deletion.
- Role-aware controls, confirmation dialogs for destructive operations, error/retry states, and responsive layouts.
- All data comes from the API. Empty workspaces and projects display useful onboarding states. The decorative illustration on the login screen is not workspace data.

The demo button only fills the login form. Submit it to sign in with `alice@example.com` / `TaskFlowDemo1!` after running the backend seed. No additional demo data is automatically created.

## Session behavior

Tokens are stored in `sessionStorage` (per tab) and removed when logout succeeds or the server rejects a session. Concurrent requests share one refresh request; a failed network call preserves the session for retry. Server-side role checks remain authoritative. Tokens are accessible to JavaScript. Production deployment should consider secure HttpOnly cookies through a same-origin backend, which requires changes to the authentication API.

Lists fetch all API pages in batches of 100 so boards, filters, and counts do not silently omit records. For very large datasets, replace this with incremental loading or server-side aggregates. Fonts use Google Fonts with system font fallbacks.

## Project structure

- `src/api.ts`: typed API transport, session storage, single-flight refresh, error handling.
- `src/App.tsx`: workspace shell, board/list views, members and settings.
- `src/Auth.tsx`: registration/login screens.
- `src/TaskDialog.tsx`: task editor and comment conversation.
- `src/Forms.tsx`: workspace, project, member, and profile forms.
- `src/components.tsx`: shared accessible dialog and UI elements.
- `src/styles.css`: responsive visual styling.

The backend and frontend are separate repositories. Share both source repositories and follow their setup instructions. A GitHub link alone does not host a running application.
