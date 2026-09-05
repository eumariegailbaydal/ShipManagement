"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";

type Task = {
  id: string;
  equipment_name: string | null;
  task_description: string | null;
  frequency_type: string | null;
  frequency_value: number | null;
  last_done_date: string | null;
  next_due_date: string | null;
  ships: { name: string } | null;
};

type ShipOption = { id: string; name: string };

export default function MaintenancePage() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ships, setShips] = useState<ShipOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    ship_id: "",
    equipment_name: "",
    task_description: "",
    frequency_type: "calendar",
    frequency_value: "",
    next_due_date: "",
  });

  async function load() {
    const { data } = await supabase
      .from("maintenance_tasks")
      .select("*, ships(name)")
      .order("next_due_date", { ascending: true, nullsFirst: false });
    setTasks((data as any) ?? []);

    const { data: shipData } = await supabase.from("ships").select("id, name").order("name");
    setShips(shipData ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    await supabase.from("maintenance_tasks").insert({
      ship_id: form.ship_id,
      equipment_name: form.equipment_name || null,
      task_description: form.task_description || null,
      frequency_type: form.frequency_type,
      frequency_value: form.frequency_value ? Number(form.frequency_value) : null,
      next_due_date: form.next_due_date || null,
    });
    setForm({ ship_id: "", equipment_name: "", task_description: "", frequency_type: "calendar", frequency_value: "", next_due_date: "" });
    setShowForm(false);
    load();
  }

  async function createWorkOrder(task: Task, shipId: string) {
    await supabase.from("work_orders").insert({
      ship_id: shipId,
      task_id: task.id,
      description: task.task_description ?? task.equipment_name,
      status: "open",
    });
    alert("Work order created — check the Work Orders page.");
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <AppShell>
      <div className="p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold mb-1">Maintenance schedule</h1>
            <p className="text-sm text-ink/60">Planned upkeep, by ship and equipment.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800"
          >
            {showForm ? "Cancel" : "Add task"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={addTask} className="panel rounded-sm p-5 mb-6 grid grid-cols-3 gap-4">
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
            <Field label="Equipment" value={form.equipment_name} onChange={(v) => setForm({ ...form, equipment_name: v })} placeholder="e.g. Main engine" />
            <Field label="Task" value={form.task_description} onChange={(v) => setForm({ ...form, task_description: v })} placeholder="e.g. Oil change" />
            <div>
              <label className="block text-xs text-ink/60 mb-1">Frequency type</label>
              <select
                value={form.frequency_type}
                onChange={(e) => setForm({ ...form, frequency_type: e.target.value })}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              >
                <option value="calendar">Calendar (days)</option>
                <option value="hours">Running hours</option>
              </select>
            </div>
            <Field label="Frequency value" value={form.frequency_value} onChange={(v) => setForm({ ...form, frequency_value: v })} type="number" />
            <Field label="Next due date" value={form.next_due_date} onChange={(v) => setForm({ ...form, next_due_date: v })} type="date" />
            <div className="col-span-3">
              <button className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800">
                Save task
              </button>
            </div>
          </form>
        )}

        <div className="panel rounded-sm">
          <table className="log-table w-full">
            <thead>
              <tr>
                <th>Ship</th>
                <th>Equipment</th>
                <th>Task</th>
                <th>Next due</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const overdue = t.next_due_date && t.next_due_date < today;
                return (
                  <tr key={t.id}>
                    <td className="font-medium">{t.ships?.name ?? "—"}</td>
                    <td className="text-ink/60">{t.equipment_name ?? "—"}</td>
                    <td className="text-ink/60">{t.task_description ?? "—"}</td>
                    <td className={overdue ? "text-signal-bad font-medium" : "text-ink/60"}>
                      {t.next_due_date ?? "—"}
                    </td>
                    <td>
                      <button
                        onClick={() => createWorkOrder(t, (t as any).ship_id ?? "")}
                        className="text-xs text-harbor-700 hover:underline"
                      >
                        Create work order
                      </button>
                    </td>
                  </tr>
                );
              })}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-ink/50 py-8">
                    No maintenance tasks yet — add your first one above.
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-ink/60 mb-1">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
      />
    </div>
  );
}
