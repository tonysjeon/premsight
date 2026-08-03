# Coding Standards

## Purpose

Set shared engineering standards for PremSight so TypeScript and Python services stay consistent, typed, and reviewable.

## Overview

Standards complement [.cursor/rules.md](../.cursor/rules.md). Prefer clarity and maintainability over cleverness. Documentation-first for architecture and contracts.

## Goals

- Strict typing in TypeScript and annotated Python (Pydantic at HTTP boundaries)
- Small, testable units; inject I/O at edges
- One owner for each piece of business logic—no copy-paste across services

## Language conventions

### TypeScript (`apps/web`, `packages/*`)

- `strict` compiler options
- App Router conventions in `apps/web`
- Shared contracts in `@premsight/shared-types` when used by more than one TS package
- ESLint + Prettier; do not fight formatting in review

### Python (`services/*`)

- Python 3.12, managed with `uv`
- FastAPI routers thin; settings via `pydantic-settings`
- Ruff for lint; pytest for tests
- Prediction/math code only in `services/prediction-engine`

## Testing

- Every new endpoint or pure module ships with focused tests
- Prefer TestClient/httpx for FastAPI route smoke tests
- CI must stay green: lint, typecheck, tests

## Documentation

- Update the relevant `docs/` file when changing architecture, schema, or public API behavior
- Keep service READMEs limited to run/test instructions

## Non-goals

- Enforcing a heavy enterprise process for a young codebase
- Adding frameworks that do not pay for themselves immediately

## Open questions

- Minimum coverage threshold (if any) for CI
- Whether to adopt conventional commits repo-wide

## References

- [.cursor/rules.md](../.cursor/rules.md)
- [AGENTS.md](../AGENTS.md)
- [Testing](./10-testing.md)
