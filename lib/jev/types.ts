import type { EncounterId } from "./encounters";

export type ChoiceQuestion = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
};
export type BooleanQuestion = {
  type: "boolean";
  instructions: string;
  criteria?: { true?: string; false?: string };
};
export type ScoreQuestion = {
  type: "score";
  instructions: string;
  criteria: string[];
};
export type Question = ChoiceQuestion | BooleanQuestion | ScoreQuestion;

export type ChoiceAnswer = {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
};
export type BooleanAnswer = {
  type: "boolean";
  probability: number;
  confidence: number;
};
export type ScoreAnswer = {
  type: "score";
  score: number;
  probabilities: Record<string, number>;
  confidence: number;
};
export type Answer = ChoiceAnswer | BooleanAnswer | ScoreAnswer;

export type JevValue = string | number | boolean | null | string[];
export type JevState = Record<string, JevValue>;

export type JevDecision = {
  id: string;
  encounterId: EncounterId;
  npc: string;
  state: JevState;
  answers: Record<string, Answer>;
  latencyMs: number;
  usage?: { inputTokens?: number; outputTokens?: number };
  source: "jev" | "fallback";
  error?: string;
};

/** Below this confidence an NPC "hesitates" — used as game logic, not decoration. */
export const HESITATION_THRESHOLD = 0.55;
