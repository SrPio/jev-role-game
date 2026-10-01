import "server-only";
import { experimental_evaluate as evaluate } from "ai";
import { fallbackAnswers, normalizeAnswers } from "./answers";
import { evaluateWithLaya } from "./laya";
import {
  DECISION_PROVIDERS,
  PROVIDER_INFO,
  type DecisionProvider,
  type EvalSpec,
  type JevDecision,
  type JevState,
  type Question,
} from "./types";

export const JEV_MODEL = PROVIDER_INFO.jev.model;

const isProvider = (v: unknown): v is DecisionProvider =>
  DECISION_PROVIDERS.includes(v as DecisionProvider);

/** The engine used when the client doesn't pick one: `DECISION_PROVIDER`, else Jev. */
export function defaultProvider(): DecisionProvider {
  const env = process.env.DECISION_PROVIDER?.trim().toLowerCase();
  return isProvider(env) ? env : "jev";
}

export const resolveProvider = (requested?: DecisionProvider) => requested ?? defaultProvider();

async function evaluateWithJev(state: JevState, questions: Record<string, Question>) {
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
    answers: result.answers,
    confidence: typesafe?.confidence ?? {},
    usage: { inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens },
  };
}

/** Asks the chosen engine every question of a spec in one call. */
export async function askDecision(
  spec: EvalSpec,
  state: JevState,
  provider: DecisionProvider,
): Promise<Omit<JevDecision, "id">> {
  const started = performance.now();
  const { questions, ...info } = spec;
  const base = { ...info, state, provider };

  try {
    const result =
      provider === "laya" ? await evaluateWithLaya(state, questions) : await evaluateWithJev(state, questions);
    return {
      ...base,
      answers: normalizeAnswers(result.answers, questions, result.confidence),
      latencyMs: Math.round(performance.now() - started),
      usage: result.usage,
      source: provider,
    };
  } catch (error) {
    console.error(`[${provider}] ${spec.encounterId} failed, using fallback:`, error);
    return {
      ...base,
      answers: fallbackAnswers(questions, state),
      latencyMs: Math.round(performance.now() - started),
      source: "fallback",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
