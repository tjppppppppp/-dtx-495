import { describe, expect, it } from "vitest";
import { needsFoundation, foundationPrerequisites, connectionMarkdown } from "./learning-routing";

describe("help-first routing", () => {
  for (const statement of ["I don't know", "I don't even know", "I have no idea", "I never learned this", "None of this makes sense"]) {
    it(`starts foundation teaching for ${statement}`, () => expect(needsFoundation(statement)).toBe(true));
  }
  it("does not override a demonstrated connection question", () => {
    expect(needsFoundation("I understand diffusion and fields but cannot connect them")).toBe(false);
    expect(needsFoundation("It isn't true that I don't know diffusion")).toBe(false);
  });
  it("builds the three specified PN prerequisites in order", () => {
    expect(foundationPrerequisites("PN-junction built-in potential")).toEqual(["Carrier diffusion", "The depletion region", "The internal electric field"]);
  });
  it("exports source paths as vault links without inventing verification", () => {
    const text = connectionMarkdown({ problem: "PN junction", prerequisite: "Diffusion", rationale: "Balance", explanation: "Theory", sources: ["ECE 340/Diffusion.md"], verified: false });
    expect(text).toContain("[[ECE 340/Diffusion]]");
    expect(text).toContain("Status: Needs Review");
    expect(text).not.toContain("Status: Student Verified");
  });
});