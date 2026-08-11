# ADR 0001: Use a modular monolith

- Status: Accepted
- Date: 2026-08-03

## Context

TBS Operations will grow across Inventory, Projects, Procurement, Vendors, Deliveries, Scheduling, Estimating, Field Operations, Fleet, Administration, Reporting, and executive views. Phase 0 needs fast iteration and consistent navigation without coupling every future capability into one undifferentiated folder.

## Decision

Build one Next.js application and organize product code by feature. Inventory is the first domain and owns project materials and Receiving. Route entry points remain thin and delegate page composition to feature code.

## Consequences

- One deployment, dependency graph, and application shell.
- Feature ownership can mature without early microservices or a monorepo.
- Cross-feature imports must remain deliberate.
- A service boundary can be extracted later only when operational or scaling evidence justifies it.
