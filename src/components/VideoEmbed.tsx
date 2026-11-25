"use client";

import { useState } from "react";

/**
 * Video fra YouTube eller Vimeo. Intet hentes fra dem, før man trykker, så de ikke ser besøgende,
 * der ikke ser videoen (se privatlivspolitikken).
 */
export function VideoEmbed({ src, host, label }: { src: string; host: string; label: { play: string; note: string } }) {
  const [on, setOn] = useState(false);
  return (
    <div className="video-embed">
      {on ? (
        <iframe src={src} title={host} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
      ) : (
        <button type="button" onClick={() => setOn(true)}>
          <span className="video-play" aria-hidden="true">▶</span>
          <b>{label.play}</b>
          <small>{label.note}</small>
        </button>
      )}
    </div>
  );
}
