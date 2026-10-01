/**
 * Samples the primary-answer confidence a decision engine returns for the game's
 * real states, to pick a per-engine hesitation threshold.
 *   pnpm dlx tsx scripts/sample-confidence.ts laya   (needs `pnpm dev` running)
 */
import { HERO_PERSONALITY_IDS, heroCombatState } from "@/lib/jev/hero";
import { ENEMIES, combatJevState, startCombat, type CombatState, type PlayerAction } from "@/lib/story/combat";
import { INITIAL_STATE } from "@/lib/story/state";
import { NODES } from "@/lib/story/story";
import type { GameState } from "@/lib/story/types";

const provider = process.argv[2] ?? "laya";
const BASE = process.env.GAME_URL ?? "http://localhost:3000";

const variants: GameState[] = [
  INITIAL_STATE,
  {
    ...INITIAL_STATE,
    playerHealth: 35,
    playerGold: 5,
    potions: 0,
    honor: 2,
    reputation: 1,
    knownThief: true,
    items: { cursed_coin: 1, smoke_bomb: 1 },
    approach: "loot",
  },
  {
    ...INITIAL_STATE,
    playerGold: 60,
    honor: 8,
    reputation: 9,
    companion: "Sera",
    kaelAlly: true,
    blessed: true,
    hasShield: true,
    items: { hermit_lantern: 1, silver_mirror: 1, dubious_elixir: 1, guild_letter: 1 },
    approach: "help_caravan",
  },
];

type Sample = { group: string; options: number; confidence: number; source: string };
const samples: Sample[] = [];

async function post(path: string, body: unknown, group: string) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...(body as object), provider }),
  });
  const d = await res.json();
  const a = d.answers?.[d.primary];
  if (!a) return;
  samples.push({
    group,
    options: Object.keys(a.probabilities ?? {}).length,
    confidence: a.confidence,
    source: d.source,
  });
}

async function main() {
  for (const [id, n] of Object.entries(NODES)) {
    for (const s of variants) {
      if (n.kind === "jev") await post("/api/decide", { encounterId: n.encounter, state: n.buildState(s) }, "npc_story");
      if (n.kind === "choose") {
        for (const personality of HERO_PERSONALITY_IDS) {
          await post("/api/hero", { nodeId: id, game: s, personality, recentEvents: [] }, "hero_choice");
        }
      }
    }
  }
  const actions: PlayerAction[] = ["attack", "defend", "potion", "flee", "smoke_bomb", "elixir", "mirror"];
  for (const enemy of Object.values(ENEMIES)) {
    for (const s of variants) {
      for (const frac of [1, 0.6, 0.25, 0.08]) {
        const c: CombatState = {
          ...startCombat(enemy, s),
          enemyHp: Math.max(1, Math.round(enemy.hp * frac)),
          turn: 1 + Math.round((1 - frac) * 8),
          lastPlayerAction: actions[Math.floor(Math.random() * actions.length)],
        };
        await post("/api/decide", { encounterId: enemy.encounter, state: combatJevState(enemy, c, s) }, "npc_combat");
        const personality = HERO_PERSONALITY_IDS[Math.floor(Math.random() * HERO_PERSONALITY_IDS.length)];
        await post("/api/decide", { encounterId: "hero_combat", state: heroCombatState(enemy, c, s, personality) }, "hero_combat");
      }
    }
  }

  const live = samples.filter((x) => x.source === provider);
  const q = (xs: number[], p: number) => xs[Math.min(xs.length - 1, Math.floor(p * xs.length))];
  const report = (name: string, xs: number[]) => {
    const v = [...xs].sort((a, b) => a - b);
    if (!v.length) return console.log(`${name}: no samples`);
    console.log(
      `${name.padEnd(12)} n=${String(v.length).padStart(3)}  p10=${q(v, 0.1).toFixed(3)}  p25=${q(v, 0.25).toFixed(3)}  p50=${q(v, 0.5).toFixed(3)}  p75=${q(v, 0.75).toFixed(3)}  p90=${q(v, 0.9).toFixed(3)}`,
    );
  };
  console.log(`${provider}: ${live.length}/${samples.length} live answers`);
  for (const g of ["npc_story", "npc_combat", "hero_choice", "hero_combat"]) {
    report(g, live.filter((x) => x.group === g).map((x) => x.confidence));
  }
  report("all", live.map((x) => x.confidence));
}

main();
