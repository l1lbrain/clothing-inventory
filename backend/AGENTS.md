# Backend Agent Guidelines

## Scope and Source of Truth

These instructions apply to files under `backend/`.

- The backend uses Java 17 and Spring Boot.
- The current Spring Boot parent declared in `pom.xml` is the source of truth and is currently a stable `3.5.15` release.
- Do not reintroduce `-SNAPSHOT` versions or Spring snapshot repositories unless the task explicitly requires snapshot testing.
- Use the Maven wrapper committed in this module.
- Inspect `pom.xml`, `application.properties`, security configuration, and existing tests before changing infrastructure behavior.

## Backend Structure

Production code is under:

```text
backend/src/main/java/com/example/backend
```

The project uses packages such as:

- `controller`
- `service`
- `repository`
- `model`
- `dto`
- `mapper`
- `security`

Configuration is under:

```text
backend/src/main/resources
```

Tests belong under:

```text
backend/src/test/java
```

Mirror production package structure in tests. Follow the current repository structure if packages have evolved.

## Current Backend Stack

Reuse the existing stack before adding overlapping libraries:

- Spring Web
- Spring Data JPA
- Spring Security
- Spring OAuth2 Resource Server
- MySQL Connector/J
- Spring Data Redis
- Jakarta Bean Validation
- Auth0 Java JWT
- Lombok
- MapStruct
- JUnit 5 and Spring Boot Test
- Spring Security Test

Do not replace an existing framework mechanism with another library without a task-specific reason.

## Java Style and Naming

- Use four-space indentation.
- Classes, records, enums, and interfaces use `PascalCase`.
- Methods, fields, parameters, and local variables use `camelCase`.
- Constants use the existing project convention, normally `UPPER_SNAKE_CASE`.
- Preserve established suffixes such as `Controller`, `Service`, `Repository`, `RequestDto`, `ResponseDto`, `Mapper`, `Config`, and `Exception`.
- Follow existing package naming and visibility conventions.
- Prefer focused classes and methods over large multi-purpose implementations.
- Follow existing constructor-injection patterns; do not introduce field injection into new code.
- Keep public APIs documented when their behavior is not obvious from names and types.

## Layer Responsibilities

### Controllers

- Keep controllers focused on HTTP concerns.
- Parse and validate requests.
- Delegate business logic to services.
- Return the project’s established response and error shapes.
- Do not place repository queries or complex business rules directly in controllers.

### Services

- Keep business rules, orchestration, and transaction boundaries in services.
- Reuse existing service abstractions instead of creating parallel pathways.
- Apply transactions deliberately and consistently with existing patterns.
- Do not perform slow external work inside a database transaction unless necessary.

### Repositories

- Keep persistence operations in repositories.
- Prefer clear derived queries or explicit JPQL/native queries consistent with existing code.
- Avoid loading more data than required.
- Check query count and relationship loading when a change may introduce N+1 behavior.
- Do not move business decisions into repository queries merely to reduce service code.

## DTOs, Validation, and API Boundaries

- Use DTOs at API boundaries according to existing project patterns.
- Do not expose persistence entities directly when the current codebase uses DTO mapping.
- Use Jakarta Bean Validation for request constraints.
- Preserve existing validation message and error-response conventions.
- Validate untrusted identifiers and ownership at the service/security boundary.
- Keep request DTOs and response DTOs separate when their responsibilities differ.
- Avoid silently making fields nullable, optional, or writable.
- Treat JSON property names and enum values as part of the API contract.

## Mapping and Generated Code

- Reuse existing MapStruct mappers.
- Do not hand-write duplicate mapping logic when an existing mapper should own it.
- Do not edit generated MapStruct output under `target/`.
- Keep Lombok usage consistent with neighboring code.
- Do not mix generated and handwritten accessors or constructors in a way that creates ambiguous behavior.
- When changing mapped fields, update mapper tests or relevant service tests.

## Persistence and Schema Changes

- The current `pom.xml` does not declare Flyway or Liquibase.
- Do not assume a migration framework exists.
- Do not silently introduce a migration framework unless explicitly requested.
- Follow the repository’s current schema-management approach.
- Do not destructively drop or alter tables, columns, indexes, or stored data unless the task explicitly requires it.
- Prefer backward-compatible schema changes where practical.
- Document required manual SQL and execution order when a schema change cannot be automated.
- Do not use production database credentials or data in tests.
- Preserve data integrity with appropriate validation, constraints, and transaction handling.

## JPA and Open-in-View

- Do not change `spring.jpa.open-in-view` solely to silence a warning.
- Before disabling open-in-view, verify DTO mapping, transaction boundaries, lazy relationships, and all affected request flows.
- Fetch required data inside the service transaction rather than relying on accidental lazy loading during response serialization.
- Avoid serializing bidirectional entity relationships directly.

## Security and JWT

- Follow the existing Spring Security configuration and authentication flow.
- The project includes OAuth2 Resource Server support and Auth0 Java JWT; inspect the current code before deciding which component owns token creation or verification.
- Do not create a second competing authentication path.
- Do not bypass authorization checks to fix a failing endpoint.
- Preserve role, permission, and ownership checks.
- Validate token claims, expiration, issuer, audience, and signing configuration according to existing project behavior.
- Never hard-code secrets or include real tokens in source, tests, logs, or documentation.
- Use Spring Security Test for protected endpoints and authorization regressions.

## Redis

- Inspect all readers and writers before changing Redis keys or values.
- Preserve established key naming, serialization, TTL, invalidation, and namespace behavior.
- Avoid unbounded keys or collections.
- Do not silently change cache semantics, session behavior, or token revocation behavior.
- Test fallback behavior when Redis is unavailable if the affected feature is expected to degrade gracefully.

## Configuration and `.env`

Spring Boot explicitly imports extensionless `.env` files as Java Properties:

```properties
spring.config.import=optional:file:.env[.properties],optional:file:backend/.env[.properties]
```

- Preserve this mechanism unless configuration loading itself is the task.
- Do not add a dotenv library merely to load the existing backend `.env`.
- The two paths support running from `backend/` and from the repository root.
- Treat `.env` files as untracked local configuration.
- Keep safe, non-secret defaults in tracked configuration where appropriate.
- When adding a required variable, update an existing example environment file or setup documentation with a safe placeholder.
- Never place secrets in `application.properties`, test fixtures, or committed example values.

## Dependency Management

- Let the Spring Boot parent manage dependency versions when possible.
- Do not add explicit versions to managed dependencies without a demonstrated need.
- Keep explicit versions, such as MapStruct or Auth0 Java JWT, aligned with the existing project unless the task is an upgrade.
- Do not upgrade Spring Boot, Spring Security, Hibernate, Jackson, MapStruct, Lombok, or other unrelated libraries as part of a normal feature or bug fix.
- Do not restore snapshot repositories after the project has moved to stable releases.
- Explain any new production dependency and why the existing stack was insufficient.

## Testing

Backend tests use JUnit 5, Spring Boot Test, and Spring Security Test.

- Name tests according to the existing convention.
- Mirror production packages under `backend/src/test/java`.
- Add focused tests for changed behavior and regressions.
- Prefer unit or slice tests when they provide sufficient confidence.
- Use full-context tests when integration across configuration or layers is what must be verified.
- Cover success, validation failure, authorization failure, not-found behavior, and important edge cases as relevant.
- Keep tests deterministic.
- Do not depend on production services or production credentials.
- Do not weaken assertions merely to make a test pass.

## Backend Commands

Run from `backend/`.

### Windows PowerShell

```powershell
.\mvnw.cmd spring-boot:run
.\mvnw.cmd test
.\mvnw.cmd clean package
```

Prefer PowerShell and `mvnw.cmd` on Windows. The Unix wrapper may fail in Git Bash while downloading Maven even when the project is valid.

### macOS/Linux

```bash
./mvnw spring-boot:run
./mvnw test
./mvnw clean package
```

Use `clean package` for dependency, build, configuration, security, persistence, annotation-processing, or packaging changes.

## Warning Handling

- Do not change application behavior solely to hide a startup or test warning.
- Treat the JPA open-in-view warning as an architectural review item, not an automatic configuration change.
- Treat Mockito or JVM dynamic-agent warnings as compatibility warnings unless they actually fail tests.
- Report relevant warnings when they create future risk, but keep the requested task scoped.

## Backend Completion Checklist

Before finishing a backend task:

- Confirm the controller, service, repository, DTO, mapper, security, and configuration layers affected by the change.
- Confirm API compatibility or explicitly report intentional changes.
- Run relevant focused tests.
- Normally run the full backend test suite.
- Run `clean package` when required by the change category.
- Check that no secret, generated file, or unrelated dependency change entered the diff.
- Report any infrastructure requirement that prevented full verification.
