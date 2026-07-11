export async function loadModel() {
  throw new Error("Local model loading not supported in standard web browser.");
}
export const LLAMA_3_2_1B_INST_Q4_0 = "Llama-3.2-1B-Inst-Q4";
export function completion() {
  return {};
}
export async function unloadModel() {
  return true;
}
