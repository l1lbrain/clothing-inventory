# Frontend Agent Guidelines

## Scope and Source of Truth

These instructions apply to files under `frontend/`.

The frontend currently uses:

- React 19
- TypeScript
- Vite
- React Router v7
- Redux Toolkit
- React Redux
- CSS Modules
- ESLint
- npm with `package-lock.json`

Treat `package.json`, `package-lock.json`, TypeScript configuration, ESLint configuration, and current source patterns as the source of truth.

## Frontend Structure

Use the existing module organization:

- `src/components`: reusable UI components.
- `src/pages`: route-level or screen-level components.
- `src/features`: domain-specific state and behavior.
- `src/services`: API clients and transport logic.
- `src/store`: Redux store, slices, selectors, and typed hooks.
- Adjacent `*.module.css`: component-specific styles.

Follow the current repository structure when it differs from this summary. Do not create a second competing folder architecture.

## Commands

Run from `frontend/`:

```bash
npm ci
npm run dev
npm run lint
npm run build
npm run preview
```

- `npm ci` installs exactly from the committed lockfile and is appropriate for a clean environment.
- `npm run build` executes TypeScript project compilation before the Vite production build.
- Use `npm install <package>` or `npm uninstall <package>` for intentional dependency changes so both `package.json` and `package-lock.json` are updated.
- Do not manually edit generated lockfile sections.
- Do not switch to Yarn or pnpm unless explicitly requested.

## TypeScript and React Conventions

- Use two-space indentation for TypeScript and CSS.
- React components use `PascalCase`.
- Hooks start with `use`.
- Functions, variables, service functions, Redux logic, and utilities use `camelCase`.
- Follow the existing component style rather than introducing an unrelated pattern.
- Keep components focused; extract reusable logic when it is genuinely shared.
- Avoid `any`; prefer precise types or `unknown` with narrowing.
- Do not use `@ts-ignore` or broad type assertions to hide a real mismatch unless there is no safer integration option and the reason is documented.
- Preserve existing public component props and behavior unless the task requires a breaking change.
- Remove dead imports and unreachable code introduced by the change.

## React Router

- The project uses React Router v7.
- React Router v7 provides its own TypeScript declarations.
- Do not install or restore `@types/react-router-dom`.
- Do not use React Router v5 APIs such as `Switch`, `Redirect`, or `useHistory`.
- Follow the routing style already established in the project.
- Preserve route paths, parameters, navigation state, and protected-route behavior unless the task explicitly changes them.
- Update links, redirects, loaders/actions, and route consumers together when changing a route contract.

## State Management

- Reuse Redux Toolkit and the existing store architecture.
- Keep domain-specific state in the appropriate feature or slice.
- Reuse typed dispatch and selector hooks.
- Do not create a second global state mechanism for data already owned by Redux.
- Keep derived state derived; do not duplicate it unless required for performance or user interaction.
- Preserve loading, success, empty, and error states for asynchronous flows.
- Handle stale requests, duplicate submissions, and race conditions where relevant.
- Avoid storing non-serializable values in Redux unless the current store is explicitly configured for them.

## API Services

- Keep HTTP requests in the existing service layer rather than embedding them directly in presentation components.
- Reuse existing base URLs, authentication headers, token handling, error parsing, and request utilities.
- Treat server responses as untrusted data at the boundary.
- Keep frontend request and response types aligned with backend DTOs.
- Do not silently change JSON field names, enum values, pagination, date formats, error structures, or authentication behavior.
- Handle expected HTTP error states explicitly.
- Do not expose backend credentials or secrets in client-side code.

## Styling

- Keep component-specific CSS Modules beside their components.
- Reuse existing design tokens, variables, spacing, and layout patterns.
- Avoid global styles for a local component concern.
- Do not rename CSS module classes without updating every reference.
- Keep responsive behavior intact.
- Avoid broad visual redesigns unless the task explicitly asks for one.

## Accessibility

When changing UI, preserve or improve:

- Semantic HTML.
- Form labels and accessible names.
- Keyboard navigation.
- Focus visibility and focus movement.
- Button and link semantics.
- Dialog focus management.
- Error association with form fields.
- Alternative text for meaningful images.
- Reduced-motion behavior where applicable.

Do not replace native interactive elements with non-semantic elements without implementing equivalent accessibility behavior.

## Environment Variables and Secrets

- Treat every variable exposed through Vite, including every `VITE_` variable, as public client-side data.
- Never put passwords, JWT signing secrets, private API keys, database credentials, or private tokens in frontend environment variables or source code.
- Use safe example values in documentation.
- Preserve the project’s existing environment-variable naming and access patterns.

## Dependencies

- Prefer existing React, browser, TypeScript, Redux Toolkit, React Router, and CSS capabilities before adding a package.
- Keep dependency changes task-specific.
- Do not upgrade unrelated dependencies as part of a feature or bug fix.
- Do not add duplicate type packages for libraries that already ship their own declarations.
- Explain every newly added production dependency in the final response.
- Verify dependency changes with a clean install when practical.

## Testing and Verification

There is currently no frontend test script configured in `package.json`.

- Do not assume Jest, Vitest, React Testing Library, Cypress, or Playwright is available.
- Do not introduce a frontend test framework unless explicitly requested.
- Run `npm run lint` for frontend changes.
- Run `npm run build` for frontend changes.
- Use `npm run dev` and manually exercise affected flows when automated frontend coverage is unavailable.
- Consult `TESTCASES.md` for documented scenarios.
- For API-related changes, verify both successful and failure states in the UI.
- For UI changes, verify relevant viewport sizes and keyboard interaction.

If lint or build already fails before the task:

- Capture or reproduce the baseline first.
- Compare the post-change failures with the baseline.
- Fix failures introduced by the current change.
- Do not claim unrelated pre-existing failures were introduced by the current task.
- Report what remains failing and why.

## Full-Stack Contract Changes

When backend behavior changes, inspect and update:

- Frontend TypeScript request and response types.
- API service functions.
- Redux actions, thunks, slices, selectors, or feature state.
- Page and component consumers.
- Loading, empty, success, validation-error, authorization-error, and server-error states.
- Routes and navigation when endpoints or identifiers change.
- Relevant scenarios in `TESTCASES.md`.

Do not consider a backend API change complete while the frontend still depends on the old contract.

## Generated and Temporary Files

Do not commit or edit:

- `node_modules/`
- `dist/`
- transient Vite caches
- generated coverage output
- local environment files containing secrets
- temporary build or debug artifacts

Do not add generated output merely because a local command created it.

## Frontend Completion Checklist

Before finishing a frontend task:

- Confirm the correct component, page, feature, service, and store ownership.
- Confirm React Router usage is compatible with v7.
- Confirm request and response types match the backend contract.
- Preserve loading, empty, success, and error behavior.
- Preserve accessibility and responsive behavior.
- Run `npm run lint`.
- Run `npm run build`.
- Manually exercise affected flows when no automated test exists.
- Check that `package-lock.json` changed only when dependency changes were intentional.
- Report pre-existing failures separately from failures introduced by the task.
