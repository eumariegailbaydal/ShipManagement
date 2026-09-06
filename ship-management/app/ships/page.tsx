"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";

type Ship = {
  id: string;
  name: string;
  imo_number: string | null;
  type: string | null;
  flag: string | null;
  capacity: number | null;
  year_built: number | null;
  status: string;
};

export default function ShipsPage() {
  const supabase = createClient();
  const [ships, setShips] = useState<Ship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    imo_number: "",
    type: "",
    flag: "",
    capacity: "",
    year_built: "",
    status: "in_port",
  });

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("ships").select("*").order("name");
    setShips(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addShip(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("ships").insert({
      name: form.name,
      imo_number: form.imo_number || null,
      type: form.type || null,
      flag: form.flag || null,
      capacity: form.capacity ? Number(form.capacity) : null,
      year_built: form.year_built ? Number(form.year_built) : null,
      status: form.status,
    });
    if (error) {
      alert(`Couldn't save this ship: ${error.message}`);
      return;
    }
    setForm({ name: "", imo_number: "", type: "", flag: "", capacity: "", year_built: "", status: "in_port" });
    setShowForm(false);
    load();
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("ships").update({ status }).eq("id", id);
    load();
  }

  return (
    <AppShell>
      <div className="p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold mb-1">Ships</h1>
            <p className="text-sm text-ink/60">Your fleet, at a glance.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800"
          >
            {showForm ? "Cancel" : "Add ship"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={addShip} className="panel rounded-sm p-5 mb-6 grid grid-cols-3 gap-4">
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Field label="IMO number" value={form.imo_number} onChange={(v) => setForm({ ...form, imo_number: v })} />
            <Field label="Type" value={form.type} onChange={(v) => setForm({ ...form, type: v })} placeholder="e.g. Bulk carrier" />
            <Field label="Flag" value={form.flag} onChange={(v) => setForm({ ...form, flag: v })} />
            <Field label="Capacity" value={form.capacity} onChange={(v) => setForm({ ...form, capacity: v })} type="number" />
            <Field label="Year built" value={form.year_built} onChange={(v) => setForm({ ...form, year_built: v })} type="number" />
            <div className="col-span-3">
              <button className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800">
                Save ship
              </button>
            </div>
          </form>
        )}

        <div className="panel rounded-sm">
          <table className="log-table w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>IMO</th>
                <th>Type</th>
                <th>Flag</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ships.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.name}</td>
                  <td className="text-ink/60">{s.imo_number ?? "—"}</td>
                  <td className="text-ink/60">{s.type ?? "—"}</td>
                  <td className="text-ink/60">{s.flag ?? "—"}</td>
                  <td>
                    <select
                      value={s.status}
                      onChange={(e) => updateStatus(s.id, e.target.value)}
                      className="text-xs border border-ink/15 rounded-sm px-1.5 py-1 bg-transparent"
                    >
                      <option value="in_port">In port</option>
                      <option value="at_sea">At sea</option>
                      <option value="anchored">Anchored</option>
                      <option value="dry_dock">Dry dock</option>
                    </select>
                  </td>
                </tr>
              ))}
              {!loading && ships.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-ink/50 py-8">
                    No ships yet — add your first one above.
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

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-ink/60 mb-1">{label}</label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-harbor-700"
      />
    </div>
  );
}
