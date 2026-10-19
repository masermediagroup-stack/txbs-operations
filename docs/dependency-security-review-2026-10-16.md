# Dependency security and recovery review — 2026-10-16

Supporting evidence for Master Plan A-11/#5 and A-07/A-10. Local work from
baseline `aa32028`; no hosted rollout or replay-hold release is implied.

## Dependency result

Pinned `next` and `eslint-config-next` together from 16.3.6 to 16.3.8, the patch
release on the existing framework line. Ran ordinary `npm audit fix` without
`--force`, with installation scripts disabled, to refresh compatible transitive
packages. React, the pinned Supabase client packages and the domain model were
not migrated. The lockfile records the exact resulting graph.

| Audit | Before | After |
| --- | --- | --- |
| Complete dependency graph | 17 entries: 1 critical, 13 high, 3 moderate | 9 high entries, all from the same development-only `braces` advisory |
| Production dependency graph (`--omit=dev`) | Not separately captured before remediation | Zero reported vulnerabilities |

These are registry audit results at the recorded date, not proof that all possible
security defects are absent. The full audit still exits nonzero. Do not describe
this work as a zero-finding full audit.

The lockfile SHA-256 after remediation is
`9d72056da43b6ee58d92c538665daaea514de72311d8107fcfcb356eeb82cfed`.
Comparison with the baseline found 59 added, removed or version-changed package
paths, including platform-specific Next.js compiler entries. Non-development
changes are the matched framework/runtime/compiler packages, browser-support
metadata and `source-map-js` 1.2.2. The private execution artifact records every
path and version; no global override or forced framework downgrade was added.

## Advisory paths and disposition

| Root or affected package | Observed path / applicability | Disposition |
| --- | --- | --- |
| `next` | Direct runtime dependency; six registry advisories covered cache/Draft Mode, SSG/ISR poisoning, development MCP, metadata images and remote image optimization | Patch to 16.3.8 rather than depend on individual unused-feature exceptions |
| `source-map-js` | Shared build/runtime graph | 1.2.1 → 1.2.2 |
| `@modelcontextprotocol/sdk` | Development `shadcn` CLI graph | 1.30.0 → 1.32.1 |
| `proxy-addr` | Development CLI → MCP SDK → Express | 2.0.7 → 2.0.8; removes the audit's critical entry |
| `undici` | Development CLI and jsdom branches | 7.29.0 → 7.30.1; 8.10.0 → 8.12.2 |
| `brace-expansion` | Development glob/parser branches | 1.1.18 → 1.1.21; 5.0.9 → 5.0.12 |
| `fast-uri`, `ip-address`, `postcss-selector-parser` | Development-tool dependencies | Updated within supported parent constraints to 3.1.8, 10.7.4 and 7.1.6 respectively |
| `braces` | Development glob chain through Next ESLint and the shadcn CLI | No patched upstream version reported; bounded applicability disposition below |

Primary Next.js advisories:
[Draft Mode/cache](https://github.com/vercel/next.js/security/advisories/GHSA-3w37-wq28-93x7),
[self-hosted SSG/ISR](https://github.com/vercel/next.js/security/advisories/GHSA-4jqv-mc3x-m676),
[development MCP](https://github.com/vercel/next.js/security/advisories/GHSA-39w2-rjm5-chcv),
[metadata image routes](https://github.com/vercel/next.js/security/advisories/GHSA-f87g-xv8r-7p7x),
[SSG/ISR substitution](https://github.com/vercel/next.js/security/advisories/GHSA-mcj8-r9mp-w47p),
[remote image SSRF](https://github.com/vercel/next.js/security/advisories/GHSA-cjq9-62q9-8jv4),
and the [16.3.8 release](https://github.com/vercel/next.js/releases/tag/v16.3.8).
The registry reports `<16.3.8` as affected on this line; some upstream advisory
pages still display placeholder patch text, so the exact published package and
fresh audit were checked as well.

Other source records include the
[MCP SDK advisory](https://github.com/modelcontextprotocol/typescript-sdk/security/advisories/GHSA-6qxp-vccf-f47h),
[proxy-addr advisory](https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h),
and [Undici patch release](https://github.com/nodejs/undici/releases/tag/v7.29.1).
The registry's full advisory output is retained in private execution artifacts.

## Node runtime boundary

**Superseded security floor:** the [October 19 reassessment](dependency-security-review-2026-10-19.md)
found newer published advisories affecting bundled Undici 7.29.1. A-11 is reopened
and the release guard is stricter. This section preserves the earlier artifact
and validation history; it is not current runtime clearance.

The initial local/CI pin, Node 24.19.0, bundled Undici 7.29.0. Refreshing the npm
graph did not update that implementation of global fetch. The official Windows
Node 24.22.0 archive was downloaded from nodejs.org and checked against its
published SHA-256 manifest. Executing it reports Node 24.22.0, Undici 7.29.1 and
OpenSSL 3.5.8. CI and the active README now use this supported 24.x baseline;
package engines selects Node 24.x. A build/check guard rejects older Node and
affected bundled Undici ranges. It was exercised against the actual old binary
(rejected) and new binary (accepted).

The [24.22.0 release](https://nodejs.org/en/blog/release/v24.22.0) is current LTS
at this checkpoint. The project has also announced
[security releases for October 21](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases),
including the 24.x line. Those fixes are not available yet; do not claim the
current runtime resolves unreleased issues. Reassess the published release before
the next hosted rollout. The hosted platform's actual patch level has not been
verified or changed by installing a local runtime. The build guard is intended to
fail rather than silently accept an older hosted build runtime.

## Remaining development-tool exception

`braces@3.0.3` is flagged for deeply nested untrusted patterns. The
[published advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no
patched version. The [upstream issue](https://github.com/micromatch/braces/issues/70)
contains the report and maintainer disagreement. That disagreement does not erase
the audit finding.

The nine remaining entries are `braces`, `micromatch`, `fast-glob`,
`@next/eslint-plugin-next`, `eslint-config-next`, `@shadcn/registry`,
`@ts-morph/common`, `ts-morph` and `shadcn`. They represent one advisory propagated
through several parent dependencies, not nine independently observed exploits.
Every affected installed path is marked development-only in the lockfile.

Application/source-reader code does not import this glob chain. Next's ESLint
helper derives optional glob input from repository-controlled `settings.next.rootDir`;
the current ESLint configuration supplies no external root pattern. shadcn is
development tooling (including an imported stylesheet), not a configured public
CLI/MCP service. Application search, barcode capture and uploaded documents are
not passed to these glob functions. Production dependency audit reports zero,
and 43 production Node file traces contain no paths for `braces`, `micromatch`,
`fast-glob`, `shadcn` or `ts-morph`.

Technical disposition: retain the supported current tooling under a limited
development-input exception. Build/CLI execution must use reviewed repository and
registry inputs; do not expose a shadcn/MCP receiver or feed user-supplied patterns
to glob tools. Treat untrusted repository changes as executable build input.
This is not a blanket exception for other advisories or a production vulnerability
waiver. Reassess before the next release, on an upstream patch, or before adding
external glob/CLI/MCP input. npm's proposed shadcn 1.0.0 / Next ESLint 14 downgrade
was rejected because it breaks the current supported stack instead of supplying
a patch to this dependency.

## Recovery regression found during validation

The production build originally prerendered `/offline` with zero script nonces
while proxy responses enforced a per-request nonce and `strict-dynamic`. The
page's connectivity effect never activated, leaving the online retry control
absent. Development rendering hid that failure. A focused production regression
failed on the response nonce mismatch before the fix.

The public fallback now renders dynamically, preserving the enforced policy and
matching its response nonce. The retry control uses a native link with the shared
button styles. Its test checks response nonce, destination, offline retention
message, hiding the retry while disconnected, reconnect and actual navigation.
The service worker moves from public cache version v4 to v5 so installed clients
can refresh the fallback; this does not clear IndexedDB work or release replay.
CI now includes a runtime dependency audit and production recovery/CSP Chromium job in addition to the existing
four-target development-server suite. The new CI job is configured locally; it
has not run on GitHub in this checkpoint.

## Validation

- `npm run check` passed on Node 24.22.0: runtime guard, full ESLint, strict
  TypeScript, all 117 unit/database tests and the production build.
- Production build passed with `/offline` now marked dynamic.
- All 108 standard browser cases passed on Node 24.22.0 across desktop/mobile
  Chromium and WebKit. All 54 production-server desktop/mobile Chromium cases
  also passed. Both final runs had zero skipped, unexpected or flaky cases.
- An initial development run disconnected immediately after server-rendered text,
  before online preparation completed, and exposed an intermittent navigation
  failure. The test now completes the existing Prepare this device flow and
  observes the Offline indicator before testing the supported offline-navigation
  behavior. This does not claim that an incompletely loaded page is offline-ready.
- Production WebKit over plain local HTTP is not accepted evidence: its
  `upgrade-insecure-requests` handling tried HTTPS for local assets and produced
  SSL failures. The exploratory run was stopped after that common transport cause
  was confirmed; the production CSP was not weakened to make it pass.

## Rollback and release boundary

Revert the dependency files together if rollback is needed, then reinstall the
recorded lockfile and rerun checks. Reverting to 16.3.6 restores known advisories
and is not a release recommendation. For a future service-worker rollback, publish
a new cache version rather than reusing an old one. There is no schema/data
migration in this change. Legacy recovery/isolation, replay hold, hosted acceptance,
primary physical Android testing and operational cutover remain separate gates.
The user explicitly deferred initial iPhone acceptance on October 16; that is not
an iPhone pass.
