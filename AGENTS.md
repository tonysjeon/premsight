# AGENTS.md

## Purpose

This document defines the engineering standards that all AI coding agents must follow when contributing to PremSight.

## Project Goals

* Build a production-quality Premier League application.
* Keep the codebase modular and maintainable.
* Prioritize correctness over speed.
* Favor clear architecture over clever implementations.

## Engineering Principles

* Follow the documented architecture before introducing new patterns.
* Keep services loosely coupled.
* Separate UI, API, ingestion, and prediction responsibilities.
* Prefer composition over duplication.
* Write readable code with clear names.

## Documentation

Before implementing a new subsystem:

1. Update the relevant document in `docs/`.
2. Ensure implementation matches the documented design.
3. Record major architectural decisions.

## Coding Standards

* Use strict typing.
* Keep functions focused and testable.
* Avoid hidden side effects.
* Validate all external input.
* Handle errors explicitly.

## Prediction Engine

* Keep statistical models isolated from API and UI code.
* Version prediction models.
* Ensure probability outputs are normalized and tested.
* Write deterministic calculations whenever possible.

## Testing Expectations

* Add unit tests for core business logic.
* Add integration tests for service boundaries.
* Do not merge code that breaks existing tests.

## Repository Rules

* Keep commits focused on a single logical change.
* Avoid unrelated refactors in feature branches.
* Update documentation when architecture changes.

## Guiding Philosophy

Build PremSight as if it will be maintained by a team for years, not as a short-term prototype. Favor clarity, maintainability, and correctness in every implementation.
