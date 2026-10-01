import type { GameState } from "@/lib/story/types";
import { fallbackAnswers } from "./answers";
import { encounterSpec, type EncounterId } from "./encounters";
import { heroChoiceSpec, type HeroPersonality } from "./hero";
import type { DecisionProvider, EvalSpec, JevDecision, JevState } from "./types";

let counter = 0;
const nextId = () => `d${Date.now().toString(36)}${(counter++).toString(36)}`;

/** POSTs to a decision route; if it can't be reached, answers locally so the game never stalls. */
async function post(
  url: string,
  body: Record<string, unknown>,
  spec: EvalSpec,
  state: JevState,
  provider: DecisionProvider,
): Promise<JevDecision> {
  const started = performance.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, provider }),
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
      provider,
      source: "fallback",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function requestDecision(
  encounterId: EncounterId,
  state: JevState,
  provider: DecisionProvider,
): Promise<JevDecision> {
  return post("/api/decide", { encounterId, state }, encounterSpec(encounterId), state, provider);
}

export function requestHeroChoice(
  nodeId: string,
  game: GameState,
  personality: HeroPersonality,
  recentEvents: string[],
  provider: DecisionProvider,
): Promise<JevDecision> {
  const built = heroChoiceSpec(nodeId, game, personality, recentEvents);
  if (!built) return Promise.reject(new Error(`Node ${nodeId} is not a choice`));
  return post("/api/hero", { nodeId, game, personality, recentEvents }, built.spec, built.state, provider);
}

/** The server's default engine (`DECISION_PROVIDER`); Jev if it can't be asked. */
export async function fetchDefaultProvider(): Promise<DecisionProvider> {
  try {
    const res = await fetch("/api/provider");
    const body = (await res.json()) as { default?: DecisionProvider };
    return body.default === "laya" ? "laya" : "jev";
  } catch {
    return "jev";
  }
}
