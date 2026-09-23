import { z } from "zod";
import type { GameState } from "./types";

const int = (max: number) => z.number().int().min(0).max(max);

/** Server-side validation of a GameState sent by the browser (Jev mode). */
export const GameStateSchema = z.object({
  playerHealth: int(200),
  playerMaxHealth: int(200),
  playerGold: int(1000),
  potions: int(20),
  playerHasWeapon: z.boolean(),
  honor: int(10),
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
  approach: z.string().max(40),
  goldOffered: int(1000),
  firstStrike: int(200),
  morvathChoice: z.string().max(40),
  endingNote: z.string().max(40),
}) satisfies z.ZodType<GameState>;
