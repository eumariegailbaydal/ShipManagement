"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";

type Crew = {
  id: string;
  full_name: string;
  rank: string | null;
  nationality: string | null;
  phone: string | null;
  email: string | null;
  status: string;
};

export default function CrewPage() {
  const supabase = createClient();
  const [crew, setCrew] = useState<Crew[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    rank: "",
    nationality: "",
    passport_no: "",
    seaman_book_no: "",
    phone: "",
    email: "",
    status: "standby",
  });

  async function load() {
    const { data } = await supabase.from("crew").select("*").order("full_name");
    setCrew(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addCrew(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("crew").insert({
      full_name: form.full_name,
      rank: form.rank || null,
      nationality: form.nationality || null,
      passport_no: form.passport_no || null,
      seaman_book_no: form.seaman_book_no || null,
      phone: form.phone || null,
      email: form.email || null,
      status: form.status,
    });
    setForm({
      full_name: "",
      rank: "",
      nationality: "",
      passport_no: "",
      seaman_book_no: "",
      phone: "",
      email: "",
      status: "standby",
    });
    setShowForm(false);
    load();
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("crew").update({ status }).eq("id", id);
    load();
  }

  return (
    <AppShell>
      <div className="p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold mb-1">Crew</h1>
            <p className="text-sm text-ink/60">Roster and current status.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800"
          >
            {showForm ? "Cancel" : "Add crew member"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={addCrew} className="panel rounded-sm p-5 mb-6 grid grid-cols-3 gap-4">
            <Field label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} required />
            <Field label="Rank" value={form.rank} onChange={(v) => setForm({ ...form, rank: v })} placeholder="e.g. Chief Engineer" />
            <Field label="Nationality" value={form.nationality} onChange={(v) => setForm({ ...form, nationality: v })} />
            <Field label="Passport no." value={form.passport_no} onChange={(v) => setForm({ ...form, passport_no: v })} />
            <Field label="Seaman's book no." value={form.seaman_book_no} onChange={(v) => setForm({ ...form, seaman_book_no: v })} />
            <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
            <div className="col-span-3">
              <button className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800">
                Save crew member
              </button>
            </div>
          </form>
        )}

        <div className="panel rounded-sm">
          <table className="log-table w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Rank</th>
                <th>Nationality</th>
                <th>Contact</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {crew.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.full_name}</td>
                  <td className="text-ink/60">{c.rank ?? "—"}</td>
                  <td className="text-ink/60">{c.nationality ?? "—"}</td>
                  <td className="text-ink/60">{c.phone || c.email || "—"}</td>
                  <td>
                    <select
                      value={c.status}
                      onChange={(e) => updateStatus(c.id, e.target.value)}
                      className="text-xs border border-ink/15 rounded-sm px-1.5 py-1 bg-transparent"
                    >
                      <option value="onboard">On board</option>
                      <option value="leave">On leave</option>
                      <option value="standby">Standby</option>
                      <option value="training">Training</option>
                    </select>
                  </td>
                </tr>
              ))}
              {crew.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-ink/50 py-8">
                    No crew records yet — add your first one above.
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
