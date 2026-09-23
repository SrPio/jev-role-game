import type { QuestionMeta } from "./encounters";

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

/** Everything needed to ask Jev one batch of questions and display the result. */
export type EvalSpec = {
  encounterId: string;
  npc: string;
  title: string;
  /** The question whose answer drives the game. */
  primary: string;
  questions: Record<string, Question>;
  meta: Record<string, QuestionMeta>;
};

export type JevDecision = {
  id: string;
  encounterId: string;
  npc: string;
  title: string;
  primary: string;
  meta: Record<string, QuestionMeta>;
  state: JevState;
  answers: Record<string, Answer>;
  latencyMs: number;
  usage?: { inputTokens?: number; outputTokens?: number };
  source: "jev" | "fallback";
  error?: string;
};

/** Below this confidence an NPC "hesitates" — used as game logic, not decoration. */
export const HESITATION_THRESHOLD = 0.55;
