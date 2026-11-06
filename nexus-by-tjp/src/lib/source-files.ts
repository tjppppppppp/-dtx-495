export const sourceAccept = ".pdf,.docx,image/*,.txt,.md,.markdown,.csv,.log,text/*";
export function sourceType(file: { name: string; type: string }): "PDF" | "DOCX" | "Image" | "Text" | null {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return "PDF";
  if (/\.docx$/i.test(file.name) || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "DOCX";
  if (file.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp|tiff?|avif|heic)$/i.test(file.name)) return "Image";
  if (file.type.startsWith("text/") || /\.(txt|md|markdown|csv|log)$/i.test(file.name)) return "Text";
  return null;
}
