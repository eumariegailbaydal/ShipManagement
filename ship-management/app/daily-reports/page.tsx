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
