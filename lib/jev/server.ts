import "server-only";
import { experimental_evaluate as evaluate } from "ai";
import { fallbackAnswers, normalizeAnswers } from "./answers";
import type { EvalSpec, JevDecision, JevState } from "./types";

export const JEV_MODEL = "typesafe-ai/jev";

/** Asks Jev (via Vercel AI Gateway) every question of a spec in one call. */
export async function askJev(spec: EvalSpec, state: JevState): Promise<Omit<JevDecision, "id">> {
  const started = performance.now();
  const { questions, ...info } = spec;
  const base = { ...info, state };

  try {
    const result = await evaluate({
      model: JEV_MODEL,
      state,
      questions,
      maxRetries: 2,
      abortSignal: AbortSignal.timeout(15_000),
    });
    const typesafe = result.providerMetadata?.typesafe as
      | { confidence?: Record<string, number> }
      | undefined;
    return {
      ...base,
      answers: normalizeAnswers(result.answers, questions, typesafe?.confidence ?? {}),
      latencyMs: Math.round(performance.now() - started),
      usage: {
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
      },
      source: "jev",
    };
  } catch (error) {
    console.error(`[jev] ${spec.encounterId} failed, using fallback:`, error);
    return {
      ...base,
      answers: fallbackAnswers(questions, state),
      latencyMs: Math.round(performance.now() - started),
      source: "fallback",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
