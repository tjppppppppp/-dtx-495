# Nexus roadmap — full application build

## Current revision — visual learning + Illinois identity (Nov 6 brief)
- [x] Fix typing lag on /session (per-render vault retrieval) and dead-feeling Start learning.
- [x] Illinois palette: blue #13294B structure/verified, orange #FF5F05 active/important/gaps, neutral charcoal dark mode; logo dots orange/blue/white.
- [x] Real rendered visuals only — no text "draw this" placeholders. PN-junction: staged interactive SVG diagram (imbalance → diffusion → depletion → field → drift opposes → equilibrium), step forward/back.
- [x] Visual Explainer picks the right visual type (causal, schematic, plot, derivation, comparison table…); pair every visual with a concise "what is happening" explanation.
- [ ] Fix overlapping equation characters globally (KaTeX font/CSS isolation; verify sub/superscripts, Greek, fractions, multiline derivations in light+dark+narrow).
- [ ] Worked example redesign: Given / What we know / Steps / Final result block / Why this matters — scannable, equations not buried in prose.
- [ ] Tagline: replace "Engineering notes, connected" with a line built on the definition of "nexus" (a connection point) that fits any student, not just engineering.
- [ ] Full-page bug audit + visual QA of every route and session step.
- [ ] Preserve all existing features (gap diagnostic, planner, resource scout, practice, verification, map, debt, courses, sources, vault, save connection, provenance).

## Pre-launch verification + publish (Nov 6 brief) — done
- [x] Core functional path: sign in → add file (indexed) → session → planner → real staged visual → clean equations → provenance → practice → verification (both verdicts) → save connection → map/dashboard update → persistence. Obsidian import verified in earlier sessions; directory picker untestable headless.
- [x] Visual QA: session, dashboard, map, landing in light+dark+narrow — no clipping, overlap, or dead controls found; tagline copy aligned everywhere.
- [x] Math: 14 KaTeX elements, zero overflow/overlap, no fallback errors, dark+light; regression tests cover built-in voltage, drift-diffusion, Einstein, multiline derivation.
- [x] Visual Explainer: all 6 stages change; regions, carriers, ions, diffusion/drift/field arrows, equilibrium all render.
- [x] Published. Known limitations: unsaved session packages don't restore in a fresh browser (saved connections do); vault picker needs a real browser gesture; YouTube links blocked only inside the editor preview iframe.

## Previous revisions (done)
- [x] Task-first entry; dashboard/map/debt secondary; consented Obsidian context; uncertainty routing; progressive disclosure.
- [x] Restore full demo feature set on real backend (planner, provenance equations, resource scout, verification, save connection, real graph, knowledge debt).
- [x] Phase 1–5: Cloud/auth/schema, courses + real uploads, Obsidian import + retrieval, AI session orchestration, graph/debt/dashboard.

## Open / deferred
- [ ] Persistent vault library: requires explicit storage-consent decision; library stays local by design.
- [ ] Final preview flow test: persistence across refresh/logout, error/loading states, mobile layout.
- [x] YouTube links "go nowhere": editor preview sandbox blocks YouTube new tabs; URLs are correct and work published / in own tab. No code change.
