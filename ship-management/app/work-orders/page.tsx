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
  photo_url: string | null;
  ships: { name: string } | null;
};

type ShipOption = { id: string; name: string };
type ContactOption = { id: string; name: string; company: string | null; email: string | null; phone: string | null };

const STATUSES = ["open", "in_progress", "completed", "verified"];

function contactLabel(c: ContactOption) {
  return c.company ? `${c.name} — ${c.company}` : c.name;
}

export default function WorkOrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [ships, setShips] = useState<ShipOption[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [vendorsByOrder, setVendorsByOrder] = useState<Record<string, string[]>>({});

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ship_id: "", description: "", assigned_to: "" });
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from("work_orders")
      .select("*, ships(name)")
      .order("created_at", { ascending: false });
    setOrders((data as any) ?? []);

    const { data: shipData } = await supabase.from("ships").select("id, name").order("name");
    setShips(shipData ?? []);

    const { data: contactData } = await supabase.from("contacts").select("id, name, company, email, phone").order("name");
    setContacts(contactData ?? []);

    const { data: linkData } = await supabase.from("work_order_contacts").select("work_order_id, contact_id");
    const map: Record<string, string[]> = {};
    (linkData ?? []).forEach((l: any) => {
      map[l.work_order_id] = map[l.work_order_id] ? [...map[l.work_order_id], l.contact_id] : [l.contact_id];
    });
    setVendorsByOrder(map);
  }

  useEffect(() => {
    load();
  }, []);

  function toggleSelectedVendor(id: string) {
    setSelectedVendors((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  async function addOrder(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    let photoUrl: string | null = null;
    if (photoFile) {
      const path = `work-order-photos/${Date.now()}_${photoFile.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, photoFile);
      if (uploadError) {
        alert(`Couldn't upload the sample photo: ${uploadError.message}`);
        setSaving(false);
        return;
      }
      photoUrl = path;
    }

    const { data: newOrder, error } = await supabase
      .from("work_orders")
      .insert({
        ship_id: form.ship_id,
        description: form.description,
        assigned_to: form.assigned_to || null,
        photo_url: photoUrl,
        status: "open",
      })
      .select()
      .single();

    if (error) {
      alert(`Couldn't create this work order: ${error.message}`);
      setSaving(false);
      return;
    }

    if (selectedVendors.length > 0) {
      await supabase.from("work_order_contacts").insert(selectedVendors.map((contact_id) => ({ work_order_id: newOrder.id, contact_id })));
    }

    setSaving(false);
    setForm({ ship_id: "", description: "", assigned_to: "" });
    setSelectedVendors([]);
    setPhotoFile(null);
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

  async function addVendorToOrder(orderId: string, contactId: string) {
    if (!contactId) return;
    await supabase.from("work_order_contacts").insert({ work_order_id: orderId, contact_id: contactId });
    setPickerFor(null);
    load();
  }

  async function removeVendorFromOrder(orderId: string, contactId: string) {
    await supabase.from("work_order_contacts").delete().eq("work_order_id", orderId).eq("contact_id", contactId);
    load();
  }

  async function viewPhoto(path: string) {
    const { data } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 5);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function sendEmail(order: WorkOrder) {
    const vendorIds = vendorsByOrder[order.id] ?? [];
    if (vendorIds.length === 0) {
      alert("Tag at least one vendor from your Directory to this work order first.");
      return;
    }
    setNotifying(order.id);
    const { data, error } = await supabase.functions.invoke("notify-work-order", {
      body: { work_order_id: order.id, contact_ids: vendorIds, channel: "email" },
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
    const sentCount = Object.keys(data.results || {}).length;
    alert(`Email sent to ${sentCount} vendor${sentCount === 1 ? "" : "s"}${order.photo_url ? " with the sample photo attached." : "."}`);
  }

  async function sendSms(order: WorkOrder) {
    const vendorIds = vendorsByOrder[order.id] ?? [];
    if (vendorIds.length === 0) {
      alert("Tag at least one vendor from your Directory to this work order first.");
      return;
    }
    setNotifying(order.id);
    const { data, error } = await supabase.functions.invoke("notify-work-order", {
      body: { work_order_id: order.id, contact_ids: vendorIds, channel: "sms" },
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
    const sentCount = Object.keys(data.results || {}).length;
    alert(`SMS sent to ${sentCount} vendor${sentCount === 1 ? "" : "s"}.`);
  }

  return (
    <AppShell>
      <div className="p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold mb-1">Work orders</h1>
            <p className="text-sm text-ink/60">Open → In progress → Completed → Verified. Tag one or more vendors from your Directory to reach out to all of them at once.</p>
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
            <div className="col-span-2">
              <label className="block text-xs text-ink/60 mb-1">Vendors / contacts (from Directory) — select as many as needed</label>
              <div className="border border-ink/20 rounded-sm p-2 max-h-32 overflow-y-auto space-y-1">
                {contacts.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm px-1 py-0.5 hover:bg-paper/60 rounded-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedVendors.includes(c.id)}
                      onChange={() => toggleSelectedVendor(c.id)}
                    />
                    {contactLabel(c)}
                  </label>
                ))}
                {contacts.length === 0 && <p className="text-xs text-ink/40 px-1">No contacts in your Directory yet.</p>}
              </div>
            </div>
            <div>
              <label className="block text-xs text-ink/60 mb-1">Sample photo (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                className="w-full text-xs"
              />
              {photoFile && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={URL.createObjectURL(photoFile)} alt="" className="mt-2 h-16 rounded-sm border border-ink/15 object-cover" />
              )}
            </div>
            <div className="col-span-3">
              <button disabled={saving} className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800 disabled:opacity-60">
                {saving ? "Saving…" : "Create work order"}
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
                <th>Photo</th>
                <th>Assigned to</th>
                <th>Vendors</th>
                <th>Status</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const tagged = vendorsByOrder[o.id] ?? [];
                const taggedContacts = contacts.filter((c) => tagged.includes(c.id));
                const untaggedContacts = contacts.filter((c) => !tagged.includes(c.id));
                return (
                  <tr key={o.id}>
                    <td className="font-medium">{o.ships?.name ?? "—"}</td>
                    <td className="text-ink/60">{o.description ?? "—"}</td>
                    <td>
                      {o.photo_url ? (
                        <button onClick={() => viewPhoto(o.photo_url!)} className="text-xs text-harbor-700 hover:underline">
                          View
                        </button>
                      ) : (
                        <span className="text-xs text-ink/30">—</span>
                      )}
                    </td>
                    <td className="text-ink/60">{o.assigned_to ?? "—"}</td>
                    <td>
                      <div className="flex flex-wrap gap-1 items-center max-w-xs">
                        {taggedContacts.map((c) => (
                          <span key={c.id} className="inline-flex items-center gap-1 text-xs bg-ink/5 border border-ink/15 rounded-full px-2 py-0.5">
                            {c.name}
                            <button onClick={() => removeVendorFromOrder(o.id, c.id)} className="text-ink/40 hover:text-signal-bad">
                              ×
                            </button>
                          </span>
                        ))}
                        {pickerFor === o.id ? (
                          <select
                            autoFocus
                            defaultValue=""
                            onChange={(e) => addVendorToOrder(o.id, e.target.value)}
                            onBlur={() => setPickerFor(null)}
                            className="text-xs border border-ink/15 rounded-sm px-1 py-0.5 bg-transparent"
                          >
                            <option value="" disabled>
                              Select…
                            </option>
                            {untaggedContacts.map((c) => (
                              <option key={c.id} value={c.id}>
                                {contactLabel(c)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <button onClick={() => setPickerFor(o.id)} className="text-xs text-harbor-700 hover:underline">
                            + Add
                          </button>
                        )}
                      </div>
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
                          {notifying === o.id ? "Sending…" : "Email Vendors"}
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
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-ink/50 py-8">
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
