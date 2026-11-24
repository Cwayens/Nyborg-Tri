/**
 * Pakker en sikkerhedskopi ud til almindelig JSON, så data kan læses eller lægges tilbage.
 *
 *   BACKUP_KEY=... npx tsx scripts/read-backup.ts backup-fil.ntb > backup.json
 *
 * Første valg ved uheld er Neons egen gendannelse til et tidspunkt (Neon → Branches → Restore).
 * Denne fil er reserven, fx hvis noget er slettet for længere tid siden.
 */
import { readFileSync } from "node:fs";
import { readBackup } from "../src/lib/backup";

const file = process.argv[2];
if (!file) { console.error("Brug: npx tsx scripts/read-backup.ts <fil.ntb>"); process.exit(1); }
const b = readBackup(readFileSync(file));
console.error(`Backup fra ${b.createdAt}: ${Object.entries(b.data).map(([k, v]) => `${k} ${v.length}`).join(", ")}`);
process.stdout.write(JSON.stringify(b, null, 2));
