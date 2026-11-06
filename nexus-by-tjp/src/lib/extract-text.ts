// Client-side text extraction for uploaded sources.
// Runs in the browser; only the extracted text and metadata are saved.

export type ExtractResult =
  | { ok: true; text: string; note?: string }
  | { ok: false; reason: string };

const TEXT_TYPES = new Set(["txt", "md", "markdown", "csv", "json", "log"]);

function extOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return (m?.[1] ?? "").toLowerCase();
}

export function isImageFile(name: string, mime: string): boolean {
  return mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extOf(name));
}

export async function extractText(file: File): Promise<ExtractResult> {
  const ext = extOf(file.name);
  try {
    if (TEXT_TYPES.has(ext) || file.type.startsWith("text/")) {
      return { ok: true, text: await file.text() };
    }
    if (ext === "pdf" || file.type === "application/pdf") {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const parts: string[] = [];
      const maxPages = Math.min(doc.numPages, 60);
      for (let p = 1; p <= maxPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        parts.push(
          content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" "),
        );
      }
      const text = parts.join("\n\n").trim();
      return text
        ? { ok: true, text, note: `Extracted ${maxPages} page(s).` }
        : { ok: false, reason: "No readable text found in this PDF (it may be scanned images)." };
    }
    if (ext === "docx") {
      const mammoth = await import("mammoth/mammoth.browser");
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      const text = result.value.trim();
      return text
        ? { ok: true, text }
        : { ok: false, reason: "No readable text found in this document." };
    }
    if (isImageFile(file.name, file.type)) {
      return { ok: false, reason: "image" }; // images are stored as visual sources, not text-indexed
    }
    return { ok: false, reason: `Unsupported file type (.${ext || "unknown"}).` };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Could not read this file." };
  }
}
