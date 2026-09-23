"use client";

import { useEffect, useRef } from "react";
import { rect, px } from "@/lib/pixel/draw";
import { SCREEN_H, SCREEN_W } from "@/lib/pixel/palette";
import { SCENES } from "@/lib/pixel/scenes";
import { drawSprite, SPRITES, type SpriteId } from "@/lib/pixel/sprites";
import type { SceneId } from "@/lib/story/types";

export type Mood = "idle" | "thinking" | "hesitant" | "decided";

export type Actor = {
  sprite: SpriteId;
  x: number;
  scale: number;
  flip: boolean;
  role: "hero" | "ally" | "npc";
  mood?: Mood;
  crown?: boolean;
};

export type SceneFx = { shake: number; hitHero: number; hitNpc: number };

type Props = { scene: SceneId; actors: Actor[]; fx: SceneFx };

const bgCache = new Map<SceneId, HTMLCanvasElement>();

function staticBackground(scene: SceneId): HTMLCanvasElement {
  let canvas = bgCache.get(scene);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = SCREEN_W;
    canvas.height = SCREEN_H;
    const c = canvas.getContext("2d")!;
    SCENES[scene].drawStatic(c);
    bgCache.set(scene, canvas);
  }
  return canvas;
}

const QUESTION = ["777", "..7", ".77", "...", ".7."];

function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, mood: Mood, t: number) {
  rect(ctx, "0", x - 1, y - 1, 15, 11);
  rect(ctx, "7", x, y, 13, 9);
  px(ctx, "7", x + 3, y + 9);
  px(ctx, "0", x + 3, y + 10);
  if (mood === "thinking") {
    const n = (Math.floor(t / 2) % 4) as number;
    for (let i = 0; i < 3; i++) rect(ctx, i < n ? "0" : "6", x + 2 + i * 4, y + 4, 2, 2);
  } else if (mood === "hesitant") {
    QUESTION.forEach((row, j) =>
      [...row].forEach((c, i) => c !== "." && px(ctx, "8", x + 5 + i, y + 2 + j)),
    );
  } else {
    // decided: a "!" in green
    rect(ctx, "3", x + 6, y + 2, 1, 3);
    px(ctx, "3", x + 6, y + 6);
  }
}

export default function SceneView({ scene, actors, fx }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ scene, actors });
  const timers = useRef({ shakeUntil: 0, heroUntil: 0, npcUntil: 0 });

  useEffect(() => {
    live.current = { scene, actors };
  }, [scene, actors]);

  useEffect(() => {
    if (fx.shake) timers.current.shakeUntil = performance.now() + 280;
  }, [fx.shake]);
  useEffect(() => {
    if (fx.hitHero) timers.current.heroUntil = performance.now() + 320;
  }, [fx.hitHero]);
  useEffect(() => {
    if (fx.hitNpc) timers.current.npcUntil = performance.now() + 320;
  }, [fx.hitNpc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    let raf = 0;
    let last = 0;
    let tick = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 90) return;
      last = now;
      tick++;
      const { scene, actors } = live.current;
      const def = SCENES[scene];
      const shaking = now < timers.current.shakeUntil;

      ctx.save();
      if (shaking) ctx.translate(Math.round(Math.random() * 4 - 2), Math.round(Math.random() * 4 - 2));
      ctx.drawImage(staticBackground(scene), 0, 0);
      def.drawAnim?.(ctx, tick);

      actors.forEach((a, i) => {
        const sprite = SPRITES[a.sprite];
        const bob = (tick + i * 3) % 10 < 5 ? 0 : a.scale >= 3 ? 1 : 0;
        const jitter = a.mood === "hesitant" ? (tick % 2 ? 1 : -1) : 0;
        const flashing =
          (a.role === "hero" && now < timers.current.heroUntil) ||
          (a.role === "npc" && now < timers.current.npcUntil);
        const ground = def.ground - bob;
        // shadow
        ctx.globalAlpha = 0.35;
        rect(ctx, "0", a.x + 2 * a.scale, def.ground - 1, (sprite.w - 4) * a.scale, 2);
        ctx.globalAlpha = 1;
        drawSprite(
          ctx,
          a.sprite,
          a.x + jitter,
          ground,
          a.scale,
          a.flip,
          flashing && tick % 2 === 0 ? "#fff1e8" : undefined,
        );
        if (a.crown) drawSprite(ctx, "crown", a.x + 5 * a.scale, ground - sprite.h * a.scale + 3 * a.scale, a.scale);
        if (a.mood && a.mood !== "idle") {
          const top = ground - sprite.h * a.scale;
          bubble(ctx, Math.round(a.x + (sprite.w * a.scale) / 2 - 6), Math.max(2, top - 12), a.mood, tick);
        }
      });
      ctx.restore();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={SCREEN_W}
      height={SCREEN_H}
      className="pixelated block h-full w-full"
      aria-label="Escena del juego"
    />
  );
}
