# Performance log — sub-50ms page load

## Test Protocol

- Build: production (`pnpm run build`)
- Server: `pnpm start` on port 3001
- Base URL: http://127.0.0.1:3001
- Cache state: warm (server kept running between runs)
- Tool: `.perf/measure-pages.sh` (curl `time_total`, 5 runs, median)
- Runs per page: 5; record median
- Network: localhost (no throttling)
- Primary metric: curl total time (request start → response complete)

## Baseline — 2026-08-12

(change: none — first measurement after production build)

| Page | Median (ms) | Pass (<50)? |
|------|-------------|-------------|
| / | 2.67 | yes |
| /login | 1.09 | yes |
| /signup | 1.15 | yes |
| /credits | 0.93 | yes |
| /policy | 0.96 | yes |
| /impressum | 0.80 | yes |
| /studio | 5.24 | yes |
| /studio/image | 4.24 | yes |
| /studio/video | 2.99 | yes |
| /admin | 0.79 | yes |

**Summary:** 10/10 passed. Slowest: `/studio` at 5.24 ms median.

Raw CSV: `.perf/results-baseline.csv`

## Run 2 — 2026-08-12 (cold server restart)

(change: none — verify cold-start stability)

| Page | Median (ms) | Pass (<50)? |
|------|-------------|-------------|
| / | 1.28 | yes |
| /login | 1.16 | yes |
| /signup | 1.06 | yes |
| /credits | 1.08 | yes |
| /policy | 1.10 | yes |
| /impressum | 1.05 | yes |
| /studio | 4.12 | yes |
| /studio/image | 3.85 | yes |
| /studio/video | 3.27 | yes |
| /admin | 1.07 | yes |

**Summary:** 10/10 passed after server restart.

Raw CSV: `.perf/results-cold.csv`

## Run 3 — 2026-08-12 (final)

(change: `next.config.mjs` cache headers for `/video`, `/assets`, hero; Inter `display: swap`; `poweredByHeader: false`)

| Page | Median (ms) | Pass (<50)? |
|------|-------------|-------------|
| / | 1.75 | yes |
| /login | 1.44 | yes |
| /signup | 1.32 | yes |
| /credits | 0.80 | yes |
| /policy | 1.00 | yes |
| /impressum | 0.84 | yes |
| /studio | 6.76 | yes |
| /studio/image | 4.43 | yes |
| /studio/video | 3.75 | yes |
| /admin | 1.03 | yes |

**Summary:** 10/10 passed. No regressions above 50 ms.

Raw CSV: `.perf/results-final.csv`

## Final — 2026-08-12

**All pages < 50 ms: yes** (localhost production, curl total time, median of 5 runs)

Slowest route: `/studio` at 6.76 ms median.
