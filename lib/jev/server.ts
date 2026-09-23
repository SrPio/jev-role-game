import "server-only";
import { experimental_evaluate as evaluate } from "ai";
import { fallbackAnswers, normalizeAnswers } from "./answers";
import { getEncounter, type EncounterId } from "./encounters";
import type { JevDecision, JevState } from "./types";

export const JEV_MODEL = "typesafe-ai/jev";

/** Asks Jev (via Vercel AI Gateway) every question of an encounter in one call. */
export async function askJev(
  encounterId: EncounterId,
  state: JevState,
): Promise<Omit<JevDecision, "id">> {
  const encounter = getEncounter(encounterId);
  const started = performance.now();
  const base = { encounterId, npc: encounter.npc, state };

  try {
    const result = await evaluate({
      model: JEV_MODEL,
      state,
      questions: encounter.questions,
      maxRetries: 2,
      abortSignal: AbortSignal.timeout(15_000),
    });
    const typesafe = result.providerMetadata?.typesafe as
      | { confidence?: Record<string, number> }
      | undefined;
    return {
      ...base,
      answers: normalizeAnswers(result.answers, encounter.questions, typesafe?.confidence ?? {}),
      latencyMs: Math.round(performance.now() - started),
      usage: {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
      },
      source: "jev",
    };
  } catch (error) {
    console.error(`[jev] ${encounterId} failed, using fallback:`, error);
    return {
      ...base,
      answers: fallbackAnswers(encounterId, state),
      latencyMs: Math.round(performance.now() - started),
      source: "fallback",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
