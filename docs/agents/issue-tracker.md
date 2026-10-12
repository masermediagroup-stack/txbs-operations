# Issue tracker

Repository: masermediagroup-stack/txbs-operations.
Use connected GitHub tools; use the GitHub CLI only when installed and authenticated.
Keep external PRs out of the triage queue unless separately requested.

## Master Plan

`TODO.md` determines priority, status, and acceptance gates. Detailed GitHub issues
reference stable TODO task IDs. Reconcile issue progress into TODO.md; a closed
issue does not establish production or physical-device acceptance by itself.

For the expanded operations workflow, read the Master Plan together with
`docs/architecture/expanded-operations-specification.md` and its published behavior
slice references. The architecture assessment is supporting evidence; neither
document replaces the Master Plan or marks source/design acceptance complete.

## Specification and tickets

Draft the specification and ticket breakdown locally for review before publishing.
Each implementation ticket states the behavior, users/roles, agreed public
interfaces, exclusions, blockers, validation, and completion evidence.
Use a title with the stable task ID and a concrete behavior.
Every ticket includes a Blocked by section with issue links; use native blocking
relationships where the available GitHub tool supports them.
Prefer a demonstrable schema-to-interface-to-test slice over tickets split only
by database, API, and frontend layers.

## Wayfinding

Use only for bounded multi-session uncertainty. A map references decision tickets;
each decision has one detailed home. Map items resolve decisions rather than
implementing features. Synthesize resolved decisions into a specification before
creating implementation tickets. Do not create a second active roadmap.

## Publication contents

This repository is public. Use technical requirements and synthetic examples.
Keep company document excerpts, actual job/vendor data, financial amounts, and
credentials out of public issues and PR bodies. Keep restricted source evidence
in approved private storage. Do not upload company documents as part of ticketing.
