import type { SceneId } from "@/lib/story/types";
import { bands, circle, dither, mulberry32, peak, px, rect, type Ctx } from "./draw";
import { SCREEN_H, SCREEN_W } from "./palette";

type SceneDef = {
  /** y where characters' feet rest */
  ground: number;
  drawStatic: (ctx: Ctx) => void;
  drawAnim?: (ctx: Ctx, t: number) => void;
};

const W = SCREEN_W;
const H = SCREEN_H;

// ── shared pieces ──────────────────────────────────────────────
function stars(ctx: Ctx, seed: number, maxY: number, t = 0, count = 40) {
  const r = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * maxY);
    const phase = Math.floor(r() * 12);
    if ((t + phase) % 12 < 10) px(ctx, r() > 0.8 ? "a" : "7", x, y);
  }
}

function moon(ctx: Ctx, x: number, y: number, r: number, c = "7") {
  circle(ctx, c, x, y, r);
  circle(ctx, c === "7" ? "6" : "2", x - 3, y - 2, 2);
  circle(ctx, c === "7" ? "6" : "2", x + 4, y + 3, 1);
}

function pineTree(ctx: Ctx, x: number, baseY: number, h: number, c: string, trunk = "4") {
  rect(ctx, trunk, x - 1, baseY - 4, 3, 4);
  for (let k = 0; k < 3; k++) {
    peak(ctx, c, x, baseY - 3 - (k * h) / 4, 6 + (2 - k) * 3, h / 2);
  }
}

function flame(ctx: Ctx, x: number, baseY: number, t: number, size = 1) {
  const f = (t + x) % 4;
  const h = (6 + (f % 2) * 2) * size;
  peak(ctx, "8", x, baseY, 3 * size, h);
  peak(ctx, "9", x + (f === 1 ? 1 : 0), baseY, 2 * size, h * 0.7);
  peak(ctx, "a", x, baseY, 1 * size, h * 0.4);
}

function snow(ctx: Ctx, t: number, seed: number, count = 50, c = "7") {
  const r = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const x0 = r() * W;
    const speed = 0.5 + r();
    const y = (r() * H + t * speed) % H;
    const x = (x0 + Math.sin((t + i * 7) / 6) * 2 + W) % W;
    px(ctx, c, x, y);
  }
}

// ── scenes ─────────────────────────────────────────────────────
const title: SceneDef = {
  ground: 124,
  drawStatic: (ctx) => {
    bands(ctx, ["0", "1", "1", "2"], 0, 100);
    moon(ctx, 206, 30, 12);
    peak(ctx, "1", 40, 104, 70, 34);
    peak(ctx, "1", 200, 104, 80, 40);
    peak(ctx, "5", 120, 104, 60, 26);
    // castle silhouette
    rect(ctx, "0", 88, 60, 80, 48);
    for (const tx of [80, 112, 136, 166]) {
      rect(ctx, "0", tx, 44, 14, 64);
      for (let i = 0; i < 4; i++) rect(ctx, "0", tx + i * 4, 40, 2, 4);
    }
    // central keep with a slim spire, filling the gap between the inner towers
    rect(ctx, "0", 120, 30, 22, 30);
    for (let i = 0; i < 6; i++) rect(ctx, "0", 120 + i * 4, 26, 2, 4);
    peak(ctx, "0", 131, 26, 4, 12);
    rect(ctx, "0", 0, 104, W, 40);
    dither(ctx, "0", "1", 0, 104, W, 3);
  },
  drawAnim: (ctx, t) => {
    stars(ctx, 7, 70, t);
    const windows = [
      [85, 54],
      [117, 58],
      [141, 54],
      [171, 60],
      [100, 76],
      [150, 80],
      [126, 70],
    ];
    windows.forEach(([x, y], i) => rect(ctx, (t + i * 5) % 17 === 0 ? "a" : "9", x, y, 2, 3));
  },
};

const bridge: SceneDef = {
  ground: 102,
  drawStatic: (ctx) => {
    bands(ctx, ["c", "c", "6"], 0, 80);
    peak(ctx, "d", 50, 84, 60, 38);
    peak(ctx, "6", 50, 58, 13, 12);
    peak(ctx, "d", 190, 84, 70, 44);
    peak(ctx, "6", 190, 52, 13, 12);
    rect(ctx, "3", 0, 80, W, 8);
    dither(ctx, "3", "b", 0, 80, W, 2);
    // river
    rect(ctx, "1", 0, 88, W, H - 88);
    dither(ctx, "1", "c", 0, 88, W, 3);
    // banks
    rect(ctx, "3", 0, 96, 34, H - 96);
    rect(ctx, "3", 222, 96, 34, H - 96);
    dither(ctx, "3", "b", 0, 96, 34, 2);
    dither(ctx, "3", "b", 222, 96, 34, 2);
    // bridge deck + arch
    rect(ctx, "5", 24, 102, 208, 8);
    rect(ctx, "6", 24, 102, 208, 2);
    for (let x = 24; x < 232; x += 8) rect(ctx, "0", x, 106, 1, 4);
    rect(ctx, "5", 70, 110, 12, 34);
    rect(ctx, "5", 174, 110, 12, 34);
    rect(ctx, "6", 70, 110, 2, 34);
    rect(ctx, "6", 174, 110, 2, 34);
    // railing posts
    for (let x = 28; x < 230; x += 20) rect(ctx, "4", x, 94, 2, 8);
    rect(ctx, "4", 24, 95, 208, 1);
  },
  drawAnim: (ctx, t) => {
    // drifting clouds
    for (const [x0, y, w] of [
      [20, 14, 26],
      [120, 24, 34],
      [200, 10, 22],
    ]) {
      const x = ((x0 + t * 0.3) % (W + 40)) - 40;
      rect(ctx, "7", x, y, w, 5);
      rect(ctx, "7", x + 5, y - 3, w - 10, 3);
    }
    // water shimmer
    const r = mulberry32(3);
    for (let i = 0; i < 26; i++) {
      const x = (r() * W + t * (1 + (i % 3))) % W;
      const y = 112 + r() * 30;
      if (x < 34 || x > 222) continue;
      rect(ctx, "c", x, y, 4, 1);
    }
  },
};

const tavern: SceneDef = {
  ground: 122,
  drawStatic: (ctx) => {
    rect(ctx, "4", 0, 0, W, 110);
    for (let y = 8; y < 110; y += 10) rect(ctx, "2", 0, y, W, 1);
    for (let x = 0; x < W; x += 32) rect(ctx, "2", x + ((x / 32) % 2) * 16, 0, 1, 110);
    rect(ctx, "0", 0, 0, W, 6);
    for (let x = 10; x < W; x += 60) rect(ctx, "2", x, 6, 8, 104);
    // window with dusk sky
    rect(ctx, "0", 26, 26, 44, 34);
    bands(ctx, ["2", "e", "9"], 28, 58, 28, 40);
    rect(ctx, "0", 47, 26, 2, 34);
    rect(ctx, "0", 26, 42, 44, 2);
    // shelves & bottles
    rect(ctx, "2", 96, 30, 50, 3);
    rect(ctx, "2", 96, 50, 50, 3);
    ["3", "8", "c", "9", "3", "d"].forEach((c, i) => {
      rect(ctx, c, 100 + i * 7, 22, 4, 8);
      rect(ctx, c, 101 + i * 7, 19, 2, 3);
    });
    ["c", "9", "8", "3"].forEach((c, i) => rect(ctx, c, 102 + i * 10, 42, 5, 8));
    // fireplace
    rect(ctx, "5", 178, 40, 60, 70);
    rect(ctx, "6", 174, 36, 68, 6);
    for (let y = 44; y < 110; y += 8) for (let x = 178; x < 238; x += 12) rect(ctx, "0", x + ((y / 8) % 2) * 6, y, 1, 7);
    rect(ctx, "0", 192, 70, 32, 40);
    // floor
    rect(ctx, "5", 0, 110, W, H - 110);
    for (let y = 114; y < H; y += 6) rect(ctx, "0", 0, y, W, 1);
    dither(ctx, "5", "4", 0, 110, W, 2);
    // table
    rect(ctx, "4", 92, 104, 60, 4);
    rect(ctx, "2", 96, 108, 3, 12);
    rect(ctx, "2", 145, 108, 3, 12);
    rect(ctx, "a", 104, 99, 5, 5);
    rect(ctx, "7", 104, 98, 5, 1);
    rect(ctx, "a", 132, 99, 5, 5);
  },
  drawAnim: (ctx, t) => {
    for (let i = 0; i < 4; i++) flame(ctx, 198 + i * 7, 108, t + i, 2);
    rect(ctx, "4", 196, 106, 24, 4);
    // candle
    rect(ctx, "7", 121, 96, 2, 8);
    px(ctx, t % 3 === 0 ? "a" : "9", 121 + (t % 2), 94);
    px(ctx, "a", 121, 95);
  },
};

const forest: SceneDef = {
  ground: 124,
  drawStatic: (ctx) => {
    bands(ctx, ["0", "1", "1"], 0, 110);
    moon(ctx, 60, 24, 9);
    const r = mulberry32(11);
    for (let i = 0; i < 18; i++) pineTree(ctx, r() * W, 104, 40 + r() * 20, "1", "0");
    for (let i = 0; i < 9; i++) pineTree(ctx, 10 + i * 30 + r() * 10, 116, 60 + r() * 20, "3", "0");
    rect(ctx, "0", 0, 110, W, H - 110);
    dither(ctx, "0", "3", 0, 110, W, 4);
    for (let i = 0; i < 30; i++) rect(ctx, "3", r() * W, 114 + r() * 28, 2, 1);
    // big foreground trunks
    rect(ctx, "0", 0, 0, 10, H);
    rect(ctx, "4", 2, 0, 3, H);
    rect(ctx, "0", 244, 0, 12, H);
    rect(ctx, "4", 248, 0, 3, H);
  },
  drawAnim: (ctx, t) => {
    stars(ctx, 5, 40, t, 20);
    for (let i = 0; i < 10; i++) {
      const x = (i * 29 + Math.sin((t + i * 13) / 8) * 12 + W) % W;
      const y = 70 + ((i * 17) % 40) + Math.cos((t + i * 5) / 6) * 6;
      if ((t + i) % 8 < 6) px(ctx, i % 2 ? "b" : "a", x, y);
    }
  },
};

const village: SceneDef = {
  ground: 124,
  drawStatic: (ctx) => {
    bands(ctx, ["2", "e", "9", "f"], 0, 96);
    circle(ctx, "a", 128, 96, 16);
    peak(ctx, "d", 40, 96, 60, 20);
    peak(ctx, "d", 220, 96, 60, 24);
    const house = (x: number, w: number, h: number) => {
      rect(ctx, "4", x, 112 - h, w, h);
      rect(ctx, "2", x, 112 - h, 2, h);
      rect(ctx, "2", x + w - 2, 112 - h, 2, h);
      rect(ctx, "2", x, 112 - h / 2, w, 2);
      peak(ctx, "2", x + w / 2, 112 - h, w / 2 + 4, 14);
      rect(ctx, "0", x + w / 2 - 3, 112 - 10, 6, 10);
      rect(ctx, "9", x + 4, 112 - h + 6, 4, 4);
    };
    house(8, 36, 28);
    house(72, 44, 34);
    house(150, 40, 26);
    house(208, 38, 30);
    rect(ctx, "4", 0, 112, W, H - 112);
    dither(ctx, "4", "5", 0, 112, W, 3);
    const r = mulberry32(21);
    for (let i = 0; i < 40; i++) rect(ctx, "5", r() * W, 116 + r() * 26, 2, 1);
  },
  drawAnim: (ctx, t) => {
    for (const [x, y] of [
      [26, 72],
      [94, 64],
      [100, 64],
      [170, 74],
      [227, 70],
      [20, 72],
    ])
      flame(ctx, x, y + 6, t, 2);
    // rising smoke
    for (let i = 0; i < 8; i++) {
      const baseX = [26, 94, 170, 227][i % 4];
      const y = 60 - ((t * 1.5 + i * 12) % 60);
      const x = baseX + Math.sin((t + i * 9) / 5) * 4 + i;
      circle(ctx, i % 2 ? "5" : "6", x, y, 3 + ((60 - y) / 60) * 3);
    }
    // embers
    for (let i = 0; i < 12; i++) {
      const x = (i * 23 + t * 2) % W;
      const y = 110 - ((t * 2 + i * 17) % 90);
      px(ctx, i % 2 ? "9" : "a", x, y);
    }
  },
};

const tower: SceneDef = {
  ground: 126,
  drawStatic: (ctx) => {
    bands(ctx, ["0", "1", "2"], 0, 116);
    peak(ctx, "1", 60, 116, 80, 30);
    // tower
    rect(ctx, "5", 158, 22, 40, 100);
    rect(ctx, "0", 158, 22, 2, 100);
    for (let y = 26; y < 120; y += 6) for (let x = 160; x < 198; x += 10) rect(ctx, "0", x + ((y / 6) % 2) * 5, y, 4, 1);
    peak(ctx, "2", 178, 22, 26, 20);
    rect(ctx, "5", 152, 18, 52, 6);
    for (let x = 152; x < 204; x += 8) rect(ctx, "5", x, 14, 4, 4);
    rect(ctx, "0", 172, 100, 12, 22);
    // rocks & path
    rect(ctx, "0", 0, 116, W, H - 116);
    dither(ctx, "0", "5", 0, 116, W, 3);
    for (let x = 0; x < W; x += 20) rect(ctx, "5", x + 3, 120 + (x % 3) * 5, 8, 3);
    rect(ctx, "4", 100, 122, 80, 3);
  },
  drawAnim: (ctx, t) => {
    // storm clouds
    for (let i = 0; i < 5; i++) {
      const x = ((i * 70 + t * 0.6) % (W + 60)) - 60;
      rect(ctx, "5", x, 8 + (i % 2) * 8, 48, 6);
      rect(ctx, "5", x + 8, 4 + (i % 2) * 8, 30, 4);
    }
    // glowing windows
    rect(ctx, t % 6 < 3 ? "8" : "9", 174, 40, 8, 10);
    rect(ctx, "8", 166, 70, 4, 6);
    rect(ctx, "8", 186, 70, 4, 6);
    // lightning
    const cycle = t % 46;
    if (cycle < 2) {
      ctx.globalAlpha = 0.35;
      rect(ctx, "7", 0, 0, W, H);
      ctx.globalAlpha = 1;
      let x = 70;
      for (let y = 0; y < 90; y += 6) {
        const nx = x + ((y / 6) % 2 ? 4 : -3);
        rect(ctx, "7", Math.min(x, nx), y, Math.abs(nx - x) + 1, 6);
        x = nx;
      }
    }
  },
};

const throne: SceneDef = {
  ground: 124,
  drawStatic: (ctx) => {
    dither(ctx, "1", "2", 0, 0, W, 112);
    for (let y = 6; y < 112; y += 10) for (let x = 0; x < W; x += 16) rect(ctx, "1", x + ((y / 10) % 2) * 8, y, 14, 1);
    // pillars
    for (const x of [16, 110, 150]) {
      rect(ctx, "5", x, 0, 14, 112);
      rect(ctx, "6", x, 0, 3, 112);
      rect(ctx, "0", x + 12, 0, 2, 112);
    }
    // banners
    for (const x of [44, 80]) {
      rect(ctx, "8", x, 10, 16, 40);
      peak(ctx, "8", x + 8, 56, 8, 6);
      rect(ctx, "a", x + 6, 22, 4, 4);
    }
    // throne
    rect(ctx, "0", 204, 48, 34, 74);
    rect(ctx, "5", 206, 50, 30, 70);
    rect(ctx, "2", 210, 80, 22, 20);
    peak(ctx, "0", 221, 48, 17, 14);
    // floor + carpet
    rect(ctx, "0", 0, 112, W, H - 112);
    for (let y = 112; y < H; y += 6) for (let x = 0; x < W; x += 12) rect(ctx, "1", x + ((y / 6) % 2) * 6, y, 6, 6);
    rect(ctx, "8", 0, 116, W, 16);
    rect(ctx, "2", 0, 116, W, 1);
    rect(ctx, "2", 0, 131, W, 1);
  },
  drawAnim: (ctx, t) => {
    for (const x of [23, 117, 157]) {
      rect(ctx, "4", x - 1, 34, 3, 8);
      flame(ctx, x, 34, t, 1);
    }
    // crown glow on the throne back
    if (t % 8 < 4) rect(ctx, "9", 219, 60, 4, 2);
  },
};

const castle: SceneDef = {
  ground: 126,
  drawStatic: (ctx) => {
    bands(ctx, ["c", "c", "7"], 0, 100);
    circle(ctx, "a", 40, 26, 12);
    circle(ctx, "9", 40, 26, 8);
    peak(ctx, "b", 60, 110, 90, 26);
    peak(ctx, "3", 200, 110, 90, 30);
    // castle
    rect(ctx, "6", 110, 50, 70, 60);
    for (const tx of [102, 136, 174]) {
      rect(ctx, "6", tx, 36, 16, 74);
      rect(ctx, "7", tx, 36, 3, 74);
      peak(ctx, "8", tx + 8, 36, 10, 16);
    }
    rect(ctx, "4", 136, 86, 16, 24);
    for (const [x, y] of [
      [120, 64],
      [160, 64],
      [108, 50],
      [180, 50],
    ])
      rect(ctx, "1", x, y, 4, 6);
    rect(ctx, "b", 0, 110, W, H - 110);
    dither(ctx, "b", "3", 0, 110, W, 4);
    for (let i = 0; i < 20; i++) rect(ctx, i % 3 ? "a" : "e", (i * 37) % W, 116 + ((i * 11) % 24), 2, 2);
  },
  drawAnim: (ctx, t) => {
    // flags
    for (const tx of [110, 144, 182]) {
      rect(ctx, "4", tx, 14, 1, 8);
      rect(ctx, t % 4 < 2 ? "a" : "9", tx + 1, 14, 6 + (t % 2), 4);
    }
    // birds
    for (let i = 0; i < 3; i++) {
      const x = (t * 1.5 + i * 60) % W;
      const y = 20 + i * 8;
      px(ctx, "0", x, y);
      px(ctx, "0", x - 1, y - (t % 2));
      px(ctx, "0", x + 1, y - (t % 2));
    }
    // confetti
    const r = mulberry32(9);
    for (let i = 0; i < 24; i++) {
      const x = (r() * W + Math.sin((t + i) / 4) * 3) % W;
      const y = (r() * H + t * (1 + r())) % H;
      px(ctx, ["8", "a", "c", "e", "b"][i % 5], x, y);
    }
  },
};

const road: SceneDef = {
  ground: 126,
  drawStatic: (ctx) => {
    bands(ctx, ["1", "2", "e", "9"], 0, 96);
    circle(ctx, "9", 200, 94, 10);
    peak(ctx, "1", 50, 98, 80, 30);
    peak(ctx, "1", 210, 98, 70, 24);
    rect(ctx, "6", 0, 96, W, H - 96);
    dither(ctx, "6", "7", 0, 96, W, 3);
    // road in perspective
    ctx.fillStyle = "#ab5236";
    for (let y = 96; y < H; y++) {
      const k = (y - 96) / (H - 96);
      const w = 6 + k * 120;
      ctx.fillRect(Math.round(128 - w / 2), y, Math.round(w), 1);
    }
    const r = mulberry32(4);
    for (let i = 0; i < 8; i++) pineTree(ctx, r() > 0.5 ? r() * 60 : 196 + r() * 60, 110 + r() * 10, 30, "5", "0");
  },
  drawAnim: (ctx, t) => snow(ctx, t, 12, 60),
};

const grave: SceneDef = {
  ground: 124,
  drawStatic: (ctx) => {
    bands(ctx, ["0", "0", "1"], 0, 110);
    circle(ctx, "8", 190, 32, 14);
    circle(ctx, "2", 186, 28, 3);
    // dead tree
    rect(ctx, "0", 40, 50, 5, 70);
    rect(ctx, "0", 28, 60, 14, 2);
    rect(ctx, "0", 44, 70, 16, 2);
    rect(ctx, "0", 26, 56, 2, 6);
    rect(ctx, "0", 58, 64, 2, 8);
    rect(ctx, "5", 0, 112, W, H - 112);
    dither(ctx, "5", "0", 0, 112, W, 4);
    // mound + sword
    circle(ctx, "4", 128, 122, 16);
    rect(ctx, "5", 100, 122, 56, 22);
    rect(ctx, "6", 127, 84, 3, 30);
    rect(ctx, "7", 127, 84, 1, 30);
    rect(ctx, "4", 121, 84, 15, 3);
    rect(ctx, "4", 127, 76, 3, 8);
    rect(ctx, "a", 127, 74, 3, 2);
  },
  drawAnim: (ctx, t) => {
    stars(ctx, 17, 60, t, 25);
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 6; i++) {
      const x = ((i * 50 + t) % (W + 60)) - 60;
      rect(ctx, "6", x, 116 + (i % 3) * 6, 40, 3);
    }
    ctx.globalAlpha = 1;
  },
};

const pact: SceneDef = {
  ground: throne.ground,
  drawStatic: (ctx) => {
    throne.drawStatic(ctx);
    ctx.globalAlpha = 0.45;
    rect(ctx, "2", 0, 0, W, H);
    ctx.globalAlpha = 1;
  },
  drawAnim: (ctx, t) => {
    throne.drawAnim?.(ctx, t);
    snow(ctx, t, 30, 70, "d");
  },
};

export const SCENES: Record<SceneId, SceneDef> = {
  title,
  bridge,
  tavern,
  forest,
  village,
  tower,
  throne,
  castle,
  road,
  grave,
  pact,
};
