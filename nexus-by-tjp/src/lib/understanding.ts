export function checkUnderstanding(explanation: string, voltage: string) {
  const text = explanation.toLowerCase();
  const causal = /diffus/.test(text) && /ion|dopant/.test(text) && /field/.test(text) && /drift/.test(text) && /balanc|cancel|oppos/.test(text);
  const value = Number(voltage.trim());
  const application = voltage.trim() !== "" && Number.isFinite(value) && Math.abs(value - 0.774) <= 0.025;
  return { causal, application, ready: causal && application };
}