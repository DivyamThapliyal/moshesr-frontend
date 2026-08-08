# MOHESR — Frontend

React + Vite + Tailwind implementation of the MOHESR certificate-verification
workspace. The architecture is componentised and the previously-broken pieces
(routing, state, real uploads) are fixed.

- **Framework:** React 18, Vite 6, React Router DOM 6
- **Styling:** a token-based CSS system + Tailwind (token-aware)
- **Data/API:** Axios service layer calling the REST API (`/api`)
- **Forms:** React Hook Form + Zod (validation)
- **State:** React Context + per-tab `sessionStorage`/`localStorage` engines

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # serve the production build locally
npm run lint       # ESLint
npm run format     # Prettier
```

The pages render from fixtures and are fully usable on their own. The upload flow
posts to the REST API at `VITE_API_BASE` (default `/api`), which the Vite dev
server proxies (see `vite.config.js`).

Environment: copy `.env.example` → `.env`. Only `VITE_API_BASE` (default `/api`).

---

## Architecture at a glance

```
main.jsx
 └─ <BrowserRouter>
     └─ <ShellProvider>          theme · rail · language · toasts · confirm · shortcuts
         └─ <ViewerProvider>     the shared document viewer's open/close/step state
             └─ <App>            the routes
                 └─ <AppLayout>  the shared shell (rail + top bar + overlays)
                     └─ <Outlet> the current page
```

- **ShellContext** owns everything the chrome does; any component reads it via
  `useShell()`.
- **AppLayout** renders the shell once (`.app-bg`, `.app` grid → `Sidebar` +
  `.stage` → `Topbar` + `.stage__body` with the `<Outlet/>`), plus the floating
  overlays that must survive navigation: `ToastHost`, `ConfirmDialog`,
  `LivePanel`, `Viewer`.
- **Pages** own only what renders inside `.stage__body`, and declare what the top
  bar shows via `useTopbar({ nav, lead })`.

### Routing

| Route | Page |
|---|---|
| `/` | Dashboard (My tasks) |
| `/task/:id` | Task detail |
| `/review/:id` | Certificate review |
| `/new` | New verification |
| `*` | Not found |

Pages are lazy-loaded (`React.lazy`) for code-splitting; the shell stays mounted
across navigations.

---

## The full flow

### 1. Dashboard (`/`)
The board is **rebuilt each render** from immutable data + this session's records
by [`utils/dashboard.js`](src/utils/dashboard.js) → `computeDashboard()`, which
merges authored `TASKS`, tasks created this session (`sessionStorage`), and live
runs, and keeps the tab counts honest. It re-derives every second (`liveTick`) so
a running task's card advances live. Interactions: filter tabs (arrow-key nav),
debounced search, list/grid toggle, the card ⋯ menu (portal-positioned) and
delete-with-confirm.

`New verification` → navigates to a fresh empty task (`/task/t-new-…`).

### 2. Task detail (`/task/:id`)
A five-state machine driven by `state.bodyKind`, in
[`pages/Task.jsx`](src/pages/Task.jsx):

```
new (empty) → uploading → new (list) → checking → pending → done
```

- **Upload** — drag files / folders / ZIPs onto the page; folders are walked and
  ZIPs are read for real contents ([`utils/zipread.js`](src/utils/zipread.js)),
  validated (type / 10 MB / duplicate), then shown.
- **Start verification** — begins a wall-clock **live run** recorded in
  `sessionStorage` (see below), so progress survives navigation. The monitor,
  the found list and the certificate table all read the same records.
- **Results** — three tabs (Needs you · All certificates · Not verified), a
  severity-filtered found list, row preview (the viewer), check-again,
  remove/split/undo, and popovers (sort / notify).

### 3. Certificate review (`/review/:id`)
Three independent panes ([`pages/Review.jsx`](src/pages/Review.jsx)): the queue,
the certificate stage, and the findings panel. Finding **markers are geometry** —
each finding names a region drawn in the certificate's own 595×842 coordinate
space ([`utils/certs.js`](src/utils/certs.js)), so a box lands exactly on the
seal/name/etc. Decisions (Agree / Change / Refuse) are appended to the shared
decision store; keyboard shortcuts `A C S M` + arrows; verdicts flow back to the
task view. Refusing (forged) is gated behind a confirm.

### 4. New verification (`/new`)
Three states (drop zone → named list → list-with-refusals) with folder/ZIP
intake and a suggested-editable, Zod-validated task name
([`pages/NewVerification.jsx`](src/pages/NewVerification.jsx)). **Create** hands
the task to My tasks (session) **and** persists the task + real files via the API
(`POST /api/upload`) so uploads are stored permanently and reopenable, with a
graceful offline fallback.

### Cross-cutting: the live-run panel & decisions
State that must outlive navigation lives in `sessionStorage`, managed by pure
functions in [`utils/storage.js`](src/utils/storage.js):

- **Live runs** (`mohsar.liveTasks`) — a run's progress is derived fresh from
  wall-clock time, so the floating `LivePanel`, the task card and the task page
  always agree. `LivePanel` ticks every second, announces a finished run once
  (toast) and prunes it.
- **Decisions** (`mohsar.decisions`) — append-only history per certificate; a
  recheck that disagrees with the last human decision reopens it (`isSettled`).
- **Task lifecycle** (`mohsar.taskState`), **created tasks** (`mohsar.created`),
  **per-task docs / verified / added-after** id-sets.

### Data flow

```
   fixtures (src/data)
          │  render
          ▼
        Pages  ◀── computeDashboard() / storage engines
          │  ▲
          │  └─ per-tab session/local storage (live runs, decisions, task state)
          │
          └─ services/ (Axios) ──▶  REST API (/api)   [upload persistence]
```

Reads currently render from fixtures + session storage; the upload path is
wired end-to-end through the `services/` layer, which is also ready to take over
the read paths behind loading/error states.

---

## Project structure

```
frontend/
├─ index.html                 mounts #root, loads Inter, sets data-theme
├─ vite.config.js             React plugin + dev proxy for /api and /uploads
├─ tailwind.config.js         token-aware scales; preflight OFF
├─ postcss.config.js          tailwind + autoprefixer
├─ .eslintrc.cjs / .prettierrc.json
├─ .env.example               VITE_API_BASE
└─ src/
   ├─ main.jsx                entry: Router → ShellProvider → ViewerProvider → App
   ├─ App.jsx                 routes (lazy pages under AppLayout)
   │
   ├─ styles/
   │  ├─ index.css            imports the 7 sheets in cascade order + tailwind
   │  └─ tokens/base/layout/atoms/molecules/organisms/responsive.css
   │
   ├─ data/
   │  └─ index.js             fixtures
   │
   ├─ context/
   │  ├─ ShellContext.jsx     theme, rail, language, toasts, confirm, shortcuts, liveTick
   │  └─ ViewerContext.jsx    document viewer open/close/step (isOpen, mode, id)
   │
   ├─ layouts/
   │  └─ AppLayout.jsx        the shared shell + floating overlays
   │
   ├─ hooks/
   │  └─ useTopbar.js         a page declares its nav + top-bar lead
   │
   ├─ components/
   │  ├─ Icon.jsx             Lucide line-icon set
   │  ├─ Sidebar.jsx          the rail (brand, nav, theme, language, account)
   │  ├─ Topbar.jsx           title / breadcrumb lead
   │  ├─ ToastHost.jsx        top-layer toast surface (popover API)
   │  ├─ ConfirmDialog.jsx    one destructive-confirm (<dialog>)
   │  ├─ LivePanel.jsx        floating live-run panel (survives navigation)
   │  ├─ Viewer.jsx           document viewer (drawer / full-screen, paging, swipe)
   │  ├─ AnchoredPopover.jsx  portal popover positioned against a trigger
   │  ├─ PageFallback.jsx     lazy-route loading fallback
   │  └─ dashboard/
   │     ├─ Greeting.jsx      salutation + live date/time + page search
   │     ├─ SummaryStrip.jsx  dismissible queue summary
   │     ├─ Toolbar.jsx       filter tabs + view toggle + New verification
   │     ├─ TaskCard.jsx      one task card
   │     └─ CardMenu.jsx      the card ⋯ menu
   │
   ├─ pages/
   │  ├─ Dashboard.jsx        My tasks
   │  ├─ Task.jsx             task detail (5-state machine)
   │  ├─ Review.jsx           3-pane certificate review
   │  ├─ NewVerification.jsx  upload flow
   │  └─ NotFound.jsx
   │
   ├─ services/
   │  ├─ api.js               axios instance (baseURL, error normalisation)
   │  └─ index.js             typed wrappers: tasks, certificates, upload, reviews
   │
   ├─ utils/
   │  ├─ storage.js           session/local engines (live runs, decisions, task state, docs)
   │  ├─ dashboard.js         computeDashboard() — rebuilds the board + counts
   │  ├─ certs.js             certificate specimen SVG renderer (deterministic)
   │  └─ zipread.js           reads ZIP central directory (names/sizes, no inflate)
   │
   ├─ assets/                 static assets
   └─ types/                  (reserved for shared type defs)
```

---

## Notes

- **State model:** `Task.jsx` and `Review.jsx` use a mutable state ref + a
  force-render to model their imperative controllers; the Dashboard derives its
  view purely each render.
- **Styling:** spacing/colour/size come from the token CSS. Components use
  Tailwind utilities that read the same tokens.
