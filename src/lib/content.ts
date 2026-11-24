import { marked } from "marked";
import type { ContentFormat } from "@prisma/client";

/** Gør indhold klar til visning. Indhold skrives kun af bestyrelsen (admins). */
export function renderBody(body: string, format: ContentFormat): string {
  return format === "HTML" ? body : (marked.parse(body, { async: false }) as string);
}
