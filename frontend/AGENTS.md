# Frontend Agent Guidelines

## Scope and Source of Truth

These rules apply to `frontend/`. The application uses React, TypeScript, Vite, React Router, Redux Toolkit/React Redux, CSS Modules, ESLint, npm, and `package-lock.json`. `package.json`, the lockfile, TypeScript/ESLint configuration, and current source patterns are the source of truth.

## Structure

Follow the existing organization; do not create a competing folder architecture.

- `src/components`: reusable UI components.
- `src/pages`: route-level screens.
- `src/features`: domain-specific behavior and feature components.
- `src/services`: backend API clients and transport logic.
- `src/store`: Redux store, slices, and RTK Query setup.
- `src/constants`: routes, navigation, and shared constants.
- `src/hooks`: reusable UI/state hooks.
- `src/layouts`: shared page layouts.
- `src/types`: shared frontend and backend-contract types.
- `src/utils`: pure utilities and validation helpers.

## TypeScript, React, and Routing

- Use two-space indentation. Components use `PascalCase`; hooks begin with `use`; functions, values, services, Redux logic, and utilities use `camelCase`.
- Prefer precise types or `unknown` with narrowing. Do not use `any`, `@ts-ignore`, or broad assertions to hide a mismatch.
- Preserve public props and behavior unless a breaking change is intentional. Remove imports and unreachable code introduced by the change.
- The router uses `createBrowserRouter`; keep route constants in `src/constants/routes.ts` and update route consumers together. Do not use React Router v5 APIs or add `@types/react-router-dom`.

## State and API Boundaries

- Reuse Redux Toolkit, the existing store, and RTK Query where applicable. The store exports `RootState` and `AppDispatch`; do not assume project-specific typed hooks exist.
- Keep domain state in the appropriate feature or slice. Preserve loading, empty, success, and error states; handle stale requests and duplicate submissions where relevant.
- Backend requests belong in `src/services` and use the shared `apiFetch` transport. Preserve `ApiResponse<T>` and its `data` envelope in sync with backend response DTOs.
- Do not add direct backend fetches to presentation components. For an approved third-party browser API, isolate new calls in a named helper or client and keep public configuration separate from secrets.
- Preserve base URLs, authentication headers, refresh behavior, error parsing, JSON field names, enums, pagination, date formats, and authorization behavior.

## Styling, Accessibility, and Configuration

- `src/index.css` owns global reset, design tokens, and app-wide base styles. Keep local styling in adjacent CSS Modules; do not rename module classes without updating all references.
- Reuse existing tokens, spacing, and responsive patterns. Avoid a broad redesign unless requested.
- Preserve semantic HTML, labels and accessible names, keyboard access, visible focus, dialog focus handling, error association, meaningful-image alt text, and reduced-motion behavior.
- Every `VITE_` value is public. Never put passwords, JWT signing secrets, database credentials, private API keys, or private tokens in frontend code or environment variables.

## Dependencies, Verification, and Completion

- Prefer existing browser, React, TypeScript, Redux Toolkit, React Router, and CSS capabilities before adding a package. Keep dependency changes task-specific and use npm so `package.json` and `package-lock.json` change together.
- Do not edit `node_modules/`, `dist/`, Vite caches, coverage output, local secret files, or temporary artifacts.
- Frontend tests use Vitest with jsdom. Import Vitest APIs directly instead of enabling globals; do not add broader test libraries unless requested.

Run from `frontend/` for frontend changes:

```bash
npm run test
npm run lint
npm run build
```

Manually exercise affected flows when automated coverage is unavailable, including relevant viewport sizes and keyboard interaction for UI changes. If lint or build has a baseline failure, report it separately and fix only failures introduced by the change.

Before finishing, confirm component/page/feature/service/store ownership, route compatibility, backend-contract alignment, accessible/responsive behavior, intentional lockfile changes, and relevant scenarios in `TESTCASES.md`.
