import { fallbackAnswers } from "./answers";
import { getEncounter, type EncounterId } from "./encounters";
import type { JevDecision, JevState } from "./types";

let counter = 0;
const nextId = () => `d${Date.now().toString(36)}${(counter++).toString(36)}`;

export async function requestDecision(
  encounterId: EncounterId,
  state: JevState,
): Promise<JevDecision> {
  const started = performance.now();
  try {
    const res = await fetch("/api/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ encounterId, state }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const decision = (await res.json()) as Omit<JevDecision, "id">;
    return { ...decision, id: nextId() };
  } catch (error) {
    return {
      id: nextId(),
      encounterId,
      npc: getEncounter(encounterId).npc,
      state,
      answers: fallbackAnswers(encounterId, state),
      latencyMs: Math.round(performance.now() - started),
      source: "fallback",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
