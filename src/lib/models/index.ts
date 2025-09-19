import type { GenerateParams, GenerateResult } from "./types";
import { runBananaGemini } from "./runBananaGemini";

export async function generateWith(p: GenerateParams): Promise<GenerateResult> {
  return runBananaGemini(p);
}
