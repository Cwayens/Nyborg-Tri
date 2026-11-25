import { prismaUnscoped } from "./db-base";
import { scopeArgs } from "./tenant-scope";
import { currentClubId } from "./tenant";

/**
 * Databasen for den aktuelle klub. Hver forespørgsel begrænses automatisk til klubben (where.clubId), og nye rækker
 * får klubben sat (data.clubId), også rækker der oprettes inde i andre. Klubben findes ud fra domænet eller
 * runAsClub() (se src/lib/tenant.ts). Kan klubben ikke findes, fejler forespørgslen i stedet for at vise noget.
 * Databasen afviser desuden selv rækker, der peger på en anden klub (triggerne i migrationen flere_klubber).
 */
export const prisma = prismaUnscoped.$extends({
  name: "klub-isolation",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const clubId = await currentClubId();
        return query(scopeArgs(model, operation, args, clubId) as typeof args);
      },
    },
  },
});

export type Db = typeof prisma;
export { prismaUnscoped };
/** Databasen inde i en transaktion (prisma.$transaction(async (tx) => ...)), også klub-begrænset. */
export type Tx = Omit<Db, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;
