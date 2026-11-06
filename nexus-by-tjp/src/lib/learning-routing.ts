export function needsFoundation(statement: string): boolean {
  const normalized = statement.toLowerCase().replace(/[’']/g, "").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  if (/\b(?:not true|isnt true|is not true|used to|used to say)\b/.test(normalized)) return false;
  return /\b(?:i (?:dont|do not) (?:even )?know|i have no idea|i never learned (?:this|it)|none of this makes sense)\b/.test(normalized);
}

export function foundationPrerequisites(problem: string): string[] {
  return /pn[- ]?junction|depletion|built[- ]?in (?:voltage|potential)/i.test(problem)
    ? ["Carrier diffusion", "The depletion region", "The internal electric field"]
    : [];
}

export function connectionMarkdown(args: { problem: string; prerequisite: string; explanation: string; rationale: string; sources: string[]; verified: boolean }): string {
  const wiki = (text: string) => `[[${text.replace(/[[\]\r\n]/g, " ")}]]`;
  return `# Nexus learning connection\n\nStatus: ${args.verified ? "Student Verified" : "Needs Review"}\n\n## Original problem\n${args.problem}\n\n## Connection\n${wiki(args.prerequisite)} → ${args.problem}\n\n${args.rationale}\n\n## Explanation\n${args.explanation}\n\n## Supporting notes\n${args.sources.map((path) => `- ${wiki(path.replace(/\.md$/i, ""))}`).join("\n") || "No supporting notes retrieved."}\n\nGenerated with Nexus. Source notes are not independently verified.\n`;
}