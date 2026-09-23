"use client";

import { useCallback, useEffect, useState } from "react";
import { sfx } from "@/lib/audio/chiptune";
import { isTypingTarget } from "@/lib/keys";
import type { Line } from "@/lib/story/types";

const SPEAKER_COLORS: Record<string, string> = {
  Grul: "text-[#00e436]",
  Sera: "text-[#ff77a8]",
  Kael: "text-[#83769c]",
  Ysolde: "text-[#ffec27]",
  Morvath: "text-[#ff004d]",
};

type Props = { lines: Line[]; onDone: () => void };

/** JRPG-style dialog with a typewriter effect. Remount (via `key`) for each new batch of lines. */
export default function DialogBox({ lines, onDone }: Props) {
  const [idx, setIdx] = useState(0);
  const [shown, setShown] = useState(0);
  const line = lines[idx] ?? { text: "" };
  const full = shown >= line.text.length;

  useEffect(() => {
    if (full) return;
    const id = setTimeout(() => {
      setShown((n) => n + 1);
      if (shown % 3 === 0) sfx.blip();
    }, 20);
    return () => clearTimeout(id);
  }, [shown, full]);

  const advance = useCallback(() => {
    if (!full) {
      setShown(line.text.length);
    } else if (idx < lines.length - 1) {
      sfx.move();
      setIdx(idx + 1);
      setShown(0);
    } else {
      sfx.select();
      onDone();
    }
  }, [full, idx, line.text.length, lines.length, onDone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || isTypingTarget(e)) return;
      if (e.key === "Enter" || e.key === " " || e.key.toLowerCase() === "z") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  return (
    <button
      type="button"
      onClick={(e) => e.detail !== 0 && advance()}
      className="pixel-box block min-h-[132px] w-full cursor-pointer p-4 text-left"
    >
      {line.who ? (
        <div className={`mb-3 text-[11px] ${SPEAKER_COLORS[line.who] ?? "text-[#29adff]"}`}>{line.who}</div>
      ) : null}
      <p className={`text-[11px] leading-[1.9] sm:text-[12px] ${line.who ? "" : "text-[#c2c3c7]"}`}>
        {line.text.slice(0, shown)}
      </p>
      <div className="mt-2 flex justify-between text-[9px] text-[#5f574f]">
        <span>
          {idx + 1}/{lines.length}
        </span>
        {full ? <span className="blink text-[#fff1e8]">▼</span> : null}
      </div>
    </button>
  );
}
