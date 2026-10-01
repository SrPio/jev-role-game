import type { GameState, ItemId } from "./types";

export type ItemDef = {
  /** Spanish name shown in the HUD and dialogs. */
  name: string;
  /** English name given to the decision engine. */
  en: string;
  /** Finite items run out; infinite ones stay with the hero for good. */
  finite: boolean;
  /** Harmful items work against the hero. */
  harms?: boolean;
  description: string;
};

export const ITEMS: Record<ItemId, ItemDef> = {
  smoke_bomb: {
    name: "Bomba de humo",
    en: "smoke bomb (guaranteed escape from a fight)",
    finite: true,
    description: "En combate: huida garantizada.",
  },
  dubious_elixir: {
    name: "Elixir dudoso",
    en: "dubious elixir (may heal a lot or poison)",
    finite: true,
    description: "En combate: 60 % +50 HP, 40 % −20 HP.",
  },
  silver_mirror: {
    name: "Espejo de plata",
    en: "silver mirror (reflects the next enemy attack)",
    finite: true,
    description: "En combate: devuelve el siguiente ataque enemigo.",
  },
  guild_letter: {
    name: "Carta del gremio",
    en: "sealed letter of the merchant guild",
    finite: true,
    description: "Se puede enseñar una vez a quien comercia con el gremio.",
  },
  hermit_lantern: {
    name: "Linterna del ermitaño",
    en: "hermit's eternal lantern (reveals ambushes and hidden passages)",
    finite: false,
    description: "Revela emboscadas y pasadizos ocultos.",
  },
  moon_amulet: {
    name: "Amuleto lunar",
    en: "moon amulet (softens every blow)",
    finite: false,
    description: "Recibes un 15 % menos de daño.",
  },
  obsidian_dagger: {
    name: "Daga de obsidiana",
    en: "obsidian dagger (extra damage)",
    finite: false,
    description: "+4 de daño en cada ataque.",
  },
  cursed_coin: {
    name: "Moneda maldita",
    en: "cursed coin (dark aura, bad rumors follow its bearer)",
    finite: false,
    harms: true,
    description: "Los rumores te persiguen: −1 reputación en cada etapa del viaje.",
  },
  hermit_curse: {
    name: "Maldición del ermitaño",
    en: "hermit's curse (weakened body)",
    finite: false,
    harms: true,
    description: "−20 HP máximos mientras dure.",
  },
};

export const HERMIT_CURSE_HP = 20;

export const itemCount = (s: GameState, id: ItemId) => s.items[id] ?? 0;
export const hasItem = (s: GameState, id: ItemId) => itemCount(s, id) > 0;
/** Owned and not one of Vesper's fakes. */
export const itemWorks = (s: GameState, id: ItemId) => hasItem(s, id) && !s.fakes.includes(id);

export function addItem(s: GameState, id: ItemId, n = 1): GameState {
  const count = ITEMS[id].finite ? itemCount(s, id) + n : 1;
  return { ...s, items: { ...s.items, [id]: count } };
}

/** Uses up one finite item (or drops an infinite one). */
export function removeItem(s: GameState, id: ItemId, n = 1): GameState {
  const left = ITEMS[id].finite ? itemCount(s, id) - n : 0;
  const items = { ...s.items };
  if (left > 0) items[id] = left;
  else delete items[id];
  return { ...s, items, fakes: left > 0 ? s.fakes : s.fakes.filter((f) => f !== id) };
}

/** Inventory as the decision engines read it. */
export function inventoryList(s: GameState): string[] {
  const list = (Object.keys(s.items) as ItemId[])
    .filter((id) => hasItem(s, id))
    .map((id) => (ITEMS[id].finite && itemCount(s, id) > 1 ? `${ITEMS[id].en} x${itemCount(s, id)}` : ITEMS[id].en));
  if (s.potions > 0) list.unshift(`healing potion x${s.potions}`);
  return list.slice(0, 10);
}
