import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MathTex, normalizeMathTex } from "./Math";

describe("MathTex", () => {
  const equation = String.raw`I_n=I_{n,\mathrm{drift}}+I_{n,\mathrm{diff}}`;

  it.each([
    equation,
    `$${equation}$`,
    `$$${equation}$$`,
    `\\[${equation}\\]`,
    `\\(${equation}\\)`,
    `  $$\n${equation}\n$$  `,
    `$$\\[${equation}\\]$$`,
  ])("renders bare and delimiter-wrapped engineering math: %s", (tex) => {
    expect(normalizeMathTex(tex)).toBe(equation);
    // Parsing/rendering is the regression: previously wrapped input threw.
    expect(() => renderToStaticMarkup(<MathTex tex={tex} block />)).not.toThrow();
    expect(renderToStaticMarkup(<MathTex tex={tex} block />)).toContain('<math xmlns=');
  });

  it.each([
    String.raw`V_{bi} = \frac{kT}{q}\ln\left(\frac{N_A N_D}{n_i^2}\right)`,
    String.raw`J_n = q\mu_n nE + qD_n\frac{dn}{dx}`,
    String.raw`\frac{D_n}{\mu_n} = \frac{kT}{q}`,
    String.raw`\begin{aligned} J_n &= 0 \\ q\mu_n nE + qD_n\frac{dn}{dx} &= 0 \\ E &= -\frac{D_n}{\mu_n}\frac{1}{n}\frac{dn}{dx} \end{aligned}`,
    String.raw`\int_0^{W} E\,dx = V_{bi}, \quad \nabla \cdot \vec{E} = \frac{\rho}{\varepsilon}`,
  ])("renders the acceptance equations cleanly: %s", (tex) => {
    const html = renderToStaticMarkup(<MathTex tex={tex} block />);
    expect(html).toContain('<math xmlns=');
    expect(html).not.toContain("Equation unavailable");
  });

  it("preserves escaped dollar symbols inside an expression", () => {
    const tex = String.raw`\text{Cost: }\$5`;
    expect(normalizeMathTex(tex)).toBe(tex);
    expect(renderToStaticMarkup(<MathTex tex={tex} />)).toContain('<math xmlns=');
  });

  it.each([String.raw`\frac{1}{`, String.raw`\unknowncommand{x}`, "", "$x"])(
    "isolates malformed math without crashing the lesson: %s", (tex) => {
      const html = renderToStaticMarkup(<><MathTex tex={tex} /><MathTex tex="x^2" /></>);
      expect(html).toContain("Equation unavailable");
      expect(html).toContain('<math xmlns=');
    },
  );
});