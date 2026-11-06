import { describe, expect, it } from "vitest";
import { sourceType } from "./source-files";
describe("Supported demo sources", () => {
  it("accepts PDF files", () => expect(sourceType({ name: "notes.pdf", type: "application/pdf" })).toBe("PDF"));
  it("accepts image files", () => expect(sourceType({ name: "diagram.png", type: "image/png" })).toBe("Image"));
  it("accepts text files", () => expect(sourceType({ name: "notes.txt", type: "text/plain" })).toBe("Text"));
  it("accepts supported files when browsers omit MIME type", () => expect(sourceType({ name: "notes.PDF", type: "" })).toBe("PDF"));
  it("rejects unrelated files", () => expect(sourceType({ name: "program.exe", type: "application/octet-stream" })).toBeNull());
});