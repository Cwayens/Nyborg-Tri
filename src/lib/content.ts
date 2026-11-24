import { marked } from "marked";
import type { ContentFormat } from "@prisma/client";

/** Rydder op i HTML fra den gamle WordPress-side: tomme afsnit, faste størrelser og inline-styles. */
export function cleanWpHtml(html: string): string {
  return html
    .replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "")
    .replace(/\s(width|height)="\d+"/gi, "")
    .replace(/\sstyle="[^"]*"/gi, "")
    .replace(/\sclass="(align\w+|wp-image-\d+|size-\w+|\s)+"/gi, "")
    .replace(/(<br\s*\/?>\s*){3,}/gi, "<br><br>")
    .replace(/\n{3,}/g, "\n\n");
}

/** Gør indhold klar til visning. Indhold skrives kun af bestyrelsen (admins). */
export function renderBody(body: string, format: ContentFormat): string {
  return format === "HTML" ? cleanWpHtml(body) : (marked.parse(body, { async: false }) as string);
}
