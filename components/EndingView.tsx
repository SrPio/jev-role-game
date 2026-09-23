"use client";

import { useEffect } from "react";
import { isTypingTarget } from "@/lib/keys";
import { getEncounter } from "@/lib/jev/encounters";
import type { JevDecision } from "@/lib/jev/types";
import { ENDINGS } from "@/lib/story/endings";
import type { EndingId, GameState } from "@/lib/story/types";

type Props = {
  ending: EndingId;
  game: GameState;
  decisions: JevDecision[];
  discovered: EndingId[];
  onRestart: () => void;
};

const ORDER: EndingId[] = ["hero", "pact", "exile", "fall"];

export default function EndingView({ ending, game, decisions, discovered, onRestart }: Props) {
  const e = ENDINGS[ending];
  const story = decisions.filter((d) => !d.encounterId.startsWith("combat_"));
  const combatTurns = decisions.length - story.length;

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Enter" && !ev.repeat && !isTypingTarget(ev)) onRestart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onRestart]);

  return (
    <div className="pixel-box space-y-4 p-4">
      <div>
        <div className="text-[9px] text-[#c2c3c7]">{e.subtitle}</div>
        <h2 className="mt-2 text-[16px] leading-[1.5] sm:text-[20px]" style={{ color: e.color }}>
          {e.title}
        </h2>
      </div>
      <div className="space-y-2">
        {e.lines(game).map((l) => (
          <p key={l.text} className="text-[11px] leading-[1.9]">
            {l.text}
          </p>
        ))}
      </div>

      <div>
        <div className="mb-2 text-[9px] text-[#ff77a8]">LO QUE DECIDIO JEV</div>
        <ul className="space-y-1 text-[9px] leading-[1.8]">
          {story.map((d) => {
            const enc = getEncounter(d.encounterId);
            const a = d.answers[enc.primary];
            if (a?.type !== "choice") return null;
            return (
              <li key={d.id} className="flex justify-between gap-2">
                <span>
                  {d.npc}: <span className="text-[#00e436]">{enc.meta[enc.primary]?.options?.[a.choice] ?? a.choice}</span>
                </span>
                <span className="text-[#c2c3c7]">conf. {a.confidence.toFixed(2)}</span>
              </li>
            );
          })}
          {combatTurns > 0 ? (
            <li className="text-[#c2c3c7]">+ {combatTurns} turnos de combate decididos por Jev</li>
          ) : null}
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 text-[9px]">
          FINALES:
          {ORDER.map((id) => (
            <span key={id} style={{ color: discovered.includes(id) ? ENDINGS[id].color : "#5f574f" }}>
              {discovered.includes(id) ? "★" : "☆"}
            </span>
          ))}
          <span className="text-[#c2c3c7]">{discovered.length}/4</span>
        </div>
        <button type="button" onClick={(ev) => ev.detail !== 0 && onRestart()} className="pixel-btn">
          ▶ JUGAR DE NUEVO
        </button>
      </div>
    </div>
  );
}
