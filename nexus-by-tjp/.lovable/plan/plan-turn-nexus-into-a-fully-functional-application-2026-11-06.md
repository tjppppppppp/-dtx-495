# Plan: Turn Nexus into a fully functional application

## Goal
Replace mocked/demo behavior with real logic: accounts, persistent data, working uploads, AI-powered learning sessions, retrieval, and a saved knowledge graph — while preserving the existing interface and PN-junction demo content.

## Approach: vertical slice first (per the brief's §25)
Build the end-to-end path (sign in → create course → upload sources → import notes → run a learning session → verify → save connection → graph updates → persists across refresh/logout) before broadening.

## Phase 1 — Production foundation
- Enable Lovable Cloud (database, auth, file storage built in).
- Email/password sign-up, sign-in, sign-out; each user's data fully isolated.
- Database tables: profiles, courses, sources, concepts, sessions, knowledge gaps, connections, practice attempts, verification results, preferences — all with per-user access rules.
- Storage bucket for uploaded files with per-user access rules.
- Remove demo-only state where a real feature now exists; clearly label anything still demo.

## Phase 2 — Courses + real uploads
- Course create/manage (name, code, semester, instructor).
- Real file upload (PDF, MD, TXT, DOCX, images) with visible states: Uploading → Processing → Indexed / Failed.
- Text extraction + indexing for retrieval; associate with a course; removable later.

## Phase 3 — Obsidian import + retrieval
- Persist imported vault notes (folder/selected-notes import, wikilinks, tags, frontmatter, paths, backlinks) to the database instead of session-only memory.
- Retrieval: keyword + relevance scoring over indexed sources and notes; only relevant excerpts go to the AI, each with source path, course, excerpt, and relevance.

## Phase 4 — Learning session with real AI
- Server-side AI workflows (Lovable AI Gateway) structured as specialized roles behind one orchestrator: Diagnostic, Retrieval, Concept, Connection, Explanation Planner, Visual Explainer, Resource Scout, Practice, Verification.
- Diagnostic stage asks the student, proposes a gap type (Retrieval / Foundation / Misconception / Connection) with confidence, and lets the student confirm or correct it.
- Connected learning package: problem, gap, prior knowledge, explanation (KaTeX math), visual, equations, assumptions, source trail, practice, understanding check.
- Practice + verification: student answers are evaluated; verified connections save to the graph.
- Provenance states on claims: Source Verified / Derived from Source / Student Verified / AI Suggested / Needs Review. Weak evidence is stated honestly, never faked.

## Phase 5 — Knowledge graph, debt, dashboard
- Persistent graph: nodes (courses, concepts, equations, skills) and edges (prerequisite for, derived from, applied in, …) with provenance; clicking an edge shows why, sources, session, verification state.
- Concept knowledge states (Seen / Understood / Applied / Verified / Connected / Uncertain / Misconception detected).
- Knowledge Debt panel surfacing recurring prerequisite struggles and patterns.
- Dashboard rebuilt around real stored data: Continue Learning, Courses, Map, Debt, Verified Connections, Open Gaps, Recent Sources.
- Navigation: Dashboard, Learn, Courses, Knowledge Map, Sources, Knowledge Debt, History, Settings.

## What stays labeled as demo
- External video/resource scouting: clean integration boundary, no fabricated videos.
- Continuous vault sync: folder import now; structured so a future desktop connector could sync.

## Verification
After each phase: test the flow in the preview, confirm data survives refresh and sign-out/sign-in, check error and loading states, and check mobile layout.

## Technical notes
- Lovable Cloud provides the database, auth, and storage — no external accounts needed.
- AI calls run through Lovable's built-in AI gateway from server functions; no API keys to manage.
- Existing KaTeX rendering, display modes, graph component, and PN-junction demo content are preserved and reused.
