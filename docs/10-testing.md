# Testing

## Purpose

Placeholder document for PremSight Testing. Expand this file as the project evolves.

## Overview

Frontend draft scoring is isolated in a pure TypeScript module. Node's built-in test runner verifies weighting, point bounds, result thresholds, incomplete squads, and the rule that reserves do not affect the result.

## Goals

- Keep draft scoring deterministic and independent of UI state.
- Test every result-band boundary.
- Protect the 85% starter, 15% substitute, and 0% reserve weighting contract.

## Non-goals

_TBD_

## Open questions

_TBD_

## References

_TBD_
