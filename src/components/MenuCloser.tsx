"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Menuer er <details>-elementer. Kun én må være åben ad gangen, og de lukker ved
// klik udenfor, Escape og sideskift.
export function MenuCloser() {
  const pathname = usePathname();

  useEffect(() => {
    const menus = () => Array.from(document.querySelectorAll<HTMLDetailsElement>("header details[open]"));
    const closeAll = (except?: Element | null) => menus().forEach((d) => d !== except && d.removeAttribute("open"));

    const onToggle = (e: Event) => {
      const d = e.target as HTMLDetailsElement;
      if (d.open && d.closest("header")) closeAll(d);
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element;
      const inside = t.closest("header details");
      // Klik på et link i en menu lukker den også
      if (!inside || t.closest("a")) closeAll(inside && !t.closest("a") ? inside : null);
    };
    const onKey = (e: KeyboardEvent) => {
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
  }, [pathname]);

  return null;
}
