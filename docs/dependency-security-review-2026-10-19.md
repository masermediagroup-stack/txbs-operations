# Runtime security reassessment — October 19

**Current status: A-11 reopened; hosted app rollout held.** The fresh Android backend passed its database checks, but neither attempted Vercel app deployment became ready. The first failed at the unchanged build runtime guard. A minimal provider-hosted probe measured Node **24.21.0**, bundled Undici **7.29.1**, and failed the same guard before dependency installation. The earlier locally validated Node 24.22.0 also bundles 7.29.1.

## What changed the decision

The original October 16 work selected Node 24.22.0 and Undici 7.29.1. The first deployment diagnosis asked whether the Node minimum merely excluded Vercel's preceding 24.21 release. Official release metadata identifies both releases as non-security releases; 24.21 already updates Undici to 7.29.1 and OpenSSL to 3.5.8. That comparison alone would not justify calling 24.21 vulnerable or lowering the guard.

The subsequent primary-source review found October 15 Undici advisories affecting **7.29.1 itself**. Two apply to `fetch()`: a malicious response with excessive content encodings and an early close can terminate the Node process, and TLS 1.2 certificate-changing renegotiation can crash the client. Their fixed versions are **7.30.1** and **8.12.2** for the accepted Undici majors. Ordinary exception handling is not a stated workaround for the first issue. [Content-encoding advisory](https://github.com/nodejs/undici/security/advisories/GHSA-xjj6-f33q-929c), [TLS advisory](https://github.com/nodejs/undici/security/advisories/GHSA-qrxm-fqhp-jwvm)

The [bootstrap/runtime research](research/isolated-test-bootstrap-2026-10-19.md) records the additional advisory/API distinctions, release metadata and the provider's managed-major policy. The earlier review did not establish a current October 19 security floor for bundled fetch. Its passing build/audit/browser results remain historical functional evidence; they are not current runtime clearance.

## Application reachability and limits

The installed Supabase client resolves to global `fetch` unless a custom implementation is supplied. The app's server and privileged clients do not supply one. Consequently configured Auth, Data API and Storage calls use Node's bundled implementation on the server. Evidence verification downloads through that client; notification dispatch uses Resend's fetch-backed client when configured. The pilot has no email-provider configuration.

These are configured HTTPS service peers. The inspected app interfaces do not accept an arbitrary outbound URL from an ordinary worker. The advisories require a malicious response or peer behavior; this assessment does not establish an exploit against the configured providers, a compromise, or observed data loss. Fixed destinations and caught promise rejections do not prove that the affected implementation is patched. No malicious-server reproduction was executed against either hosted environment.

Other advisories concerning custom interceptors, dispatchers, proxy/no-proxy parsing, low-level pipeline APIs or a later 8.x WebSocket path must not be described as every app path being exploitable. Their exact applicability is retained in the research rather than inferred from an npm version alone.

## Remediation and verification

The existing build/check guard now requires bundled Undici **7.30.1+ on 7.x** or **8.12.2+ on 8.x**, while retaining the existing Node 24.x and 24.22.0 minimum. It still rejects missing versions, unknown Undici majors, malformed/prerelease versions and unsupported Node majors. Diagnostics print only non-secret version numbers. No authentication, TLS, CSP or replay protection was reduced, and no npm-only fetch replacement was installed.

Thirteen tests execute the actual guard source against synthetic runtime metadata. Before the correction, four failed because affected Undici versions were accepted; afterward all thirteen passed. The actual local Node 24.22.0/Undici 7.29.1 binary now exits 1 at the release guard, as required. Synthetic accepted version vectors test the rule; they do not claim that a corresponding official Node archive or hosted function runtime exists.

The full trusted-fixture suite passed 130 tests, strict TypeScript and focused
lint after the correction. These checks ran on the existing local engine and do
not prove its bundled fetch patched. A release build remains intentionally
blocked at prebuild; no new successful build or browser-release result is claimed.

As observed from the official release index on October 19, latest released Node 24.x is 24.22.0 and its tagged bundled Undici is 7.29.1. A qualifying released 24.x runtime has not been established. The announced October 21 Node security release remains future work, not an available or verified fix. [Release index](https://nodejs.org/dist/index.json), [Node 24.22.0](https://nodejs.org/en/blog/release/v24.22.0), [announced security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)

Vercel exposes supported **major** selection and manages minor/patch rollout. Selecting `24.x`, setting an exact npm engine string, installing another build-only Node binary or changing npm dependencies does not prove the function runtime's bundled version. Requalify both the build and actual function runtime against the updated guard after a supported patched release is available. The probe's temporary install command was removed; normal automatic installation and `npm run build` were restored on the new project. [Vercel Node version policy](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)

No successful new app deployment, function startup, real sign-in, immutable-byte upload or mobile replay is claimed. The database baseline and 32 hosted rollback role checks remain valid within their scope. Existing legacy deployment/backend and replay hold were not changed. The server secret's presence remains unverified because the environment-list connector returns 403 and the browser requires team authentication.

## Resume conditions

Qualify a released supported Node 24.x archive and its bundled Undici against current advisories, update the exact local/CI baseline, then repeat runtime audit, lint, TypeScript, tests, build and appropriate browser checks. Verify the managed build and function versions independently before accepting the hosted release. Repeat new-app backend/session/command/journal isolation and preserve the legacy hold. Existing A-09, A-10 and operational gates remain open. No alternative hosting, paid resource, broad runtime exception or production cutover is authorized by this report.
