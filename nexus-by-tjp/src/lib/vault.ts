import { parse } from "yaml";

export type VaultNote = { path: string; title: string; folder: string; course: string; tags: string[]; aliases: string[]; links: string[]; backlinks: string[]; modified: number; body: string; metadata: Record<string, unknown> };
export type VaultHit = { note: VaultNote; excerpt: string; heading: string; score: number; linked: VaultNote[] };
export const defaultExclusions = ".obsidian, .git, .trash, Private, Journal, Passwords";
export function normalizePath(path: string) { return path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+|\/+$/g, ""); }
export function inScope(path: string, allowed: string[], excluded: string[]): boolean {
  const normalized = normalizePath(path);
  if (!/\.md$/i.test(normalized) || normalized.split("/").includes("..")) return false;
  const lower = normalized.toLowerCase();
  if (excluded.some((entry) => {
    const folder = normalizePath(entry).toLowerCase();
    return folder && (lower === folder || lower.startsWith(folder + "/") || normalized.split("/").some((part) => part.toLowerCase() === folder));
  })) return false;
  return allowed.some((entry) => { const folder = normalizePath(entry); return !folder || normalized === folder || normalized.startsWith(folder + "/"); });
}
function strings(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return typeof value === "string" ? value.split(/[,\s]+/).filter(Boolean) : [];
}
export function parseNote(path: string, text: string, modified: number): VaultNote {
  const front = text.replace(/^\uFEFF/, "").match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  let metadata: Record<string, unknown> = {};
  if (front) {
    const parsed: unknown = parse(front[1] ?? "", { maxAliasCount: 20 });
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) metadata = parsed as Record<string, unknown>;
  }
  const body = front ? text.replace(/^\uFEFF/, "").slice(front[0].length) : text;
  const normalized = normalizePath(path);
  const folder = normalized.includes("/") ? normalized.slice(0, normalized.lastIndexOf("/")) : "";
  const title = typeof metadata["title"] === "string" ? metadata["title"] : body.match(/^#\s+(.+)$/m)?.[1] ?? normalized.split("/").pop()?.replace(/\.md$/i, "") ?? "Untitled";
  const course = typeof metadata["course"] === "string" ? metadata["course"] : folder.match(/(?:ECE|PHYS|MATH|CS)[ -]?\d{3}/i)?.[0] ?? "Unassigned";
  const inlineTags = [...body.matchAll(/(?:^|\s)#([\p{L}\p{N}_/-]+)/gu)].map((match) => match[1] ?? "").filter(Boolean);
  const links = [...body.matchAll(/!?\[\[([^\]]+)\]\]/g)].map((match) => (match[1] ?? "").split("|")[0]?.split("#")[0] ?? "").filter(Boolean);
  for (const match of body.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    let target = (match[1] ?? "").replace(/^<|>$/g, "").split("#")[0] ?? "";
    try { target = decodeURIComponent(target); } catch { /* preserve malformed local link */ }
    if (/\.md$/i.test(target) && !/^[a-z]+:/i.test(target)) links.push(target);
  }
  return { path: normalized, title, folder, course, tags: [...new Set([...strings(metadata["tags"]).map((tag) => tag.replace(/^#/, "")), ...inlineTags])], aliases: typeof metadata["aliases"] === "string" ? [metadata["aliases"]] : strings(metadata["aliases"]), links: [...new Set(links)], backlinks: [], modified, body, metadata };
}
export function resolveLink(note: VaultNote, target: string, notes: VaultNote[]): VaultNote | undefined {
  const clean = normalizePath(target).replace(/\.md$/i, "").toLowerCase();
  const relativeParts = `${note.folder}/${target}`.split("/");
  const resolved: string[] = [];
  relativeParts.forEach((part) => { if (part === "..") resolved.pop(); else if (part && part !== ".") resolved.push(part); });
  const relative = resolved.join("/").replace(/\.md$/i, "").toLowerCase();
  const vaultRoot = note.path.split("/")[0] ?? "";
  const rooted = `${vaultRoot}/${clean}`.toLowerCase();
  const exact = notes.find((item) => item.path.replace(/\.md$/i, "").toLowerCase() === relative) ?? notes.find((item) => item.path.replace(/\.md$/i, "").toLowerCase() === clean) ?? notes.find((item) => item.path.replace(/\.md$/i, "").toLowerCase() === rooted);
  if (exact) return exact;
  const matches = notes.filter((item) => [item.title, item.path.split("/").pop()?.replace(/\.md$/i, "") ?? "", ...item.aliases].some((name) => name.toLowerCase() === clean));
  return matches.length === 1 ? matches[0] : undefined;
}
export function indexNotes(notes: VaultNote[]): VaultNote[] {
  const indexed = notes.map((note) => ({ ...note, backlinks: [] as string[] }));
  indexed.forEach((note) => note.links.forEach((link) => { const target = resolveLink(note, link, indexed); if (target && !target.backlinks.includes(note.path)) target.backlinks.push(note.path); }));
  return indexed;
}
const stop = new Set("a an the and or of to in is it on for with how why what where from current problem learning session understand explain me my i im working dont comes equation material notes course ece phys math cs".split(" "));
function terms(text: string) { return text.toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter((term) => term.length > 1 && !stop.has(term) && !/^\d+$/.test(term)) ?? []; }

// Preprocessing (splitting sections, tokenizing chunks) is the expensive part of
// retrieval and depends only on the note, so cache it per note object. Without
// this, every keystroke re-tokenizes the whole vault and typing stutters.
type PreparedChunk = { excerpt: string; heading: string; bodyTerms: string[] };
type PreparedNote = { titleTerms: string[]; chunks: PreparedChunk[] };
const preparedCache = new WeakMap<VaultNote, PreparedNote>();
function prepareNote(note: VaultNote): PreparedNote {
  const cached = preparedCache.get(note);
  if (cached) return cached;
  const titleTerms = terms(`${note.title} ${note.tags.join(" ")} ${note.aliases.join(" ")}`);
  const chunks = note.body
    .split(/(?=^#{1,6}\s)/m)
    .filter((section) => section.trim())
    .flatMap((section) => {
      const heading = section.match(/^#{1,6}\s+(.+)/)?.[1] ?? note.title;
      return (section.match(/[\s\S]{1,1000}(?:\s|$)/g) ?? [section]).map((excerpt) => ({
        excerpt: excerpt.trim(),
        heading,
        bodyTerms: terms(excerpt),
      }));
    });
  const prepared = { titleTerms, chunks };
  preparedCache.set(note, prepared);
  return prepared;
}

export function retrieveNotes(notes: VaultNote[], query: string, course = "", limit = 4): VaultHit[] {
  const queryTerms = [...new Set(terms(query))];
  if (!queryTerms.length) return [];
  const scored = notes.flatMap((note) => {
    const { titleTerms, chunks } = prepareNote(note);
    const passages = chunks.map(({ excerpt, heading, bodyTerms }) => {
      const matched = queryTerms.filter((term) => titleTerms.includes(term) || bodyTerms.includes(term));
      const score = matched.reduce((sum, term) => sum + (titleTerms.includes(term) ? 3 : 0) + (bodyTerms.includes(term) ? 1 : 0), 0);
      return { excerpt, heading, score, matched: matched.length };
    }).sort((a, b) => b.score - a.score);
    const best = passages[0];
    if (!best || best.matched < Math.min(2, queryTerms.length)) return [];
    return [{ note, excerpt: best.excerpt, heading: best.heading, score: best.score + (note.course.toLowerCase() === course.toLowerCase() ? .5 : 0), linked: [] as VaultNote[] }];
  }).sort((a, b) => b.score - a.score || a.note.path.localeCompare(b.note.path)).slice(0, limit);
  return scored.map((hit) => ({ ...hit, linked: hit.note.links.map((link) => resolveLink(hit.note, link, notes)).filter((note): note is VaultNote => Boolean(note)) }));
}