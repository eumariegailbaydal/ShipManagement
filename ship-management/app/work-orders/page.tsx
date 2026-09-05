"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";

type WorkOrder = {
  id: string;
  description: string | null;
  status: string;
  reported_by: string | null;
  assigned_to: string | null;
  created_at: string;
  ships: { name: string } | null;
};

type ShipOption = { id: string; name: string };

const STATUSES = ["open", "in_progress", "completed", "verified"];

export default function WorkOrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [ships, setShips] = useState<ShipOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ship_id: "", description: "", assigned_to: "" });

  async function load() {
    const { data } = await supabase
      .from("work_orders")
      .select("*, ships(name)")
      .order("created_at", { ascending: false });
    setOrders((data as any) ?? []);

    const { data: shipData } = await supabase.from("ships").select("id, name").order("name");
    setShips(shipData ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addOrder(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("work_orders").insert({
      ship_id: form.ship_id,
      description: form.description,
      assigned_to: form.assigned_to || null,
      status: "open",
    });
    setForm({ ship_id: "", description: "", assigned_to: "" });
    setShowForm(false);
    load();
  }

  async function updateStatus(id: string, status: string) {
    await supabase
      .from("work_orders")
      .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
      .eq("id", id);
    load();
  }

  return (
    <AppShell>
      <div className="p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold mb-1">Work orders</h1>
            <p className="text-sm text-ink/60">Open → In progress → Completed → Verified.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800"
          >
            {showForm ? "Cancel" : "New work order"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={addOrder} className="panel rounded-sm p-5 mb-6 grid grid-cols-3 gap-4">
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
            <div className="col-span-2">
              <label className="block text-xs text-ink/60 mb-1">Description</label>
              <input
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-ink/60 mb-1">Assigned to</label>
              <input
                value={form.assigned_to}
                onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              />
            </div>
            <div className="col-span-3">
              <button className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800">
                Create work order
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
                <th>Assigned to</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="font-medium">{o.ships?.name ?? "—"}</td>
                  <td className="text-ink/60">{o.description ?? "—"}</td>
                  <td className="text-ink/60">{o.assigned_to ?? "—"}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={o.status} />
                      <select
                        value={o.status}
                        onChange={(e) => updateStatus(o.id, e.target.value)}
                        className="text-xs border border-ink/15 rounded-sm px-1 py-0.5 bg-transparent"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-ink/50 py-8">
                    No work orders yet.
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
