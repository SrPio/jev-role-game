"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { setMuted as setAudioMuted, sfx } from "@/lib/audio/chiptune";
import { requestDecision, requestHeroChoice } from "@/lib/jev/client";
import { getEncounter, type EncounterId } from "@/lib/jev/encounters";
import { HERO_PERSONALITIES, heroCombatState, type HeroPersonality } from "@/lib/jev/hero";
import type { JevDecision, JevState } from "@/lib/jev/types";
import { isTypingTarget } from "@/lib/keys";
import type { SpriteId } from "@/lib/pixel/sprites";
import { ENEMIES, type CombatOutcome, type CombatState, type Enemy, type PlayerAction } from "@/lib/story/combat";
import { INITIAL_STATE, isHesitant, primaryAnswer } from "@/lib/story/state";
import { CHAPTER_STARTS, NODES, START_NODE } from "@/lib/story/story";
import type { CombatNode, EndingId, GameState, Line, NpcId, Option, Ref, StoryNode } from "@/lib/story/types";
import ChoiceMenu from "./ChoiceMenu";
import CombatView from "./CombatView";
import DialogBox from "./DialogBox";
import EndingView from "./EndingView";
import JevBrainPanel from "./JevBrainPanel";
import SceneView, { type Actor, type Mood, type SceneFx } from "./SceneView";

type Phase =
  | { t: "title" }
  | { t: "chapter"; key: number; number: string; title: string; next: string; state: GameState }
  | { t: "dialog"; key: number; lines: Line[]; next: Ref; state: GameState }
  | { t: "choose"; key: number; prompt: Line; options: Option[]; picked?: number }
  | { t: "thinking"; text: string }
  | { t: "combat"; key: number; node: CombatNode }
  | { t: "ending"; ending: EndingId };

/** "player": you are the hero. "jev": Jev plays the hero too, against Jev-driven NPCs. */
type GameMode = { kind: "player" } | { kind: "jev"; personality: HeroPersonality };
type MoodTarget = NpcId | "hero";

const MODE_OPTIONS: { label: string; mode: GameMode }[] = [
  { label: "Jugar: tú eres el héroe", mode: { kind: "player" } },
  ...(Object.keys(HERO_PERSONALITIES) as HeroPersonality[]).map((p) => ({
    label: `Modo Jev: héroe ${HERO_PERSONALITIES[p].label}`,
    mode: { kind: "jev", personality: p } as GameMode,
  })),
];

const ENDINGS_KEY = "eldmoor.endings";
const MIN_THINKING_MS = 650;
/** Jev mode: how long the hero's pick stays highlighted before the story moves on. */
const PICK_PAUSE_MS = 1300;
const HERO_LABEL = { npc: "Héroe (Jev)", title: "Decisión del héroe" };

const resolveRef = (ref: Ref, s: GameState) => (typeof ref === "function" ? ref(s) : ref);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const lineText = (l: Line) => (l.who ? `${l.who}: ${l.text}` : l.text);

function loadEndings(): EndingId[] {
  try {
    return JSON.parse(localStorage.getItem(ENDINGS_KEY) ?? "[]") as EndingId[];
  } catch {
    return [];
  }
}

function buildActors(node: StoryNode | null, s: GameState, moodTarget: MoodTarget | null, mood: Mood): Actor[] {
  if (!node) return [];
  const cast = typeof node.cast === "function" ? node.cast(s) : (node.cast ?? []);
  const look = node.hero ?? "normal";
  const actors: Actor[] = [];
  const withMood = (id: MoodTarget): Mood => (id === moodTarget ? mood : "idle");

  if (look !== "hidden") {
    const allies: NpcId[] = [];
    if (s.companion === "Sera" && !cast.includes("sera")) allies.push("sera");
    if (s.kaelAlly && !cast.includes("kael")) allies.push("kael");
    allies.forEach((id, i) =>
      actors.push({ sprite: id as SpriteId, x: 32 - i * 26, scale: 2, flip: false, role: "ally", mood: withMood(id) }),
    );
    actors.push({
      sprite: "hero",
      x: 60,
      scale: 2,
      flip: false,
      role: "hero",
      crown: look === "crowned",
      mood: withMood("hero"),
    });
  }
  cast.forEach((id, i) => {
    const big = id === "grul" || id === "morvath";
    actors.push({
      sprite: id as SpriteId,
      x: i === 0 ? (big ? 164 : 170) : 196 + (i - 1) * 26,
      scale: big ? 3 : 2,
      flip: true,
      role: i === 0 ? "npc" : "ally",
      mood: i === 0 || id === moodTarget ? withMood(id) : "idle",
    });
  });
  return actors;
}

export default function Game({ debug = false }: { debug?: boolean }) {
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [game, setGame] = useState<GameState>(INITIAL_STATE);
  const [phase, setPhase] = useState<Phase>({ t: "title" });
  const [mode, setMode] = useState<GameMode>({ kind: "player" });
  const [decisions, setDecisions] = useState<JevDecision[]>([]);
  const [thinking, setThinking] = useState<{ npc: string; title: string } | null>(null);
  const [mood, setMood] = useState<{ target: MoodTarget | null; mood: Mood }>({ target: null, mood: "idle" });
  const [fx, setFx] = useState<SceneFx>({ shake: 0, hitHero: 0, hitNpc: 0 });
  const [muted, setMuted] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [discovered, setDiscovered] = useState<EndingId[]>([]);
  const keyRef = useRef(0);
  const runRef = useRef(0);
  const modeRef = useRef<GameMode>(mode);
  /** Last lines of story text, given to Jev when it plays the hero. */
  const recentRef = useRef<string[]>([]);

  const node = nodeId ? NODES[nodeId] : null;
  const jevMode = mode.kind === "jev";

  const remember = (texts: string[]) => {
    recentRef.current = [...recentRef.current, ...texts].slice(-4);
  };

  // ── Jev ────────────────────────────────────────────────────
  const think = useCallback(
    async (
      target: MoodTarget,
      label: { npc: string; title: string },
      request: () => Promise<JevDecision>,
    ): Promise<JevDecision> => {
      setThinking(label);
      setMood({ target, mood: "thinking" });
      sfx.think();
      const [d] = await Promise.all([request(), wait(MIN_THINKING_MS)]);
      setDecisions((prev) => [...prev, d]);
      setThinking(null);
      const primary = primaryAnswer(d, d.primary);
      setMood({ target, mood: primary && isHesitant(primary) ? "hesitant" : "decided" });
      sfx.decide();
      return d;
    },
    [],
  );

  const decide = useCallback(
    (encounterId: EncounterId, state: JevState, target: MoodTarget) => {
      const enc = getEncounter(encounterId);
      return think(target, { npc: enc.npc, title: enc.title }, () => requestDecision(encounterId, state));
    },
    [think],
  );

  // ── Story engine ───────────────────────────────────────────
  const enterRef = useRef<(id: string, s: GameState) => void>(() => {});
  const advance = useCallback((ref: Ref, s: GameState) => {
    const id = resolveRef(ref, s);
    enterRef.current(s.playerHealth <= 0 ? "end_fall" : id, s);
  }, []);

  const enter = useCallback(
    (id: string, s: GameState) => {
      const n = NODES[id];
      if (!n) throw new Error(`Unknown story node: ${id}`);
      const run = runRef.current;
      const key = ++keyRef.current;
      setNodeId(id);
      setGame(s);
      if (n.kind !== "combat") setMood((m) => (n.kind === "jev" ? m : { target: null, mood: "idle" }));

      switch (n.kind) {
        case "chapter":
          sfx.chapter();
          setPhase({ t: "chapter", key, number: n.number, title: n.title, next: resolveRef(n.next, s), state: s });
          break;
        case "say": {
          const s2 = n.effect ? n.effect(s) : s;
          const lines = typeof n.lines === "function" ? n.lines(s2) : n.lines;
          remember(lines.map(lineText));
          setGame(s2);
          setPhase({ t: "dialog", key, lines, next: n.next, state: s2 });
          break;
        }
        case "choose": {
          const options = n.options(s);
          setPhase({ t: "choose", key, prompt: n.prompt, options });
          const m = modeRef.current;
          if (m.kind !== "jev") break;
          void think("hero", HERO_LABEL, () => requestHeroChoice(id, s, m.personality, recentRef.current)).then(
            (d) => {
              if (run !== runRef.current) return;
              const a = primaryAnswer(d, d.primary);
              let idx = a ? Number(a.choice.replace("opt_", "")) : -1;
              if (!options[idx] || options[idx].disabled) idx = options.findIndex((o) => !o.disabled);
              const o = options[idx];
              remember([`El héroe eligió: ${o.label}`]);
              setPhase((p) => (p.t === "choose" && p.key === key ? { ...p, picked: idx } : p));
              setTimeout(() => {
                if (run === runRef.current) advance(o.next, o.apply ? o.apply(s) : s);
              }, PICK_PAUSE_MS);
            },
          );
          break;
        }
        case "jev":
          setPhase({ t: "thinking", text: n.thinking });
          void decide(n.encounter, n.buildState(s), n.npc).then((d) => {
            if (run !== runRef.current) return;
            const r = n.resolve(s, d);
            remember(r.lines.map(lineText));
            setGame(r.state);
            setPhase({ t: "dialog", key: ++keyRef.current, lines: r.lines, next: r.next, state: r.state });
          });
          break;
        case "combat":
          setPhase({ t: "combat", key, node: n });
          break;
        case "ending": {
          setPhase({ t: "ending", ending: n.ending });
          if (n.ending === "fall") sfx.lose();
          else sfx.win();
          const found = Array.from(new Set([...loadEndings(), n.ending]));
          setDiscovered(found);
          try {
            localStorage.setItem(ENDINGS_KEY, JSON.stringify(found));
          } catch {
            /* storage unavailable: progress simply isn't remembered */
          }
          break;
        }
      }
    },
    [decide, think, advance],
  );

  useEffect(() => {
    enterRef.current = enter;
  }, [enter]);

  const start = useCallback(
    (m: GameMode) => {
      runRef.current++;
      modeRef.current = m;
      recentRef.current = [];
      setMode(m);
      setDecisions([]);
      setThinking(null);
      enter(START_NODE, INITIAL_STATE);
    },
    [enter],
  );

  const backToTitle = useCallback(() => {
    runRef.current++;
    setNodeId(null);
    setThinking(null);
    setMood({ target: null, mood: "idle" });
    setPhase({ t: "title" });
  }, []);

  // Chapter cards advance on their own.
  useEffect(() => {
    if (phase.t !== "chapter") return;
    const id = setTimeout(() => advance(phase.next, phase.state), 2200);
    return () => clearTimeout(id);
  }, [phase, advance]);

  // Global keys: chapter skip, panel, mute.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e)) return;
      const k = e.key.toLowerCase();
      if (k === "j") setPanelOpen((o) => !o);
      else if (k === "m") setMuted((m) => !m);
      else if ((e.key === "Enter" || e.key === " ") && !e.repeat && phase.t === "chapter") {
        e.preventDefault();
        advance(phase.next, phase.state);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, advance]);

  useEffect(() => setAudioMuted(muted), [muted]);

  const onCombatEnd = useCallback(
    (outcome: CombatOutcome, s: GameState) => {
      if (phase.t !== "combat") return;
      advance(phase.node.outcomes[outcome], s);
    },
    [phase, advance],
  );

  const onHit = useCallback((who: "hero" | "npc") => {
    setFx((f) => ({
      shake: who === "hero" ? f.shake + 1 : f.shake,
      hitHero: who === "hero" ? f.hitHero + 1 : f.hitHero,
      hitNpc: who === "npc" ? f.hitNpc + 1 : f.hitNpc,
    }));
  }, []);

  // Jev mode: Jev picks the hero's combat action.
  const heroCombatPick = useMemo(() => {
    if (mode.kind !== "jev") return undefined;
    const { personality } = mode;
    return async (enemy: Enemy, c: CombatState, s: GameState): Promise<PlayerAction> => {
      const d = await think("hero", { npc: "Héroe (Jev)", title: `Turno del héroe vs ${enemy.name}` }, () =>
        requestDecision("hero_combat", heroCombatState(enemy, c, s, personality)),
      );
      return (primaryAnswer(d, d.primary)?.choice ?? "attack") as PlayerAction;
    };
  }, [mode, think]);

  const scene = phase.t === "title" || !node ? "title" : node.scene;
  const actors = useMemo(
    () => (phase.t === "title" ? [] : buildActors(node, game, mood.target, mood.mood)),
    [phase.t, node, game, mood],
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-[1400px] flex-col gap-4 px-4 py-4 lg:py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[12px] text-[#ffec27] sm:text-[14px]">CRONICAS DE ELDMOOR</h1>
          {mode.kind === "jev" && phase.t !== "title" ? (
            <span className="bg-[#ff77a8] px-2 py-1 text-[8px] text-black">
              MODO JEV · HEROE {HERO_PERSONALITIES[mode.personality].label.toUpperCase()}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 text-[9px]">
          {phase.t !== "title" ? (
            <button type="button" className="pixel-btn" onClick={backToTitle}>
              MENU
            </button>
          ) : null}
          <button type="button" className="pixel-btn" onClick={() => setMuted((m) => !m)}>
            {muted ? "SONIDO: NO" : "SONIDO: SI"} [M]
          </button>
          <button type="button" className="pixel-btn" onClick={() => setPanelOpen((o) => !o)}>
            JEV {panelOpen ? "▼" : "▶"} [J]
          </button>
        </div>
      </header>

      <div className={`grid gap-4 ${panelOpen ? "lg:grid-cols-[minmax(0,1fr)_400px]" : ""}`}>
        <section className="mx-auto w-full max-w-[960px] space-y-3">
          <div className="screen relative aspect-video w-full overflow-hidden">
            <SceneView scene={scene} actors={actors} fx={fx} />
            {phase.t === "title" ? <TitleOverlay /> : null}
            {phase.t === "chapter" ? (
              <button
                type="button"
                onClick={(e) => e.detail !== 0 && advance(phase.next, phase.state)}
                className="chapter-card absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85"
              >
                <span className="text-[10px] text-[#c2c3c7] sm:text-[12px]">{phase.number}</span>
                <span className="px-4 text-center text-[14px] text-[#ffec27] sm:text-[22px]">{phase.title}</span>
              </button>
            ) : null}
            {phase.t !== "title" ? <Hud game={game} /> : null}
            <div className="scanlines pointer-events-none absolute inset-0" />
          </div>

          {phase.t === "dialog" ? (
            <DialogBox
              key={phase.key}
              lines={phase.lines}
              onDone={() => advance(phase.next, phase.state)}
              autoAdvance={jevMode}
            />
          ) : null}
          {phase.t === "choose" ? (
            <ChoiceMenu
              key={phase.key}
              prompt={
                jevMode
                  ? {
                      ...phase.prompt,
                      text: `${phase.prompt.text} ${phase.picked === undefined ? "(Jev está decidiendo...)" : "(Jev decidió)"}`,
                    }
                  : phase.prompt
              }
              options={phase.options}
              disabled={jevMode}
              highlight={jevMode ? phase.picked : undefined}
              onPick={(i) => {
                const o = phase.options[i];
                advance(o.next, o.apply ? o.apply(game) : game);
              }}
            />
          ) : null}
          {phase.t === "thinking" ? (
            <div className="pixel-box min-h-[132px] p-4 text-[11px] leading-[1.9]">
              <p className="text-[#c2c3c7]">{phase.text}</p>
              <p className="mt-3 text-[9px] text-[#29adff]">
                <span className="blink">●</span> Jev está evaluando el estado...
              </p>
            </div>
          ) : null}
          {phase.t === "combat" ? (
            <CombatView
              key={phase.key}
              enemy={ENEMIES[phase.node.enemy]}
              game={game}
              setGame={setGame}
              decide={(id, st) => decide(id, st, phase.node.enemy)}
              onHit={onHit}
              onEnd={onCombatEnd}
              autoPick={heroCombatPick}
            />
          ) : null}
          {phase.t === "ending" ? (
            <EndingView
              ending={phase.ending}
              game={game}
              decisions={decisions}
              discovered={discovered}
              onRestart={backToTitle}
            />
          ) : null}
          {phase.t === "title" ? (
            <>
              <ChoiceMenu
                prompt={{ text: "Elige un modo de juego:" }}
                options={MODE_OPTIONS}
                onPick={(i) => start(MODE_OPTIONS[i].mode)}
              />
              <div className="pixel-box space-y-3 p-4 text-[10px] leading-[1.9] text-[#c2c3c7]">
                <p>
                  Una aventura de 5 capítulos y <span className="text-[#ffec27]">4 finales</span>. Tú eliges cómo
                  actuar; <span className="text-[#ff77a8]">Jev</span> decide qué hacen los demás.
                </p>
                <p>
                  En el <span className="text-[#ff77a8]">Modo Jev</span> tú solo miras: Jev juega al héroe con la
                  personalidad elegida, contra NPCs que también decide Jev.
                </p>
                <p className="text-[9px] text-[#5f574f]">
                  Controles: ↑↓ / 1-4 elegir · ENTER avanzar · J panel de Jev · M sonido
                </p>
              </div>
            </>
          ) : null}

          {debug ? (
            <DebugBar
              nodeId={nodeId}
              game={game}
              onJump={(id, s) => {
                runRef.current++;
                enter(id, s);
              }}
            />
          ) : null}
        </section>

        {panelOpen ? (
          <aside className="w-full lg:sticky lg:top-4 lg:self-start">
            <JevBrainPanel decisions={decisions} thinking={thinking} />
          </aside>
        ) : null}
      </div>
    </main>
  );
}

function TitleOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
      <span className="title-glow px-4 text-[18px] leading-[1.4] text-[#ffec27] sm:text-[32px]">
        CRONICAS DE ELDMOOR
      </span>
      <span className="text-[9px] text-[#ff77a8] sm:text-[12px]">~ La Corona de Brasas ~</span>
      <span className="blink mt-6 text-[9px] text-[#fff1e8] sm:text-[11px]">ELIGE UN MODO ▼</span>
    </div>
  );
}

function Hud({ game }: { game: GameState }) {
  const pct = Math.max(0, (game.playerHealth / game.playerMaxHealth) * 100);
  const party = [game.companion, game.kaelAlly ? "Kael" : null].filter(Boolean).join(", ");
  return (
    <div className="pointer-events-none absolute left-2 top-2 flex flex-wrap items-center gap-x-3 gap-y-1 bg-black/60 px-2 py-1 text-[7px] sm:text-[9px]">
      <span className="flex items-center gap-1">
        HP
        <span className="inline-block h-2 w-12 border border-[#fff1e8] bg-black sm:w-16">
          <span
            className="hp-fill block h-full"
            style={{ width: `${pct}%`, background: pct > 35 ? "#00e436" : "#ff004d" }}
          />
        </span>
        {game.playerHealth}
      </span>
      <span className="text-[#ffec27]">ORO {game.playerGold}</span>
      <span className="text-[#ff77a8]">POC {game.potions}</span>
      <span className="text-[#29adff]">HONOR {game.honor}</span>
      {party ? <span className="text-[#00e436]">+ {party}</span> : null}
    </div>
  );
}

function DebugBar({
  nodeId,
  game,
  onJump,
}: {
  nodeId: string | null;
  game: GameState;
  onJump: (id: string, s: GameState) => void;
}) {
  const [target, setTarget] = useState(nodeId ?? START_NODE);
  const [json, setJson] = useState("");
  const [error, setError] = useState("");
  const jump = (id: string) => {
    try {
      const s = json.trim() ? ({ ...INITIAL_STATE, ...JSON.parse(json) } as GameState) : game;
      setError("");
      onJump(id, s);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <div className="pixel-box space-y-2 p-3 text-[8px]">
      <div className="text-[#ffa300]">DEBUG · nodo actual: {nodeId ?? "—"}</div>
      <div className="flex flex-wrap gap-2">
        {CHAPTER_STARTS.map((c) => (
          <button key={c.node} type="button" className="pixel-btn" onClick={() => jump(c.node)}>
            Cap. {c.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={target} onChange={(e) => setTarget(e.target.value)} className="bg-black p-1 text-[8px]">
          {Object.keys(NODES).map((id) => (
            <option key={id}>{id}</option>
          ))}
        </select>
        <button type="button" className="pixel-btn" onClick={() => jump(target)}>
          IR
        </button>
      </div>
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder='Sobrescribir estado, p. ej. {"companion":"Sera","seraSpy":true,"playerHealth":20}'
        className="h-16 w-full bg-black p-2 text-[8px]"
      />
      {error ? <div className="text-[#ff004d]">{error}</div> : null}
    </div>
  );
}
