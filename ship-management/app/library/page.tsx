"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";

type Resource = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  external_url: string | null;
  file_url: string | null;
  created_by: string | null;
  created_at: string;
};

const CATEGORIES = ["STCW", "MLC", "MARPOL", "Certificate Renewal Procedures", "Other"];

export default function LibraryPage() {
  const supabase = createClient();
  const [resources, setResources] = useState<Resource[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    category: "STCW",
    description: "",
    external_url: "",
    file: null as File | null,
  });

  async function load() {
    const { data } = await supabase.from("library_resources").select("*").order("category").order("title");
    setResources(data ?? []);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setCanManage(["admin", "fleet_manager", "crewing_officer"].includes(profile?.role ?? ""));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addResource(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    let fileUrl: string | null = null;
    if (form.file) {
      const path = `${Date.now()}_${form.file.name}`;
      const { error: uploadError } = await supabase.storage.from("library").upload(path, form.file);
      if (uploadError) {
        alert(`Couldn't upload the file: ${uploadError.message}`);
        setSaving(false);
        return;
      }
      const { data: publicUrl } = supabase.storage.from("library").getPublicUrl(path);
      fileUrl = publicUrl.publicUrl;
    }

    const { error } = await supabase.from("library_resources").insert({
      title: form.title,
      category: form.category,
      description: form.description || null,
      external_url: form.external_url || null,
      file_url: fileUrl,
    });
    setSaving(false);
    if (error) {
      alert(`Couldn't save this resource: ${error.message}`);
      return;
    }
    setForm({ title: "", category: "STCW", description: "", external_url: "", file: null });
    setShowForm(false);
    load();
  }

  async function deleteResource(id: string) {
    if (!confirm("Remove this resource from the library?")) return;
    await supabase.from("library_resources").delete().eq("id", id);
    load();
  }

  const visible = resources.filter((r) => {
    if (filter !== "all" && r.category !== filter) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !(r.description ?? "").toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <AppShell>
      <div className="p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold mb-1">Library</h1>
            <p className="text-sm text-ink/60">Maritime publications and references — STCW, MLC, MARPOL, and certificate renewal procedures.</p>
          </div>
          {canManage && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800"
            >
              {showForm ? "Cancel" : "Add resource"}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            placeholder="Search title or description…"
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
                key={c}
                onClick={() => setFilter(c)}
                className={`text-xs px-3 py-1.5 rounded-full border ${
                  filter === c ? "bg-harbor-900 text-paper border-harbor-900" : "border-ink/20 text-ink/60"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {showForm && (
          <form onSubmit={addResource} className="panel rounded-sm p-5 mb-6 grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-ink/60 mb-1">Title</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-ink/60 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-ink/60 mb-1">External link (optional)</label>
              <input
                type="url"
                value={form.external_url}
                onChange={(e) => setForm({ ...form, external_url: e.target.value })}
                placeholder="https://…"
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-ink/60 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-ink/60 mb-1">Or upload a file (optional — e.g. a PDF procedure document)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,image/*"
                onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })}
                className="w-full text-xs"
              />
            </div>
            <div className="col-span-2">
              <button disabled={saving} className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800 disabled:opacity-60">
                {saving ? "Saving…" : "Save resource"}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {visible.map((r) => (
            <div key={r.id} className="panel rounded-sm p-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full border bg-brass-500/10 text-brass-500 border-brass-500/30">
                    {r.category}
                  </span>
                  <p className="text-sm font-medium">{r.title}</p>
                </div>
                {r.description && <p className="text-sm text-ink/60">{r.description}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {(r.external_url || r.file_url) && (
                  <a
                    href={r.external_url ?? r.file_url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-harbor-700 hover:underline whitespace-nowrap"
                  >
                    Open →
                  </a>
                )}
                {canManage && (
                  <button onClick={() => deleteResource(r.id)} className="text-xs text-ink/40 hover:text-signal-bad">
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
          {visible.length === 0 && (
            <div className="panel rounded-sm p-8 text-center text-ink/50 text-sm">
              No resources match — try a different filter or search.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
