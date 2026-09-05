import { createClient } from "@/lib/supabase-server";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const [
    { data: ships },
    { data: crew },
    { count: openWorkOrders },
    { data: expiringCerts },
    { data: recentIncidents },
  ] = await Promise.all([
    supabase.from("ships").select("id, name, status"),
    supabase.from("crew").select("id, status"),
    supabase.from("work_orders").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
    supabase
      .from("crew_certifications_status")
      .select("id, crew_id, expiry_date, status, crew(full_name), certificate_types(name)")
      .in("status", ["expiring_soon", "expired"])
      .order("expiry_date", { ascending: true })
      .limit(6),
    supabase.from("incidents").select("id, description, severity, created_at, ships(name)").order("created_at", { ascending: false }).limit(5),
  ]);

  const onboardCount = crew?.filter((c) => c.status === "onboard").length ?? 0;
  const atSeaCount = ships?.filter((s) => s.status === "at_sea").length ?? 0;

  return (
    <AppShell>
      <div className="p-8 max-w-6xl">
        <h1 className="text-xl font-semibold mb-1">Fleet overview</h1>
        <p className="text-sm text-ink/60 mb-6">Where things stand across the fleet right now.</p>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <StatCard label="Ships" value={ships?.length ?? 0} sub={`${atSeaCount} at sea`} />
          <StatCard label="Crew" value={crew?.length ?? 0} sub={`${onboardCount} on board`} />
          <StatCard label="Open work orders" value={openWorkOrders ?? 0} sub="maintenance" />
          <StatCard
            label="Certs needing attention"
            value={expiringCerts?.length ?? 0}
            sub="expiring or expired"
            alert={(expiringCerts?.length ?? 0) > 0}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="panel rounded-sm">
            <div className="px-5 py-3 border-b border-ink/10 flex items-center justify-between">
              <h2 className="text-sm font-medium">Certifications needing attention</h2>
              <Link href="/certifications" className="text-xs text-harbor-700 hover:underline">
                View all
              </Link>
            </div>
            <div className="p-2">
              {expiringCerts && expiringCerts.length > 0 ? (
                <table className="log-table w-full">
                  <tbody>
                    {expiringCerts.map((c: any) => (
                      <tr key={c.id}>
                        <td>{c.crew?.full_name ?? "—"}</td>
                        <td className="text-ink/60">{c.certificate_types?.name ?? "—"}</td>
                        <td>{c.expiry_date}</td>
                        <td>
                          <StatusBadge status={c.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-ink/50 p-4">Nothing needs attention right now.</p>
              )}
            </div>
          </div>

          <div className="panel rounded-sm">
            <div className="px-5 py-3 border-b border-ink/10 flex items-center justify-between">
              <h2 className="text-sm font-medium">Recent incidents</h2>
              <Link href="/incidents" className="text-xs text-harbor-700 hover:underline">
                View all
              </Link>
            </div>
            <div className="p-2">
              {recentIncidents && recentIncidents.length > 0 ? (
                <table className="log-table w-full">
                  <tbody>
                    {recentIncidents.map((i: any) => (
                      <tr key={i.id}>
                        <td className="text-ink/60">{i.ships?.name ?? "—"}</td>
                        <td>{i.description?.slice(0, 40)}</td>
                        <td className="capitalize">{i.severity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-ink/50 p-4">No incidents logged.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: number;
  sub: string;
  alert?: boolean;
}) {
  return (
    <div className="panel rounded-sm p-4">
      <p className="data-label text-[0.65rem] uppercase tracking-wider text-ink/50 mb-2">{label}</p>
      <p className={`text-3xl font-semibold ${alert ? "text-signal-bad" : "text-ink"}`}>{value}</p>
      <p className="text-xs text-ink/50 mt-1">{sub}</p>
    </div>
  );
}
