# Poisson Model

## Phase 5 model

PremSight's first pre-match model is `poisson-v1`. It estimates team strengths from completed league fixtures and produces expected goals, a score probability matrix, home/draw/away probabilities, and likely scores.

The model is deterministic. The prediction engine receives validated fixture history as input and does not read PostgreSQL or call the main API itself.

## Inputs

Each historical result contains:

- home team ID
- away team ID
- non-negative home score
- non-negative away score

The target contains distinct home and away team IDs. Training history must contain at least one home and one away appearance for each target team. Incomplete history returns an explicit insufficient-data error rather than a fabricated estimate.

## Team strengths

Let league home and away scoring averages be calculated across all supplied results.

For each team:

- home attack = home goals scored per home match / league home-goal average
- home defense = home goals conceded per home match / league away-goal average
- away attack = away goals scored per away match / league away-goal average
- away defense = away goals conceded per away match / league home-goal average

Values above `1` indicate stronger-than-league-average attack or weaker-than-average defense. Zero league scoring averages are rejected because they cannot produce meaningful relative ratings.

## Expected goals

```text
home xG = league home average × home-team home attack × away-team away defense
away xG = league away average × away-team away attack × home-team home defense
```

Expected goals must be finite and non-negative.

## Score probabilities

Each team's goals follow an independent Poisson distribution. The score matrix is the outer product of the two probability vectors from zero through `max_goals`, inclusive. Phase 5 defaults to `max_goals = 10`.

Because a finite matrix truncates the Poisson tail, the matrix is normalized after construction. Every cell is non-negative and the complete matrix sums to `1` within floating-point tolerance.

Outcome probabilities are derived from the matrix:

- home win: cells where home goals exceed away goals
- draw: diagonal cells
- away win: cells where away goals exceed home goals

The three outcomes must sum to `1`. Likely scores are ordered by descending probability with score as the deterministic tie-breaker.

## Versioning

Every response includes `model_version = "poisson-v1"`. A material change to training, strength calculation, expected-goal calculation, tail handling, or calibration requires a new version. Phase 6 will validate and calibrate this model without silently changing historical meaning.

## Non-goals

- Dixon–Coles correlation adjustment
- Time decay or recency weighting
- Lineups, injuries, red cards, or player ratings
- Promoted-team priors
- Live match updates
- Calibration or backtesting

## Testing requirements

- deterministic results for identical inputs
- normalized score and outcome probabilities
- no negative, NaN, or infinite outputs
- home/away symmetry under symmetric inputs
- explicit invalid-input and insufficient-history failures
- stable model version in every response

## References

- [Roadmap](./02-roadmap.md)
- [System Architecture](./01-system-architecture.md)
- [API Spec](./04-api-spec.md)
