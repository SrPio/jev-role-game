"use client";

import { useEffect, useState } from "react";
import { sfx } from "@/lib/audio/chiptune";
import { isTypingTarget } from "@/lib/keys";
import type { Line } from "@/lib/story/types";

export type MenuOption = { label: string; disabled?: boolean };

type Props = {
  prompt?: Line;
  options: MenuOption[];
  onPick: (index: number) => void;
  disabled?: boolean;
  footer?: React.ReactNode;
  /** Jev mode: the option Jev picked, shown as the cursor. */
  highlight?: number;
};

export default function ChoiceMenu({ prompt, options, onPick, disabled, footer, highlight }: Props) {
  const firstEnabled = Math.max(0, options.findIndex((o) => !o.disabled));
  const [cursor, setCursor] = useState(firstEnabled);

  useEffect(() => {
    if (disabled) return;
    const step = (from: number, dir: number) => {
      for (let i = 1; i <= options.length; i++) {
        const n = (from + dir * i + options.length) % options.length;
        if (!options[n].disabled) return n;
      }
      return from;
    };
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e)) return;
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
        e.preventDefault();
        sfx.move();
        setCursor((c) => step(c, 1));
      } else if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
        e.preventDefault();
        sfx.move();
        setCursor((c) => step(c, -1));
      } else if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
        e.preventDefault();
        if (!options[cursor]?.disabled) {
          sfx.select();
          onPick(cursor);
        }
      } else if (/^[1-9]$/.test(e.key)) {
        const n = Number(e.key) - 1;
        if (options[n] && !options[n].disabled) {
          sfx.select();
          onPick(n);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cursor, disabled, onPick, options]);

  return (
    <div className="pixel-box min-h-[132px] p-4">
      {prompt ? (
        <p className="mb-3 text-[11px] leading-[1.9] sm:text-[12px]">
          {prompt.who ? <span className="text-[#ff77a8]">{prompt.who}: </span> : null}
          {prompt.text}
        </p>
      ) : null}
      <ul className="space-y-1">
        {options.map((o, i) => (
          <li key={o.label}>
            <button
              type="button"
              disabled={o.disabled || disabled}
              onMouseEnter={() => !o.disabled && setCursor(i)}
              onClick={(e) => {
                if (e.detail === 0) return; // keyboard already handled above
                sfx.select();
                onPick(i);
              }}
              className={`flex w-full items-start gap-2 px-1 py-1 text-left text-[11px] leading-[1.7] sm:text-[12px] ${
                o.disabled ? "text-[#5f574f] line-through" : i === (highlight ?? cursor) ? "text-[#ffec27]" : "text-[#fff1e8]"
              } ${disabled && highlight === undefined ? "opacity-50" : ""}`}
            >
              <span className="w-3 shrink-0">{i === (highlight ?? cursor) && !o.disabled ? "▶" : ""}</span>
              <span>{o.label}</span>
            </button>
          </li>
        ))}
      </ul>
      {footer}
    </div>
  );
}
