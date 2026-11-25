import { test } from "node:test";
import assert from "node:assert/strict";
import { isReaction, postImages, videoEmbed } from "./news";

test("video: YouTube- og Vimeo-links bliver til sikre indlejringer", () => {
  assert.equal(videoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.src, "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0");
  assert.equal(videoEmbed("https://youtu.be/dQw4w9WgXcQ")?.host, "YouTube");
  assert.equal(videoEmbed("https://youtube.com/shorts/dQw4w9WgXcQ")?.host, "YouTube");
  assert.equal(videoEmbed("https://vimeo.com/123456789")?.src, "https://player.vimeo.com/video/123456789?autoplay=1&dnt=1");
});

test("video: alt andet afvises", () => {
  assert.equal(videoEmbed("http://www.youtube.com/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(videoEmbed("https://evil.example/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(videoEmbed("https://youtube.com.evil.example/watch?v=abc123"), null);
  assert.equal(videoEmbed("https://www.youtube.com/watch?v=%22onload"), null);
  assert.equal(videoEmbed("javascript:alert(1)"), null);
  assert.equal(videoEmbed(""), null);
});

test("reaktioner: kun de faste emojis", () => {
  assert.ok(isReaction("🔥"));
  assert.ok(!isReaction("💩"));
  assert.ok(!isReaction("hej"));
});

test("billeder: forsidebillede først, ingen dubletter", () => {
  assert.deepEqual(postImages({ featuredImage: "/a.webp", images: ["/b.webp", "/a.webp"] }), ["/a.webp", "/b.webp"]);
  assert.deepEqual(postImages({ featuredImage: null, images: [] }), []);
});
