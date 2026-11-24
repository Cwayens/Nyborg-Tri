"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LMap, Polyline } from "leaflet";
import type { Place } from "@/lib/club";
import type { Route } from "@/lib/routes";
import { DISCIPLINE_LABEL } from "@/lib/roles";

// Interaktivt kort over Nyborg med klubbens træningssteder og ruter. Kortet starter ved klubbens base
// (Nyborg Idræts- og Fritidscenter). Kortdata fra OpenStreetMap.

const COLOR: Record<string, string> = { SWIM: "#1e88e5", BIKE: "#d9820b", RUN: "#1f8f4d", OTHER: "#5d6b7a", STRENGTH: "#8e44ad" };
type Filter = "ALL" | "RUN" | "BIKE" | "SWIM";

export function RouteMap({ places, routes, home }: { places: Place[]; routes: Route[]; home: Place }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const lines = useRef(new Map<string, Polyline>());
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current || map.current) return;
      const m = L.map(el.current, { scrollWheelZoom: false }).setView([home.lat, home.lng], 14);
      map.current = m;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m);
      for (const r of routes) {
        const line = L.polyline(r.pts, { color: COLOR[r.sport], weight: 4, opacity: 0.55 }).addTo(m);
        line.bindTooltip(`${r.name} · ${r.km.toLocaleString("da-DK")} km`, { sticky: true });
        line.on("click", () => setSelected(r.id));
        lines.current.set(r.id, line);
      }
      for (const p of places) {
        const icon = L.divIcon({
          className: "",
          html: `<span class="rm-pin${p.home ? " home" : ""}" aria-hidden="true">${p.home ? "NT" : ""}</span>`,
          iconSize: p.home ? [34, 34] : [18, 18],
          iconAnchor: p.home ? [17, 17] : [9, 9],
        });
        L.marker([p.lat, p.lng], { icon, title: p.name, keyboard: true, zIndexOffset: p.home ? 1000 : 0 })
          .addTo(m)
          .bindPopup(`<b>${p.name}</b><br>${p.what}`);
      }
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      lines.current.clear();
    };
  }, [places, routes, home]);

  // Fremhæv den valgte rute og zoom ind på den
  useEffect(() => {
    for (const r of routes) {
      const line = lines.current.get(r.id);
      if (!line) continue;
      const visible = filter === "ALL" || r.sport === filter;
      const on = r.id === selected;
      line.setStyle({ opacity: !visible ? 0 : on ? 1 : selected ? 0.25 : 0.55, weight: on ? 6 : 4 });
      if (on) { line.bringToFront(); map.current?.fitBounds(line.getBounds(), { padding: [30, 30] }); }
    }
  }, [selected, filter, routes]);

  const shown = routes.filter((r) => filter === "ALL" || r.sport === filter);
  const goHome = () => { setSelected(null); map.current?.setView([home.lat, home.lng], 14); };

  return (
    <div className="rm">
      <div className="rm-map-wrap">
        <div ref={el} className="rm-map" role="region" aria-label="Kort over Nyborg med træningssteder og ruter" />
        <button type="button" className="button small secondary rm-home" onClick={goHome}>Tilbage til klubben</button>
      </div>
      <aside className="rm-side">
        <div className="seg rm-filter" role="group" aria-label="Vis ruter for">
          {(["ALL", "RUN", "BIKE", "SWIM"] as Filter[]).map((f) => (
            <button key={f} type="button" className={f === filter ? "active" : undefined} aria-pressed={f === filter} onClick={() => { setFilter(f); setSelected(null); }}>
              {f === "ALL" ? "Alle" : DISCIPLINE_LABEL[f]}
            </button>
          ))}
        </div>
        <ul className="rm-list">
          {shown.map((r) => (
            <li key={r.id} className={r.id === selected ? "on" : undefined}>
              <button type="button" onClick={() => setSelected(r.id === selected ? null : r.id)} aria-pressed={r.id === selected}>
                <i style={{ background: COLOR[r.sport] }} aria-hidden="true" />
                <span><b>{r.name}</b><small className="muted">{DISCIPLINE_LABEL[r.sport]} · {r.km.toLocaleString("da-DK")} km · {r.tag}</small></span>
              </button>
              {r.id === selected && (
                <div className="rm-detail">
                  <p>{r.desc}</p>
                  <a href={`/ruter/${r.id}.gpx`} download>Hent som GPX til uret</a>
                </div>
              )}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
