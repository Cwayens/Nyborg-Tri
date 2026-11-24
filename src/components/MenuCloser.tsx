"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Menuer er <details>-elementer. Kun én må være åben ad gangen, og de lukker ved
// klik udenfor, Escape og sideskift.
export function MenuCloser() {
  const pathname = usePathname();
  const byMouse = useRef(false);

  useEffect(() => {
    const menus = () => Array.from(document.querySelectorAll<HTMLDetailsElement>("header details[open]"));
    const closeAll = (except?: Element | null) => menus().forEach((d) => d !== except && d.removeAttribute("open"));

    const onToggle = (e: Event) => {
      const d = e.target as HTMLDetailsElement;
      if (d.open && d.closest("header")) closeAll(d);
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element;
      byMouse.current = e.detail > 0;
      // Musseklik på et link i toppen skal ikke efterlade en fokusramme (tastatur beholder den)
      if (e.detail > 0) (t.closest("header a") as HTMLElement | null)?.blur();
      const inside = t.closest("header details");
      // Klik på et link i en menu lukker den også
      if (!inside || t.closest("a")) closeAll(inside && !t.closest("a") ? inside : null);
    };
    const onKey = (e: KeyboardEvent) => {
      byMouse.current = false;
      if (e.key === "Escape") closeAll();
    };
    document.addEventListener("toggle", onToggle, true);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("toggle", onToggle, true);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    document.querySelectorAll("header details[open]").forEach((d) => d.removeAttribute("open"));
    const active = document.activeElement as HTMLElement | null;
    if (byMouse.current && active?.closest("header")) active.blur();
  }, [pathname]);

  return null;
}
