"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Henter nye beskeder hvert 10. sekund, mens fanen er synlig
export function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  useEffect(() => {
    document.getElementById("bund")?.scrollIntoView({ block: "end" });
  }, []);
  return null;
}
