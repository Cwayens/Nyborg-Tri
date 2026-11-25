// Klub-isolation mod en rigtig database. Kør: DATABASE_URL=... npm run test:db (kræver migrerede tabeller).
// Opretter to midlertidige klubber og sletter dem igen bagefter.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { prisma, prismaUnscoped } from "./db";
import { runAsClub, currentClubId } from "./tenant";
import { SCOPED_MODELS } from "./tenant-scope";
import { createClub } from "./club-setup";

const tag = randomBytes(4).toString("hex");
let A = "", B = "";
const asA = <T>(fn: () => Promise<T>) => runAsClub(A, fn);
const asB = <T>(fn: () => Promise<T>) => runAsClub(B, fn);
const ids: Record<string, string> = {};

const delegate = (model: string) =>
  (prisma as unknown as Record<string, { findMany: (a?: unknown) => Promise<{ clubId: string }[]> }>)[model[0].toLowerCase() + model.slice(1)];

before(async () => {
  A = (await createClub({ slug: `testa-${tag}`, name: "Testklub A" })).id;
  B = (await createClub({ slug: `testb-${tag}`, name: "Testklub B" })).id;
  await asA(async () => {
    const type = await prisma.membershipType.findFirstOrThrow({ where: { code: "ADULT" } });
    const admin = await prisma.user.create({ data: { email: `admin@${tag}.dk`, name: "Admin A", role: "ADMIN" } });
    const child = await prisma.user.create({ data: { email: `barn@${tag}.dk`, name: "Barn A", athleteGroup: "BOERN" } });
    const session = await prisma.trainingSession.create({
      data: { title: "Svøm A", discipline: "SWIM", location: "Hal A", startsAt: new Date(), endsAt: new Date(Date.now() + 3600_000), group: "BREDDE", createdById: admin.id },
    });
    await prisma.trainingSignup.create({ data: { sessionId: session.id, userId: admin.id } });
    const m = await prisma.membership.create({ data: { userId: admin.id, typeId: type.id, startDate: new Date(), endDate: new Date(Date.now() + 86400_000) } });
    const pay = await prisma.payment.create({ data: { userId: admin.id, membershipId: m.id, amountOre: 100000, description: "Kontingent", status: "PAID", paidAt: new Date() } });
    await prisma.chatMessage.create({ data: { room: "BOERN", channel: "SOCIAL", userId: child.id, body: "hej fra børnechatten i A" } });
    await prisma.post.create({ data: { slug: "nyhed", title: "Nyhed A", body: "..." } });
    await prisma.setting.create({ data: { key: "site_club", value: { name: "Klub A" } } });
    await prisma.session.create({ data: { sessionToken: `tok-${tag}`, userId: admin.id, expires: new Date(Date.now() + 86400_000) } });
    Object.assign(ids, { admin: admin.id, child: child.id, session: session.id, payment: pay.id, type: type.id });
  });
});

after(async () => {
  // Ryd op: slet alt i de to testklubber (rækkefølgen tager hensyn til Restrict-relationer)
  for (const club of [A, B]) {
    await runAsClub(club, async () => {
      await prisma.payment.deleteMany({});
      await prisma.membership.deleteMany({});
      await prisma.accessCode.deleteMany({});
      await prisma.trainingSession.deleteMany({});
      await prisma.trialRequest.deleteMany({});
      for (const m of ["chatMessage", "post", "setting", "session", "verificationToken", "tip"]) await (prisma as unknown as Record<string, { deleteMany: (a: object) => Promise<unknown> }>)[m].deleteMany({});
      await prisma.user.deleteMany({});
      await prisma.team.deleteMany({});
      await prisma.membershipType.deleteMany({});
    });
    await prismaUnscoped.club.delete({ where: { id: club } });
  }
  await prismaUnscoped.$disconnect();
});

test("klub B ser ingen af klub A's rækker i nogen tabel", async () => {
  await asB(async () => {
    for (const model of SCOPED_MODELS) {
      const rows = await delegate(model).findMany();
      assert.ok(rows.every((r) => r.clubId === B), `${model}: rækker fra en anden klub`);
    }
    assert.equal(await prisma.user.count({ where: { email: `admin@${tag}.dk` } }), 0);
    assert.equal(await prisma.chatMessage.count(), 0);
  });
  await asA(async () => assert.equal(await prisma.chatMessage.count(), 1));
});

test("klub B kan ikke læse, ændre eller slette klub A's rækker ud fra id", async () => {
  await asB(async () => {
    assert.equal(await prisma.user.findUnique({ where: { id: ids.admin } }), null);
    assert.equal(await prisma.payment.findFirst({ where: { id: ids.payment } }), null);
    await assert.rejects(prisma.user.update({ where: { id: ids.admin }, data: { role: "ATHLETE" } }));
    await assert.rejects(prisma.trainingSession.delete({ where: { id: ids.session } }));
    assert.equal((await prisma.user.updateMany({ where: { id: ids.admin }, data: { name: "hacket" } })).count, 0);
    assert.equal((await prisma.payment.deleteMany({ where: { id: ids.payment } })).count, 0);
    // Aggregering og gruppering medtager heller ikke A
    assert.equal((await prisma.payment.aggregate({ _sum: { amountOre: true } }))._sum.amountOre, null);
  });
  await asA(async () => {
    const u = await prisma.user.findUniqueOrThrow({ where: { id: ids.admin } });
    assert.equal(u.role, "ADMIN");
    assert.equal(u.name, "Admin A");
  });
});

test("klub B kan ikke forbinde sine rækker til klub A's (databasen afviser det)", async () => {
  await asB(async () => {
    const me = await prisma.user.create({ data: { email: `b@${tag}.dk` } });
    // Med fremmednøgle direkte: databasens klubvagt afviser
    await assert.rejects(prisma.trainingSignup.create({ data: { sessionId: ids.session, userId: me.id } }), /Klub-isolation/);
    // Med connect: rækken findes ikke i klubben
    await assert.rejects(prisma.trainingSignup.create({ data: { session: { connect: { id: ids.session } }, user: { connect: { id: me.id } } } }));
    // Holdleder for et hold i en anden klub (mange-til-mange)
    const teamA = await asA(() => prisma.team.findFirstOrThrow({ where: { kind: "BREDDE" } }));
    await assert.rejects(prismaUnscoped.$executeRawUnsafe(`INSERT INTO "_TeamLeaders" ("A", "B") VALUES ($1, $2)`, teamA.id, me.id), /Klub-isolation/);
  });
});

test("samme mail kan være medlem af to klubber som to brugere", async () => {
  const a = await asA(() => prisma.user.findFirstOrThrow({ where: { email: `admin@${tag}.dk` } }));
  const b = await asB(() => prisma.user.create({ data: { email: `admin@${tag}.dk`, name: "Admin B" } }));
  assert.notEqual(a.id, b.id);
  assert.equal(b.role, "ATHLETE"); // admin i A giver ingen rettigheder i B
});

test("en login-session fra klub A virker ikke i klub B", async () => {
  await asB(async () => assert.equal(await prisma.session.findUnique({ where: { sessionToken: `tok-${tag}` }, include: { user: true } }), null));
  await asA(async () => assert.ok(await prisma.session.findUnique({ where: { sessionToken: `tok-${tag}` } })));
});

test("rækker oprettet inde i andre får klubben, og en række kan ikke flyttes til en anden klub", async () => {
  await asB(async () => {
    const type = await prisma.membershipType.findFirstOrThrow({ where: { code: "ADULT" } });
    const u = await prisma.user.create({
      data: { email: `nested@${tag}.dk`, memberships: { create: { typeId: type.id, startDate: new Date(), endDate: new Date() } } },
      include: { memberships: true },
    });
    assert.equal(u.clubId, B);
    assert.equal(u.memberships[0].clubId, B);
    // Forsøg på at flytte via koden ignoreres; direkte i databasen afvises det
    await prisma.user.update({ where: { id: u.id }, data: { clubId: A } as never });
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).clubId, B);
    await assert.rejects(prismaUnscoped.user.update({ where: { id: u.id }, data: { clubId: A } }), /Klub-isolation/);
  });
});

test("indstillinger, nyheder og medlemstyper er pr. klub", async () => {
  await asB(async () => {
    assert.equal(await prisma.setting.findFirst({ where: { key: "site_club" } }), null);
    await prisma.setting.create({ data: { key: "site_club", value: { name: "Klub B" } } });
    await prisma.post.create({ data: { slug: "nyhed", title: "Nyhed B", body: "..." } }); // samme adresse som i A
    assert.equal((await prisma.post.findFirstOrThrow({ where: { slug: "nyhed" } })).title, "Nyhed B");
    const typeB = await prisma.membershipType.findFirstOrThrow({ where: { code: "ADULT" } });
    assert.notEqual(typeB.id, ids.type);
  });
  await asA(async () => assert.equal((await prisma.post.findFirstOrThrow({ where: { slug: "nyhed" } })).title, "Nyhed A"));
});

test("holdsynkroniseringen vælger kun hold i medlemmets egen klub", async () => {
  const u = await asB(() => prisma.user.create({ data: { email: `hold@${tag}.dk`, athleteGroup: "ELITE" }, include: { team: true } }));
  assert.equal(u.team?.clubId, B);
});

test("en række uden klub afvises, og uden klub kan intet læses", async () => {
  await assert.rejects(prismaUnscoped.tip.create({ data: { title: "x", body: "x", authorId: ids.admin } }));
  await assert.rejects(prisma.user.findMany(), /ingen klub valgt/);
  await assert.rejects(currentClubId(), /ingen klub valgt/);
});

test("transaktioner er også begrænset til klubben", async () => {
  await asB(async () => {
    const [n, rows] = await prisma.$transaction([prisma.user.count({ where: { id: ids.admin } }), prisma.payment.findMany()]);
    assert.equal(n, 0);
    assert.ok(rows.every((r) => r.clubId === B));
    await prisma.$transaction(async (tx) => {
      assert.equal(await tx.user.findUnique({ where: { id: ids.admin } }), null);
      const t = await tx.tip.create({ data: { title: "tx", body: "x", authorId: (await tx.user.findFirstOrThrow()).id } });
      assert.equal(t.clubId, B);
    });
  });
});
