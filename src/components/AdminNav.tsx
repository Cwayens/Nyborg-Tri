import { featuresOff } from "@/lib/features";
import { auth } from "@/auth";
import { staffOf } from "@/lib/staff";
import { AdminMenu, type MenuGroup } from "./AdminMenu";

/**
 * Menuen i administrationen, grupperet efter emne. Vises af admin/layout.tsx.
 * Admin ser alt. Kassereren ser kun sin del (økonomi, betalinger og medlemstyper). Andre ser ingen menu.
 */
export async function adminMenuGroups(): Promise<MenuGroup[] | null> {
  const me = await staffOf((await auth())?.user?.id);
  if (!me) return null;
  if (me.role !== "ADMIN") {
    if (!me.duties.includes("TREASURER")) return null;
    return [
      { label: "Økonomi", items: [["/admin/oekonomi", "Økonomi"], ["/admin/betalinger", "Betalinger"], ["/admin/medlemstyper", "Medlemstyper"]] },
    ];
  }
  const off = await featuresOff();
  const on = (key: Parameters<typeof off.has>[0], item: [string, string]) => (off.has(key) ? [] : [item]);
  return [
    { label: "Medlemmer", items: [["/admin", "Medlemmer"], ["/admin/adgang", "Prøveperioder og koder"], ["/admin/hold", "Hold"], ["/admin/import", "Importér"]] },
    { label: "Økonomi", items: [["/admin/oekonomi", "Økonomi"], ["/admin/betalinger", "Betalinger"], ["/admin/medlemstyper", "Medlemstyper"]] },
    { label: "Indhold", items: [["/admin/indhold", "Nyheder og sider"], ["/admin/klubben", "Klubben"], ...on("sponsorer", ["/admin/sponsorer", "Sponsorer"]), ...on("atleter", ["/admin/atleter", "Atleter"]), ["/admin/kontakt", "Kontakt"], ...on("mail", ["/admin/mail", "Mail"])] },
    { label: "Indstillinger", items: [["/admin/kom-i-gang", "Kom i gang"], ["/admin/funktioner", "Funktioner"], ["/admin/drift", "Drift"]] },
  ];
}

export async function AdminNav() {
  const groups = await adminMenuGroups();
  return groups ? <AdminMenu groups={groups} /> : null;
}
