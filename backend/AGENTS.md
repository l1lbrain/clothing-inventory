# Backend Agent Guidelines

## Scope and Source of Truth

These rules apply to `backend/`. The backend uses Java 17 and Spring Boot; `pom.xml`, `application.properties`, security configuration, and existing tests are the source of truth for infrastructure behavior.

- Use the committed Maven wrapper.
- Do not add or restore Spring snapshot repositories or snapshot framework dependencies unless snapshot testing is explicitly requested. This does not restrict the project's own Maven artifact version.
- Inspect affected configuration and tests before changing dependencies, persistence, security, or application behavior.

## Structure and Layers

Production code is under `src/main/java/com/example/backend`; configuration is under `src/main/resources`; tests belong under `src/test/java` and should mirror production packages where practical.

Existing packages include `config`, `controller`, `service`, `repository`, `model`, `dto`, `mapper`, `security`, `exception`, and `util`. Follow current structure rather than creating a competing architecture.

- Controllers handle HTTP parsing/validation and delegate business rules.
- Services own business logic, orchestration, and deliberate transaction boundaries.
- Repositories own persistence operations; avoid unnecessary loading and N+1 queries.
- Use DTOs and existing MapStruct mappers at API boundaries; do not expose JPA entities directly when a DTO pattern exists.

## API, Validation, and Mapping

- The global response envelope is `FormatMessageResponseDto<T>`, applied by `GlobalExceptionHandler`. Treat its JSON shape, status code, and error messages as API-contract behavior.
- Use Jakarta Bean Validation and preserve existing validation/error conventions.
- Keep request and response DTOs separate when their responsibilities differ. Treat JSON names, enum values, nullable fields, and writable fields as contract decisions.
- Reuse MapStruct and Lombok patterns already present. Do not edit generated output under `target/`; update relevant mapper or service tests when mapped fields change.

## Persistence, Security, and Redis

- The project has no declared Flyway or Liquibase dependency. Follow the current schema-management approach; do not introduce a migration framework or destructive schema/data change without an explicit request.
- Prefer backward-compatible schema changes. Document required manual SQL and execution order when schema work cannot be automated.
- Do not disable `spring.jpa.open-in-view` merely to hide a warning. Fetch required data within a service transaction and do not serialize bidirectional entities directly.
- Preserve the current Spring Security and JWT flow, including role, permission, and ownership checks. Inspect existing code before deciding whether OAuth2 Resource Server or Auth0 Java JWT owns token creation or verification.
- Before changing Redis behavior, inspect all readers and writers. Preserve key names, serialization, TTL, invalidation, and session/token-revocation semantics.

## Configuration and Dependencies

- `application.properties` imports extensionless `.env` files as Java Properties for runs from either `backend/` or the repository root. Preserve this mechanism unless configuration loading is the task; do not add a dotenv library for it.
- Treat `.env` files as untracked local configuration. Add required variables to setup documentation with safe placeholders; never place real secrets in tracked configuration, fixtures, logs, or documentation.
- Let the Spring Boot parent manage dependency versions where possible. Keep explicit dependency versions aligned with `pom.xml` and explain any new production dependency.

## Testing and Commands

- Add focused, deterministic tests for changed behavior. Use unit or slice tests when sufficient; use full-context tests when integration is the subject under test.
- Cover relevant success, validation, authorization, not-found, and edge cases. Do not use production services, credentials, or data in tests.

Run from `backend/`:

```powershell
.\mvnw.cmd test
.\mvnw.cmd clean package
```

On macOS/Linux, use `./mvnw test` and `./mvnw clean package`. On Windows, prefer PowerShell and `mvnw.cmd`. Run `clean package` when dependencies, build/application/security configuration, persistence, annotation processing, or packaging changes.

Before finishing, check API compatibility, run relevant tests (normally the full backend suite), and confirm no generated file, secret, or unrelated dependency change entered the diff. Treat startup/test warnings as review signals; do not change behavior solely to hide them.
