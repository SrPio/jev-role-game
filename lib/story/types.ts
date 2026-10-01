import type { EncounterId } from "@/lib/jev/encounters";
import type { JevDecision, JevState } from "@/lib/jev/types";

export type SceneId =
  | "title"
  | "bridge"
  | "tavern"
  | "forest"
  | "village"
  | "tower"
  | "throne"
  | "castle"
  | "road"
  | "grave"
  | "pact";

export type NpcId =
  | "grul"
  | "sera"
  | "kael"
  | "ysolde"
  | "morvath"
  | "bandit"
  | "oswin"
  | "odo"
  | "brann"
  | "vesper";
export type EnemyId = "grul" | "kael" | "morvath";
export type EndingId = "hero" | "pact" | "exile" | "fall";

export type Line = { who?: string; text: string };

export type ItemId =
  | "smoke_bomb"
  | "dubious_elixir"
  | "silver_mirror"
  | "guild_letter"
  | "hermit_lantern"
  | "moon_amulet"
  | "obsidian_dagger"
  | "cursed_coin"
  | "hermit_curse";

export type SideQuestId = "sq1" | "sq2" | "sq3" | "sq4";

export type GameState = {
  playerHealth: number;
  playerMaxHealth: number;
  playerGold: number;
  potions: number;
  playerHasWeapon: boolean;
  /** 0–10: what the hero does. */
  honor: number;
  /** 0–10: what Eldmoor says about the hero. Only changes when someone sees it or spreads the word. */
  reputation: number;
  /** Carried items and how many are left (infinite items count 1). */
  items: Partial<Record<ItemId, number>>;
  /** Items Vesper sold as convincing fakes: they never work. */
  fakes: ItemId[];
  /** Side quests the hero took on. */
  quests: SideQuestId[];
  companion: "Sera" | null;
  seraSpy: boolean;
  seraTrust: number;
  seraHelps: boolean;
  kaelAlly: boolean;
  blessed: boolean;
  knowsWeakness: boolean;
  hasShield: boolean;
  hasMap: boolean;
  savedVillagers: boolean;
  warnedAboutSera: boolean;
  defeatedGrul: boolean;
  defeatedKael: boolean;
  /** Oswin told the whole region the hero looted his caravan. */
  knownThief: boolean;
  /** The hero saved Brann the deserter from the rope. */
  sparedDeserter: boolean;
  /** Brann sold the hero out to Morvath. */
  morvathWarned: boolean;
  /** The player's last declared approach, fed to Jev. */
  approach: string;
  goldOffered: number;
  /** Damage dealt before a fight starts (a hesitating NPC gives you an opening). */
  firstStrike: number;
  morvathChoice: string;
  endingNote: string;
};

export type Ref = string | ((s: GameState) => string);

export type Option = {
  label: string;
  disabled?: boolean;
  apply?: (s: GameState) => GameState;
  next: Ref;
};

export type HeroLook = "normal" | "crowned" | "hidden";

type Base = {
  scene: SceneId;
  /** NPCs standing in the scene (companions are added automatically). */
  cast?: NpcId[] | ((s: GameState) => NpcId[]);
  hero?: HeroLook;
};

export type ChapterNode = Base & { kind: "chapter"; number: string; title: string; next: Ref };
export type SayNode = Base & {
  kind: "say";
  lines: Line[] | ((s: GameState) => Line[]);
  effect?: (s: GameState) => GameState;
  next: Ref;
};
export type ChooseNode = Base & {
  kind: "choose";
  prompt: Line;
  options: (s: GameState) => Option[];
};
export type JevNode = Base & {
  kind: "jev";
  encounter: EncounterId;
  npc: NpcId;
  thinking: string;
  buildState: (s: GameState) => JevState;
  resolve: (s: GameState, d: JevDecision) => { state: GameState; lines: Line[]; next: Ref };
};
export type CombatNode = Base & {
  kind: "combat";
  enemy: EnemyId;
  outcomes: { win: Ref; lose: Ref; enemyFled: Ref; playerFled: Ref };
};
export type EndingNode = Base & { kind: "ending"; ending: EndingId };

export type StoryNode = ChapterNode | SayNode | ChooseNode | JevNode | CombatNode | EndingNode;
