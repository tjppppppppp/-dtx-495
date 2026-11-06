import { describe, expect, it } from "vitest";
import { checkUnderstanding } from "./understanding";

describe("PN junction demo understanding check", () => {
  const answer = "Diffusion uncovers dopant ions, creating a field whose drift current balances diffusion.";
  it("requires both the causal chain and the worked application", () => {
    expect(checkUnderstanding(answer, "0.774").ready).toBe(true);
    expect(checkUnderstanding(answer, "0.2").ready).toBe(false);
    expect(checkUnderstanding("field diffusion", "0.774").ready).toBe(false);
    expect(checkUnderstanding(answer, "").ready).toBe(false);
  });
});