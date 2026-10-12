# Domain documentation

Read `CONTEXT.md` before changing business behavior. It is this application's sole
domain glossary; generic skill references to `GLOSSARY.md` resolve to `CONTEXT.md`.
Read relevant existing ADRs under `docs/adr/` and follow their numbering convention.

Use established TBS terms. Preserve settled decisions and reopen them only when
new evidence creates a material conflict. Keep terminology in the glossary;
specifications, task status, and acceptance belong in their existing documents.
Record an ADR only for a consequential decision with a real tradeoff.

The application remains a single-package modular monolith. Do not add multi-context
glossary infrastructure or duplicate planning documents by default.
