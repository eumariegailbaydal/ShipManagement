"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";

type LiquidationRow = {
  id: string;
  received_amount: number;
  received_date: string;
  crew_id: string;
  ship_id: string | null;
  crew: { full_name: string } | null;
  ships: { name: string } | null;
};

type ExpenseRow = {
  id: string;
  liquidation_id: string;
  amount: number;
  expense_date: string;
  category: string | null;
};

type MonthSummary = {
  month: string; // "YYYY-MM"
  received: number;
  expenses: number;
  balance: number;
  byCategory: Record<string, number>;
  byCrew: Record<string, { name: string; received: number; expenses: number }>;
};

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { year: "numeric", month: "long" });
}

function monthShort(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: "short" });
}

function StatementChart({ months }: { months: MonthSummary[] }) {
  // Chronological (oldest → newest), last 12 months max
  const data = [...months].sort((a, b) => (a.month < b.month ? -1 : 1)).slice(-12);
  if (data.length === 0) return null;

  const W = 900;
  const H = 260;
  const padL = 50;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxVal = Math.max(1, ...data.map((m) => Math.max(m.received, m.expenses)));
  const groupW = chartW / data.length;
  const barW = Math.min(22, groupW * 0.32);

  function yFor(v: number) {
    return padT + chartH - (v / maxVal) * chartH;
  }

  const gridLines = 4;

  return (
    <div className="panel rounded-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium">Received vs. Expenses — Last {data.length} Month{data.length === 1 ? "" : "s"}</p>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#0B1F3A" }}></span> Received
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: "#B3272C" }}></span> Expenses
          </span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* Gridlines */}
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const v = (maxVal / gridLines) * i;
          const y = yFor(v);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#E5E3DC" strokeWidth={1} />
              <text x={padL - 8} y={y + 3} fontSize={9} fill="#8A8A82" textAnchor="end">
                {v >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v)}
              </text>
            </g>
          );
        })}
        {/* Bars */}
        {data.map((m, i) => {
          const groupX = padL + i * groupW;
          const centerX = groupX + groupW / 2;
          const recvH = chartH - (yFor(m.received) - padT);
          const expH = chartH - (yFor(m.expenses) - padT);
          return (
            <g key={m.month}>
              <rect x={centerX - barW - 2} y={yFor(m.received)} width={barW} height={recvH} fill="#0B1F3A" rx={2} />
              <rect x={centerX + 2} y={yFor(m.expenses)} width={barW} height={expH} fill="#B3272C" rx={2} />
              <text x={centerX} y={H - padB + 16} fontSize={10} fill="#5B6B75" textAnchor="middle">
                {monthShort(m.month)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function LiquidationStatementPage() {
  const supabase = createClient();
  const [months, setMonths] = useState<MonthSummary[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: liquidations } = await supabase
        .from("liquidations")
        .select("id, received_amount, received_date, crew_id, ship_id, crew(full_name), ships(name)");
      const { data: expenses } = await supabase
        .from("liquidation_expenses")
        .select("id, liquidation_id, amount, expense_date, category");

      const liqById = new Map<string, LiquidationRow>();
      (liquidations as any[] ?? []).forEach((l) => liqById.set(l.id, l));

      const map = new Map<string, MonthSummary>();

      function getMonth(ym: string): MonthSummary {
        if (!map.has(ym)) {
          map.set(ym, { month: ym, received: 0, expenses: 0, balance: 0, byCategory: {}, byCrew: {} });
        }
        return map.get(ym)!;
      }

      (liquidations as any[] ?? []).forEach((l: LiquidationRow) => {
        const ym = l.received_date?.slice(0, 7);
        if (!ym) return;
        const m = getMonth(ym);
        m.received += Number(l.received_amount) || 0;
        const crewName = l.crew?.full_name ?? "Unknown";
        if (!m.byCrew[l.crew_id]) m.byCrew[l.crew_id] = { name: crewName, received: 0, expenses: 0 };
        m.byCrew[l.crew_id].received += Number(l.received_amount) || 0;
      });

      (expenses as ExpenseRow[] ?? []).forEach((e) => {
        const ym = e.expense_date?.slice(0, 7);
        if (!ym) return;
        const m = getMonth(ym);
        const amt = Number(e.amount) || 0;
        m.expenses += amt;
        const cat = e.category ?? "Uncategorized";
        m.byCategory[cat] = (m.byCategory[cat] ?? 0) + amt;
        
        const liq = liqById.get(e.liquidation_id);
        if (liq) {
          const crewName = liq.crew?.full_name ?? "Unknown";
          if (!m.byCrew[liq.crew_id]) m.byCrew[liq.crew_id] = { name: crewName, received: 0, expenses: 0 };
          m.byCrew[liq.crew_id].expenses += amt;
        }
      });

      const result = Array.from(map.values())
        .map((m) => ({ ...m, balance: m.received - m.expenses }))
        .sort((a, b) => (a.month < b.month ? 1 : -1));

      setMonths(result);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function downloadCsv(m: MonthSummary) {
    const lines = [
      [`Financial Statement — ${monthLabel(m.month)}`],
      [],
      ["Received", money(m.received)],
      ["Expenses", money(m.expenses)],
      ["Balance", money(m.balance)],
      [],
      ["By Category", ""],
      ...Object.entries(m.byCategory).map(([cat, amt]) => [cat, money(amt)]),
      [],
      ["By Crew Member", "Received", "Expenses"],
      ...Object.values(m.byCrew).map((c) => [c.name, money(c.received), money(c.expenses)]),
    ];
    const csv = lines.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial_statement_${m.month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <div className="p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold mb-1">Monthly Financial Statement</h1>
            <p className="text-sm text-ink/60">Received, expenses, and balance rolled up by month, across all liquidations.</p>
          </div>
          <Link href="/liquidation" className="text-xs text-harbor-700 hover:underline">
            ← Back to Liquidation
          </Link>
        </div>

        <StatementChart months={months} />

        <div className="space-y-3">
          {months.map((m) => (
            <div key={m.month} className="panel rounded-sm overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === m.month ? null : m.month)}
                className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-paper/50"
              >
                <p className="text-sm font-medium">{monthLabel(m.month)}</p>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-xs text-ink/40">Received</p>
                    <p className="text-sm data-label">{money(m.received)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink/40">Expenses</p>
                    <p className="text-sm data-label">{money(m.expenses)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink/40">Balance</p>
                    <p className={`text-sm data-label font-semibold ${m.balance < 0 ? "text-signal-bad" : "text-signal-ok"}`}>
                      {money(m.balance)}
                    </p>
                  </div>
                </div>
              </button>

              {expanded === m.month && (
                <div className="border-t border-ink/10 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">Breakdown</h3>
                    <button onClick={() => downloadCsv(m)} className="text-xs text-harbor-700 hover:underline">
                      Download statement (.csv)
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-ink/40 mb-2 uppercase tracking-wide">By Category</p>
                      <table className="log-table w-full">
                        <tbody>
                          {Object.entries(m.byCategory)
                            .sort((a, b) => b[1] - a[1])
                            .map(([cat, amt]) => (
                              <tr key={cat}>
                                <td>{cat}</td>
                                <td className="text-right data-label">{money(amt)}</td>
                              </tr>
                            ))}
                          {Object.keys(m.byCategory).length === 0 && (
                            <tr>
                              <td className="text-center text-ink/50 py-4">No expenses this month.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <p className="text-xs text-ink/40 mb-2 uppercase tracking-wide">By Crew Member</p>
                      <table className="log-table w-full">
                        <thead>
                          <tr>
                            <th>Crew</th>
                            <th>Received</th>
                            <th>Expenses</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.values(m.byCrew).map((c) => (
                            <tr key={c.name}>
                              <td>{c.name}</td>
                              <td className="data-label">{money(c.received)}</td>
                              <td className="data-label">{money(c.expenses)}</td>
                            </tr>
                          ))}
                          {Object.keys(m.byCrew).length === 0 && (
                            <tr>
                              <td colSpan={3} className="text-center text-ink/50 py-4">
                                No activity this month.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!loading && months.length === 0 && (
            <div className="panel rounded-sm p-8 text-center text-ink/50 text-sm">
              No liquidation activity recorded yet.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
