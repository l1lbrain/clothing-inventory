# Repository Agent Guidelines

## Scope and Source of Truth

- This file applies to the whole repository. `backend/AGENTS.md` and `frontend/AGENTS.md` add rules for their respective modules; follow the nearest applicable file when rules differ.
- Source code, configuration, lockfiles, tests, `README.md`, and `TESTCASES.md` are the source of truth when they differ from these summaries.
- Consult `README.md` for setup/configuration changes and `TESTCASES.md` when a documented workflow or manual scenario is affected.

## Working Rules

- Read the relevant implementation, configuration, tests, and documentation before editing.
- Keep changes scoped to the request. Preserve established architecture, API contracts, and user-visible behavior unless a change is intentional.
- Do not revert, overwrite, reformat, move, or delete unrelated user work.
- Do not edit generated or dependency output, including `backend/target/`, `frontend/node_modules/`, `frontend/dist/`, coverage output, or generated source.
- Do not commit, push, create branches, rewrite history, alter remotes, or run destructive Git commands unless explicitly requested.
- Review the final diff before finishing.

## Cross-Module Contracts

For an API-contract change, update every affected layer together:

- Backend route, method, DTOs, validation, service/persistence behavior, security, status codes, and error shape.
- Frontend types, services, store/feature logic, consuming UI, and success/error states.
- Relevant automated tests and scenarios in `TESTCASES.md`.

Do not silently change endpoint paths, HTTP methods, JSON field names, enum values, date/number formats, pagination, authentication, status codes, or error structures. Report intentional compatibility changes.

## Security and Dependencies

- Never commit or log passwords, tokens, signing secrets, private keys, production connection values, or sensitive personal data.
- Treat every `VITE_` variable as public client-side configuration; never expose backend secrets through frontend code.
- Do not weaken authentication, authorization, ownership checks, validation, CORS, CSRF, or security filters merely to make a feature work.
- Prefer the existing stack. Keep dependency changes task-specific; preserve `frontend/package-lock.json` and do not manually edit generated lockfile sections.
- Use safe placeholders in tracked configuration and documentation.

## Verification and Documentation

- Run the relevant checks defined by the affected module's `AGENTS.md`; establish a baseline when a relevant check already fails.
- Distinguish pre-existing failures from failures introduced by the change. Report commands actually run and any unverified behavior.
- Update tracked documentation only when setup, configuration, API behavior, user-visible workflows, or documented test procedures change.

## Final Response

- Summarize the behavior changed and important files changed.
- Report verification results, intentional compatibility changes, and remaining risks, manual steps, or unverified behavior.
