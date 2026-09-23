import { PAL } from "./palette";

/**
 * 16×16 sprites, one PICO-8 hex char per pixel ("." = transparent).
 * All face right; NPCs are mirrored when drawn so they face the hero.
 */
const RAW = {
  hero: [
    "......88........",
    ".....888........",
    "....66666.......",
    "...6666666......",
    "...66f0f06......",
    "...6666666....7.",
    "....66666....76.",
    "..111c1c111.76..",
    ".1111111111476..",
    ".f111111111f....",
    ".f11aaaa11......",
    "...1111111......",
    "...11...11......",
    "...55...55......",
    "..555...555.....",
    "................",
  ],
  grul: [
    "................",
    ".....bbbbb......",
    "....bbbbbbb.....",
    "....bb0bb0b.....",
    "....bbbbbbb.....",
    "....bb7b7bb..44.",
    "...bbbbbbbbb444.",
    "..bbbbbbbbbbb44.",
    ".bbbb33333bbb4..",
    ".bbb3333333bb4..",
    ".bb.3333333.bb..",
    "....4444444.....",
    "....4444444.....",
    "....bb...bb.....",
    "....bb...bb.....",
    "...bbb...bbb....",
  ],
  sera: [
    "......333.......",
    ".....33333......",
    "....3388833.....",
    "....38ff883.....",
    "....38f0f03.....",
    "....38ffff3.....",
    ".....3ff33......",
    "....3344433.....",
    "...334444433....",
    "...f3444443f6...",
    "....3444443..6..",
    "....33a4a33.....",
    ".....44444......",
    ".....4...4......",
    ".....4...4......",
    "....00...00.....",
  ],
  kael: [
    "......555.......",
    ".....55555......",
    ".....55858......",
    ".....55555......",
    "......555.......",
    "...225555522....",
    "..22555555522...",
    "..2555a5a5552...",
    "..25555555556...",
    "..255555555.6...",
    "..22555555..6...",
    "..22555555..6...",
    "...255..552.7...",
    "....55..55......",
    "...555..555.....",
    "................",
  ],
  ysolde: [
    ".....aaaa.......",
    "....a....a......",
    ".....7777.......",
    "....77aa77......",
    "....7affa7......",
    "....7f0f07......",
    "....7ffff7......",
    ".....7ff7.......",
    "....777777......",
    "...77766777.....",
    "..f77777777f....",
    "...77777777.....",
    "...77777777.....",
    "...77a77a77.....",
    "..7777777777....",
    "..6666666666....",
  ],
  morvath: [
    "....a9a9a.......",
    "....aa8aa....8..",
    "...2222222..888.",
    "..222222222..4..",
    "..22ff0f0f2..4..",
    "..2ffffffff2.4..",
    "..2266666622.4..",
    ".222666666222f..",
    ".22dd6666dd224..",
    ".22dd2222dd2.4..",
    ".22ddddddddd24..",
    "..2ddddddddd24..",
    "..2ddddddddd2...",
    "..22ddddddd22...",
    ".2222222222222..",
    "................",
  ],
  bandit: [
    "................",
    "................",
    "................",
    "......444.......",
    ".....44444......",
    ".....40000......",
    ".....4ff0f......",
    "......444.......",
    "....5544455.....",
    "...555444555....",
    "...f5544455f6...",
    "....5544455..6..",
    "....5555555.....",
    "....55...55.....",
    "....44...44.....",
    "...444...444....",
  ],
  crown: [
    "a.a.a",
    "aaaaa",
    "a989a",
  ],
} as const;

export type SpriteId = keyof typeof RAW;

type Sprite = { w: number; h: number; rows: string[] };

export const SPRITES: Record<SpriteId, Sprite> = Object.fromEntries(
  Object.entries(RAW).map(([id, rows]) => {
    const w = Math.max(...rows.map((r) => r.length));
    return [id, { w, h: rows.length, rows: rows.map((r) => r.padEnd(w, ".")) }];
  }),
) as Record<SpriteId, Sprite>;

/**
 * Draws a sprite with its feet on `groundY`.
 * `silhouette` paints every pixel one color (hit flash).
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  id: SpriteId,
  x: number,
  groundY: number,
  scale: number,
  flip = false,
  silhouette?: string,
) {
  const s = SPRITES[id];
  const top = groundY - s.h * scale;
  for (let j = 0; j < s.h; j++) {
    const row = s.rows[j];
    for (let i = 0; i < s.w; i++) {
      const c = row[i];
      if (c === ".") continue;
      ctx.fillStyle = silhouette ?? PAL[c];
      const col = flip ? s.w - 1 - i : i;
      ctx.fillRect(Math.round(x + col * scale), Math.round(top + j * scale), scale, scale);
    }
  }
}
