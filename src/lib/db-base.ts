import { PrismaClient } from "@prisma/client";

// Den rå databaseforbindelse UDEN klub-filter. Brug `prisma` fra ./db i al almindelig kode.
// Kun platformskode (find klub ud fra domæne, Strava-webhooks på tværs af klubber, cron) må bruge denne.

const g = globalThis as unknown as { prismaBase?: PrismaClient };

export const prismaUnscoped = g.prismaBase ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") g.prismaBase = prismaUnscoped;
