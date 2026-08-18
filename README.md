# Spend_Musk_Money

Taro + React + TypeScript cross-platform project for the “花光马斯克的钱 / Spend Musk's Money” Web/PWA and WeChat Mini Program experience.

The repository now contains the **M2 Free Mode implementation** on top of the verified M1 domain. The H5/PWA and WeChat builds share one React/Taro page, centralized RunState controller, 45-product catalog, quantity controls, receipt, per-run achievement feedback, exact-zero result flow, and responsive styling. T0209 remains open until the required interactive H5 browser smoke is completed.

## Prerequisites

- Node.js 18 or newer
- pnpm 10 (the repository pins `pnpm@10.27.0`)
- WeChat Developer Tools for interactive Mini Program runtime verification

## Commands

```bash
pnpm install
pnpm run dev:h5
pnpm run build:h5
pnpm run dev:weapp
pnpm run build:weapp
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run format:check
pnpm run build:pwa
pnpm run check
```

Build outputs are isolated by target:

- H5/PWA: `dist/h5/`
- WeChat Mini Program: `dist/weapp/`

For the Mini Program, import the repository root into WeChat Developer Tools; `project.config.json` points to `dist/weapp/`. The committed `touristappid` is only for local technical verification and must be replaced through approved project configuration when a real AppID is available. Never commit an AppSecret.

## Architecture boundaries

- `src/domain/` contains platform-independent pure TypeScript only.
- `src/storage/` owns the shared persistence contract and concrete H5/Taro adapters.
- `src/platform/` selects platform capabilities; Domain code must not import browser, WeChat, or Taro APIs.
- `src/i18n/` centralizes visible technical copy. Product strings and catalog data stay outside core calculations.
- H5 production builds integrate `vite-plugin-pwa`; the manifest, registration script, service worker, and declared icons are checked by `pnpm run pwa:check`.
- The PWA update strategy is user-mediated (`registerType: prompt`): a new worker is not configured to force-refresh an active session.

## M2 Free Mode

- `src/application/free-mode-controller.ts` owns the UI-to-Domain command bridge; its nested `RunState` is authoritative.
- `src/hooks/use-free-mode-game.ts` supplies timestamps and React callbacks without duplicating game math.
- `src/components/game/` contains the balance, catalog, product, receipt, feedback, restart, and result presentation components.
- Search and category filtering are local and combine with `AND`; neither operation mutates purchase state.
- M2 uses original CSS/emoji placeholders and keeps final product asset production in the later asset tasks.
- Page refresh intentionally resets the current run. Formal persistence, lifetime achievements, and records remain M4 work.

## Requirements map

Read documents in their mandatory priority order:

1. `docs/constitution.md`
2. `docs/product/requirements-baseline.md`
3. `docs/product/spec.md`
4. Normative product annexes
5. `docs/engineering/architecture.md`
6. `docs/planning/plan.md`
7. `docs/planning/tasks.md`
8. `AGENTS.md`

See `docs/README.md` for the complete map. M2 does not implement challenge timing/lifecycle, production persistence, lifetime-achievement UI, or local records; those remain M3–M4 work.

## Change history

Project additions, changes, fixes, and known limitations are recorded in [CHANGELOG.md](./CHANGELOG.md). New work must be entered under `Unreleased` before it is considered complete.
