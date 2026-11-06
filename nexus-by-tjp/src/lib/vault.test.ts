import { describe, expect, it } from "vitest";
import { inScope, parseNote, indexNotes, retrieveNotes, resolveLink } from "./vault";

const note = (path: string, body: string) => parseNote(path, body, 1793923200000);
describe("Obsidian privacy scope", () => {
  it("indexes only the allowed folder", () => {
    expect(inScope("Vault/ECE 340/PN.md", ["Vault/ECE 340"], [])).toBe(true);
    expect(inScope("Vault/Journal/PN.md", ["Vault/ECE 340"], [])).toBe(false);
    expect(inScope("Vault/ECE 340-extra/PN.md", ["Vault/ECE 340"], [])).toBe(false);
  });
  it("exclusions override an allowed entire vault", () => {
    expect(inScope("Vault/Private/PN.md", ["Vault"], ["Private"])).toBe(false);
    expect(inScope("Vault/.obsidian/settings.md", ["Vault"], [".obsidian"])).toBe(false);
  });
  it("does not index attachments or parent traversal paths", () => {
    expect(inScope("Vault/diagram.png", ["Vault"], [])).toBe(false);
    expect(inScope("Vault/../secret.md", ["Vault"], [])).toBe(false);
  });
});
describe("Vault metadata and links", () => {
  it("preserves title, path, course, tags, modification date and metadata", () => {
    const parsed = note("Vault/ECE 340/PN.md", "---\ntitle: PN equilibrium\ncourse: ECE 340\ntags: [semiconductor, junction]\naliases: [Built-in voltage]\ncustom: kept\n---\n# PN\n#diffusion\n[[Electric Fields|field]]");
    expect(parsed).toMatchObject({ title: "PN equilibrium", path: "Vault/ECE 340/PN.md", folder: "Vault/ECE 340", course: "ECE 340", tags: ["semiconductor", "junction", "diffusion"], links: ["Electric Fields"], modified: 1793923200000, metadata: { custom: "kept" } });
  });
  it("resolves wikilinks and backlinks inside the indexed scope", () => {
    const indexed = indexNotes([note("Vault/ECE 340/PN.md", "# PN\n[[Electric Fields#Drift|field]]"), note("Vault/PHYS 212/Electric Fields.md", "# Electric Fields\nDrift")]);
    expect(indexed[1]?.backlinks).toEqual(["Vault/ECE 340/PN.md"]);
    if (!indexed[0]) throw new Error("Missing test note");
    expect(resolveLink(indexed[0], "Private Journal", indexed)).toBeUndefined();
  });
  it("resolves relative Markdown links and avoids ambiguous basename matches", () => {
    const indexed = indexNotes([note("Vault/ECE 340/PN.md", "# PN\n[Drift](../PHYS%20212/Field.md)"), note("Vault/PHYS 212/Field.md", "# Field"), note("Vault/ECE 210/Field.md", "# Field")]);
    expect(indexed[1]?.backlinks).toEqual(["Vault/ECE 340/PN.md"]);
    if (!indexed[0]) throw new Error("Missing test note");
    expect(resolveLink(indexed[0], "Field", indexed)).toBeUndefined();
  });
  it("resolves vault-root-relative Obsidian links", () => {
    const indexed = indexNotes([note("Vault/ECE 340/PN.md", "# PN\n[[PHYS 212/Field]]"), note("Vault/PHYS 212/Field.md", "# Field")]);
    expect(indexed[1]?.backlinks).toEqual(["Vault/ECE 340/PN.md"]);
  });
});
describe("Problem-relevant retrieval", () => {
  const notes = indexNotes([note("Vault/ECE 340/PN.md", "# PN junction equilibrium\nDiffusion and drift balance the built-in voltage. [[Electric Fields]]"), note("Vault/PHYS 212/Electric Fields.md", "# Electric Fields\nFields create drift current."), note("Vault/ECE 210/Fourier.md", "# Fourier transform\nFrequency response supports filter design.")]);
  it("retrieves relevant material rather than every indexed note", () => {
    const hits = retrieveNotes(notes, "Explain PN junction built-in voltage", "ECE 340");
    expect(hits.map((hit) => hit.note.path)).toEqual(["Vault/ECE 340/PN.md"]);
    expect(hits[0]?.linked.map((linked) => linked.path)).toEqual(["Vault/PHYS 212/Electric Fields.md"]);
    expect(hits[0]?.excerpt).toContain("Diffusion and drift");
  });
  it("returns no unrelated evidence for an unmatched problem", () => {
    expect(retrieveNotes(notes, "Explain thermodynamics entropy")).toEqual([]);
    expect(retrieveNotes(notes, "the and a")).toEqual([]);
  });
  it("only resolves linked content in the retrieval scope", () => {
    expect(retrieveNotes(notes.slice(0, 1), "PN junction")[0]?.linked).toEqual([]);
  });
});