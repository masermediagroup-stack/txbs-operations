# ADR 0009: Preserve Issue evidence and lifecycle history

- Status: Accepted
- Date: 2026-08-10

## Context

Inventory exceptions can affect receiving, stored material, movements, and outbound readiness. Editing an Issue in place would erase who assigned it, what follow-up occurred, why it was completed, and whether it was later reopened. Damaged material also needs defensible visual evidence for yard handling and possible supplier-return follow-up.

## Decision

An Issue keeps its current status and assignee for operational filtering while every creation, assignment, link change, and status change also creates an immutable Issue Transition. Discussion is stored as append-only Issue Comments with optional linked photos. Global Activity Events continue to summarize each mutation.

Open and In Progress Issues are active. An active blocking Issue prevents Project Readiness; Resolved and Dismissed Issues do not. Completed Issues can only return to Open through a documented reopen transition.

A newly recorded Damaged Issue requires at least one valid image. When Receiving already captured the required material image, the automatic Damaged Issue links that same Photo Record and blob rather than duplicating media. Migrated legacy damage records may remain visible as Needs evidence until an operator adds a real photo; evidence is never invented.

Resolving an Unknown Shipment can associate its Receipt with a confirmed Project. The original handwritten label, inspection evidence, operator, and receiving timestamps remain unchanged, and the new association is recorded as a link transition.

## Consequences

- Assignment, supplier-return follow-up, resolution, dismissal, and reopening remain auditable.
- Damage completion cannot silently proceed without visual evidence.
- Receiving media remains single-source and portable through the existing backup archive.
- Readiness changes can be traced to the exact Issue transition that caused them.
- Supplier claims, return authorization, and shipment logistics remain outside the Issue model.
