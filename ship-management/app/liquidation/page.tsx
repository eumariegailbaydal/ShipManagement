"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";

type Liquidation = {
  id: string;
  crew_id: string;
  ship_id: string | null;
  received_amount: number;
  received_date: string;
  previous_balance: number;
  purpose: string | null;
  status: string;
  total_expenses: number;
  balance: number;
  crew: { full_name: string } | null;
  ships: { name: string } | null;
};

type Expense = {
  id: string;
  liquidation_id: string;
  expense_date: string;
  category: string | null;
  description: string | null;
  amount: number;
  receipt_url: string | null;
};

type CrewOption = { id: string; full_name: string };
type ShipOption = { id: string; name: string };

const CATEGORIES = ["Fuel", "Provisions / Food", "Repairs & Maintenance", "Port Fees & Dues", "Transportation", "Communication", "Medical", "Miscellaneous"];

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function LiquidationPage() {
  const supabase = createClient();
  const [liquidations, setLiquidations] = useState<Liquidation[]>([]);
  const [crewOptions, setCrewOptions] = useState<CrewOption[]>([]);
  const [shipOptions, setShipOptions] = useState<ShipOption[]>([]);
  const [expenses, setExpenses] = useState<Record<string, Expense[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [newForm, setNewForm] = useState({
    crew_id: "",
    ship_id: "",
    received_amount: "",
    received_date: new Date().toISOString().slice(0, 10),
    previous_balance: "0",
    purpose: "",
  });

  const [expenseForm, setExpenseForm] = useState({
    expense_date: new Date().toISOString().slice(0, 10),
    category: CATEGORIES[0],
    description: "",
    amount: "",
    receiptFile: null as File | null,
  });

  async function load() {
    const { data } = await supabase
      .from("liquidation_summary")
      .select("*, crew(full_name), ships(name)")
      .order("received_date", { ascending: false });
    setLiquidations((data as any) ?? []);

    const { data: crewData } = await supabase.from("crew").select("id, full_name").order("full_name");
    setCrewOptions(crewData ?? []);

    const { data: shipData } = await supabase.from("ships").select("id, name").order("name");
    setShipOptions(shipData ?? []);
  }

  async function loadExpenses(liquidationId: string) {
    const { data } = await supabase
      .from("liquidation_expenses")
      .select("*")
      .eq("liquidation_id", liquidationId)
      .order("expense_date", { ascending: true });
    setExpenses((prev) => ({ ...prev, [liquidationId]: (data as any) ?? [] }));
  }

  useEffect(() => {
    load();
  }, []);

  async function onCrewChangeForNewForm(crewId: string) {
    setNewForm((f) => ({ ...f, crew_id: crewId }));
    if (!crewId) return;
    const { data } = await supabase
      .from("liquidation_summary")
      .select("balance")
      .eq("crew_id", crewId)
      .order("received_date", { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      setNewForm((f) => ({ ...f, previous_balance: String((data[0] as any).balance ?? 0) }));
    }
  }

  async function addLiquidation(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("liquidations").insert({
      crew_id: newForm.crew_id,
      ship_id: newForm.ship_id || null,
      received_amount: Number(newForm.received_amount) || 0,
      received_date: newForm.received_date,
      previous_balance: Number(newForm.previous_balance) || 0,
      purpose: newForm.purpose || null,
    });
    if (error) {
      alert(`Couldn't save this liquidation: ${error.message}`);
      return;
    }
    setNewForm({ crew_id: "", ship_id: "", received_amount: "", received_date: new Date().toISOString().slice(0, 10), previous_balance: "0", purpose: "" });
    setShowNewForm(false);
    load();
  }

  async function addExpense(liquidationId: string, e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    let receiptUrl: string | null = null;

    if (expenseForm.receiptFile) {
      const path = `receipts/${liquidationId}/${Date.now()}_${expenseForm.receiptFile.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, expenseForm.receiptFile);
      if (uploadError) {
        alert(`Couldn't upload receipt: ${uploadError.message}`);
        setUploading(false);
        return;
      }
      receiptUrl = path;
    }

    const { error } = await supabase.from("liquidation_expenses").insert({
      liquidation_id: liquidationId,
      expense_date: expenseForm.expense_date,
      category: expenseForm.category,
      description: expenseForm.description || null,
      amount: Number(expenseForm.amount) || 0,
      receipt_url: receiptUrl,
    });
    setUploading(false);
    if (error) {
      alert(`Couldn't save this expense: ${error.message}`);
      return;
    }
    setExpenseForm({ expense_date: new Date().toISOString().slice(0, 10), category: CATEGORIES[0], description: "", amount: "", receiptFile: null });
    loadExpenses(liquidationId);
    load();
  }

  async function getReceiptLink(path: string) {
    const { data } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 5);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  function toggleExpand(l: Liquidation) {
    if (expanded === l.id) {
      setExpanded(null);
    } else {
      setExpanded(l.id);
      if (!expenses[l.id]) loadExpenses(l.id);
    }
  }

  function downloadCsv(l: Liquidation) {
    const rows = expenses[l.id] ?? [];
    const lines = [
      ["Liquidation Report"],
      ["Crew Member", l.crew?.full_name ?? ""],
      ["Ship", l.ships?.name ?? ""],
      ["Purpose", l.purpose ?? ""],
      ["Received Date", l.received_date],
      ["Previous Balance", money(l.previous_balance)],
      ["Received Amount", money(l.received_amount)],
      [],
      ["Date", "Category", "Description", "Amount", "Receipt"],
      ...rows.map((r) => [r.expense_date, r.category ?? "", r.description ?? "", money(r.amount), r.receipt_url ? "Yes" : "No"]),
      [],
      ["Total Expenses", money(l.total_expenses)],
      ["Balance (carried forward)", money(l.balance)],
    ];
    const csv = lines.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liquidation_${(l.crew?.full_name ?? "crew").replace(/\s+/g, "_")}_${l.received_date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <div className="p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold mb-1">Liquidation</h1>
            <p className="text-sm text-ink/60">Cash received, itemized expenses with receipts, and running balance per crew member.</p>
          </div>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800"
          >
            {showNewForm ? "Cancel" : "Record money received"}
          </button>
        </div>

        {showNewForm && (
          <form onSubmit={addLiquidation} className="panel rounded-sm p-5 mb-6 grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-ink/60 mb-1">Crew member</label>
              <select
                required
                value={newForm.crew_id}
                onChange={(e) => onCrewChangeForNewForm(e.target.value)}
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
              <label className="block text-xs text-ink/60 mb-1">Ship (optional)</label>
              <select
                value={newForm.ship_id}
                onChange={(e) => setNewForm({ ...newForm, ship_id: e.target.value })}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              >
                <option value="">—</option>
                {shipOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Purpose" value={newForm.purpose} onChange={(v) => setNewForm({ ...newForm, purpose: v })} placeholder="e.g. Port disbursement, provisions" />
            <Field label="Amount received" value={newForm.received_amount} onChange={(v) => setNewForm({ ...newForm, received_amount: v })} type="number" required />
            <Field label="Date received" value={newForm.received_date} onChange={(v) => setNewForm({ ...newForm, received_date: v })} type="date" required />
            <div>
              <label className="block text-xs text-ink/60 mb-1">Previous balance</label>
              <input
                type="number"
                value={newForm.previous_balance}
                onChange={(e) => setNewForm({ ...newForm, previous_balance: e.target.value })}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              />
              <p className="text-xs text-ink/40 mt-1">Auto-filled from their last balance — adjust if needed.</p>
            </div>
            <div className="col-span-3">
              <button className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800">
                Save
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {liquidations.map((l) => (
            <div key={l.id} className="panel rounded-sm overflow-hidden">
              <button
                onClick={() => toggleExpand(l)}
                className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-paper/50"
              >
                <div>
                  <p className="text-sm font-medium">{l.crew?.full_name ?? "—"}</p>
                  <p className="text-xs text-ink/50 mt-0.5">
                    {l.ships?.name ? `${l.ships.name} · ` : ""}
                    {l.purpose || "No purpose noted"} · Received {l.received_date}
                  </p>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-xs text-ink/40">Received</p>
                    <p className="text-sm data-label">{money(l.received_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink/40">Expenses</p>
                    <p className="text-sm data-label">{money(l.total_expenses)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink/40">Balance</p>
                    <p className={`text-sm data-label font-semibold ${l.balance < 0 ? "text-signal-bad" : "text-signal-ok"}`}>
                      {money(l.balance)}
                    </p>
                  </div>
                </div>
              </button>

              {expanded === l.id && (
                <div className="border-t border-ink/10 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">Expenses</h3>
                    <button onClick={() => downloadCsv(l)} className="text-xs text-harbor-700 hover:underline">
                      Download spreadsheet (.csv)
                    </button>
                  </div>

                  <table className="log-table w-full mb-4">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(expenses[l.id] ?? []).map((ex) => (
                        <tr key={ex.id}>
                          <td className="text-ink/60">{ex.expense_date}</td>
                          <td className="text-ink/60">{ex.category ?? "—"}</td>
                          <td className="text-ink/60">{ex.description ?? "—"}</td>
                          <td className="data-label">{money(ex.amount)}</td>
                          <td>
                            {ex.receipt_url ? (
                              <button onClick={() => getReceiptLink(ex.receipt_url!)} className="text-xs text-harbor-700 hover:underline">
                                View
                              </button>
                            ) : (
                              <span className="text-xs text-ink/30">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(expenses[l.id] ?? []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center text-ink/50 py-6">
                            No expenses logged yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <form onSubmit={(e) => addExpense(l.id, e)} className="grid grid-cols-5 gap-3 items-end bg-paper/60 p-4 rounded-sm border border-ink/10">
                    <div>
                      <label className="block text-xs text-ink/60 mb-1">Date</label>
                      <input
                        type="date"
                        required
                        value={expenseForm.expense_date}
                        onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                        className="w-full border border-ink/20 rounded-sm px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ink/60 mb-1">Category</label>
                      <select
                        value={expenseForm.category}
                        onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                        className="w-full border border-ink/20 rounded-sm px-2 py-1.5 text-sm"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-ink/60 mb-1">Description</label>
                      <input
                        value={expenseForm.description}
                        onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                        className="w-full border border-ink/20 rounded-sm px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ink/60 mb-1">Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                        className="w-full border border-ink/20 rounded-sm px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ink/60 mb-1">Receipt</label>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setExpenseForm({ ...expenseForm, receiptFile: e.target.files?.[0] ?? null })}
                        className="w-full text-xs"
                      />
                    </div>
                    <div className="col-span-5">
                      <button
                        disabled={uploading}
                        className="bg-harbor-900 text-paper text-sm px-4 py-1.5 rounded-sm hover:bg-harbor-800 disabled:opacity-60"
                      >
                        {uploading ? "Saving…" : "Add expense"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ))}
          {liquidations.length === 0 && (
            <div className="panel rounded-sm p-8 text-center text-ink/50 text-sm">
              No liquidation records yet — click "Record money received" above to start one.
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
