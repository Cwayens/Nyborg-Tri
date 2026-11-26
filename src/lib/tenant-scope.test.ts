import { test } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { SCOPED_MODELS, UNSCOPED_MODELS, scopeArgs } from "./tenant-scope";
import { hostLookup, normalizeHost } from "./tenant";

test("alle tabeller undtagen Club og Account har clubId (nye tabeller SKAL have en klub)", () => {
  for (const m of Prisma.dmmf.datamodel.models) {
    if (UNSCOPED_MODELS.has(m.name)) continue;
    assert.ok(SCOPED_MODELS.has(m.name), `${m.name} mangler clubId`);
  }
  assert.ok(!SCOPED_MODELS.has("Club"));
});

test("læsning, opdatering og sletning begrænses til klubben", () => {
  for (const op of ["findUnique", "findFirst", "findMany", "count", "aggregate", "groupBy", "delete", "deleteMany", "update", "updateMany", "upsert"]) {
    const a = scopeArgs("User", op, { where: { id: "u1" }, data: {}, create: {}, update: {} }, "A");
    assert.deepEqual((a.where as Record<string, unknown>).clubId, "A", op);
  }
  // Uden where får man stadig kun klubbens rækker
  assert.deepEqual(scopeArgs("Post", "findMany", undefined, "A").where, { clubId: "A" });
  // Et forsøg på at spørge efter en anden klub overskrives
  assert.deepEqual(scopeArgs("Post", "findMany", { where: { clubId: "B" } }, "A").where, { clubId: "A" });
});

test("nye rækker får klubben, også rækker oprettet inde i andre", () => {
  const a = scopeArgs("User", "create", { data: { email: "x@y.dk", clubId: "B", memberships: { create: [{ typeId: "t", startDate: 1, endDate: 2 }] } } }, "A");
  const d = a.data as { clubId: string; memberships: { create: { clubId: string }[] } };
  assert.equal(d.clubId, "A");
  assert.equal(d.memberships.create[0].clubId, "A");
  const many = scopeArgs("Tip", "createMany", { data: [{ title: "a" }, { title: "b" }] }, "A");
  assert.deepEqual((many.data as { clubId: string }[]).map((x) => x.clubId), ["A", "A"]);
});

test("med relationer (connect) sættes klubben som relation, ellers som clubId", () => {
  const checked = scopeArgs("Membership", "create", { data: { user: { connect: { id: "u" } }, type: { connect: { id: "t" } } } }, "A").data as Record<string, unknown>;
  assert.deepEqual(checked.club, { connect: { id: "A" } });
  assert.equal(checked.clubId, undefined);
  // connect til en række får klubben i where, så man ikke kan forbinde til en anden klubs række
  assert.deepEqual(checked.user, { connect: { id: "u", clubId: "A" } });
  // Under-relationer (participants) gør ikke data "checked"
  const unchecked = scopeArgs("GroupWorkout", "create", { data: { hostId: "u", participants: { create: [{ userId: "u" }] } } }, "A").data as Record<string, unknown>;
  assert.equal(unchecked.clubId, "A");
});

test("klubben kan ikke ændres med en opdatering", () => {
  const a = scopeArgs("User", "update", { where: { id: "u" }, data: { name: "x", clubId: "B", club: { connect: { id: "B" } } } }, "A");
  assert.deepEqual(a.data, { name: "x" });
  const m = scopeArgs("User", "updateMany", { where: {}, data: { clubId: "B" } }, "A");
  assert.deepEqual(m.data, {});
});

test("Club og Account filtreres ikke", () => {
  assert.deepEqual(scopeArgs("Club", "findMany", { where: { slug: "x" } }, "A"), { where: { slug: "x" } });
});

test("domæne → klub", () => {
  assert.equal(normalizeHost("NyborgTri.dk:443"), "nyborgtri.dk");
  assert.deepEqual(hostLookup("svendborg.klubplatform.dk", "klubplatform.dk"), { slug: "svendborg" });
  assert.deepEqual(hostLookup("demo.localhost:3000", "klubplatform.dk"), { slug: "demo" });
  assert.deepEqual(hostLookup("www.klubplatform.dk", "klubplatform.dk"), { domain: "www.klubplatform.dk", fallback: "nyborg" });
  assert.deepEqual(hostLookup("a.b.klubplatform.dk", "klubplatform.dk"), { domain: "a.b.klubplatform.dk", fallback: "nyborg" });
  assert.deepEqual(hostLookup("nyborgtri.dk", "klubplatform.dk"), { domain: "nyborgtri.dk", fallback: "nyborg" });
});
