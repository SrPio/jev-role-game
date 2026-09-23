"use client";

import { useState } from "react";
import { sfx } from "@/lib/audio/chiptune";
import type { EncounterId } from "@/lib/jev/encounters";
import type { JevDecision, JevState } from "@/lib/jev/types";
import {
  combatJevState,
  resolveTurn,
  startCombat,
  type CombatOutcome,
  type Enemy,
  type PlayerAction,
} from "@/lib/story/combat";
import { choiceOf, patch } from "@/lib/story/state";
import type { GameState } from "@/lib/story/types";
import ChoiceMenu from "./ChoiceMenu";
import DialogBox from "./DialogBox";

type Props = {
  enemy: Enemy;
  game: GameState;
  setGame: (s: GameState) => void;
  decide: (encounterId: EncounterId, state: JevState) => Promise<JevDecision>;
  onHit: (who: "hero" | "npc") => void;
  onEnd: (outcome: CombatOutcome, game: GameState) => void;
};

const ACTIONS: { id: PlayerAction; label: string }[] = [
  { id: "attack", label: "Atacar" },
  { id: "defend", label: "Defender" },
  { id: "potion", label: "Poción" },
  { id: "flee", label: "Huir" },
];

const OUTCOME_TEXT: Record<CombatOutcome, string> = {
  win: "¡VICTORIA!",
  lose: "DERROTA...",
  enemyFled: "EL ENEMIGO HA HUIDO",
  playerFled: "HAS ESCAPADO",
};

export function HpBar({ label, hp, max, color }: { label: string; hp: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  return (
    <div className="flex-1">
      <div className="mb-1 flex justify-between text-[9px]">
        <span>{label}</span>
        <span>
          {hp}/{max}
        </span>
      </div>
      <div className="h-3 border-2 border-[#fff1e8] bg-[#000]">
        <div className="hp-fill h-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function CombatView({ enemy, game, setGame, decide, onHit, onEnd }: Props) {
  const [combat, setCombat] = useState(() => startCombat(enemy, game));
  const [log, setLog] = useState<string[]>(() =>
    game.firstStrike > 0
      ? [`¡Golpe inicial! ${enemy.name} pierde ${game.firstStrike} HP antes de empezar.`]
      : [`¡${enemy.name} se prepara para luchar!`],
  );
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{ result: CombatOutcome; game: GameState } | null>(null);

  const act = async (action: PlayerAction) => {
    if (busy || outcome) return;
    setBusy(true);
    const decision = await decide(enemy.encounter, combatJevState(enemy, combat, game));
    const npc = choiceOf(decision, "action");
    const r = resolveTurn(enemy, combat, game, action, npc);
    setCombat(r.combat);
    setGame(r.game);
    setLog((prev) => [...prev.slice(-3), `— Turno ${combat.turn} —`, ...r.log].slice(-6));
    if (r.enemyHit) onHit("npc");
    if (r.heroHit) onHit("hero");
    if (r.enemyHit || r.heroHit) sfx.hit();
    else if (action === "potion") sfx.heal();
    if (r.outcome) {
      if (r.outcome === "lose") sfx.lose();
      else sfx.win();
      setOutcome({ result: r.outcome, game: patch(r.game, { firstStrike: 0 }) });
    }
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <div className="pixel-box flex gap-4 p-3">
        <HpBar label="TU" hp={game.playerHealth} max={game.playerMaxHealth} color="#00e436" />
        <HpBar label={enemy.name.toUpperCase()} hp={combat.enemyHp} max={combat.enemyMaxHp} color="#ff004d" />
      </div>
      <div className="pixel-box min-h-[92px] space-y-1 p-3 text-[10px] leading-[1.7]">
        {log.map((l, i) => (
          <p key={`${combat.turn}-${i}`} className={l.startsWith("—") ? "text-[#5f574f]" : ""}>
            {l}
          </p>
        ))}
      </div>
      {outcome ? (
        <DialogBox
          lines={[{ text: OUTCOME_TEXT[outcome.result] }]}
          onDone={() => onEnd(outcome.result, outcome.game)}
        />
      ) : (
        <ChoiceMenu
          prompt={{ text: busy ? `Jev decide el turno de ${enemy.name}...` : "Tu turno:" }}
          disabled={busy}
          options={ACTIONS.map((a) => ({
            label: a.id === "potion" ? `${a.label} (${game.potions})` : a.label,
            disabled: a.id === "potion" && game.potions === 0,
          }))}
          onPick={(i) => void act(ACTIONS[i].id)}
        />
      )}
    </div>
  );
}
