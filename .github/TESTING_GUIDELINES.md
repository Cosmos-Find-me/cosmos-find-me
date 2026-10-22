# Testing Guidelines & CI

## Commands

```bash
npm test              # Unit + integration tests (Vitest); exits non-zero on failure
npm run typecheck     # next typegen + tsc, including test files
npm run lint          # ESLint (Next.js flat config)
npm run test:e2e      # Playwright, all browsers (run locally; needs .env.local)
npm run test:performance
```

CI (`.github/workflows/ci.yml`) runs typecheck, lint, build, a production
dependency audit (`npm audit --omit=dev --audit-level=high`) and `npm test`.

## History: Vitest snapshot bug

`npm test` used to be `vitest run --no-coverage || exit 0` to work around a
Vitest snapshot bug. That bug is gone, and the fallback hid real failures, so it
was removed. `tests/unit/dependency-health.test.ts` fails if it comes back.

## Upgrade safety net

These tests exist to catch breaking dependency upgrades:

- `tests/unit/dependency-health.test.ts` – test script, React types, unused deps
- `tests/unit/upgrade-compat.test.tsx` – lucide-react, sonner, cytoscape, uuid
- `tests/unit/tailwind-build.test.ts` – Tailwind output and v4-incompatible markup
- `tests/unit/next-config.test.ts` – Next.js 16 conventions (proxy.ts, Turbopack)
- `tests/unit/llm-server.test.ts` – boots `server/` (Express)
- `src/lib/**/__tests__` – Supabase clients and session proxy
- `tests/e2e/visual-pages.spec.ts`, `tests/e2e/css-cascade.spec.ts` – rendering

When a visual baseline changes intentionally, update it with
`npx playwright test --config=config/playwright.config.ts --update-snapshots`.
