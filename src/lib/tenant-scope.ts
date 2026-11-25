import { Prisma } from "@prisma/client";

// Ren logik til klub-isolation: tilføjer clubId til hver forespørgsel (where) og hver ny række (data), også rækker,
// der oprettes inde i andre (nested writes). Bruges af src/lib/db.ts. Holdt fri for Next.js og database, så den kan testes.

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);

/** Modeller uden clubId. Alle andre SKAL have clubId (tjekkes af tenant-scope.test.ts). */
export const UNSCOPED_MODELS = new Set(["Club", "Account"]);

const models = Prisma.dmmf.datamodel.models;
/** Modeller med clubId */
export const SCOPED_MODELS = new Set(models.filter((m) => m.fields.some((f) => f.name === "clubId")).map((m) => m.name));
/** Relationsfelter pr. model: feltnavn → modellen, der peges på */
const RELATIONS: Record<string, Record<string, string>> = Object.fromEntries(
  models.map((m) => [m.name, Object.fromEntries(m.fields.filter((f) => f.kind === "object").map((f) => [f.name, f.type]))]),
);
/** Relationer, hvor modellen selv har fremmednøglen (fx Membership.user via userId) */
const OWNING: Record<string, Set<string>> = Object.fromEntries(
  models.map((m) => [m.name, new Set(m.fields.filter((f) => f.kind === "object" && f.relationFromFields?.length).map((f) => f.name))]),
);

const READ_WHERE = new Set([
  "findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany", "count", "aggregate", "groupBy",
  "delete", "deleteMany",
]);

const withWhere = (where: unknown, clubId: string): Obj => ({ ...(isObj(where) ? where : {}), clubId });
const each = (v: unknown, f: (x: Obj) => unknown): unknown => (Array.isArray(v) ? v.map((x) => f(isObj(x) ? x : {})) : f(isObj(v) ? v : {}));

/** Data til en ny række: sætter klubben og går ned i rækker, der oprettes samtidig. */
export function createData(model: string, data: unknown, clubId: string): Obj {
  const d: Obj = { ...(isObj(data) ? data : {}) };
  delete d.clubId;
  delete d.club;
  const rels = RELATIONS[model] ?? {};
  // Prisma tillader ikke at blande relationer ("checked", fx user: { connect }) og fremmednøgler ("unchecked", fx userId)
  // i samme data. Bruges en relation, hvor modellen selv har fremmednøglen, sætter vi klubben som relation.
  const owning = OWNING[model] ?? new Set<string>();
  const checked = Object.keys(d).some((k) => owning.has(k) && isObj(d[k]));
  if (SCOPED_MODELS.has(model)) {
    if (checked) d.club = { connect: { id: clubId } };
    else d.clubId = clubId;
  }
  for (const [k, target] of Object.entries(rels)) if (isObj(d[k])) d[k] = nested(target, d[k] as Obj, clubId);
  return d;
}

/** Data til en opdatering: klubben kan ikke ændres, og rækker, der oprettes samtidig, får klubben. */
export function updateData(model: string, data: unknown, clubId: string): Obj {
  const d: Obj = { ...(isObj(data) ? data : {}) };
  delete d.clubId;
  delete d.club;
  const rels = RELATIONS[model] ?? {};
  for (const [k, target] of Object.entries(rels)) if (isObj(d[k])) d[k] = nested(target, d[k] as Obj, clubId);
  return d;
}

/** Skriveoperationer på en relation inde i create/update, fx { create: {...}, connect: { id } }. */
function nested(target: string, ops: Obj, clubId: string): Obj {
  if (!SCOPED_MODELS.has(target)) return ops;
  const out: Obj = { ...ops };
  const where = (w: unknown) => (isObj(w) ? withWhere(w, clubId) : w);
  for (const [op, v] of Object.entries(ops)) {
    if (v === undefined || v === null) continue;
    switch (op) {
      case "create":
        out[op] = each(v, (x) => createData(target, x, clubId));
        break;
      case "createMany":
        out[op] = { ...(v as Obj), data: each((v as Obj).data, (x) => createData(target, x, clubId)) };
        break;
      case "connectOrCreate":
        out[op] = each(v, (x) => ({ ...x, where: where(x.where), create: createData(target, x.create, clubId) }));
        break;
      case "upsert":
        out[op] = each(v, (x) => ({ ...x, ...(x.where ? { where: where(x.where) } : {}), create: createData(target, x.create, clubId), update: updateData(target, x.update, clubId) }));
        break;
      case "update":
        // to-many: { where, data }; to-one: { data } eller felterne direkte
        out[op] = each(v, (x) =>
          isObj(x.data) ? { ...x, ...(x.where ? { where: where(x.where) } : {}), data: updateData(target, x.data, clubId) } : updateData(target, x, clubId),
        );
        break;
      case "updateMany":
        out[op] = each(v, (x) => ({ ...x, where: where(x.where), data: updateData(target, x.data, clubId) }));
        break;
      case "connect":
      case "set":
      case "deleteMany":
        out[op] = each(v, (x) => where(x));
        break;
      case "delete":
      case "disconnect":
        out[op] = isObj(v) || Array.isArray(v) ? each(v, (x) => where(x)) : v;
        break;
    }
  }
  return out;
}

/** Argumenterne til en Prisma-forespørgsel, begrænset til klubben. */
export function scopeArgs(model: string, operation: string, args: unknown, clubId: string): Obj {
  const a: Obj = { ...(isObj(args) ? args : {}) };
  if (!SCOPED_MODELS.has(model)) {
    // Fx Club: ingen filtrering, men rækker i klubtabeller oprettet herfra skal stadig have en klub
    return a;
  }
  if (READ_WHERE.has(operation)) {
    a.where = withWhere(a.where, clubId);
  } else if (operation === "update") {
    a.where = withWhere(a.where, clubId);
    a.data = updateData(model, a.data, clubId);
  } else if (operation === "updateMany" || operation === "updateManyAndReturn") {
    a.where = withWhere(a.where, clubId);
    a.data = updateData(model, a.data, clubId);
  } else if (operation === "create") {
    a.data = createData(model, a.data, clubId);
  } else if (operation === "createMany" || operation === "createManyAndReturn") {
    a.data = each(a.data, (x) => createData(model, x, clubId));
  } else if (operation === "upsert") {
    a.where = withWhere(a.where, clubId);
    a.create = createData(model, a.create, clubId);
    a.update = updateData(model, a.update, clubId);
  } else {
    // Ukendt operation: hellere fejl end data fra en anden klub
    throw new Error(`Klub-isolation: ukendt Prisma-operation ${model}.${operation}`);
  }
  return a;
}
