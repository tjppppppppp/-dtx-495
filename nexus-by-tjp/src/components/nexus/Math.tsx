import katex from "katex";

// AI responses and saved notes can include Markdown math delimiters. KaTeX
// expects the expression inside those delimiters, not the delimiters themselves.
export function normalizeMathTex(tex: string): string {
  let expression = tex.trim();
  const wrappers = [["$$", "$$"], ["\\[", "\\]"], ["\\(", "\\)"], ["$", "$"]] as const;
  while (expression) {
    const wrapper = wrappers.find(([start, end]) =>
      expression.length >= start.length + end.length &&
      expression.startsWith(start) && expression.endsWith(end) &&
      (end !== "$" || expression.at(-2) !== "\\"),
    );
    if (!wrapper) break;
    expression = expression.slice(wrapper[0].length, -wrapper[1].length).trim();
  }
  return expression;
}

export function MathTex({ tex, block = false }: { tex: string; block?: boolean }) {
  const className = block ? "math-block" : "math-inline";
  try {
    const expression = normalizeMathTex(tex);
    if (!expression) return <span className={className}>Equation unavailable.</span>;
    const html = katex.renderToString(expression, { displayMode: block, throwOnError: true, output: "htmlAndMathml", strict: "ignore", trust: false });
    return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    // One malformed generated equation must never take down the entire lesson.
    return <span className={className}>Equation unavailable: invalid math notation.</span>;
  }
}