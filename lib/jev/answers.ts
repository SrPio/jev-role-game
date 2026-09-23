import type { Answer, JevState, Question } from "./types";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** 1 − normalized entropy: 1 when all mass is on one option, 0 when uniform. */
export function distributionConfidence(probabilities: Record<string, number>): number {
  const values = Object.values(probabilities);
  if (values.length < 2) return 1;
  const entropy = -values.reduce((acc, p) => (p > 0 ? acc + p * Math.log(p) : acc), 0);
  return clamp01(1 - entropy / Math.log(values.length));
}

type RawAnswer =
  | { type: "choice"; choice: string; probabilities?: Record<string, number> }
  | { type: "score"; score: number; probabilities?: Record<string, number> }
  | { type: "boolean"; probability: number };

/** Normalizes SDK answers and attaches Jev's confidence (or derives one). */
export function normalizeAnswers(
  raw: Record<string, RawAnswer>,
  questions: Record<string, Question>,
  confidence: Record<string, number>,
): Record<string, Answer> {
  const out: Record<string, Answer> = {};
  for (const [id, question] of Object.entries(questions)) {
    const a = raw[id];
    if (!a) continue;
    if (a.type === "choice") {
      const probabilities =
        a.probabilities ??
        Object.fromEntries(
          Object.keys(question.type === "choice" ? question.criteria : {}).map((k) => [
            k,
            k === a.choice ? 1 : 0,
          ]),
        );
      out[id] = {
        type: "choice",
        choice: a.choice,
        probabilities,
        confidence: confidence[id] ?? distributionConfidence(probabilities),
      };
    } else if (a.type === "boolean") {
      out[id] = {
        type: "boolean",
        probability: a.probability,
        confidence: confidence[id] ?? Math.abs(2 * a.probability - 1),
      };
    } else {
      const probabilities = a.probabilities ?? { [String(Math.round(a.score))]: 1 };
      out[id] = {
        type: "score",
        score: a.score,
        probabilities,
        confidence: confidence[id] ?? distributionConfidence(probabilities),
      };
    }
  }
  return out;
}

function normalize(weights: Record<string, number>) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(
    Object.entries(weights).map(([k, v]) => [k, Math.round((v / total) * 100) / 100]),
  );
}

/**
 * Offline stand-in used only when the gateway is unreachable, so the demo
 * never dead-ends. Clearly flagged as "fallback" in the UI.
 */
export function fallbackAnswers(
  questions: Record<string, Question>,
  state: JevState,
): Record<string, Answer> {
  const hp = Number(state.npcHealth ?? 1);
  const maxHp = Number(state.npcMaxHealth ?? hp) || 1;
  const hurt = hp / maxHp < 0.35;
  const healsLeft = Number(state.npcHealsLeft ?? 1);

  const raw: Record<string, RawAnswer> = {};
  for (const [id, q] of Object.entries(questions)) {
    if (q.type === "choice") {
      const weights: Record<string, number> = {};
      for (const option of Object.keys(q.criteria)) {
        let w = 0.5 + Math.random();
        if (hurt && option === "heal" && healsLeft > 0) w *= 3;
        if (hurt && option === "flee") w *= 1.5;
        if (option === "heal" && healsLeft <= 0) w *= 0.1;
        if (option === "potion" && Number(state.potions ?? 0) <= 0) w *= 0.05;
        weights[option] = w;
      }
      const probabilities = normalize(weights);
      const choice = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0][0];
      raw[id] = { type: "choice", choice, probabilities };
    } else if (q.type === "boolean") {
      raw[id] = { type: "boolean", probability: Math.round((0.3 + Math.random() * 0.4) * 100) / 100 };
    } else {
      const levels = q.criteria.length;
      const mid = (levels - 1) / 2;
      const probabilities = normalize(
        Object.fromEntries(q.criteria.map((_, i) => [String(i), 1 / (1 + Math.abs(i - mid))])),
      );
      raw[id] = { type: "score", score: mid, probabilities };
    }
  }
  return normalizeAnswers(raw, questions, {});
}
