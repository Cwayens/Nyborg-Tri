import { AdminNav } from "@/components/AdminNav";

/** Fælles ramme for administrationen: menu i siden (på mobil en vandret række øverst) og siden ved siden af. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="admin-side"><AdminNav /></aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
