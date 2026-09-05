"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";

type Cert = {
  id: string;
  issue_date: string | null;
  expiry_date: string | null;
  status: string;
  crew: { full_name: string } | null;
  certificate_types: { name: string } | null;
};

type CrewOption = { id: string; full_name: string };
type TypeOption = { id: string; name: string };

export default function CertificationsPage() {
  const supabase = createClient();
  const [certs, setCerts] = useState<Cert[]>([]);
  const [crewOptions, setCrewOptions] = useState<CrewOption[]>([]);
  const [typeOptions, setTypeOptions] = useState<TypeOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "expiring_soon" | "expired">("all");
  const [form, setForm] = useState({
    crew_id: "",
    certificate_type_id: "",
    new_type_name: "",
    issue_date: "",
    expiry_date: "",
  });

  async function load() {
    const { data } = await supabase
      .from("crew_certifications_status")
      .select("id, issue_date, expiry_date, status, crew(full_name), certificate_types(name)")
      .order("expiry_date", { ascending: true });
    setCerts((data as any) ?? []);

    const { data: crewData } = await supabase.from("crew").select("id, full_name").order("full_name");
    setCrewOptions(crewData ?? []);

    const { data: typeData } = await supabase.from("certificate_types").select("id, name").order("name");
    setTypeOptions(typeData ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addCert(e: React.FormEvent) {
    e.preventDefault();
    let certTypeId = form.certificate_type_id;

    if (!certTypeId && form.new_type_name) {
      const { data: newType } = await supabase
        .from("certificate_types")
        .insert({ name: form.new_type_name })
        .select()
        .single();
      certTypeId = newType?.id;
    }

    if (!certTypeId || !form.crew_id) return;

    await supabase.from("crew_certifications").insert({
      crew_id: form.crew_id,
      certificate_type_id: certTypeId,
      issue_date: form.issue_date || null,
      expiry_date: form.expiry_date || null,
    });
    setForm({ crew_id: "", certificate_type_id: "", new_type_name: "", issue_date: "", expiry_date: "" });
    setShowForm(false);
    load();
  }

  const visibleCerts = certs.filter((c) => filter === "all" || c.status === filter);

  return (
    <AppShell>
      <div className="p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold mb-1">Crew Certifications</h1>
            <p className="text-sm text-ink/60">Every certificate, and when it needs renewing.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800"
          >
            {showForm ? "Cancel" : "Add certificate"}
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {(["all", "expiring_soon", "expired"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                filter === f ? "bg-harbor-900 text-paper border-harbor-900" : "border-ink/20 text-ink/60"
              }`}
            >
              {f === "all" ? "All" : f === "expiring_soon" ? "Expiring soon" : "Expired"}
            </button>
          ))}
        </div>

        {showForm && (
          <form onSubmit={addCert} className="panel rounded-sm p-5 mb-6 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-ink/60 mb-1">Crew member</label>
              <select
                required
                value={form.crew_id}
                onChange={(e) => setForm({ ...form, crew_id: e.target.value })}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              >
                <option value="">Select…</option>
                {crewOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-ink/60 mb-1">Certificate type</label>
              <select
                value={form.certificate_type_id}
                onChange={(e) => setForm({ ...form, certificate_type_id: e.target.value })}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              >
                <option value="">New type…</option>
                {typeOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            {!form.certificate_type_id && (
              <div>
                <label className="block text-xs text-ink/60 mb-1">New certificate type name</label>
                <input
                  value={form.new_type_name}
                  onChange={(e) => setForm({ ...form, new_type_name: e.target.value })}
                  placeholder="e.g. STCW Basic Safety"
                  className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-ink/60 mb-1">Issue date</label>
              <input
                type="date"
                value={form.issue_date}
                onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-ink/60 mb-1">Expiry date</label>
              <input
                type="date"
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              />
            </div>
            <div className="col-span-2">
              <button className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800">
                Save certificate
              </button>
            </div>
          </form>
        )}

        <div className="panel rounded-sm">
          <table className="log-table w-full">
            <thead>
              <tr>
                <th>Crew member</th>
                <th>Certificate</th>
                <th>Issued</th>
                <th>Expires</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleCerts.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.crew?.full_name ?? "—"}</td>
                  <td className="text-ink/60">{c.certificate_types?.name ?? "—"}</td>
                  <td className="text-ink/60">{c.issue_date ?? "—"}</td>
                  <td className="text-ink/60">{c.expiry_date ?? "—"}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
              {visibleCerts.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-ink/50 py-8">
                    Nothing in this view yet.
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
