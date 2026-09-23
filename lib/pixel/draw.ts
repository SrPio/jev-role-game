import { PAL } from "./palette";

export type Ctx = CanvasRenderingContext2D;

export function rect(ctx: Ctx, c: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = PAL[c] ?? c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function px(ctx: Ctx, c: string, x: number, y: number) {
  rect(ctx, c, x, y, 1, 1);
}

/** Checkerboard dither of two colors — the classic 8-bit gradient trick. */
export function dither(ctx: Ctx, c1: string, c2: string, x: number, y: number, w: number, h: number) {
  rect(ctx, c1, x, y, w, h);
  ctx.fillStyle = PAL[c2];
  for (let j = 0; j < h; j++) {
    for (let i = (j + x + y) % 2; i < w; i += 2) ctx.fillRect(x + i, y + j, 1, 1);
  }
}

/** Vertical sky made of flat bands joined by 2px dithered seams. */
export function bands(ctx: Ctx, colors: string[], y0: number, y1: number, x = 0, w = 256) {
  const h = (y1 - y0) / colors.length;
  colors.forEach((c, i) => rect(ctx, c, x, y0 + i * h, w, i === colors.length - 1 ? y1 - (y0 + i * h) : h + 1));
  for (let i = 1; i < colors.length; i++) {
    dither(ctx, colors[i - 1], colors[i], x, Math.round(y0 + i * h - 2), w, 4);
  }
}

export function circle(ctx: Ctx, c: string, cx: number, cy: number, r: number) {
  ctx.fillStyle = PAL[c];
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    ctx.fillRect(cx - half, cy + y, half * 2 + 1, 1);
  }
}

/** Mountain / triangle with a flat base. */
export function peak(ctx: Ctx, c: string, cx: number, baseY: number, halfW: number, h: number) {
  ctx.fillStyle = PAL[c];
  for (let y = 0; y < h; y++) {
    const half = Math.round((halfW * y) / h);
    ctx.fillRect(cx - half, baseY - h + y, half * 2 + 1, 1);
  }
}

export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
