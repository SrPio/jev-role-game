import { allies, booleanOf, choiceOf, hurt, isHesitant, patch, scoreOf } from "./state";
import type { GameState, Line, StoryNode } from "./types";

export const START_NODE = "prologue";

const APPROACH: Record<string, string> = {
  paid_toll: "paid the 10 gold toll without complaining",
  intimidate: "drew a sword and threatened Grul",
  sneak: "tried to sneak across over the rocks",
  offer_gold: "offered gold in exchange for guidance",
  honest: "honestly explained the quest to recover the stolen crown",
  threaten: "threatened Sera with a blade to force her to guide them",
  fight: "drew their sword, ready to fight",
  negotiate: "proposed a deal to pass peacefully",
  mission: "spoke of their quest to defeat Morvath",
  flee: "turned and tried to run between the trees",
  attack: "charged at Morvath without hesitation",
  listen: "lowered their sword and waited to hear what Morvath had to say",
};

const HESITATE_LINE = (name: string): Line => ({
  text: `${name} duda un instante... ¡Aprovechas la apertura y golpeas primero!`,
});

/** After Morvath (and maybe Sera) decide, route to the right outcome. */
function morvathRoute(s: GameState): string {
  switch (s.morvathChoice) {
    case "offer_pact":
      return "ch5_pact_choice";
    case "flee_with_crown":
      return "ch5_morvath_fled";
    case "surrender":
      return "ch5_surrender";
    default:
      return "combat_morvath";
  }
}

export const NODES: Record<string, StoryNode> = {
  // ───────────────────────── Prólogo ─────────────────────────
  prologue: {
    kind: "say",
    scene: "title",
    hero: "hidden",
    lines: [
      { text: "Eldmoor, año 1187. La Corona de Brasas mantenía encendido el corazón del reino." },
      { text: "Hasta que el hechicero Morvath la robó... y un invierno sin fin cayó sobre estas tierras." },
      { text: "Tú, un viajero con una vieja espada, partes hacia su torre, en el lejano norte." },
      {
        text: "Pero aquí nadie sigue un guion: cada personaje decide por sí mismo. Sus decisiones las toma Jev, en tiempo real.",
      },
    ],
    next: "ch1_title",
  },

  // ───────────────────────── Capítulo I ─────────────────────────
  ch1_title: { kind: "chapter", scene: "bridge", number: "CAPITULO I", title: "El Puente de Grul", next: "ch1_intro" },
  ch1_intro: {
    kind: "say",
    scene: "bridge",
    cast: ["grul"],
    lines: [
      { text: "Un puente de piedra cruza el río Gris. Bajo él vive Grul, un troll con más hambre que paciencia." },
      { who: "Grul", text: "¡ALTO! Este puente es de Grul. Quien cruza, paga. Diez monedas... o un brazo." },
    ],
    next: "ch1_choice",
  },
  ch1_choice: {
    kind: "choose",
    scene: "bridge",
    cast: ["grul"],
    prompt: { text: "¿Qué haces?" },
    options: (s) => [
      {
        label: "Pagar el peaje (10 oro)",
        disabled: s.playerGold < 10,
        apply: (s) => patch(s, { playerGold: s.playerGold - 10, approach: "paid_toll", goldOffered: 10 }),
        next: "ch1_jev",
      },
      {
        label: "Intimidarlo con la espada",
        apply: (s) => patch(s, { approach: "intimidate", goldOffered: 0 }),
        next: "ch1_jev",
      },
      {
        label: "Cruzar a escondidas por las rocas",
        apply: (s) => patch(s, { approach: "sneak", goldOffered: 0 }),
        next: "ch1_jev",
      },
    ],
  },
  ch1_jev: {
    kind: "jev",
    scene: "bridge",
    cast: ["grul"],
    encounter: "troll_bridge",
    npc: "grul",
    thinking: "Grul se rasca la cabeza...",
    buildState: (s) => ({
      situation: "A traveler wants to cross the stone bridge that Grul guards. Grul demanded a toll of 10 gold.",
      npc: "Grul, bridge troll",
      npcPersonality: "greedy, always hungry, lazy bully who turns cowardly when outmatched",
      npcHealth: 80,
      npcHunger: "very high",
      npcKnowsPlayer: false,
      playerHealth: s.playerHealth,
      playerHasWeapon: s.playerHasWeapon,
      playerGold: s.playerGold,
      goldPaid: s.goldOffered,
      playerApproach: APPROACH[s.approach],
      distance: s.approach === "sneak" ? 20 : 5,
      timeOfDay: "day",
    }),
    resolve: (s, d) => {
      const a = choiceOf(d, "action");
      switch (a.choice) {
        case "let_pass":
          return {
            state: s,
            lines: [{ who: "Grul", text: "Hmpf. Pasa, pasa. Grul tiene sueño." }],
            next: "ch2_title",
          };
        case "demand_more":
          return {
            state: s,
            lines: [{ who: "Grul", text: "¡Eso no basta! ¡Grul quiere DIEZ MÁS!" }],
            next: "ch1_more",
          };
        case "flee":
          return {
            state: patch(s, { playerGold: s.playerGold + 15 }),
            lines: [
              { text: "Grul chilla y huye río abajo. Entre sus trapos encuentras 15 monedas." },
            ],
            next: "ch2_title",
          };
        default: {
          const lines: Line[] = [{ who: "Grul", text: "¡GRUL APLASTA!" }];
          let firstStrike = 0;
          if (isHesitant(a)) {
            lines.push(HESITATE_LINE("Grul"));
            firstStrike = 15;
          }
          return { state: patch(s, { firstStrike }), lines, next: "combat_grul" };
        }
      }
    },
  },
  ch1_more: {
    kind: "choose",
    scene: "bridge",
    cast: ["grul"],
    prompt: { who: "Grul", text: "¡Diez más, o Grul se enfada!" },
    options: (s) => [
      {
        label: "Pagar 10 más",
        disabled: s.playerGold < 10,
        apply: (s) => patch(s, { playerGold: s.playerGold - 10 }),
        next: "ch1_paid_more",
      },
      { label: "Negarte", apply: (s) => patch(s, { firstStrike: 0 }), next: "ch1_refuse" },
    ],
  },
  ch1_paid_more: {
    kind: "say",
    scene: "bridge",
    cast: ["grul"],
    lines: [{ who: "Grul", text: "¡Je, je! Grul es rico. Pasa, viajero tonto." }],
    next: "ch2_title",
  },
  ch1_refuse: {
    kind: "say",
    scene: "bridge",
    cast: ["grul"],
    lines: [{ who: "Grul", text: "¡Entonces Grul come viajero!" }],
    next: "combat_grul",
  },
  combat_grul: {
    kind: "combat",
    scene: "bridge",
    cast: ["grul"],
    enemy: "grul",
    outcomes: { win: "ch1_win", lose: "end_fall", enemyFled: "ch1_grul_fled", playerFled: "ch1_player_fled" },
  },
  ch1_win: {
    kind: "say",
    scene: "bridge",
    effect: (s) => patch(s, { playerGold: s.playerGold + 20, defeatedGrul: true }),
    lines: [{ text: "Grul cae al río con un gran chapuzón. Bajo el puente encuentras su tesoro: 20 monedas." }],
    next: "ch2_title",
  },
  ch1_grul_fled: {
    kind: "say",
    scene: "bridge",
    lines: [{ text: "Grul se lanza al agua y desaparece corriente abajo. El puente es tuyo." }],
    next: "ch2_title",
  },
  ch1_player_fled: {
    kind: "say",
    scene: "bridge",
    cast: ["grul"],
    effect: (s) => patch(s, { playerGold: s.playerGold - 5, honor: s.honor - 1 }),
    lines: [{ text: "Saltas al río y cruzas a nado. La corriente se lleva 5 monedas... y algo de tu orgullo." }],
    next: "ch2_title",
  },

  // ───────────────────────── Capítulo II ─────────────────────────
  ch2_title: { kind: "chapter", scene: "tavern", number: "CAPITULO II", title: "La Posada del Cuervo", next: "ch2_intro" },
  ch2_intro: {
    kind: "say",
    scene: "tavern",
    cast: ["sera"],
    lines: [
      { text: "Al caer la tarde llegas a la Posada del Cuervo. Huele a cerveza y a leña húmeda." },
      {
        text: "En un rincón, una mercenaria afila su daga: Sera. Dicen que conoce el camino a la torre... y que una vez sirvió a Morvath.",
      },
      { who: "Sera", text: "¿Buscas algo, viajero? Aquí nada es gratis." },
    ],
    next: "ch2_choice",
  },
  ch2_choice: {
    kind: "choose",
    scene: "tavern",
    cast: ["sera"],
    prompt: { text: "Necesitas una guía hasta la torre. ¿Cómo la convences?" },
    options: (s) => {
      const offer = Math.min(20, s.playerGold);
      return [
        {
          label: offer > 0 ? `Ofrecerle ${offer} de oro` : "Ofrecerle oro (no tienes)",
          disabled: offer === 0,
          apply: (s) => patch(s, { playerGold: s.playerGold - offer, goldOffered: offer, approach: "offer_gold" }),
          next: "ch2_jev",
        },
        {
          label: "Contarle tu misión con honestidad",
          apply: (s) => patch(s, { honor: s.honor + 1, goldOffered: 0, approach: "honest" }),
          next: "ch2_jev",
        },
        {
          label: "Amenazarla para que te guíe",
          apply: (s) => patch(s, { honor: s.honor - 2, goldOffered: 0, approach: "threaten" }),
          next: "ch2_jev",
        },
      ];
    },
  },
  ch2_jev: {
    kind: "jev",
    scene: "tavern",
    cast: ["sera"],
    encounter: "sera_tavern",
    npc: "sera",
    thinking: "Sera te mide con la mirada...",
    buildState: (s) => ({
      situation: "A traveler asks Sera to guide them to the tower of Morvath, the sorcerer who stole the crown.",
      npc: "Sera, mercenary",
      npcPersonality:
        "pragmatic mercenary who loves gold, respects honesty and courage, despises threats, and secretly owes a life-debt to Morvath",
      playerApproach: APPROACH[s.approach],
      goldOffered: s.goldOffered,
      playerGoldLeft: s.playerGold,
      playerHonor: `${s.honor}/10`,
      playerHealth: s.playerHealth,
      playerHasWeapon: s.playerHasWeapon,
      playerDefeatedTheBridgeTroll: s.defeatedGrul,
      timeOfDay: "dusk",
    }),
    resolve: (s, d) => {
      const a = choiceOf(d, "decision");
      const seraTrust = booleanOf(d, "trust").probability;
      switch (a.choice) {
        case "join":
          return {
            state: patch(s, { companion: "Sera", seraSpy: false, seraTrust }),
            lines: [{ who: "Sera", text: "Trato hecho. Te llevaré hasta la torre... y te cubriré la espalda." }],
            next: "ch3_title",
          };
        case "join_as_spy":
          return {
            state: patch(s, { companion: "Sera", seraSpy: true, seraTrust }),
            lines: [
              { who: "Sera", text: "Trato hecho. Te llevaré hasta la torre." },
              { text: "Sonríe. Pero su mirada se desvía, un instante, hacia el norte." },
            ],
            next: "ch3_title",
          };
        case "rob":
          return {
            state: patch(s, { playerGold: 0, seraTrust }),
            lines: [
              { text: "Sera ríe, te empuja contra una mesa y desaparece entre la multitud... junto con tu bolsa." },
              { text: "Seguirás solo. Y sin una moneda." },
            ],
            next: "ch3_title",
          };
        default:
          return {
            state: patch(s, { seraTrust }),
            lines: [{ who: "Sera", text: "Busca a otra tonta. Yo no me acerco a esa torre." }],
            next: "ch3_title",
          };
      }
    },
  },

  // ───────────────────────── Capítulo III ─────────────────────────
  ch3_title: { kind: "chapter", scene: "forest", number: "CAPITULO III", title: "El Bosque Susurrante", next: "ch3_intro" },
  ch3_intro: {
    kind: "say",
    scene: "forest",
    cast: ["kael", "bandit", "bandit"],
    lines: (s) => [
      { text: "El Bosque Susurrante. De noche, los árboles parecen hablar entre ellos." },
      ...(s.companion ? [{ who: "Sera", text: "Silencio. No estamos solos." }] : []),
      {
        text: "De entre las sombras surgen los bandidos. Los guía un caballero de armadura negra: Kael, el último de la Orden del Alba.",
      },
      { who: "Kael", text: "Morvath quemó mi orden. Desde entonces, este bosque es mío. ¿Qué te trae por aquí?" },
    ],
    next: "ch3_choice",
  },
  ch3_choice: {
    kind: "choose",
    scene: "forest",
    cast: ["kael", "bandit", "bandit"],
    prompt: { text: "Estás rodeado. ¿Qué haces?" },
    options: () => [
      { label: "Desenvainar y combatir", apply: (s) => patch(s, { approach: "fight" }), next: "ch3_jev" },
      { label: "Proponer un trato", apply: (s) => patch(s, { approach: "negotiate" }), next: "ch3_jev" },
      {
        label: "Hablarle de tu misión contra Morvath",
        apply: (s) => patch(s, { approach: "mission", honor: s.honor + 1 }),
        next: "ch3_jev",
      },
      { label: "Huir entre los árboles", apply: (s) => patch(s, { approach: "flee", honor: s.honor - 1 }), next: "ch3_jev" },
    ],
  },
  ch3_jev: {
    kind: "jev",
    scene: "forest",
    cast: ["kael", "bandit", "bandit"],
    encounter: "kael_forest",
    npc: "kael",
    thinking: "Kael aprieta la empuñadura...",
    buildState: (s) => ({
      situation: "Kael and his bandits have ambushed and surrounded the traveler in a dark forest.",
      npc: "Kael, fallen knight",
      npcPersonality:
        "bitter fallen knight, honorable at heart, burning hatred for Morvath who destroyed his order, respects courage, despises cowards",
      npcHealth: 90,
      bandits: 4,
      playerApproach: APPROACH[s.approach],
      playerHealth: s.playerHealth,
      playerHasWeapon: s.playerHasWeapon,
      playerGold: s.playerGold,
      playerHonor: `${s.honor}/10`,
      playerCompanions: allies(s),
      timeOfDay: "night",
    }),
    resolve: (s, d) => {
      const a = choiceOf(d, "action");
      switch (a.choice) {
        case "negotiate": {
          const toll = Math.ceil(s.playerGold / 2);
          return {
            state: patch(s, { playerGold: s.playerGold - toll }),
            lines:
              toll > 0
                ? [
                    { who: "Kael", text: "La mitad de tu oro, y el bosque olvidará tu cara." },
                    { text: `Entregas ${toll} monedas. Los bandidos se apartan.` },
                  ]
                : [{ who: "Kael", text: "¿Ni una moneda? Qué miseria. Lárgate antes de que cambie de idea." }],
            next: "ch4_title",
          };
        }
        case "retreat":
          return {
            state: patch(s, { potions: s.potions + 1 }),
            lines: [
              { who: "Kael", text: "No vales el esfuerzo. Vete." },
              { text: "Al retirarse, un bandido deja caer una poción. La guardas." },
            ],
            next: "ch4_title",
          };
        case "recruit":
          return {
            state: patch(s, { kaelAlly: true }),
            lines: [
              { who: "Kael", text: "¿Vas a por Morvath? Entonces mi espada es tuya. Por la Orden del Alba." },
              { text: "Kael se une a tu grupo." },
            ],
            next: "ch4_title",
          };
        default: {
          const lines: Line[] = [{ who: "Kael", text: "Que así sea. ¡A por él!" }];
          let firstStrike = 0;
          if (isHesitant(a)) {
            lines.push(HESITATE_LINE("Kael"));
            firstStrike = 15;
          }
          return { state: patch(s, { firstStrike }), lines, next: "combat_kael" };
        }
      }
    },
  },
  combat_kael: {
    kind: "combat",
    scene: "forest",
    cast: ["kael"],
    enemy: "kael",
    outcomes: { win: "ch3_win", lose: "end_fall", enemyFled: "ch3_kael_fled", playerFled: "ch3_player_fled" },
  },
  ch3_win: {
    kind: "say",
    scene: "forest",
    effect: (s) => patch(s, { hasShield: true, defeatedKael: true, honor: s.honor + 1 }),
    lines: [
      { who: "Kael", text: "Luchas bien... Termina lo que yo no pude." },
      { text: "Kael te entrega su escudo antes de desaparecer en la niebla. (Recibes menos daño)" },
    ],
    next: "ch4_title",
  },
  ch3_kael_fled: {
    kind: "say",
    scene: "forest",
    lines: [{ text: "Kael silba. Él y sus bandidos se desvanecen entre los árboles." }],
    next: "ch4_title",
  },
  ch3_player_fled: {
    kind: "say",
    scene: "forest",
    effect: (s) => patch(s, { playerGold: Math.floor(s.playerGold / 2), honor: s.honor - 1 }),
    lines: [{ text: "Huyes entre la maleza. En la carrera pierdes la mitad de tu oro." }],
    next: "ch4_title",
  },

  // ───────────────────────── Capítulo IV ─────────────────────────
  ch4_title: { kind: "chapter", scene: "village", number: "CAPITULO IV", title: "La Aldea en Llamas", next: "ch4_intro" },
  ch4_intro: {
    kind: "say",
    scene: "village",
    lines: [
      { text: "Al amanecer, humo negro. La aldea de Brinmoor arde: el dragón de Morvath pasó por aquí." },
      { text: "Oyes gritos atrapados en un granero... y ves a un encapuchado huir con un mapa de la torre." },
    ],
    next: "ch4_choice",
  },
  ch4_choice: {
    kind: "choose",
    scene: "village",
    prompt: { text: "No hay tiempo para ambas cosas." },
    options: () => [
      {
        label: "Salvar a los aldeanos",
        apply: (s) => patch(hurt(s, 10), { savedVillagers: true, honor: s.honor + 3 }),
        next: "ch4_saved",
      },
      {
        label: "Perseguir al ladrón del mapa",
        apply: (s) => patch(s, { hasMap: true, honor: s.honor - 1 }),
        next: "ch4_chased",
      },
    ],
  },
  ch4_saved: {
    kind: "say",
    scene: "village",
    lines: [
      { text: "Derribas la puerta del granero entre las llamas. Una familia entera sale tosiendo, viva." },
      { text: "Las brasas te queman los brazos (−10 HP)." },
    ],
    next: "ch4_ysolde_intro",
  },
  ch4_chased: {
    kind: "say",
    scene: "village",
    lines: [
      { text: "Alcanzas al ladrón en el camino y le arrebatas el mapa: muestra un pasadizo secreto a la torre." },
      { text: "A tu espalda, el granero se derrumba." },
    ],
    next: "ch4_ysolde_intro",
  },
  ch4_ysolde_intro: {
    kind: "say",
    scene: "village",
    cast: ["ysolde"],
    lines: [
      { text: "Una sacerdotisa de túnica blanca se acerca entre las cenizas: la Hermana Ysolde." },
      { who: "Ysolde", text: "He visto lo que hiciste, viajero. Y veo también lo que te acompaña." },
    ],
    next: "ch4_jev",
  },
  ch4_jev: {
    kind: "jev",
    scene: "village",
    cast: ["ysolde"],
    encounter: "ysolde_village",
    npc: "ysolde",
    thinking: "Ysolde cierra los ojos y reza...",
    buildState: (s) => ({
      situation:
        "Brinmoor village is burning. The traveler had to choose between saving trapped villagers or chasing a thief carrying a map to Morvath's tower.",
      npc: "Sister Ysolde, priestess",
      npcPersonality:
        "compassionate and wise priestess who can sense hidden intentions, rewards selflessness, turns away the selfish",
      travelerSavedTheVillagers: s.savedVillagers,
      travelerChasedTheThief: s.hasMap,
      playerHonor: `${s.honor}/10`,
      playerHealth: `${s.playerHealth}/${s.playerMaxHealth}`,
      companion: s.companion ?? "none",
      companionAura: !s.companion
        ? "none"
        : s.seraSpy
          ? "a strong, fresh shadow of Morvath clings to her"
          : "a faint, old shadow from her past service to Morvath",
      kaelTravelsWithPlayer: s.kaelAlly,
      timeOfDay: "dawn",
    }),
    resolve: (s, d) => {
      const gift = choiceOf(d, "gift");
      const honor = scoreOf(d, "honor");
      const warn = booleanOf(d, "warn");
      const levels = ["egoísta", "descuidada", "decente", "valiente", "heroica"];
      const soul = levels[Math.min(4, Math.max(0, Math.round(honor.score)))];
      const lines: Line[] = [{ who: "Ysolde", text: `Veo en ti un alma ${soul}.` }];
      let next = s;
      switch (gift.choice) {
        case "bless":
          next = patch(s, { blessed: true });
          lines.push(
            { who: "Ysolde", text: "Que la luz guíe tu espada." },
            { text: "Tu espada brilla con luz sagrada. (Más daño contra Morvath)" },
          );
          break;
        case "heal":
          next = patch(s, { playerHealth: s.playerMaxHealth });
          lines.push({ who: "Ysolde", text: "Descansa un momento." }, { text: "Tus heridas se cierran. (HP al máximo)" });
          break;
        case "reveal_secret":
          next = patch(s, { knowsWeakness: true });
          lines.push(
            { who: "Ysolde", text: "Escucha: el poder de Morvath vive en la gema de brasa de la corona." },
            { text: "Ahora sabes dónde golpear. (Daño ×1.5 contra Morvath)" },
          );
          break;
        default:
          lines.push({ who: "Ysolde", text: "No tengo nada para ti. Sigue tu camino." });
      }
      const warned = s.companion === "Sera" && warn.probability > 0.5;
      if (warned) {
        lines.push({ who: "Ysolde", text: "Y cuídate de tu compañera. Una sombra la sigue." });
      }
      return { state: patch(next, { warnedAboutSera: warned }), lines, next: warned ? "ch4_warned" : "ch5_title" };
    },
  },
  ch4_warned: {
    kind: "choose",
    scene: "village",
    cast: ["ysolde"],
    prompt: { who: "Sera", text: "¿Vas a creerle a una sacerdotisa? ¿Después de todo lo que hemos pasado?" },
    options: () => [
      {
        label: "Despedir a Sera",
        apply: (s) => patch(s, { companion: null }),
        next: "ch4_dismissed",
      },
      { label: "Confiar en ella", next: "ch4_kept" },
    ],
  },
  ch4_dismissed: {
    kind: "say",
    scene: "village",
    cast: ["ysolde", "sera"],
    lines: (s) =>
      s.seraSpy
        ? [
            { who: "Sera", text: "Tsk... ¿Cómo lo supo? Da igual. Morvath te estará esperando." },
            { text: "Sera desaparece entre el humo. Ysolde tenía razón." },
          ]
        : [
            { who: "Sera", text: "Después de todo... Como quieras. Buena suerte, viajero." },
            { text: "Se aleja sin mirar atrás. Nunca sabrás si Ysolde tenía razón." },
          ],
    next: "ch5_title",
  },
  ch4_kept: {
    kind: "say",
    scene: "village",
    cast: ["ysolde"],
    lines: [{ who: "Sera", text: "Gracias. No te arrepentirás." }],
    next: "ch5_title",
  },

  // ───────────────────────── Capítulo V ─────────────────────────
  ch5_title: { kind: "chapter", scene: "tower", number: "CAPITULO V", title: "La Torre de Morvath", next: "ch5_intro" },
  ch5_intro: {
    kind: "say",
    scene: "tower",
    lines: (s) => [
      { text: "La Torre de Morvath se alza entre relámpagos. El frío muerde los huesos." },
      s.hasMap
        ? { text: "Gracias al mapa robado, entras por un pasadizo secreto y llegas a la cima sin ser visto." }
        : { text: "Subes los mil escalones de la torre, esquivando trampas y sombras." },
    ],
    next: "ch5_throne",
  },
  ch5_throne: {
    kind: "say",
    scene: "throne",
    cast: ["morvath"],
    lines: [
      { text: "En la cima, sobre un trono de obsidiana, Morvath luce la Corona de Brasas." },
      { who: "Morvath", text: "Vaya... un viajero ha llegado hasta aquí. Qué entretenido." },
    ],
    next: "ch5_choice",
  },
  ch5_choice: {
    kind: "choose",
    scene: "throne",
    cast: ["morvath"],
    prompt: { text: "Es el momento de la verdad." },
    options: () => [
      { label: "Atacar sin dudar", apply: (s) => patch(s, { approach: "attack" }), next: "ch5_jev" },
      { label: "Escuchar lo que tiene que decir", apply: (s) => patch(s, { approach: "listen" }), next: "ch5_jev" },
    ],
  },
  ch5_jev: {
    kind: "jev",
    scene: "throne",
    cast: ["morvath"],
    encounter: "morvath_throne",
    npc: "morvath",
    thinking: "Morvath calcula tus fuerzas...",
    buildState: (s) => ({
      situation: "The traveler has reached the top of the tower to take back the Ember Crown that Morvath stole.",
      npc: "Morvath, sorcerer",
      npcPersonality:
        "arrogant, calculating sorcerer; self-preservation above all; bargains with those he fears and crushes the weak",
      npcHealth: 140,
      crownPower: "full",
      playerApproach: APPROACH[s.approach],
      playerHealth: `${s.playerHealth}/${s.playerMaxHealth}`,
      playerHasWeapon: s.playerHasWeapon,
      playerSwordBlessed: s.blessed,
      playerKnowsMorvathWeakness: s.knowsWeakness,
      playerAllies: allies(s),
      playerHonor: `${s.honor}/10`,
      travelerArrivedBySecretPassage: s.hasMap,
      timeOfDay: "night",
    }),
    resolve: (s, d) => {
      const a = choiceOf(d, "action");
      const lines: Line[] = {
        fight: [{ who: "Morvath", text: "Entonces arderás como todos los demás." }],
        offer_pact: [{ who: "Morvath", text: "Espera. No tenemos por qué ser enemigos..." }],
        flee_with_crown: [{ who: "Morvath", text: "Hoy no, viajero." }, { text: "Morvath abre un portal de sombras." }],
        surrender: [{ who: "Morvath", text: "¡Basta! ¡Basta! Toma la corona... pero déjame vivir." }],
      }[a.choice] ?? [{ who: "Morvath", text: "..." }];
      if (a.choice === "fight" && isHesitant(a)) lines.push(HESITATE_LINE("Morvath"));
      const state = patch(s, {
        morvathChoice: a.choice,
        firstStrike: a.choice === "fight" && isHesitant(a) ? 15 : 0,
      });
      return { state, lines, next: state.companion === "Sera" ? "ch5_sera_jev" : morvathRoute };
    },
  },
  ch5_sera_jev: {
    kind: "jev",
    scene: "throne",
    cast: ["morvath"],
    encounter: "sera_final",
    npc: "sera",
    thinking: "Sera lleva la mano a su daga...",
    buildState: (s) => ({
      situation: `Final confrontation in Morvath's throne room. Morvath just chose to: ${s.morvathChoice.replace(/_/g, " ")}.`,
      npc: "Sera, the traveler's companion",
      npcPersonality: "pragmatic mercenary who owes a life-debt to Morvath",
      secretlyServesMorvath: s.seraSpy,
      trustInTraveler: Math.round(s.seraTrust * 100) / 100,
      playerHonor: `${s.honor}/10`,
      playerHealth: `${s.playerHealth}/${s.playerMaxHealth}`,
      kaelIsPresent: s.kaelAlly,
      morvathAction: s.morvathChoice,
    }),
    resolve: (s, d) => {
      const a = choiceOf(d, "action");
      if (a.choice === "betray") {
        if (s.kaelAlly) {
          return {
            state: patch(hurt(s, 20), { companion: null }),
            lines: [
              { who: "Sera", text: "Lo siento, viajero. Mi deuda es con él." },
              { text: "¡Kael detiene la daga con su escudo! Aun así, el filo te alcanza (−20 HP)." },
              { who: "Kael", text: "¡Traidora! ¡Vete de aquí!" },
            ],
            next: morvathRoute,
          };
        }
        return {
          state: patch(s, { endingNote: "betrayed" }),
          lines: [
            { who: "Sera", text: "Lo siento, viajero. Mi deuda es con él." },
            { text: "Sientes el frío de la daga en la espalda..." },
          ],
          next: "end_fall",
        };
      }
      if (a.choice === "help") {
        const blocksPortal = s.morvathChoice === "flee_with_crown";
        const state = patch(s, {
          seraHelps: true,
          morvathChoice: blocksPortal ? "fight" : s.morvathChoice,
          firstStrike: s.firstStrike + 20,
        });
        return {
          state,
          lines: blocksPortal
            ? [{ who: "Sera", text: "¡De eso nada!" }, { text: "Sera lanza su daga y cierra el portal. ¡Morvath está acorralado!" }]
            : [{ who: "Sera", text: "¡Por Eldmoor!" }, { text: "Sera hiere a Morvath por sorpresa." }],
          next: morvathRoute,
        };
      }
      return {
        state: s,
        lines: [{ text: "Sera retrocede hacia las sombras. Esto es cosa tuya." }],
        next: morvathRoute,
      };
    },
  },
  ch5_pact_choice: {
    kind: "choose",
    scene: "throne",
    cast: ["morvath"],
    prompt: {
      who: "Morvath",
      text: "Únete a mí. Gobernaremos Eldmoor juntos, y el invierno será eterno solo para nuestros enemigos.",
    },
    options: () => [
      { label: "Aceptar el pacto", next: "end_pact" },
      { label: "Rechazar y luchar", apply: (s) => patch(s, { honor: s.honor + 1 }), next: "ch5_refuse_pact" },
    ],
  },
  ch5_refuse_pact: {
    kind: "say",
    scene: "throne",
    cast: ["morvath"],
    lines: [{ who: "Morvath", text: "Qué decepción. Entonces morirás aquí." }],
    next: "combat_morvath",
  },
  ch5_morvath_fled: {
    kind: "say",
    scene: "throne",
    lines: [{ text: "El portal se cierra. Morvath y la Corona de Brasas han desaparecido." }],
    next: "end_exile",
  },
  ch5_surrender: {
    kind: "say",
    scene: "throne",
    cast: ["morvath"],
    lines: [{ text: "Morvath se arrodilla y te entrega la Corona de Brasas. Su calor te llena el pecho." }],
    next: "end_hero",
  },
  combat_morvath: {
    kind: "combat",
    scene: "throne",
    cast: ["morvath"],
    enemy: "morvath",
    outcomes: { win: "end_hero", lose: "end_fall", enemyFled: "ch5_morvath_fled", playerFled: "end_exile" },
  },

  // ───────────────────────── Finales ─────────────────────────
  end_hero: { kind: "ending", scene: "castle", ending: "hero" },
  end_pact: { kind: "ending", scene: "pact", cast: ["morvath"], hero: "crowned", ending: "pact" },
  end_exile: { kind: "ending", scene: "road", ending: "exile" },
  end_fall: { kind: "ending", scene: "grave", hero: "hidden", ending: "fall" },
};

export const CHAPTER_STARTS: { label: string; node: string }[] = [
  { label: "I", node: "ch1_title" },
  { label: "II", node: "ch2_title" },
  { label: "III", node: "ch3_title" },
  { label: "IV", node: "ch4_title" },
  { label: "V", node: "ch5_title" },
];
