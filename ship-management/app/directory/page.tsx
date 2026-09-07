"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";

type Contact = {
  id: string;
  name: string;
  category: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
};

const CATEGORIES: { value: string; label: string }[] = [
  { value: "supplier", label: "Supplier" },
  { value: "customer_charterer", label: "Customer / Charterer" },
  { value: "inspector", label: "Inspector" },
  { value: "port_agent", label: "Port Agent" },
  { value: "government_regulatory", label: "Government / Regulatory" },
  { value: "other", label: "Other" },
];

function categoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export default function DirectoryPage() {
  const supabase = createClient();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    category: "supplier",
    company: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  async function load() {
    const { data } = await supabase.from("contacts").select("*").order("name");
    setContacts(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addContact(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("contacts").insert({
      name: form.name,
      category: form.category,
      company: form.company || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      notes: form.notes || null,
    });
    if (error) {
      alert(`Couldn't save this contact: ${error.message}`);
      return;
    }
    setForm({ name: "", category: "supplier", company: "", phone: "", email: "", address: "", notes: "" });
    setShowForm(false);
    load();
  }

  async function deleteContact(id: string) {
    if (!confirm("Remove this contact?")) return;
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) {
      alert(`Couldn't remove this contact: ${error.message}`);
      return;
    }
    load();
  }

  const visible = contacts.filter((c) => {
    if (filter !== "all" && c.category !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.company ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <AppShell>
      <div className="p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold mb-1">Directory</h1>
            <p className="text-sm text-ink/60">Suppliers, customers/charterers, inspectors, and other third-party contacts.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800"
          >
            {showForm ? "Cancel" : "Add contact"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            placeholder="Search name, company, phone, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-ink/20 rounded-sm px-3 py-1.5 text-sm w-64"
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                filter === "all" ? "bg-harbor-900 text-paper border-harbor-900" : "border-ink/20 text-ink/60"
              }`}
            >
              All
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setFilter(c.value)}
                className={`text-xs px-3 py-1.5 rounded-full border ${
                  filter === c.value ? "bg-harbor-900 text-paper border-harbor-900" : "border-ink/20 text-ink/60"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {showForm && (
          <form onSubmit={addContact} className="panel rounded-sm p-5 mb-6 grid grid-cols-3 gap-4">
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <div>
              <label className="block text-xs text-ink/60 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
            <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
            <Field label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
            <div className="col-span-3">
              <label className="block text-xs text-ink/60 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              />
            </div>
            <div className="col-span-3">
              <button className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800">
                Save contact
              </button>
            </div>
          </form>
        )}

        <div className="panel rounded-sm">
          <table className="log-table w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Company</th>
                <th>Phone</th>
                <th>Email</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td className="text-ink/60">{categoryLabel(c.category)}</td>
                  <td className="text-ink/60">{c.company ?? "—"}</td>
                  <td className="text-ink/60">{c.phone ?? "—"}</td>
                  <td className="text-ink/60">{c.email ?? "—"}</td>
                  <td>
                    <button onClick={() => deleteContact(c.id)} className="text-xs text-ink/40 hover:text-signal-bad">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-ink/50 py-8">
                    No contacts match — add one above or clear your filters.
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs text-ink/60 mb-1">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-harbor-700"
      />
    </div>
  );
}
