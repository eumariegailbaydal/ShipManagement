"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";

type Incident = {
  id: string;
  description: string | null;
  severity: string;
  reported_by: string | null;
  created_at: string;
  ships: { name: string } | null;
};

type ShipOption = { id: string; name: string };

export default function IncidentsPage() {
  const supabase = createClient();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [ships, setShips] = useState<ShipOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ship_id: "", description: "", severity: "low", reported_by: "" });

  async function load() {
    const { data } = await supabase
      .from("incidents")
      .select("*, ships(name)")
      .order("created_at", { ascending: false });
    setIncidents((data as any) ?? []);

    const { data: shipData } = await supabase.from("ships").select("id, name").order("name");
    setShips(shipData ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addIncident(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("incidents").insert({
      ship_id: form.ship_id,
      description: form.description,
      severity: form.severity,
      reported_by: form.reported_by || null,
    });
    if (error) {
      alert(`Couldn't save this incident: ${error.message}`);
      return;
    }
    setForm({ ship_id: "", description: "", severity: "low", reported_by: "" });
    setShowForm(false);
    load();
  }

  const severityColor: Record<string, string> = {
    low: "text-ink/60",
    medium: "text-signal-warn",
    high: "text-signal-bad",
    critical: "text-signal-bad font-semibold",
  };

  return (
    <AppShell>
      <div className="p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6 print-hide">
          <div>
            <h1 className="text-xl font-semibold mb-1">Incidents</h1>
            <p className="text-sm text-ink/60">Defects, accidents, and anything worth flagging.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => window.print()} className="border border-ink/20 text-sm px-4 py-2 rounded-sm hover:bg-ink/5">
              Print report
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800"
            >
              {showForm ? "Cancel" : "Report incident"}
            </button>
          </div>
        </div>

        {/* Print-only header */}
        <div className="hidden print-show mb-6">
          <h1 className="text-xl font-semibold">Incident Report</h1>
          <p className="text-sm text-ink/60">Generated {new Date().toLocaleDateString()} · {incidents.length} incident{incidents.length === 1 ? "" : "s"} on record</p>
        </div>

        {showForm && (
          <form onSubmit={addIncident} className="panel rounded-sm p-5 mb-6 grid grid-cols-2 gap-4 print-hide">
            <div>
              <label className="block text-xs text-ink/60 mb-1">Ship</label>
              <select
                required
                value={form.ship_id}
                onChange={(e) => setForm({ ...form, ship_id: e.target.value })}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              >
                <option value="">Select…</option>
                {ships.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-ink/60 mb-1">Severity</label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-ink/60 mb-1">Description</label>
              <textarea
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-ink/60 mb-1">Reported by</label>
              <input
                value={form.reported_by}
                onChange={(e) => setForm({ ...form, reported_by: e.target.value })}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              />
            </div>
            <div className="col-span-2">
              <button className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800">
                Submit report
              </button>
            </div>
          </form>
        )}

        <div className="panel rounded-sm">
          <table className="log-table w-full">
            <thead>
              <tr>
                <th>Ship</th>
                <th>Description</th>
                <th>Severity</th>
                <th>Reported by</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((i) => (
                <tr key={i.id}>
                  <td className="font-medium">{i.ships?.name ?? "—"}</td>
                  <td className="text-ink/60">{i.description ?? "—"}</td>
                  <td className={`capitalize ${severityColor[i.severity] ?? ""}`}>{i.severity}</td>
                  <td className="text-ink/60">{i.reported_by ?? "—"}</td>
                  <td className="text-ink/60">{new Date(i.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {incidents.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-ink/50 py-8">
                    No incidents logged.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
