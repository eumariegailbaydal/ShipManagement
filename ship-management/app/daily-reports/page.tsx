"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";

type DailyReport = {
  id: string;
  ship_id: string;
  report_date: string;
  master_name: string | null;
  status: string | null;
  location: string | null;
  remarks: string | null;
  ships: { name: string } | null;
};

type ConsumableLine = {
  id: string;
  consumable_type: string;
  quantity_consumed: number;
  unit: string;
  rob: number | null;
  daily_limit: number | null;
  over_limit: boolean;
};

type ShipOption = { id: string; name: string };
type LimitRow = { id: string; ship_id: string; consumable_type: string; daily_limit: number; unit: string; ships: { name: string } | null };

const COMMON_TYPES = ["Main Engine Fuel", "Auxiliary Engine Fuel", "Fresh Water", "Lube Oil", "Provisions"];

export default function DailyReportsPage() {
  const supabase = createClient();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [ships, setShips] = useState<ShipOption[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [linesByReport, setLinesByReport] = useState<Record<string, ConsumableLine[]>>({});

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    ship_id: "",
    report_date: new Date().toISOString().slice(0, 10),
    master_name: "",
    status: "",
    location: "",
    remarks: "",
  });
  const [lines, setLines] = useState([{ consumable_type: "Main Engine Fuel", quantity_consumed: "", unit: "L", rob: "" }]);
  const [saving, setSaving] = useState(false);

  const [showLimits, setShowLimits] = useState(false);
  const [limits, setLimits] = useState<LimitRow[]>([]);
  const [limitForm, setLimitForm] = useState({ ship_id: "", consumable_type: "Main Engine Fuel", daily_limit: "", unit: "L" });

  async function load() {
    const { data } = await supabase
      .from("daily_reports")
      .select("*, ships(name)")
      .order("report_date", { ascending: false });
    setReports((data as any) ?? []);

    const { data: shipData } = await supabase.from("ships").select("id, name").order("name");
    setShips(shipData ?? []);

    const { data: limitData } = await supabase.from("consumable_limits").select("*, ships(name)").order("consumable_type");
    setLimits((limitData as any) ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function loadLines(reportId: string) {
    const { data } = await supabase
      .from("daily_report_consumables_flagged")
      .select("*")
      .eq("daily_report_id", reportId);
    setLinesByReport((prev) => ({ ...prev, [reportId]: (data as any) ?? [] }));
  }

  function toggleExpand(id: string) {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      if (!linesByReport[id]) loadLines(id);
    }
  }

  function addLine() {
    setLines([...lines, { consumable_type: "Fresh Water", quantity_consumed: "", unit: "L", rob: "" }]);
  }
  function removeLine(i: number) {
    setLines(lines.filter((_, idx) => idx !== i));
  }
  function updateLine(i: number, field: string, value: string) {
    setLines(lines.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { data: report, error } = await supabase
      .from("daily_reports")
      .insert({
        ship_id: form.ship_id,
        report_date: form.report_date,
        master_name: form.master_name || null,
        status: form.status || null,
        location: form.location || null,
        remarks: form.remarks || null,
      })
      .select()
      .single();

    if (error) {
      alert(`Couldn't save this report: ${error.message}`);
      setSaving(false);
      return;
    }

    const validLines = lines.filter((l) => l.quantity_consumed !== "");
    if (validLines.length > 0) {
      const { error: linesError } = await supabase.from("daily_report_consumables").insert(
        validLines.map((l) => ({
          daily_report_id: report.id,
          consumable_type: l.consumable_type,
          quantity_consumed: Number(l.quantity_consumed),
          unit: l.unit,
          rob: l.rob ? Number(l.rob) : null,
        }))
      );
      if (linesError) {
        alert(`Report saved, but couldn't save consumables: ${linesError.message}`);
      }
    }

    setSaving(false);
    setForm({ ship_id: "", report_date: new Date().toISOString().slice(0, 10), master_name: "", status: "", location: "", remarks: "" });
    setLines([{ consumable_type: "Main Engine Fuel", quantity_consumed: "", unit: "L", rob: "" }]);
    setShowForm(false);
    load();
  }

  async function addLimit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("consumable_limits").upsert(
      {
        ship_id: limitForm.ship_id,
        consumable_type: limitForm.consumable_type,
        daily_limit: Number(limitForm.daily_limit),
        unit: limitForm.unit,
      },
      { onConflict: "ship_id,consumable_type" }
    );
    if (error) {
      alert(`Couldn't save this limit: ${error.message}`);
      return;
    }
    setLimitForm({ ship_id: "", consumable_type: "Main Engine Fuel", daily_limit: "", unit: "L" });
    load();
  }

  return (
    <AppShell>
      <div className="p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold mb-1">Daily Report</h1>
            <p className="text-sm text-ink/60">Master's daily consumption log, flagged automatically against your set limits.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowLimits(!showLimits)} className="border border-ink/20 text-sm px-4 py-2 rounded-sm hover:bg-ink/5">
              {showLimits ? "Close limits" : "Manage limits"}
            </button>
            <button onClick={() => setShowForm(!showForm)} className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800">
              {showForm ? "Cancel" : "New daily report"}
            </button>
          </div>
        </div>

        {showLimits && (
          <div className="panel rounded-sm p-5 mb-6">
            <h2 className="text-sm font-medium mb-3">Daily consumable limits per ship</h2>
            <form onSubmit={addLimit} className="grid grid-cols-4 gap-3 mb-4">
              <select
                required
                value={limitForm.ship_id}
                onChange={(e) => setLimitForm({ ...limitForm, ship_id: e.target.value })}
                className="border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              >
                <option value="">Ship…</option>
                {ships.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                required
                list="consumable-types"
                value={limitForm.consumable_type}
                onChange={(e) => setLimitForm({ ...limitForm, consumable_type: e.target.value })}
                placeholder="Consumable type"
                className="border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              />
              <input
                required
                type="number"
                value={limitForm.daily_limit}
                onChange={(e) => setLimitForm({ ...limitForm, daily_limit: e.target.value })}
                placeholder="Daily limit"
                className="border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              />
              <div className="flex gap-2">
                <input
                  value={limitForm.unit}
                  onChange={(e) => setLimitForm({ ...limitForm, unit: e.target.value })}
                  placeholder="Unit (L, MT…)"
                  className="w-20 border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
                />
                <button className="bg-harbor-900 text-paper text-sm px-3 py-1.5 rounded-sm hover:bg-harbor-800 whitespace-nowrap">
                  Set limit
                </button>
              </div>
            </form>
            <table className="log-table w-full">
              <thead>
                <tr>
                  <th>Ship</th>
                  <th>Consumable</th>
                  <th>Daily limit</th>
                </tr>
              </thead>
              <tbody>
                {limits.map((l) => (
                  <tr key={l.id}>
                    <td>{l.ships?.name ?? "—"}</td>
                    <td className="text-ink/60">{l.consumable_type}</td>
                    <td className="text-ink/60">
                      {l.daily_limit} {l.unit}
                    </td>
                  </tr>
                ))}
                {limits.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-ink/50 py-4">
                      No limits set yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {showForm && (
          <form onSubmit={submitReport} className="panel rounded-sm p-5 mb-6">
            <div className="grid grid-cols-4 gap-4 mb-4">
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
              <Field label="Date" value={form.report_date} onChange={(v) => setForm({ ...form, report_date: v })} type="date" required />
              <Field label="Master" value={form.master_name} onChange={(v) => setForm({ ...form, master_name: v })} />
              <Field label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} placeholder="e.g. Mining, Underway" />
              <Field label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
            </div>

            <h3 className="text-sm font-medium mb-2 mt-4">Consumables used today</h3>
            <datalist id="consumable-types">
              {COMMON_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <div className="space-y-2 mb-3">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 items-center">
                  <input
                    list="consumable-types"
                    value={l.consumable_type}
                    onChange={(e) => updateLine(i, "consumable_type", e.target.value)}
                    className="border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Quantity consumed"
                    value={l.quantity_consumed}
                    onChange={(e) => updateLine(i, "quantity_consumed", e.target.value)}
                    className="border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Unit"
                    value={l.unit}
                    onChange={(e) => updateLine(i, "unit", e.target.value)}
                    className="border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="ROB (optional)"
                    value={l.rob}
                    onChange={(e) => updateLine(i, "rob", e.target.value)}
                    className="border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
                  />
                  <button type="button" onClick={() => removeLine(i)} className="text-xs text-ink/40 hover:text-signal-bad text-left">
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addLine} className="text-xs text-harbor-700 hover:underline mb-4">
              + Add another consumable
            </button>

            <div>
              <label className="block text-xs text-ink/60 mb-1">Remarks</label>
              <textarea
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                rows={2}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm mb-4"
              />
            </div>

            <button disabled={saving} className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800 disabled:opacity-60">
              {saving ? "Saving…" : "Submit daily report"}
            </button>
          </form>
        )}

        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="panel rounded-sm overflow-hidden">
              <button onClick={() => toggleExpand(r.id)} className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-paper/50">
                <div>
                  <p className="text-sm font-medium">
                    {r.ships?.name ?? "—"} · {r.report_date}
                  </p>
                  <p className="text-xs text-ink/50 mt-0.5">
                    {r.status || "—"} {r.location ? `· ${r.location}` : ""} {r.master_name ? `· Master: ${r.master_name}` : ""}
                  </p>
                </div>
                <span className="text-xs text-ink/40">{expanded === r.id ? "▲" : "▼"}</span>
              </button>
              {expanded === r.id && (
                <div className="border-t border-ink/10 p-4">
                  <table className="log-table w-full">
                    <thead>
                      <tr>
                        <th>Consumable</th>
                        <th>Consumed</th>
                        <th>Daily limit</th>
                        <th>ROB</th>
                        <th>Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(linesByReport[r.id] ?? []).map((l) => (
                        <tr key={l.id}>
                          <td className="font-medium">{l.consumable_type}</td>
                          <td className="text-ink/60">
                            {l.quantity_consumed} {l.unit}
                          </td>
                          <td className="text-ink/60">{l.daily_limit != null ? `${l.daily_limit} ${l.unit}` : "No limit set"}</td>
                          <td className="text-ink/60">{l.rob ?? "—"}</td>
                          <td>
                            {l.over_limit ? (
                              <span className="inline-block text-xs px-2 py-0.5 rounded-full border bg-signal-bad/10 text-signal-bad border-signal-bad/30">
                                Exceeds limit
                              </span>
                            ) : (
                              <span className="inline-block text-xs px-2 py-0.5 rounded-full border bg-signal-ok/10 text-signal-ok border-signal-ok/30">
                                Within limit
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(linesByReport[r.id] ?? []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center text-ink/50 py-6">
                            No consumables logged for this report.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {r.remarks && (
                    <div className="mt-3">
                      <p className="text-xs text-ink/40 mb-1">Remarks</p>
                      <p className="text-sm text-ink/70">{r.remarks}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {reports.length === 0 && (
            <div className="panel rounded-sm p-8 text-center text-ink/50 text-sm">
              No daily reports yet — click "New daily report" above.
            </div>
          )}
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
