export type KState = "Seen" | "Recovered" | "Understood" | "Applied" | "Verified" | "Connected" | "Uncertain";
export type EdgeState = "Source Verified" | "Student Verified" | "AI Suggested" | "Needs Review";
export type Trust = "Source" | "Derived from source" | "AI explanation" | "Needs verification";

export const courses = [
  { code: "ECE 340", name: "Semiconductor Electronics", term: "Fall 2026", progress: 62 },
  { code: "ECE 310", name: "Digital Signal Processing", term: "Fall 2026", progress: 48 },
  { code: "ECE 313", name: "Probability with Engineering Applications", term: "Fall 2026", progress: 71 },
  { code: "ECE 210", name: "Analog Signal Processing", term: "Spring 2026", progress: 100 },
  { code: "PHYS 212", name: "Electricity & Magnetism", term: "Fall 2025", progress: 100 },
];

export const sessions = [
  { id: "pn", title: "PN junction built-in voltage", course: "ECE 340", status: "In progress", gap: "Connection", when: "Now" },
  { id: "fr", title: "Frequency response of LTI systems", course: "ECE 310", status: "Verified", gap: "Retrieval", when: "2 days ago" },
  { id: "rs", title: "Autocorrelation of random signals", course: "ECE 313", status: "Verified", gap: "Connection", when: "Last week" },
];

export const gaps = { Retrieval: 2, Connection: 1, Foundation: 0, Misconception: 0 };

export type GNode = { id: string; label: string; course: string; x: number; y: number; state: KState };
export type GEdge = {
  from: string; to: string; rel: string; state: EdgeState;
  why: string; math?: string; sources: string[]; discovered: string; evidence: string; verified: string;
};

export const nodes: GNode[] = [
  { id: "ef", label: "Electric Fields", course: "PHYS 212", x: 90, y: 80, state: "Verified" },
  { id: "gauss", label: "Gauss's Law", course: "PHYS 212", x: 90, y: 210, state: "Recovered" },
  { id: "diff", label: "Carrier Diffusion", course: "ECE 340", x: 330, y: 60, state: "Applied" },
  { id: "pn", label: "PN Junction Equilibrium", course: "ECE 340", x: 560, y: 150, state: "Uncertain" },
  { id: "boltz", label: "Boltzmann Statistics", course: "ECE 340", x: 330, y: 250, state: "Understood" },
  { id: "ft", label: "Fourier Transform", course: "ECE 210", x: 90, y: 360, state: "Verified" },
  { id: "fr", label: "Frequency Response", course: "ECE 310", x: 330, y: 400, state: "Connected" },
  { id: "filt", label: "Filter Design", course: "ECE 310", x: 560, y: 400, state: "Seen" },
  { id: "pd", label: "Probability Distributions", course: "ECE 313", x: 330, y: 520, state: "Verified" },
  { id: "rsig", label: "Random Signals", course: "ECE 313", x: 560, y: 520, state: "Connected" },
];

export const edges: GEdge[] = [
  { from: "ef", to: "pn", rel: "drives drift current", state: "Student Verified", why: "The depletion-region field produces drift current that balances diffusion at equilibrium.", sources: ["PHYS 212 Notes, Lecture 6", "ECE 340 Lecture 11 slides"], discovered: "PN junction built-in voltage session", evidence: "Explained drift/diffusion balance in own words", verified: "Nov 5, 2026" },
  { from: "diff", to: "pn", rel: "balanced by drift", state: "Source Verified", why: "Concentration gradients across the junction drive diffusion current.", sources: ["ECE 340 HW 4, Problem 2"], discovered: "PN junction built-in voltage session", evidence: "Solved HW 4 diffusion problem", verified: "Oct 28, 2026" },
  { from: "boltz", to: "pn", rel: "gives carrier ratio", state: "AI Suggested", why: "The Boltzmann relation links the carrier concentration ratio to the potential difference.", math: String.raw`V_{\mathrm{bi}} = \frac{kT}{q}\ln\!\left(\frac{N_A N_D}{n_i^2}\right)`, sources: ["General explanation"], discovered: "PN junction built-in voltage session", evidence: "Not yet demonstrated", verified: "N/A" },
  { from: "gauss", to: "ef", rel: "computes", state: "Needs Review", why: "Gauss's law gives the field from depletion charge.", sources: ["PHYS 212 Notes, Lecture 4"], discovered: "Recovered during PN session", evidence: "Partial, used hints", verified: "N/A" },
  { from: "ft", to: "fr", rel: "supports", state: "Student Verified", why: "Frequency response is the Fourier transform of the impulse response.", sources: ["ECE 210 Notes, Lecture 14", "ECE 310 HW 2"], discovered: "Frequency response session", evidence: "Solved transfer problem independently", verified: "Nov 3, 2026" },
  { from: "fr", to: "filt", rel: "later reused in", state: "AI Suggested", why: "Filter specifications are defined in terms of the frequency-response magnitude.", math: String.raw`\left|H\!\left(e^{j\omega}\right)\right|`, sources: ["ECE 310 syllabus"], discovered: "Predicted", evidence: "Upcoming topic", verified: "N/A" },
  { from: "pd", to: "rsig", rel: "underlies", state: "Student Verified", why: "Random signals are indexed families of random variables.", sources: ["ECE 313 Lecture 19"], discovered: "Autocorrelation session", evidence: "Explained correctly", verified: "Oct 30, 2026" },
];

export const stateTone: Record<KState, string> = {
  Seen: "bg-muted text-muted-foreground",
  Recovered: "bg-accent text-accent-foreground",
  Understood: "bg-derived/15 text-derived",
  Applied: "bg-primary/15 text-primary",
  Verified: "bg-success/15 text-success",
  Connected: "bg-success/25 text-success",
  Uncertain: "bg-verify/15 text-verify",
};

export const edgeTone: Record<EdgeState, string> = {
  "Source Verified": "var(--source)",
  "Student Verified": "var(--success)",
  "AI Suggested": "var(--ai)",
  "Needs Review": "var(--verify)",
};

export const trustTone: Record<Trust, string> = {
  Source: "bg-source/15 text-source",
  "Derived from source": "bg-derived/15 text-derived",
  "AI explanation": "bg-ai/15 text-ai",
  "Needs verification": "bg-verify/15 text-verify",
};
