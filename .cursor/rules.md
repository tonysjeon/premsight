# PremSight Engineering Principles

These rules guide all work in this repository.

## Architecture

- Prefer a **modular architecture**. Each app and service owns a clear boundary.
- Enforce **separation of concerns**: HTTP adapters, domain logic, data access, and infrastructure stay distinct.
- Keep services **loosely coupled**. The prediction engine must remain isolated from the API; the API must not embed Poisson or model code.
- Share contracts via packages (types, schemas), not by copying logic across services.

## Code quality

- Use **strict typing** (TypeScript strict mode; typed Python with Pydantic / annotations).
- Prefer **small, reusable functions** over large procedural blocks.
- Write **testable code**: pure functions where possible; inject dependencies at boundaries.
- **Do not duplicate business logic**. Extract shared rules into a single owned module or package.
- Avoid unnecessary dependencies. Favor maintainability over clever shortcuts.

## Process

- Practice **documentation-first development**: update `docs/` when introducing architecture, APIs, schemas, or behavior that others must understand.
- Keep changes focused. Do not invent domain features (fixtures, live matches, standings, models) until they are specified and approved.
- Prefer clarity in naming, structure, and README instructions over implicit convention.

## Review checklist

- Is this change in the right service/package?
- Could another service reuse this incorrectly? If so, extract a shared contract instead.
- Are types, tests, and docs updated with the behavior?
