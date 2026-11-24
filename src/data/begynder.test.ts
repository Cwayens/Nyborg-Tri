import { test } from "node:test";
import assert from "node:assert/strict";
import { BEGINNER_PLAN, PLAN_SESSIONS } from "./begynder";
import { parseText, totalDuration } from "../lib/workout";

test("alle 10 uger i begynderforløbet kan læses som programmer", () => {
  assert.equal(BEGINNER_PLAN.length, 10);
  for (const s of PLAN_SESSIONS) {
    const w = parseText(s.program);
    assert.ok(w.blocks.length > 0, s.id);
  }
  assert.equal(totalDuration(parseText(PLAN_SESSIONS[1].program)), 40 * 60);
  assert.equal(new Set(PLAN_SESSIONS.map((s) => s.id)).size, PLAN_SESSIONS.length);
});
