import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanHtml, pathFromLink, toPost } from "./wp-import";

const SITE = "https://www.nyborgtri.dk";

test("sti fra link bevarer undersider", () => {
  assert.equal(pathFromLink("https://www.nyborgtri.dk/om/bestyrelse/"), "om/bestyrelse");
});

test("shortcodes fjernes og interne links bliver relative", () => {
  const html = '[column size="one-half"]<p>Se <a href="https://www.nyborgtri.dk/om/bestyrelse/">bestyrelsen</a></p>[/column]<p><a href="https://www.nyborgtri.dk/download/x.pdf">pdf</a></p>';
  assert.equal(cleanHtml(html, SITE), '<p>Se <a href="/om/bestyrelse/">bestyrelsen</a></p><p><a href="https://www.nyborgtri.dk/download/x.pdf">pdf</a></p>');
});

test("indlæg får kategorinavne, dato og titel uden entities", () => {
  const post = toPost(
    {
      id: 1, slug: "indoor-bike-traening-pa-lordag", link: `${SITE}/indoor-bike-traening-pa-lordag/`,
      date_gmt: "2026-10-19T08:00:00",
      title: { rendered: "Indoor bike &#8211; lørdag" },
      content: { rendered: "<p>Hej</p>" },
      excerpt: { rendered: "<p>Den 24. oktober&#8230;</p>" },
      categories: [7],
    },
    SITE,
    new Map([[7, "Træning"]]),
  );
  assert.equal(post.title, "Indoor bike – lørdag");
  assert.deepEqual(post.categories, ["Træning"]);
  assert.equal(post.excerpt, "Den 24. oktober…");
  assert.equal(post.publishedAt.toISOString(), "2026-10-19T08:00:00.000Z");
});
