import type { CombatState, Enemy } from "@/lib/story/combat";
import { PLAYER_ACTION_TEXT } from "@/lib/story/combat";
import { inventoryList, itemCount } from "@/lib/story/items";
import { allies } from "@/lib/story/state";
import { NODES } from "@/lib/story/story";
import type { GameState } from "@/lib/story/types";
import type { EvalSpec, JevState } from "./types";

/** Jev mode: the hero is played by Jev with one of these personalities. */
export const HERO_PERSONALITIES = {
  noble: {
    label: "Noble",
    description:
      "brave and honorable knight who protects the innocent, keeps their word and never abandons a companion",
  },
  greedy: {
    label: "Codicioso",
    description: "greedy adventurer who values gold and personal gain above honor, and is tempted by power",
  },
  cautious: {
    label: "Prudente",
    description:
      "cautious survivor who avoids unnecessary risks and prefers negotiating or retreating over fighting",
  },
} as const;

export type HeroPersonality = keyof typeof HERO_PERSONALITIES;
export const HERO_PERSONALITY_IDS = Object.keys(HERO_PERSONALITIES) as [HeroPersonality, ...HeroPersonality[]];

const ROLE = "the traveler, hero of this story, on a quest to recover the Ember Crown stolen by the sorcerer Morvath";

function heroBase(s: GameState, personality: HeroPersonality): JevState {
  return {
    role: ROLE,
    heroPersonality: HERO_PERSONALITIES[personality].description,
    heroHealth: `${s.playerHealth}/${s.playerMaxHealth}`,
    heroGold: s.playerGold,
    heroPotions: s.potions,
    heroHonor: `${s.honor}/10`,
    heroReputation: `${s.reputation}/10`,
    heroItems: inventoryList(s),
    companions: allies(s),
    swordBlessed: s.blessed,
    knowsMorvathWeakness: s.knowsWeakness,
    hasShield: s.hasShield,
    hasSecretMapToTower: s.hasMap,
  };
}

/**
 * Builds the question for a story choice straight from the story node, so the
 * options Jev can pick are exactly the ones the game offers (never client-supplied).
 * Criteria keys are `opt_<index>` into the node's option list.
 */
export function heroChoiceSpec(
  nodeId: string,
  s: GameState,
  personality: HeroPersonality,
  recentEvents: string[],
): { spec: EvalSpec; state: JevState } | null {
  const node = NODES[nodeId];
  if (!node || node.kind !== "choose") return null;
  const criteria: Record<string, string> = {};
  node.options(s).forEach((o, i) => {
    if (!o.disabled) criteria[`opt_${i}`] = o.label;
  });
  if (Object.keys(criteria).length === 0) return null;

  const prompt = node.prompt.who ? `${node.prompt.who}: ${node.prompt.text}` : node.prompt.text;
  return {
    spec: {
      encounterId: "hero_choice",
      npc: "Héroe",
      title: "Decisión del héroe",
      primary: "choice",
      questions: {
        choice: {
          type: "choice",
          instructions:
            "You are the traveler, the hero of this story. Choose what the hero does now, staying true to the hero's personality and situation. Options and story text are in Spanish.",
          criteria,
        },
      },
      meta: { choice: { label: "¿Qué hace el héroe?", options: { ...criteria } } },
    },
    state: { ...heroBase(s, personality), decisionPrompt: prompt, recentEvents },
  };
}

export function heroCombatState(
  enemy: Enemy,
  c: CombatState,
  s: GameState,
  personality: HeroPersonality,
): JevState {
  return {
    ...heroBase(s, personality),
    situation: `Turn ${c.turn} of a duel between the hero and ${enemy.name}.`,
    enemy: enemy.name,
    enemyHealth: `${c.enemyHp}/${c.enemyMaxHp}`,
    enemyLastAction: c.lastEnemyAction,
    heroLastAction: PLAYER_ACTION_TEXT[c.lastPlayerAction],
    potions: s.potions,
    smokeBombs: itemCount(s, "smoke_bomb"),
    elixirs: itemCount(s, "dubious_elixir"),
    mirrors: itemCount(s, "silver_mirror"),
    mirrorRaised: c.mirrorUp,
    isFinalBattle: enemy.id === "morvath",
  };
}
