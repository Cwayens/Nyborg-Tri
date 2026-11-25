"use client";
import { useEffect, useRef, useState } from "react";

// Emoji-knap ved skrivefeltet. Indsætter emojien, hvor markøren står.
const EMOJI = [
  "😀", "😂", "😅", "😊", "😍", "😎", "🤔", "😴", "🥵", "🥶", "😬", "🙈",
  "👍", "👏", "🙌", "💪", "🤝", "🙏", "👋", "✌️", "❤️", "💚", "🔥", "⭐",
  "🏊", "🚴", "🏃", "🏊‍♀️", "🚴‍♀️", "🏃‍♀️", "🌊", "⛰️", "🏁", "🥇", "🏆", "⏱️",
  "☀️", "🌧️", "💨", "❄️", "☕", "🍌", "🍔", "🍺", "🎉", "📍", "📅", "✅",
];

export function EmojiButton({ target }: { target: string }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", close); };
  }, [open]);

  function insert(e: string) {
    const el = document.getElementById(target) as HTMLTextAreaElement | null;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length, end = el.selectionEnd ?? el.value.length;
    el.setRangeText(e, start, end, "end");
    el.focus();
  }

  return (
    <div className="emoji-wrap" ref={box}>
      <button type="button" className="emoji-toggle" aria-label="Indsæt emoji" aria-expanded={open} onClick={() => setOpen(!open)}>😊</button>
      {open && (
        <div className="emoji-panel" role="dialog" aria-label="Vælg emoji">
          {EMOJI.map((e) => (
            <button key={e} type="button" onClick={() => insert(e)} aria-label={e}>{e}</button>
          ))}
        </div>
      )}
    </div>
  );
}
