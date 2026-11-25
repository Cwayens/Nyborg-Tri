#!/usr/bin/env bash
# Byg på Vercel: database-migrationer, grunddata, valgfri import og demo, og til sidst Next.js.
set -euo pipefail

# Migrationer skal køre direkte mod databasen, ikke gennem pooleren
export DATABASE_URL_UNPOOLED="${DATABASE_URL_UNPOOLED:-${DATABASE_URL_NON_POOLING:-$DATABASE_URL}}"

prisma generate

# Flere samtidige builds (hurtige pushes) kan vente på hinandens migrationslås (P1002).
# Prøv igen nogle gange, før vi giver op.
for i in 1 2 3 4 5; do
  if prisma migrate deploy; then break; fi
  if [ "$i" = 5 ]; then echo "Migration fejlede 5 gange"; exit 1; fi
  echo "Migration fejlede (forsøg $i). Prøver igen om $((i * 15)) sekunder ..."
  sleep $((i * 15))
done

tsx prisma/seed.ts

if [ "${IMPORT_WP_ON_BUILD:-}" = "1" ]; then
  tsx scripts/import-wordpress.ts || echo "WordPress-import fejlede – fortsætter uden"
fi

# DEMO_MODE=1: testbrugere i standardklubben. DEMO_MODE=demo,klub2: testbrugere i de nævnte klubber.
if [ "${DEMO_MODE:-}" = "1" ]; then
  tsx scripts/seed-demo.ts
elif [ -n "${DEMO_MODE:-}" ]; then
  for k in ${DEMO_MODE//,/ }; do
    tsx scripts/seed-demo.ts --klub="$k" || echo "Demodata for $k fejlede – fortsætter"
  done
fi

next build
