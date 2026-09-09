"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";

type Record_ = {
  id: string;
  crew_name: string | null;
  position: string | null;
  vessel_name: string | null;
  date_of_joining: string | null;
  date_of_discharge: string | null;
  date_of_issue: string | null;
};

type CrewOption = { id: string; full_name: string; seaman_book_no: string | null; passport_no: string | null; nationality: string | null; rank: string | null };
type ShipOption = { id: string; name: string; imo_number: string | null; flag: string | null; type: string | null };

export default function SeaServicePage() {
  const supabase = createClient();
  const [records, setRecords] = useState<Record_[]>([]);
  const [crewOptions, setCrewOptions] = useState<CrewOption[]>([]);
  const [shipOptions, setShipOptions] = useState<ShipOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    crew_id: "",
    ship_id: "",
    position: "",
    seaman_book_no: "",
    passport_no: "",
    nationality: "",
    date_of_joining: "",
    date_of_discharge: "",
    place_of_issue: "",
    date_of_issue: new Date().toISOString().slice(0, 10),
    issued_by_name: "",
    issued_by_title: "",
    remarks: "",
  });

  async function load() {
    const { data } = await supabase
      .from("sea_service_records")
      .select("id, crew_name, position, vessel_name, date_of_joining, date_of_discharge, date_of_issue")
      .order("date_of_issue", { ascending: false });
    setRecords(data ?? []);

    const { data: crewData } = await supabase
      .from("crew")
      .select("id, full_name, seaman_book_no, passport_no, nationality, rank")
      .order("full_name");
    setCrewOptions(crewData ?? []);

    const { data: shipData } = await supabase.from("ships").select("id, name, imo_number, flag, type").order("name");
    setShipOptions(shipData ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function onCrewChange(crewId: string) {
    const c = crewOptions.find((c) => c.id === crewId);
    setForm((f) => ({
      ...f,
      crew_id: crewId,
      seaman_book_no: c?.seaman_book_no ?? "",
      passport_no: c?.passport_no ?? "",
      nationality: c?.nationality ?? "",
      position: c?.rank ?? f.position,
    }));
  }

  async function issue(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const crew = crewOptions.find((c) => c.id === form.crew_id);
    const ship = shipOptions.find((s) => s.id === form.ship_id);

    const { error } = await supabase.from("sea_service_records").insert({
      crew_id: form.crew_id || null,
      ship_id: form.ship_id || null,
      crew_name: crew?.full_name ?? null,
      seaman_book_no: form.seaman_book_no || null,
      passport_no: form.passport_no || null,
      nationality: form.nationality || null,
      position: form.position || null,
      vessel_name: ship?.name ?? null,
      vessel_imo: ship?.imo_number ?? null,
      vessel_flag: ship?.flag ?? null,
      vessel_type: ship?.type ?? null,
      date_of_joining: form.date_of_joining || null,
      date_of_discharge: form.date_of_discharge || null,
      place_of_issue: form.place_of_issue || null,
      date_of_issue: form.date_of_issue || null,
      issued_by_name: form.issued_by_name || null,
      issued_by_title: form.issued_by_title || null,
      remarks: form.remarks || null,
    });
    setSaving(false);
    if (error) {
      alert(`Couldn't issue this sea service record: ${error.message}`);
      return;
    }
    setForm({
      crew_id: "",
      ship_id: "",
      position: "",
      seaman_book_no: "",
      passport_no: "",
      nationality: "",
      date_of_joining: "",
      date_of_discharge: "",
      place_of_issue: "",
      date_of_issue: new Date().toISOString().slice(0, 10),
      issued_by_name: "",
      issued_by_title: "",
      remarks: "",
    });
    setShowForm(false);
    load();
  }

  return (
    <AppShell>
      <div className="p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold mb-1">Sea Service</h1>
            <p className="text-sm text-ink/60">Issue and print Certificates of Sea Service for crew.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800"
          >
            {showForm ? "Cancel" : "Issue sea service"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={issue} className="panel rounded-sm p-5 mb-6 grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-ink/60 mb-1">Crew member</label>
              <select
                required
                value={form.crew_id}
                onChange={(e) => onCrewChange(e.target.value)}
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
              <label className="block text-xs text-ink/60 mb-1">Ship</label>
              <select
                required
                value={form.ship_id}
                onChange={(e) => setForm({ ...form, ship_id: e.target.value })}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              >
                <option value="">Select…</option>
                {shipOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Position / Rank" value={form.position} onChange={(v) => setForm({ ...form, position: v })} required />
            <Field label="Seaman's Book No." value={form.seaman_book_no} onChange={(v) => setForm({ ...form, seaman_book_no: v })} />
            <Field label="Passport No." value={form.passport_no} onChange={(v) => setForm({ ...form, passport_no: v })} />
            <Field label="Nationality" value={form.nationality} onChange={(v) => setForm({ ...form, nationality: v })} />
            <Field label="Date of joining (sign-on)" value={form.date_of_joining} onChange={(v) => setForm({ ...form, date_of_joining: v })} type="date" required />
            <Field label="Date of discharge (sign-off)" value={form.date_of_discharge} onChange={(v) => setForm({ ...form, date_of_discharge: v })} type="date" />
            <Field label="Place of issue" value={form.place_of_issue} onChange={(v) => setForm({ ...form, place_of_issue: v })} />
            <Field label="Date of issue" value={form.date_of_issue} onChange={(v) => setForm({ ...form, date_of_issue: v })} type="date" required />
            <Field label="Issued by (name)" value={form.issued_by_name} onChange={(v) => setForm({ ...form, issued_by_name: v })} placeholder="Company signatory" />
            <Field label="Issued by (title)" value={form.issued_by_title} onChange={(v) => setForm({ ...form, issued_by_title: v })} placeholder="e.g. Fleet Manager" />
            <div className="col-span-3">
              <label className="block text-xs text-ink/60 mb-1">Remarks (optional)</label>
              <textarea
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                rows={2}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              />
            </div>
            <div className="col-span-3">
              <button disabled={saving} className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800 disabled:opacity-60">
                {saving ? "Saving…" : "Issue certificate"}
              </button>
            </div>
          </form>
        )}

        <div className="panel rounded-sm">
          <table className="log-table w-full">
            <thead>
              <tr>
                <th>Crew member</th>
                <th>Position</th>
                <th>Vessel</th>
                <th>Joined</th>
                <th>Discharged</th>
                <th>Issued</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td className="font-medium">{r.crew_name ?? "—"}</td>
                  <td className="text-ink/60">{r.position ?? "—"}</td>
                  <td className="text-ink/60">{r.vessel_name ?? "—"}</td>
                  <td className="text-ink/60">{r.date_of_joining ?? "—"}</td>
                  <td className="text-ink/60">{r.date_of_discharge ?? "Still serving"}</td>
                  <td className="text-ink/60">{r.date_of_issue ?? "—"}</td>
                  <td>
                    <Link href={`/sea-service/${r.id}`} className="text-xs text-harbor-700 hover:underline">
                      View / Print
                    </Link>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-ink/50 py-8">
                    No sea service certificates issued yet.
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
