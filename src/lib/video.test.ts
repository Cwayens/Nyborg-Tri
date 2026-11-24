import { test } from "node:test";
import assert from "node:assert/strict";
import { videoEmbed } from "./video";

test("YouTube og Vimeo indlejres uden sporing", () => {
  assert.equal(videoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(videoEmbed("https://youtu.be/dQw4w9WgXcQ"), "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  assert.equal(videoEmbed("https://youtube.com/shorts/abcdefghijk"), "https://www.youtube-nocookie.com/embed/abcdefghijk");
  assert.equal(videoEmbed("https://vimeo.com/123456789"), "https://player.vimeo.com/video/123456789?dnt=1");
  assert.equal(videoEmbed("https://evil.example/watch?v=dQw4w9WgXcQ"), null);
  assert.equal(videoEmbed("javascript:alert(1)"), null);
});
