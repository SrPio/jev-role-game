import type { GameState } from "@/lib/story/types";
import { fallbackAnswers } from "./answers";
import { encounterSpec, type EncounterId } from "./encounters";
import { heroChoiceSpec, type HeroPersonality } from "./hero";
import type { EvalSpec, JevDecision, JevState } from "./types";

let counter = 0;
const nextId = () => `d${Date.now().toString(36)}${(counter++).toString(36)}`;

/** POSTs to a Jev route; if it can't be reached, answers locally so the game never stalls. */
async function post(url: string, body: unknown, spec: EvalSpec, state: JevState): Promise<JevDecision> {
  const started = performance.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const decision = (await res.json()) as Omit<JevDecision, "id">;
    return { ...decision, id: nextId() };
  } catch (error) {
    const { questions, ...info } = spec;
    return {
      ...info,
      id: nextId(),
      state,
      answers: fallbackAnswers(questions, state),
      latencyMs: Math.round(performance.now() - started),
      source: "fallback",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function requestDecision(encounterId: EncounterId, state: JevState): Promise<JevDecision> {
  return post("/api/decide", { encounterId, state }, encounterSpec(encounterId), state);
}

export function requestHeroChoice(
  nodeId: string,
  game: GameState,
  personality: HeroPersonality,
  recentEvents: string[],
): Promise<JevDecision> {
  const built = heroChoiceSpec(nodeId, game, personality, recentEvents);
  if (!built) return Promise.reject(new Error(`Node ${nodeId} is not a choice`));
  return post("/api/hero", { nodeId, game, personality, recentEvents }, built.spec, built.state);
}
