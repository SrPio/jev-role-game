import type { EncounterId } from "@/lib/jev/encounters";
import type { ChoiceAnswer, JevDecision, JevState } from "@/lib/jev/types";
import { hasItem, inventoryList, itemCount, itemWorks, removeItem } from "./items";
import { allies, isHesitant, patch } from "./state";
import type { EnemyId, GameState } from "./types";

export type Enemy = {
  id: EnemyId;
  name: string;
  encounter: EncounterId;
  hp: number;
  atk: [number, number];
  heals: number;
  personality: string;
};

export const ENEMIES: Record<EnemyId, Enemy> = {
  grul: {
    id: "grul",
    name: "Grul",
    encounter: "combat_grul",
    hp: 80,
    atk: [7, 12],
    heals: 1,
    personality: "greedy, hungry bully who turns cowardly when outmatched",
  },
  kael: {
    id: "kael",
    name: "Kael",
    encounter: "combat_kael",
    hp: 90,
    atk: [8, 13],
    heals: 1,
    personality: "disciplined fallen knight, proud, fights with honor but will not die for nothing",
  },
  morvath: {
    id: "morvath",
    name: "Morvath",
    encounter: "combat_morvath",
    hp: 140,
    atk: [10, 16],
    heals: 2,
    personality:
      "arrogant sorcerer, proud of his power and certain he will win; only flees when he is truly about to die",
  },
};

export type PlayerAction = "attack" | "defend" | "potion" | "flee" | "smoke_bomb" | "elixir" | "mirror";
export type CombatOutcome = "win" | "lose" | "enemyFled" | "playerFled";

export type CombatState = {
  enemyHp: number;
  enemyMaxHp: number;
  enemyHeals: number;
  turn: number;
  lastPlayerAction: PlayerAction | "none";
  lastEnemyAction: string;
  /** The silver mirror is raised: the next enemy attack bounces back. */
  mirrorUp: boolean;
};

export const PLAYER_ACTION_TEXT: Record<PlayerAction | "none", string> = {
  none: "nothing yet, the fight just started",
  attack: "attacked with the sword",
  defend: "raised their guard",
  potion: "drank a healing potion",
  flee: "tried to run away",
  smoke_bomb: "threw a smoke bomb",
  elixir: "drank a dubious elixir",
  mirror: "raised a silver mirror to reflect the next attack",
};

/** Item each item action spends. */
export const ACTION_ITEM = {
  smoke_bomb: "smoke_bomb",
  elixir: "dubious_elixir",
  mirror: "silver_mirror",
} as const;

/** Whether the hero can take this action right now (has the potion or item it spends). */
export function canUse(s: GameState, action: PlayerAction): boolean {
  if (action === "potion") return s.potions > 0;
  if (action in ACTION_ITEM) return hasItem(s, ACTION_ITEM[action as keyof typeof ACTION_ITEM]);
  return true;
}

export function startCombat(enemy: Enemy, s: GameState): CombatState {
  return {
    enemyHp: Math.max(1, enemy.hp - s.firstStrike),
    enemyMaxHp: enemy.hp,
    enemyHeals: enemy.heals,
    turn: 1,
    lastPlayerAction: "none",
    lastEnemyAction: "none yet, the fight just started",
    mirrorUp: false,
  };
}

export function combatJevState(enemy: Enemy, c: CombatState, s: GameState): JevState {
  const state: JevState = {
    situation: `Turn ${c.turn} of a duel between ${enemy.name} and the traveler.`,
    npc: enemy.name,
    npcPersonality: enemy.personality,
    npcHealth: c.enemyHp,
    npcMaxHealth: c.enemyMaxHp,
    npcHealsLeft: c.enemyHeals,
    playerHealth: s.playerHealth,
    playerMaxHealth: s.playerMaxHealth,
    playerHasWeapon: s.playerHasWeapon,
    playerPotions: s.potions,
    playerLastAction: PLAYER_ACTION_TEXT[c.lastPlayerAction],
    playerHasShield: s.hasShield,
    playerItems: inventoryList(s),
    playerMirrorRaised: c.mirrorUp,
    alliesFightingWithPlayer: allies(s).filter((a) => a !== "Sera" || enemy.id !== "morvath" || s.seraHelps),
  };
  if (enemy.id === "morvath") {
    state.playerSwordBlessed = s.blessed;
    state.playerKnowsCrownWeakness = s.knowsWeakness;
  }
  return state;
}

const rnd = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

export type TurnResult = {
  game: GameState;
  combat: CombatState;
  log: string[];
  outcome?: CombatOutcome;
  heroHit: boolean;
  enemyHit: boolean;
};

export function resolveTurn(
  enemy: Enemy,
  c: CombatState,
  s: GameState,
  action: PlayerAction,
  npc: ChoiceAnswer,
  source: JevDecision["source"],
): TurnResult {
  const log: string[] = [];
  let game = s;
  let combat: CombatState = { ...c, turn: c.turn + 1, lastPlayerAction: action, lastEnemyAction: npc.choice };
  let heroHit = false;
  let enemyHit = false;
  const name = enemy.name;
  const enemyDefends = npc.choice === "defend";
  const hesitant = isHesitant(npc, { source });

  // ── Player ──
  if (action === "potion") {
    if (game.potions > 0) {
      const heal = 30;
      game = patch(game, { potions: game.potions - 1, playerHealth: game.playerHealth + heal });
      log.push(`Bebes una poción (+${heal} HP).`);
    } else {
      log.push("Buscas una poción... ¡no te queda ninguna!");
    }
  } else if (action === "smoke_bomb" || action === "elixir" || action === "mirror") {
    const item = ACTION_ITEM[action];
    if (itemCount(game, item) === 0) {
      log.push("Rebuscas en tu bolsa... ¡no te queda!");
    } else {
      const works = itemWorks(game, item);
      game = removeItem(game, item);
      if (!works) {
        log.push("¡Era una falsificación de Vesper! No pasa nada.");
      } else if (action === "smoke_bomb") {
        log.push("¡Lanzas una bomba de humo y desapareces!");
        return { game, combat, log, outcome: "playerFled", heroHit, enemyHit };
      } else if (action === "elixir") {
        if (Math.random() < 0.6) {
          game = patch(game, { playerHealth: game.playerHealth + 50 });
          log.push("El elixir arde en tu garganta... ¡y te revive! (+50 HP)");
        } else {
          game = patch(game, { playerHealth: Math.max(1, game.playerHealth - 20) });
          heroHit = true;
          log.push("El elixir estaba podrido. Te retuerces (−20 HP).");
        }
      } else {
        combat = { ...combat, mirrorUp: true };
        log.push("Alzas el espejo de plata.");
      }
    }
  } else if (action === "defend") {
    log.push("Levantas la guardia.");
  } else if (action === "flee") {
    const chance = enemyDefends || npc.choice === "heal" ? 0.75 : 0.5;
    if (Math.random() < chance) {
      log.push("¡Logras escapar!");
      return { game, combat, log, outcome: "playerFled", heroHit, enemyHit };
    }
    log.push("Intentas huir, pero te cortan el paso.");
  } else {
    let dmg = game.playerHasWeapon ? rnd(10, 16) : rnd(4, 7);
    if (enemy.id === "morvath" && game.blessed) dmg *= 1.3;
    if (enemy.id === "morvath" && game.knowsWeakness) dmg *= 1.5;
    if (enemyDefends) dmg *= 0.5;
    if (itemWorks(game, "obsidian_dagger")) dmg += 4;
    dmg = Math.round(dmg);
    const parts = [`Golpeas a ${name} (−${dmg}).`];
    if (game.kaelAlly) {
      dmg += 6;
      parts.push("Kael ataca (−6).");
    }
    // In the final fight Sera only helps if Jev decided she would.
    if (game.companion === "Sera" && (enemy.id !== "morvath" || game.seraHelps)) {
      dmg += 4;
      parts.push("Sera apuñala (−4).");
    }
    combat = { ...combat, enemyHp: Math.max(0, combat.enemyHp - dmg) };
    enemyHit = true;
    log.push(parts.join(" "));
    if (combat.enemyHp <= 0) {
      log.push(`¡${name} ha caído!`);
      return { game, combat, log, outcome: "win", heroHit, enemyHit };
    }
  }

  // ── NPC (decided by Jev) ──
  switch (npc.choice) {
    case "heal":
      if (combat.enemyHeals > 0) {
        const heal = rnd(15, 22);
        combat = {
          ...combat,
          enemyHeals: combat.enemyHeals - 1,
          enemyHp: Math.min(combat.enemyMaxHp, combat.enemyHp + heal),
        };
        log.push(`${name} se cura (+${heal}).`);
      } else {
        log.push(`${name} intenta curarse, pero ya no le queda nada.`);
      }
      break;
    case "flee":
      // A low-confidence retreat never happens: the NPC wavers and stays.
      if (hesitant) {
        log.push(`${name} duda si huir... y se queda, a la defensiva.`);
        break;
      }
      log.push(`¡${name} huye del combate!`);
      return { game, combat, log, outcome: "enemyFled", heroHit, enemyHit };
    case "defend":
      log.push(`${name} se protege.`);
      break;
    default: {
      const power = npc.choice === "power_attack";
      let dmg = rnd(enemy.atk[0], enemy.atk[1]);
      if (power && Math.random() < 0.3) {
        log.push(`${name} lanza un golpe fuerte... ¡y falla!`);
        break;
      }
      if (power) dmg *= 1.8;
      if (hesitant) dmg *= 0.6;
      if (combat.mirrorUp) {
        dmg = Math.round(dmg);
        combat = { ...combat, mirrorUp: false, enemyHp: Math.max(0, combat.enemyHp - dmg) };
        enemyHit = true;
        log.push(`El espejo devuelve el ${power ? "golpe fuerte" : "ataque"} de ${name} (−${dmg}).`);
        if (combat.enemyHp <= 0) {
          log.push(`¡${name} ha caído!`);
          return { game, combat, log, outcome: "win", heroHit, enemyHit };
        }
        break;
      }
      if (action === "defend") dmg *= power ? 0.25 : 0.4;
      if (game.hasShield) dmg *= 0.8;
      if (itemWorks(game, "moon_amulet")) dmg *= 0.85;
      dmg = Math.max(1, Math.round(dmg));
      game = patch(game, { playerHealth: Math.max(0, game.playerHealth - dmg) });
      heroHit = true;
      log.push(
        `${hesitant ? `${name} titubea y ` : `${name} `}${power ? "descarga un golpe fuerte" : "ataca"} (−${dmg} HP).`,
      );
      if (game.playerHealth <= 0) {
        log.push("Caes de rodillas...");
        return { game, combat, log, outcome: "lose", heroHit, enemyHit };
      }
    }
  }

  return { game, combat, log, heroHit, enemyHit };
}
