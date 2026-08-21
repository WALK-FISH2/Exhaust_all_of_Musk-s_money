# Implementation Plan — Spend_Musk_Money

> Status: Active  
> Version: 1.4  
> Date: 2026-08-21

## Milestone M0 — Cross-platform technical spike

Goal: prove the chosen architecture before feature work.

Deliver:

- Taro 4.x + React + TypeScript scaffold;
- H5 build;
- WeChat Mini Program build;
- one shared pure domain function/test;
- local storage adapter proof on both targets;
- PWA manifest/service-worker strategy confirmed;
- CI/local scripts for typecheck/test/build.
- centralized visible-string resource structure for localization readiness.

Exit gate: both targets compile and shared-domain tests run.

## Milestone M1 — Core money engine, catalog, and achievement evaluation

Deliver:

- product/category data model;
- v1 catalog data;
- catalog validator;
- run model;
- quantity commands: +, −, direct set, MAX;
- balance/spend derivation;
- exact-zero detection;
- deterministic result metrics;
- achievement definitions and normalized domain event model;
- pure achievement evaluator and single-run unlock calculation;
- full unit tests for money invariants.
- table-driven tests for every achievement rule.

Exit gate: game can be simulated entirely in tests with no UI.

## Milestone M2 — Free Mode vertical slice

Deliver:

- main game page;
- sticky balance panel;
- product cards;
- category filter/search;
- receipt;
- restart confirmation;
- free-mode exact-zero result;
- completed-run read-only product view;
- responsive H5 and WeChat layouts.

Exit gate: a user can start from $400B and reach $0 on both targets.

## Milestone M3 — Challenges

Deliver:

- challenge picker;
- 30/60/300s modes;
- timestamp timer;
- background/foreground reconciliation;
- timeout freeze;
- early-clear result;
- deterministic actual-duration derivation;
- completed/frozen read-only return behavior;
- pure local-record comparison using exact spent and millisecond duration.

Exit gate: challenge results are identical given the same simulated timestamps/actions.

## Milestone M4 — Achievement persistence, UI, and local persistence

Deliver:

- unlock UI;
- lifetime achievement state and history;
- autosave/restore;
- schema version;
- persistence validation and sequential migration runner;
- first migration test;
- corrupt-save recovery;
- local-record persistence;
- Free Mode and challenge restoration integration tests.

Exit gate: refresh/reopen restores valid play state and preserves lifetime achievements.

## Milestone M5 — UX polish and PWA

Deliver:

- modern flat visual system;
- light humorous copy;
- result composition;
- balance/large-purchase feedback;
- reduced-motion behavior;
- PWA install/offline shell;
- image lazy loading/size optimization;
- loading/error states.
- 100-product performance validation on H5 and WeChat.

Exit gate: core game remains usable offline after required initial Web load.

## Milestone M6 — Dual-platform release candidate

Deliver:

- complete requirement audit against BR/NFR IDs;
- H5 responsive browser tests;
- H5 Playwright or equivalent core-flow E2E tests;
- WeChat Developer Tools/device smoke test;
- WeChat Storage/background/offline/safe-area/performance acceptance;
- persistence upgrade test;
- asset provenance review;
- disclaimer/identity review;
- privacy/data-minimization review;
- v1 feature-boundary review;
- approved WeChat friend/timeline Free invitation and challenge-metadata sharing with new-Free/ready-state landings;
- WEAPP-only native version-update readiness/failure prompts at the application entry;
- stacked balance/challenge sticky visibility, challenge navigation, and WeChat quantity-control UX refinement;
- production builds.

Exit gate: all baseline MUST requirements pass.

## Post-v1 candidates

### v1.x

- generated result-card image;
- generated result-card image and Web Share integration;
- bilingual Chinese/English UI;
- additional catalogs/themes;
- custom local challenge presets.

### v2+

Only after explicit new requirements:

- account/cloud save;
- online daily challenge;
- leaderboards;
- remote configuration;
- richer social systems.
