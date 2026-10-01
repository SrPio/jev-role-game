import type { EvalSpec, Question } from "./types";

/**
 * Every question Jev can be asked lives here. The API route only accepts an
 * encounter id + state, so the browser can never inject its own questions.
 */
export type QuestionMeta = {
  /** Spanish label shown in the "Jev brain" panel. */
  label: string;
  options?: Record<string, string>;
  levels?: string[];
};

export type Encounter = {
  npc: string;
  title: string;
  /** The question whose answer drives the story. */
  primary: string;
  questions: Record<string, Question>;
  meta: Record<string, QuestionMeta>;
};

const combatQuestion = (
  who: string,
  criteria: Record<string, string>,
): Question => ({
  type: "choice",
  instructions: `Turn-based duel. Decide ${who}'s action for this turn, weighing both health bars, the traveler's last action, remaining heals and ${who}'s personality.`,
  criteria,
});

const COMBAT_LABELS = {
  attack: "Atacar",
  power_attack: "Golpe fuerte",
  defend: "Defender",
  heal: "Curarse",
  flee: "Huir",
};

export const ENCOUNTERS = {
  troll_bridge: {
    npc: "Grul",
    title: "El Puente de Grul",
    primary: "action",
    questions: {
      action: {
        type: "choice",
        instructions:
          "Decide what Grul the bridge troll does next, based on his personality and how the traveler approached him.",
        criteria: {
          let_pass: "Accepts the situation and lets the traveler cross the bridge",
          demand_more: "Gets greedy and demands more gold before letting them cross",
          attack: "Attacks the traveler with his club",
          flee: "Gets scared and runs away, abandoning the bridge",
        },
      },
    },
    meta: {
      action: {
        label: "¿Qué hace Grul?",
        options: {
          let_pass: "Dejar pasar",
          demand_more: "Pedir más oro",
          attack: "Atacar",
          flee: "Huir",
        },
      },
    },
  },

  sera_tavern: {
    npc: "Sera",
    title: "La Posada del Cuervo",
    primary: "decision",
    questions: {
      decision: {
        type: "choice",
        instructions:
          "Decide how Sera the mercenary responds to the traveler's request to guide them to Morvath's tower.",
        criteria: {
          join: "Joins the traveler as a loyal guide",
          join_as_spy:
            "Pretends to join, but secretly plans to deliver the traveler to Morvath",
          refuse: "Declines and stays in the tavern",
          rob: "Steals the traveler's purse and disappears into the night",
        },
      },
      trust: {
        type: "boolean",
        instructions: "Does Sera genuinely trust the traveler?",
      },
    },
    meta: {
      decision: {
        label: "¿Qué responde Sera?",
        options: {
          join: "Unirse (leal)",
          join_as_spy: "Unirse como espía",
          refuse: "Rechazar",
          rob: "Robar y huir",
        },
      },
      trust: { label: "¿Confía en ti?" },
    },
  },

  kael_forest: {
    npc: "Kael",
    title: "El Bosque Susurrante",
    primary: "action",
    questions: {
      action: {
        type: "choice",
        instructions:
          "Decide what Kael, the fallen knight leading the bandits, does with the traveler he has just ambushed.",
        criteria: {
          attack: "Orders the ambush and fights the traveler",
          negotiate: "Demands half of the traveler's gold as a toll to let them pass",
          retreat: "Lets the traveler go and melts back into the forest",
          recruit: "Joins the traveler's quest to take revenge on Morvath",
        },
      },
    },
    meta: {
      action: {
        label: "¿Qué hace Kael?",
        options: {
          attack: "Atacar",
          negotiate: "Cobrar peaje",
          retreat: "Retirarse",
          recruit: "Unirse a ti",
        },
      },
    },
  },

  ysolde_village: {
    npc: "Ysolde",
    title: "La Aldea en Llamas",
    primary: "gift",
    questions: {
      gift: {
        type: "choice",
        instructions:
          "Sister Ysolde can offer the traveler exactly one gift, or none. Decide what she does.",
        criteria: {
          bless: "Blesses the traveler's sword with holy light, making it stronger against Morvath",
          heal: "Heals all of the traveler's wounds",
          reveal_secret: "Reveals Morvath's weakness: the ember gem on his crown",
          cleanse: "Purifies the traveler of a curse they carry (a cursed coin or a hermit's curse)",
          refuse: "Refuses to help the traveler",
        },
      },
      honor: {
        type: "score",
        instructions: "How honorable has the traveler been on their journey so far?",
        criteria: ["selfish and cruel", "careless", "decent", "brave", "heroic"],
      },
      warn: {
        type: "boolean",
        instructions:
          "Should Ysolde warn the traveler that their companion might betray them? Answer false if the traveler has no companion.",
      },
    },
    meta: {
      gift: {
        label: "¿Qué regalo ofrece Ysolde?",
        options: {
          bless: "Bendecir espada",
          heal: "Curar heridas",
          reveal_secret: "Revelar debilidad",
          cleanse: "Purificar maldición",
          refuse: "Negarse",
        },
      },
      honor: {
        label: "Honor del viajero",
        levels: ["Egoísta", "Descuidado", "Decente", "Valiente", "Heroico"],
      },
      warn: { label: "¿Advertir sobre tu compañera?" },
    },
  },

  morvath_throne: {
    npc: "Morvath",
    title: "La Torre de Morvath",
    primary: "action",
    questions: {
      action: {
        type: "choice",
        instructions:
          "The traveler has reached Morvath's throne room. Decide what the sorcerer Morvath does.",
        criteria: {
          fight: "Fights the traveler with dark magic",
          offer_pact: "Offers the traveler to rule Eldmoor at his side",
          flee_with_crown: "Escapes through a portal, taking the crown with him",
          surrender: "Surrenders the crown and begs for mercy",
        },
      },
    },
    meta: {
      action: {
        label: "¿Qué hace Morvath?",
        options: {
          fight: "Luchar",
          offer_pact: "Ofrecer pacto",
          flee_with_crown: "Huir con la corona",
          surrender: "Rendirse",
        },
      },
    },
  },

  sera_final: {
    npc: "Sera",
    title: "La traición o la lealtad",
    primary: "action",
    questions: {
      action: {
        type: "choice",
        instructions:
          "It is the final confrontation with Morvath. Decide what Sera, the traveler's companion, does now.",
        criteria: {
          help: "Fights at the traveler's side against Morvath",
          betray: "Stabs the traveler in the back to serve Morvath",
          stand_aside: "Steps back and lets the traveler face Morvath alone",
        },
      },
    },
    meta: {
      action: {
        label: "¿Qué hace Sera?",
        options: {
          help: "Ayudarte",
          betray: "Traicionarte",
          stand_aside: "Apartarse",
        },
      },
    },
  },

  // ── Side quests ──
  oswin_caravan: {
    npc: "Oswin",
    title: "La caravana volcada",
    primary: "reward",
    questions: {
      reward: {
        type: "choice",
        instructions:
          "Decide what Oswin the merchant gives the traveler after what they just did at his overturned caravan. If they looted him, he only gives something out of fear.",
        criteria: {
          guild_letter: "Hands over a sealed letter of the merchant guild, respected even by outlaws who trade with the guild",
          smoke_bombs: "Gives two smoke bombs from his cargo",
          gold: "Pays the traveler 20 gold",
          nothing: "Gives the traveler nothing",
        },
      },
      spread_word: {
        type: "boolean",
        instructions:
          "Will Oswin tell every town and tavern in the region about what the traveler did here, good or bad?",
      },
    },
    meta: {
      reward: {
        label: "¿Qué te da Oswin?",
        options: {
          guild_letter: "Carta del gremio",
          smoke_bombs: "2 bombas de humo",
          gold: "20 de oro",
          nothing: "Nada",
        },
      },
      spread_word: { label: "¿Lo contará por la región?" },
    },
  },

  odo_shrine: {
    npc: "Odo",
    title: "El santuario del ermitaño",
    primary: "gift",
    questions: {
      gift: {
        type: "choice",
        instructions:
          "Decide how Odo the old hermit answers the traveler who came to his shrine. If the traveler stole his lantern, decide whether he forgives or curses them.",
        criteria: {
          lantern: "Gives (or lets them keep) the eternal lantern that reveals ambushes and hidden passages",
          amulet: "Gives a moon amulet that softens every blow",
          nothing: "Gives only kind words and sends them on their way",
          curse: "Curses the traveler, sapping their vitality",
        },
      },
    },
    meta: {
      gift: {
        label: "¿Qué hace Odo?",
        options: {
          lantern: "Dar la linterna",
          amulet: "Dar el amuleto",
          nothing: "Nada",
          curse: "Maldecirte",
        },
      },
    },
  },

  brann_deserter: {
    npc: "Brann",
    title: "El desertor",
    primary: "action",
    questions: {
      action: {
        type: "choice",
        instructions: "The traveler has spared Brann, a deserter from Morvath's army, from the villagers' rope. Decide what Brann does now.",
        criteria: {
          reveal: "Reveals the secret of the ember gem on Morvath's crown and gives the traveler a silver mirror that reflects dark magic",
          betray: "Steals part of the traveler's gold, runs, and sells the traveler's description to Morvath to buy his pardon",
          flee: "Simply runs into the woods and is never seen again",
        },
      },
      grateful: {
        type: "boolean",
        instructions: "Is Brann genuinely grateful to the traveler?",
      },
    },
    meta: {
      action: {
        label: "¿Qué hace Brann?",
        options: { reveal: "Revelar secreto", betray: "Traicionarte", flee: "Huir" },
      },
      grateful: { label: "¿Está agradecido?" },
    },
  },

  vesper_shop: {
    npc: "Vesper",
    title: "La mercader de sombras",
    primary: "deal",
    questions: {
      deal: {
        type: "choice",
        instructions:
          "The traveler wants to trade with Vesper, a black-market dealer camped at the foot of Morvath's tower. Decide what deal she makes.",
        criteria: {
          fair: "Trades at the fair price",
          double_price: "Doubles the price, sensing the traveler's need or bad name",
          refuse: "Refuses to trade with the traveler",
          tip_passage: "Trades at the fair price and, won over, also reveals a secret passage into the tower",
        },
      },
      cheat: {
        type: "boolean",
        instructions: "Does Vesper hand over a convincing fake (or pay with false coins) instead of the real thing?",
      },
    },
    meta: {
      deal: {
        label: "¿Qué trato hace Vesper?",
        options: {
          fair: "Precio justo",
          double_price: "Precio doble",
          refuse: "No venderte",
          tip_passage: "Revelar pasadizo",
        },
      },
      cheat: { label: "¿Te engaña?" },
    },
  },

  combat_grul: {
    npc: "Grul",
    title: "Combate: Grul",
    primary: "action",
    questions: {
      action: combatQuestion("Grul", {
        attack: "Swings his club",
        power_attack: "Winds up a huge, slow smash that can miss",
        defend: "Covers himself and waits",
        heal: "Eats a raw fish to recover health (only if heals remain)",
        flee: "Jumps into the river and escapes",
      }),
    },
    meta: { action: { label: "Turno de Grul", options: COMBAT_LABELS } },
  },

  combat_kael: {
    npc: "Kael",
    title: "Combate: Kael",
    primary: "action",
    questions: {
      action: combatQuestion("Kael", {
        attack: "A precise sword strike",
        power_attack: "A reckless charge that hits hard but can miss",
        defend: "Raises his shield",
        heal: "Drinks a healing draught (only if heals remain)",
        flee: "Whistles for his bandits and vanishes into the trees",
      }),
    },
    meta: { action: { label: "Turno de Kael", options: COMBAT_LABELS } },
  },

  combat_morvath: {
    npc: "Morvath",
    title: "Combate: Morvath",
    primary: "action",
    questions: {
      action: combatQuestion("Morvath", {
        attack: "Casts a fireball",
        power_attack: "Unleashes a shadow storm that hits hard but can miss",
        defend: "Raises a magic barrier",
        heal: "Drains the crown's power to restore health (only if heals remain)",
        flee: "Escapes through a portal with the crown",
      }),
    },
    meta: {
      action: {
        label: "Turno de Morvath",
        options: { ...COMBAT_LABELS, flee: "Huir con la corona" },
      },
    },
  },
  // Jev mode: Jev also plays the hero's side of every fight.
  hero_combat: {
    npc: "Héroe",
    title: "Turno del héroe",
    primary: "action",
    questions: {
      action: {
        type: "choice",
        instructions:
          "You are the traveler, the hero of this story. Turn-based duel: choose the hero's action for this turn according to the hero's personality, both health bars and the enemy's last action.",
        criteria: {
          attack: "Attacks with the sword",
          defend: "Raises their guard to take less damage this turn",
          potion: "Drinks a healing potion (+30 HP), only possible if potions remain",
          flee: "Tries to run away from the fight (may fail)",
          smoke_bomb: "Throws a smoke bomb to escape for sure, only possible if smoke bombs remain",
          elixir: "Drinks the dubious elixir: likely +50 HP, but may poison (-20 HP), only possible if one remains",
          mirror: "Raises the silver mirror to reflect the enemy's next attack, only possible if one remains",
        },
      },
    },
    meta: {
      action: {
        label: "¿Qué hace el héroe?",
        options: {
          attack: "Atacar",
          defend: "Defender",
          potion: "Poción",
          flee: "Huir",
          smoke_bomb: "Bomba de humo",
          elixir: "Elixir dudoso",
          mirror: "Espejo de plata",
        },
      },
    },
  },
} satisfies Record<string, Encounter>;

export type EncounterId = keyof typeof ENCOUNTERS;

export const ENCOUNTER_IDS = Object.keys(ENCOUNTERS) as [EncounterId, ...EncounterId[]];

export function getEncounter(id: EncounterId): Encounter {
  return ENCOUNTERS[id];
}

export function encounterSpec(id: EncounterId): EvalSpec {
  return { encounterId: id, ...ENCOUNTERS[id] };
}
