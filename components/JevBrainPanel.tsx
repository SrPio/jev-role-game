"use client";

import { useState } from "react";
import { HESITATION_THRESHOLD, type Answer, type JevDecision, type JevValue } from "@/lib/jev/types";

type Props = {
  decisions: JevDecision[];
  thinking: { npc: string; title: string } | null;
};

const pct = (n: number) => `${Math.round(n * 100)}%`;

function Bar({ value, color, marker }: { value: number; color: string; marker?: number }) {
  return (
    <div className="relative h-2.5 flex-1 border border-[#5f574f] bg-[#000]">
      <div className="hp-fill h-full" style={{ width: pct(value), background: color }} />
      {marker !== undefined ? (
        <div className="absolute top-[-3px] h-[14px] w-[2px] bg-[#ff77a8]" style={{ left: pct(marker) }} />
      ) : null}
    </div>
  );
}

function ConfidenceRow({ confidence }: { confidence: number }) {
  const hesitant = confidence < HESITATION_THRESHOLD;
  return (
    <div className="mt-2 flex items-center gap-2 text-[8px]">
      <span className="w-20 shrink-0 text-[#c2c3c7]">CONFIANZA</span>
      <Bar value={confidence} color={hesitant ? "#ffa300" : "#29adff"} marker={HESITATION_THRESHOLD} />
      <span className="w-10 text-right">{confidence.toFixed(2)}</span>
      <span className={`w-14 text-right ${hesitant ? "text-[#ffa300]" : "text-[#29adff]"}`}>
        {hesitant ? "DUDA" : "SEGURO"}
      </span>
    </div>
  );
}

function AnswerView({ answer, label, options, levels }: {
  answer: Answer;
  label: string;
  options?: Record<string, string>;
  levels?: string[];
}) {
  if (answer.type === "choice") {
    const sorted = Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1]);
    return (
      <div>
        <div className="mb-2 text-[9px] text-[#ffec27]">{label}</div>
        <div className="space-y-1.5">
          {sorted.map(([id, p]) => {
            const chosen = id === answer.choice;
            return (
              <div key={id} className="flex items-center gap-2 text-[8px]">
                <span className={`w-3 ${chosen ? "text-[#00e436]" : ""}`}>{chosen ? "▶" : ""}</span>
                <span className={`w-28 shrink-0 truncate ${chosen ? "text-[#00e436]" : "text-[#c2c3c7]"}`} title={id}>
                  {options?.[id] ?? id}
                </span>
                <Bar value={p} color={chosen ? "#00e436" : "#5f574f"} />
                <span className="w-9 text-right">{pct(p)}</span>
              </div>
            );
          })}
        </div>
        <ConfidenceRow confidence={answer.confidence} />
      </div>
    );
  }
  if (answer.type === "boolean") {
    return (
      <div>
        <div className="mb-2 text-[9px] text-[#ffec27]">{label}</div>
        <div className="flex items-center gap-2 text-[8px]">
          <span className="w-[124px] shrink-0 text-[#c2c3c7]">P(sí)</span>
          <Bar value={answer.probability} color={answer.probability > 0.5 ? "#00e436" : "#ff004d"} marker={0.5} />
          <span className="w-9 text-right">{pct(answer.probability)}</span>
        </div>
      </div>
    );
  }
  const maxLevel = Math.max(1, (levels?.length ?? 5) - 1);
  return (
    <div>
      <div className="mb-2 text-[9px] text-[#ffec27]">
        {label}: {answer.score.toFixed(2)} / {maxLevel}
      </div>
      <div className="space-y-1.5">
        {(levels ?? Object.keys(answer.probabilities)).map((name, i) => (
          <div key={name} className="flex items-center gap-2 text-[8px]">
            <span className="w-3" />
            <span className="w-28 shrink-0 text-[#c2c3c7]">{name}</span>
            <Bar value={answer.probabilities[String(i)] ?? 0} color="#83769c" />
            <span className="w-9 text-right">{pct(answer.probabilities[String(i)] ?? 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function JsonValue({ value }: { value: JevValue }) {
  if (typeof value === "string") return <span className="text-[#ffec27]">&quot;{value}&quot;</span>;
  if (typeof value === "number") return <span className="text-[#ff77a8]">{value}</span>;
  if (typeof value === "boolean") return <span className="text-[#00e436]">{String(value)}</span>;
  if (value === null) return <span className="text-[#5f574f]">null</span>;
  return (
    <span>
      [
      {value.map((v, i) => (
        <span key={i}>
          <span className="text-[#ffec27]">&quot;{v}&quot;</span>
          {i < value.length - 1 ? ", " : ""}
        </span>
      ))}
      ]
    </span>
  );
}

export default function JevBrainPanel({ decisions, thinking }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const latest = decisions.at(-1);
  const current = decisions.find((d) => d.id === selected) ?? latest;

  return (
    <div className="pixel-box space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] text-[#ff77a8]">CEREBRO DE JEV</h2>
        <span className="text-[8px] text-[#5f574f]">[J] ocultar</span>
      </div>

      {thinking ? (
        <div className="border-2 border-dashed border-[#29adff] p-3 text-[9px] leading-[1.8] text-[#29adff]">
          <span className="blink">●</span> Evaluando: {thinking.npc} · {thinking.title}...
        </div>
      ) : null}

      {!current ? (
        <p className="text-[9px] leading-[1.9] text-[#c2c3c7]">
          Aquí verás cada decisión de los NPC: el <span className="text-[#ffec27]">estado</span> que recibe Jev, la
          probabilidad de cada opción y su <span className="text-[#29adff]">confianza</span>. El juego ejecuta la
          opción elegida; si la confianza es baja, el NPC duda.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-[8px]">
            <span
              className={`px-2 py-1 ${current.source === "jev" ? "bg-[#008751] text-[#fff1e8]" : "bg-[#ffa300] text-[#000]"}`}
              title={current.error}
            >
              {current.source === "jev" ? "JEV · EN VIVO" : "OFFLINE · FALLBACK"}
            </span>
            <span className="text-[#c2c3c7]">{current.latencyMs} ms</span>
            {current.usage?.inputTokens ? (
              <span className="text-[#c2c3c7]">
                {current.usage.inputTokens}+{current.usage.outputTokens ?? 0} tok
              </span>
            ) : null}
          </div>
          <div>
            <div className="text-[10px]">{current.title}</div>
            <div className="mt-1 text-[8px] text-[#5f574f]">model: typesafe-ai/jev</div>
          </div>

          <details className="group" open>
            <summary className="cursor-pointer text-[9px] text-[#c2c3c7]">ESTADO →</summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words bg-[#000] p-2 text-[8px] leading-[1.7]">
              {"{\n"}
              {Object.entries(current.state).map(([k, v]) => (
                <span key={k}>
                  {"  "}
                  <span className="text-[#29adff]">{k}</span>: <JsonValue value={v} />
                  {",\n"}
                </span>
              ))}
              {"}"}
            </pre>
          </details>

          <div className="space-y-4">
            <div className="text-[9px] text-[#c2c3c7]">← RESPUESTA</div>
            {Object.entries(current.answers).map(([id, a]) => (
              <AnswerView
                key={id}
                answer={a}
                label={current.meta[id]?.label ?? id}
                options={current.meta[id]?.options}
                levels={current.meta[id]?.levels}
              />
            ))}
          </div>
        </>
      )}

      {decisions.length > 0 ? (
        <div>
          <div className="mb-2 text-[9px] text-[#c2c3c7]">HISTORIAL ({decisions.length})</div>
          <ol className="max-h-40 space-y-1 overflow-auto">
            {[...decisions].reverse().map((d) => {
              const enc = d;
              const a = d.answers[enc.primary];
              const choice = a?.type === "choice" ? (enc.meta[enc.primary]?.options?.[a.choice] ?? a.choice) : "—";
              const active = d.id === current?.id;
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(d.id === latest?.id ? null : d.id)}
                    className={`flex w-full justify-between gap-2 text-left text-[8px] ${active ? "text-[#ffec27]" : "text-[#c2c3c7]"}`}
                  >
                    <span className="truncate">
                      {d.npc} → {choice}
                    </span>
                    <span>{a ? a.confidence.toFixed(2) : ""}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
