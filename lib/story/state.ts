import type { Answer, BooleanAnswer, ChoiceAnswer, JevDecision, ScoreAnswer } from "@/lib/jev/types";
import { hesitationThreshold } from "@/lib/jev/types";
import type { GameState } from "./types";

export const INITIAL_STATE: GameState = {
  playerHealth: 100,
  playerMaxHealth: 100,
  playerGold: 25,
  potions: 1,
  playerHasWeapon: true,
  honor: 5,
  reputation: 5,
  items: {},
  fakes: [],
  quests: [],
  companion: null,
  seraSpy: false,
  seraTrust: 0.5,
  seraHelps: false,
  kaelAlly: false,
  blessed: false,
  knowsWeakness: false,
  hasShield: false,
  hasMap: false,
  savedVillagers: false,
  warnedAboutSera: false,
  defeatedGrul: false,
  defeatedKael: false,
  knownThief: false,
  sparedDeserter: false,
  morvathWarned: false,
  approach: "",
  goldOffered: 0,
  firstStrike: 0,
  morvathChoice: "",
  endingNote: "",
};

export function patch(s: GameState, p: Partial<GameState>): GameState {
  const next = { ...s, ...p };
  next.honor = Math.min(10, Math.max(0, next.honor));
  next.reputation = Math.min(10, Math.max(0, next.reputation));
  next.playerGold = Math.max(0, next.playerGold);
  next.playerHealth = Math.min(next.playerMaxHealth, next.playerHealth);
  return next;
}

/** Non-lethal damage outside combat never kills: the story decides deaths. */
export function hurt(s: GameState, amount: number): GameState {
  return patch(s, { playerHealth: Math.max(1, s.playerHealth - amount) });
}

export function allies(s: GameState): string[] {
  const list: string[] = [];
  if (s.companion) list.push(s.companion);
  if (s.kaelAlly) list.push("Kael");
  return list;
}

function answer<T extends Answer>(d: JevDecision, id: string, type: T["type"]): T {
  const a = d.answers[id];
  if (!a || a.type !== type) throw new Error(`Decision answer "${id}" missing or not ${type}`);
  return a as T;
}
export const choiceOf = (d: JevDecision, id: string) => answer<ChoiceAnswer>(d, id, "choice");
export const booleanOf = (d: JevDecision, id: string) => answer<BooleanAnswer>(d, id, "boolean");
export const scoreOf = (d: JevDecision, id: string) => answer<ScoreAnswer>(d, id, "score");

/** Whether an answer from decision `d` is below its engine's hesitation threshold. */
export const isHesitant = (a: { confidence: number }, d: Pick<JevDecision, "source">) =>
  a.confidence < hesitationThreshold(d.source);

/** The main decision of a Jev call, used by the UI for moods and history. */
export function primaryAnswer(d: JevDecision, primary: string): ChoiceAnswer | undefined {
  const a = d.answers[primary];
  return a?.type === "choice" ? a : undefined;
}
