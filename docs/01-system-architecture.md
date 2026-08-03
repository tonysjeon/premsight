# PremSight System Architecture

## High-Level Overview

PremSight follows a modular service-oriented architecture where each service owns a single responsibility.

```text
Next.js Frontend
        │
        ▼
Main API
        │
 ┌──────┴────────┐
 │               │
 ▼               ▼
Prediction    Ingestion
 Engine        Service
 │               │
 └──────┬────────┘
        ▼
 PostgreSQL + Redis
```

---

## Repository Structure

```text
apps/
    web/

services/
    api/
    prediction-engine/
    ingestion/

packages/
    database/
    shared-types/

docs/
infrastructure/
```

---

## Technology Stack

### Frontend

* Next.js
* TypeScript
* Tailwind CSS

### Backend

* FastAPI
* Python

### Prediction Engine

* Python
* NumPy
* pandas
* SciPy

### Database

* PostgreSQL

### Cache

* Redis

### Infrastructure

* Docker
* GitHub Actions

---

## Service Responsibilities

### Frontend

Responsible for:

* UI
* Routing
* Live updates
* User interactions

The frontend must never contain business or prediction logic.

---

### API

Responsible for:

* Public endpoints
* Authentication
* Database access
* Coordinating services

---

### Prediction Engine

Responsible for:

* Team ratings
* Poisson calculations
* Probability generation
* Model versioning

The prediction engine must remain independent of the frontend.

---

### Ingestion Service

Responsible for:

* Historical imports
* Live provider synchronization
* Event normalization
* Match-state updates

---

## Architectural Principles

* Single responsibility per service.
* Loose coupling.
* Strong typing.
* Versioned prediction models.
* Stateless services where practical.
* Documentation-first development.
