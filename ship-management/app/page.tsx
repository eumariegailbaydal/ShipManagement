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
  contact_id: string | null;
  ships: { name: string } | null;
};

type ShipOption = { id: string; name: string };
type ContactOption = { id: string; name: string; email: string | null; phone: string | null };

const STATUSES = ["open", "in_progress", "completed", "verified"];

export default function WorkOrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [ships, setShips] = useState<ShipOption[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ship_id: "", description: "", assigned_to: "", contact_id: "" });
  const [notifying, setNotifying] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("work_orders")
      .select("*, ships(name)")
      .order("created_at", { ascending: false });
    setOrders((data as any) ?? []);

    const { data: shipData } = await supabase.from("ships").select("id, name").order("name");
    setShips(shipData ?? []);

    const { data: contactData } = await supabase.from("contacts").select("id, name, email, phone").order("name");
    setContacts(contactData ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addOrder(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("work_orders").insert({
      ship_id: form.ship_id,
      description: form.description,
      assigned_to: form.assigned_to || null,
      contact_id: form.contact_id || null,
      status: "open",
    });
    if (error) {
      alert(`Couldn't create this work order: ${error.message}`);
      return;
    }
    setForm({ ship_id: "", description: "", assigned_to: "", contact_id: "" });
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

  async function setOrderContact(id: string, contactId: string) {
    await supabase.from("work_orders").update({ contact_id: contactId || null }).eq("id", id);
    load();
  }

  async function sendEmail(order: WorkOrder) {
    if (!order.contact_id) {
      alert("Tag a contact from your Directory to this work order first.");
      return;
    }
    const contact = contacts.find((c) => c.id === order.contact_id);
    if (!contact?.email) {
      alert("This contact doesn't have an email address on file in your Directory.");
      return;
    }
    setNotifying(order.id);
    const { data, error } = await supabase.functions.invoke("notify-work-order", {
      body: { work_order_id: order.id, contact_id: order.contact_id, channel: "email" },
    });
    setNotifying(null);

    if (error) {
      let detail = error.message;
      try {
        const body = await error.context.json();
        if (body?.error) detail = body.error;
      } catch {
        // context wasn't JSON; fall back to the generic message
      }
      alert(`Couldn't send: ${detail}`);
      return;
    }
    if (data?.success === false) {
      alert(`Couldn't send: ${data.error}`);
      return;
    }
    alert(`Email sent to ${contact.name}.`);
  }

  async function sendSms(order: WorkOrder) {
    if (!order.contact_id) {
      alert("Tag a contact from your Directory to this work order first.");
      return;
    }
    setNotifying(order.id);
    const { data, error } = await supabase.functions.invoke("notify-work-order", {
      body: { work_order_id: order.id, contact_id: order.contact_id, channel: "sms" },
    });
    setNotifying(null);
    if (error) {
      let detail = error.message;
      try {
        const body = await error.context.json();
        if (body?.error) detail = body.error;
      } catch {}
      alert(`Couldn't send: ${detail}`);
      return;
    }
    if (data?.success === false) {
      alert(`Couldn't send: ${data.error}`);
      return;
    }
    alert("SMS sent.");
  }

  return (
    <AppShell>
      <div className="p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold mb-1">Work orders</h1>
            <p className="text-sm text-ink/60">Open → In progress → Completed → Verified. Tag a vendor from your Directory to reach out directly.</p>
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
            <div>
              <label className="block text-xs text-ink/60 mb-1">Vendor / contact (from Directory)</label>
              <select
                value={form.contact_id}
                onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              >
                <option value="">— None —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
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
                <th>Vendor / Contact</th>
                <th>Status</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="font-medium">{o.ships?.name ?? "—"}</td>
                  <td className="text-ink/60">{o.description ?? "—"}</td>
                  <td className="text-ink/60">{o.assigned_to ?? "—"}</td>
                  <td>
                    <select
                      value={o.contact_id ?? ""}
                      onChange={(e) => setOrderContact(o.id, e.target.value)}
                      className="text-xs border border-ink/15 rounded-sm px-1.5 py-1 bg-transparent"
                    >
                      <option value="">— None —</option>
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
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
                  <td>
                    <div className="flex items-center gap-3">
                      <button
                        disabled={notifying === o.id}
                        onClick={() => sendEmail(o)}
                        className="text-xs text-harbor-700 hover:underline disabled:opacity-50"
                      >
                        {notifying === o.id ? "Sending…" : "Email Vendor"}
                      </button>
                      <button
                        disabled={notifying === o.id}
                        onClick={() => sendSms(o)}
                        className="text-xs text-harbor-700 hover:underline disabled:opacity-50"
                      >
                        SMS
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-ink/50 py-8">
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
