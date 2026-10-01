import { z } from "zod";
import type { GameState, ItemId } from "./types";

const int = (max: number) => z.number().int().min(0).max(max);

const ITEM_IDS = [
  "smoke_bomb",
  "dubious_elixir",
  "silver_mirror",
  "guild_letter",
  "hermit_lantern",
  "moon_amulet",
  "obsidian_dagger",
  "cursed_coin",
  "hermit_curse",
] as const satisfies readonly ItemId[];
const ItemIdSchema = z.enum(ITEM_IDS);

/** Server-side validation of a GameState sent by the browser (Jev mode). */
export const GameStateSchema = z.object({
  playerHealth: int(200),
  playerMaxHealth: int(200),
  playerGold: int(1000),
  potions: int(20),
  playerHasWeapon: z.boolean(),
  honor: int(10),
  reputation: int(10),
  items: z.partialRecord(ItemIdSchema, int(20)),
  fakes: z.array(ItemIdSchema).max(ITEM_IDS.length),
  quests: z.array(z.enum(["sq1", "sq2", "sq3", "sq4"])).max(4),
  companion: z.literal("Sera").nullable(),
  seraSpy: z.boolean(),
  seraTrust: z.number().min(0).max(1),
  seraHelps: z.boolean(),
  kaelAlly: z.boolean(),
  blessed: z.boolean(),
  knowsWeakness: z.boolean(),
  hasShield: z.boolean(),
  hasMap: z.boolean(),
  savedVillagers: z.boolean(),
  warnedAboutSera: z.boolean(),
  defeatedGrul: z.boolean(),
  defeatedKael: z.boolean(),
  knownThief: z.boolean(),
  sparedDeserter: z.boolean(),
  morvathWarned: z.boolean(),
  approach: z.string().max(40),
  goldOffered: int(1000),
  firstStrike: int(200),
  morvathChoice: z.string().max(40),
  endingNote: z.string().max(40),
}) satisfies z.ZodType<GameState>;
