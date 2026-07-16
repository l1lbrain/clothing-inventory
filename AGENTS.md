# Repository Agent Guidelines

## Instruction Scope

- This file applies to the entire repository.
- `backend/AGENTS.md` adds backend-specific instructions for files under `backend/`.
- `frontend/AGENTS.md` adds frontend-specific instructions for files under `frontend/`.
- Follow the nearest applicable `AGENTS.md` when instructions differ.
- Treat the current source code, configuration, lockfiles, and tests as the source of truth when they differ from this summary.

## Working Principles

- Read the relevant implementation, configuration, tests, and documentation before editing.
- Keep changes narrowly scoped to the requested task.
- Preserve existing architecture, naming, API contracts, and user-visible behavior unless the task explicitly requires a change.
- Do not revert, overwrite, delete, or reformat unrelated user changes.
- Avoid repository-wide formatting, broad refactors, mass renames, and file moves unless they are necessary for the task.
- Do not edit generated output or dependency directories, including `backend/target/`, `frontend/dist/`, `frontend/node_modules/`, coverage output, or generated source files.
- Do not add dependencies when the existing stack can reasonably solve the problem.
- Do not upgrade unrelated dependencies as part of a feature or bug fix.
- Do not commit, push, create branches, rewrite history, or alter remotes unless explicitly requested.
- Never use destructive Git commands such as `git reset --hard`, `git clean -fd`, or forced checkout unless explicitly requested.
- Review the final diff before finishing.

## Repository Structure

This repository contains two applications:

- `backend/`: Java 17 Spring Boot API using Maven.
- `frontend/`: React 19 and TypeScript application built with Vite.
- `README.md`: setup and project documentation.
- `TESTCASES.md`: documented manual and functional scenarios.
- `ISSUES.md`: known issues and planned work.

Consult root documentation when a task affects setup, behavior described by a scenario, known limitations, configuration, or developer workflow.

## Cross-Module Changes

For changes that affect the API contract, inspect and update all relevant layers together:

- Backend route and HTTP method.
- Request and response DTOs.
- Validation rules.
- Service and persistence behavior.
- Authentication and authorization requirements.
- HTTP status codes and error response shapes.
- Frontend TypeScript models.
- Frontend API services.
- Redux state and feature logic.
- Consuming pages and components.
- Relevant automated tests.
- Relevant scenarios in `TESTCASES.md`.

Do not silently change endpoint paths, HTTP methods, JSON field names, enum values, date or number formats, pagination behavior, authentication requirements, status codes, or error structures.

Call out intentional compatibility changes in the final response.

## Shared Security Rules

- Never commit passwords, JWT secrets, API keys, access tokens, private keys, session secrets, or production connection values.
- Do not expose backend secrets through frontend source code.
- Treat every `VITE_` variable as public client-side configuration, not as a secret.
- Do not weaken authentication, authorization, ownership checks, validation, CORS, CSRF, or security filters merely to make a feature work.
- Use safe placeholders in example configuration and documentation.
- Do not log credentials, raw tokens, or sensitive personal data.

## Dependency and Lockfile Rules

- Use Maven only through the wrapper committed under `backend/`.
- Use npm for the frontend and preserve `frontend/package-lock.json`.
- Do not switch package managers or build systems unless explicitly requested.
- When intentionally adding or updating an npm dependency, update both `package.json` and `package-lock.json`.
- Do not manually edit generated lockfile sections.
- Explain newly added production dependencies in the final response.

## Verification Strategy

Run the smallest relevant checks during development, then the full required checks before finishing.

### Backend

On Windows, prefer PowerShell and the Windows wrapper:

```powershell
cd backend
.\mvnw.cmd test
```

On macOS/Linux:

```bash
cd backend
./mvnw test
```

Use `clean package` when the task affects dependencies, build configuration, application configuration, security configuration, persistence behavior, annotation processing, or packaging.

A Git Bash failure while downloading the Maven distribution is an environment or wrapper-download failure, not a test failure. On Windows, retry with PowerShell and `mvnw.cmd`.

### Frontend

From `frontend/`:

```bash
npm run lint
npm run build
```

`npm run build` performs TypeScript project compilation before the Vite production build.

### Existing Failures

- Establish a baseline before editing when the relevant verification command already fails.
- Distinguish pre-existing failures from failures introduced by the current change.
- Do not claim a command passed unless it was actually executed successfully.
- Do not claim the current change caused an existing failure without evidence.
- If a command cannot be run, report the exact command, the reason, and what remains unverified.

## Documentation Expectations

Update documentation when the task changes:

- Required environment variables.
- Local setup.
- API behavior.
- User-visible workflows.
- Manual test procedures.
- Known limitations or resolved issues.

Do not update documentation speculatively when behavior has not changed.

## Final Response Requirements

In the final response:

- Summarize the behavior changed.
- List the important files changed.
- Report verification commands and their outcomes.
- Mention compatibility changes.
- Mention remaining risks, manual steps, pre-existing failures, or unverified behavior.
- Keep the report factual and do not claim work that was not performed.
