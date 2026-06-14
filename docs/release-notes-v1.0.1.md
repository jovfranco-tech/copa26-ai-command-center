# Release Notes: v1.0.1

**Date:** June 13, 2026

## Summary
The v1.0.1 release focuses on preparing the Copa26 Command Center for a clean, public portfolio-grade release. It removes internal references, clarifies the deployment model, enhances cron safety, and ensures the repository is safe for public visibility.

## Naming & Legal Cleanup
- Renamed project globally to **Copa26 Command Center**.
- Removed outdated "Private World Cup Dashboard" and "local-only" references.
- Consolidated documentation into a single, public-ready `README.md`.
- Added clear legal disclaimers confirming no official affiliation with FIFA, Concacaf, UEFA, or the FIFA World Cup.

## Deployment Model Clarification
- Established GitHub Actions as the sole intended production deployment gate.
- Documented instructions to disable Vercel Git auto-deployments to prevent duplicate builds.
- Updated `.github/workflows/deploy.yml` comments to clarify its primary role.
- Removed legacy fifa-branded domain re-aliasing.

## Cron Safety
- Added environment variable feature flags to all serverless cron jobs to prevent runaway usage or accidental AI API consumption:
  - `ENABLE_DATA_SYNC_CRON`
  - `ENABLE_RESULTS_SYNC_CRON`
  - `ENABLE_SIMULATE_LIVE_CRON`
  - `ENABLE_JOURNALIST_CRON`
- Cron jobs now safely skip execution with a `200 OK` status if their respective flag is not set to `true`.

## Public-Readiness Changes
- Updated all `package.json` files to version `1.0.1`.
- Polished the `README.md` to clearly highlight the architecture, tech stack, and key engineering decisions for portfolio review.
- Cleaned up `.env.example` to document the new cron toggles and remove legacy internal naming.

## Verification Results
- All tests passing.
- TypeScript compilation successful (zero errors across all packages and apps).
- Vite production build successful.

## Known Limitations
- The project is `UNLICENSED` and intended strictly for portfolio/demonstration purposes.
- Player photos and team crests rely on placeholder or Wikipedia fallback logic unless official assets are locally ingested via the included scripts.
