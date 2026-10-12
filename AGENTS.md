<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## TBS card accent rule

When a card uses the TBS orange accent to distinguish its heading section, place the accent on the internal divider directly beneath the title and description. Do not place the orange accent on the card's outer left edge. Reuse the established Project Material Locator and Outbound card pattern so this section break remains consistent across desktop and mobile layouts.

## Navigable row and card rule

When a table row, list row, or card represents one navigable record, make the entire row or card a single semantic link on desktop and mobile. Do not add a separate arrow-only control to open that record. Use hover, active, and visible keyboard-focus states to communicate interactivity, and preserve Enter/Space or native link keyboard behavior. Keep separate controls only when they perform genuinely different actions.

## Development planning rule

Use root `TODO.md`, titled **TBS Operations Master Plan**, as the sole active development plan and checklist. Consult it before starting development work and update the relevant stable task IDs when scope, status, dependencies, acceptance evidence, or completion changes. Do not create separate phase plans, wave checklists, or roadmap versions; implementation reports, audits, runbooks, ADRs, and test artifacts remain supporting evidence.

## Skill-use guardrail

Use a skill only when the user explicitly requests it or the current task materially needs its specialized workflow or current platform guidance. Use the smallest relevant set, stop using a skill when its scoped work is complete, and handle ordinary repository inspection, editing, and validation directly. Do not invoke skills from keyword matches alone or add skill-driven process that does not advance the active `TODO.md` task.

## Company source files

Treat `F:\TBS`, its network-share equivalent, and linked original cloud documents as read-only reference sources. Inspect them read-only or copy selected files into approved system-owned storage. Never save, create, rename, move, delete, or synchronize changes back into those sources. All operational edits and document revisions belong to application records or system-owned copies; retain source provenance and version history.

## Agent skills

### Issue tracker

Detailed work is tracked in GitHub Issues for masermediagroup-stack/txbs-operations. Root `TODO.md` remains the sole active priority/status index. Tickets reference its stable IDs, include explicit dependencies and acceptance evidence, and do not create a competing roadmap. Before preparing or publishing tickets, read `docs/agents/issue-tracker.md`, including its public-repository data boundary.

### Triage labels

When triaging incoming reports, use the configured canonical roles in `docs/agents/triage-labels.md`.

### Domain documentation

Before changing business behavior or terminology, read `docs/agents/domain.md`. This is a single-context application: `CONTEXT.md` is the authoritative glossary; generic skill references to `GLOSSARY.md` mean `CONTEXT.md` here. Preserve existing ADRs under `docs/adr/`.

### Workflow

Ground changes in source evidence and existing code. Survey affected architecture before selecting refactors. Synthesize settled decisions, draft behavior slices with blockers, then implement eligible tickets with agreed tests and review. Existing acceptance and production gates remain in force. Installing a skill does not automatically publish issues, run a prototype, or start implementation.
