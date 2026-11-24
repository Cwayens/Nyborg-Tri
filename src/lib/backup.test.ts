import { test } from "node:test";
import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { decrypt, encrypt, readBackup } from "./backup";

test("backup krypteres og kan kun læses med den rigtige nøgle", () => {
  process.env.BACKUP_KEY = "en-lang-hemmelig-test-noegle";
  const plain = Buffer.from(JSON.stringify({ createdAt: "2026-11-24", data: { user: [{ name: "Anne" }] } }));
  const file = encrypt(gzipSync(plain));
  assert.equal(file.includes(Buffer.from("Anne")), false);
  assert.equal(readBackup(file).data.user.length, 1);
  process.env.BACKUP_KEY = "en-anden-noegle-1234567";
  assert.throws(() => decrypt(file));
});
