/** Tiny square-wave sound effects via Web Audio. Created lazily on first user gesture. */
let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(value: boolean) {
  muted = value;
}

function audio(): AudioContext | null {
  if (muted || typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "square", vol = 0.05) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function seq(notes: [number, number][], step = 0.08, type: OscillatorType = "square", vol?: number) {
  notes.forEach(([f, len], i) => tone(f, i * step, len, type, vol));
}

export const sfx = {
  blip: () => tone(880, 0, 0.025, "square", 0.015),
  move: () => tone(660, 0, 0.04),
  select: () => seq([[660, 0.05], [990, 0.08]], 0.05),
  think: () => seq([[523, 0.06], [659, 0.06], [784, 0.06], [1047, 0.1]], 0.07, "triangle", 0.06),
  decide: () => seq([[784, 0.06], [1175, 0.12]], 0.06, "square", 0.04),
  hit: () => {
    tone(140, 0, 0.12, "sawtooth", 0.08);
    tone(90, 0.04, 0.14, "square", 0.06);
  },
  heal: () => seq([[523, 0.08], [784, 0.08], [1047, 0.12]], 0.08, "triangle", 0.06),
  win: () => seq([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.3]], 0.12),
  lose: () => seq([[392, 0.15], [330, 0.15], [262, 0.15], [196, 0.4]], 0.18, "triangle", 0.07),
  chapter: () => seq([[392, 0.1], [523, 0.1], [659, 0.2]], 0.1, "triangle", 0.06),
};
