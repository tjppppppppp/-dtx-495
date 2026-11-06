<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Nexus conventions
- Keep authored explanation planning, technical visuals, and optional external-resource searches separate from live AI claims; demo understanding checks use an explicit rubric and save connection state only in a root session provider shared by Graph, never in vault storage.
- Keep display modes in the shared top bar, apply semantic CSS tokens to the document, and persist only the display preference locally after hydration so all pages and dialogs share a theme without storing source content.
- Use the shared MathTex KaTeX renderer for block and inline engineering notation; normalize enclosing math delimiters and isolate parse failures there so generated or saved equations cannot crash a lesson. Keep graph formulas separate from prose to ensure consistent typesetting.
- SourceUpload uses a real browser picker and session-only metadata with explicitly mocked parsing; it never claims to store or extract uploaded content.
- Keep graph interactions in the shared Graph component so filtering, node focus, evidence selection, and zoom behave consistently across all views.
- Obsidian notes are parsed after preview approval and held in a root provider without persistence; only bounded task excerpts may leave the browser after separate explicit AI consent, so vault ingestion never implies network consent.
- Vault metadata and links use a pure parser/index with allowlist/exclusion checks before file reads; retrieval ranks short source excerpts locally and never labels unverified user notes as verified or template practice as AI output.
- Use the learning session as the default entry, with secondary library/history and map views, so students start from their current task rather than account management.
- Keep uncertainty routing in a pure shared helper and validate bounded consented evidence in server functions, so direct foundation routing and privacy limits apply consistently.
- Export Obsidian connections as client-side Markdown downloads rather than claiming direct vault writes or native sync, because the browser import grants no write access.
