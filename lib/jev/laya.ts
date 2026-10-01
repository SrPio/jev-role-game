import "server-only";
import type { JevState, Question } from "./types";

/**
 * Client for a self-hosted Laya server (`laya-serve`), which speaks the same
 * `POST /v1/systemone` protocol as Jev. Laya calls yes/no questions "noul".
 */
const DEFAULT_BASE_URL = "http://localhost:8000";

type LayaQuestion =
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string; criteria: string[] }
  | { type: "noul"; instructions: string; criteria: { false: string; true: string } };

type LayaAnswer =
  | { type: "choice"; choice: string; probabilities?: Record<string, number>; confidence?: number }
  | { type: "score"; score: number; probabilities?: Record<string, number>; confidence?: number }
  | { type: "noul"; noul: number; confidence?: number };

type LayaResponse = {
  model?: string;
  answers: Record<string, LayaAnswer>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export type LayaRawAnswer =
  | { type: "choice"; choice: string; probabilities?: Record<string, number> }
  | { type: "score"; score: number; probabilities?: Record<string, number> }
  | { type: "boolean"; probability: number };

function toLayaQuestions(questions: Record<string, Question>): Record<string, LayaQuestion> {
  return Object.fromEntries(
    Object.entries(questions).map(([id, q]): [string, LayaQuestion] => {
      if (q.type !== "boolean") return [id, q];
      return [
        id,
        {
          type: "noul",
          instructions: q.instructions,
          criteria: { false: q.criteria?.false ?? "no", true: q.criteria?.true ?? "yes" },
        },
      ];
    }),
  );
}

/** Laya reads state as text; flatten lists so every value is a plain scalar. */
function toLayaState(state: JevState) {
  return Object.fromEntries(
    Object.entries(state).map(([k, v]) => [k, Array.isArray(v) ? v.join("; ") : v]),
  );
}

export async function evaluateWithLaya(state: JevState, questions: Record<string, Question>) {
  const baseUrl = (process.env.LAYA_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.LAYA_API_KEY) headers.Authorization = `Bearer ${process.env.LAYA_API_KEY}`;

  const res = await fetch(`${baseUrl}/v1/systemone`, {
    method: "POST",
    headers,
    body: JSON.stringify({ state: toLayaState(state), questions: toLayaQuestions(questions) }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Laya HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as LayaResponse;

  const answers: Record<string, LayaRawAnswer> = {};
  // Laya's choice/score confidence is 1 − normalized entropy, same as ours. For
  // noul it reports max(p, 1−p), so leave it out and let normalizeAnswers derive |2p−1|.
  const confidence: Record<string, number> = {};
  for (const [id, a] of Object.entries(body.answers ?? {})) {
    if (a.type === "noul") {
      answers[id] = { type: "boolean", probability: a.noul };
      continue;
    }
    answers[id] = a;
    if (typeof a.confidence === "number") confidence[id] = a.confidence;
  }

  return {
    answers,
    confidence,
    model: body.model,
    usage: { inputTokens: body.usage?.input_tokens, outputTokens: body.usage?.output_tokens },
  };
}
