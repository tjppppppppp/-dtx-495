import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
export function NoteMarkdown({ text }: { text: string }) {
  return <div className="note-markdown break-words text-sm leading-relaxed"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[[rehypeKatex, { trust: false, throwOnError: false }]]} components={{ a: ({ children }) => <span className="text-primary underline">{children}</span>, img: () => null }}>{text.replace(/!?\[\[([^\]]+)\]\]/g, (_, link: string) => link.split("|").pop() ?? link)}</ReactMarkdown></div>;
}