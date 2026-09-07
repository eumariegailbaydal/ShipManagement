"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

type Announcement = {
  id: string;
  title: string;
  body: string;
  created_by: string | null;
  created_at: string;
  photo_url: string | null;
};

export default function Announcements() {
  const supabase = createClient();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [canPost, setCanPost] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
      setCanPost(profile?.role === "admin" || profile?.role === "fleet_manager");
    }

    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    setAnnouncements(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function postAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    let authorName = "Fleet management";
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
      authorName = profile?.full_name || authorName;
    }

    let photoUrl: string | null = null;
    if (photoFile) {
      const path = `${Date.now()}_${photoFile.name}`;
      const { error: uploadError } = await supabase.storage.from("announcements").upload(path, photoFile);
      if (uploadError) {
        alert(`Couldn't upload the photo: ${uploadError.message}`);
        setPosting(false);
        return;
      }
      const { data: publicUrl } = supabase.storage.from("announcements").getPublicUrl(path);
      photoUrl = publicUrl.publicUrl;
    }

    const { error } = await supabase.from("announcements").insert({
      title: form.title,
      body: form.body,
      created_by: authorName,
      photo_url: photoUrl,
    });
    setPosting(false);
    if (error) {
      alert(`Couldn't post this announcement: ${error.message}`);
      return;
    }
    setForm({ title: "", body: "" });
    setPhotoFile(null);
    setShowForm(false);
    load();
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm("Remove this announcement?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    load();
  }

  return (
    <div className="panel rounded-sm">
      <div className="px-5 py-3 border-b border-ink/10 flex items-center justify-between">
        <h2 className="text-sm font-medium">Announcements</h2>
        {canPost && (
          <button onClick={() => setShowForm(!showForm)} className="text-xs text-harbor-700 hover:underline">
            {showForm ? "Cancel" : "+ Post announcement"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={postAnnouncement} className="p-4 border-b border-ink/10 space-y-2">
          <input
            required
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
          />
          <textarea
            required
            placeholder="Write your announcement…"
            rows={3}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
          />
          <div className="flex items-center gap-3">
            <label className="text-xs text-ink/60">
              Attach photo (optional):{" "}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                className="text-xs"
              />
            </label>
          </div>
          {photoFile && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={URL.createObjectURL(photoFile)} alt="" className="max-h-40 rounded-sm border border-ink/10" />
          )}
          <button disabled={posting} className="bg-harbor-900 text-paper text-sm px-4 py-1.5 rounded-sm hover:bg-harbor-800 disabled:opacity-60">
            {posting ? "Posting…" : "Post"}
          </button>
        </form>
      )}

      <div className="p-2">
        {!loading && announcements.length === 0 && (
          <p className="text-sm text-ink/50 p-4">No announcements yet.</p>
        )}
        {announcements.map((a) => (
          <div key={a.id} className="px-3 py-3 border-b border-ink/5 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{a.title}</p>
              {canPost && (
                <button
                  onClick={() => deleteAnnouncement(a.id)}
                  className="text-xs text-ink/40 hover:text-signal-bad shrink-0"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-sm text-ink/70 mt-1 whitespace-pre-wrap">{a.body}</p>
            {a.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.photo_url} alt="" className="mt-2 max-h-64 rounded-sm border border-ink/10" />
            )}
            <p className="text-xs text-ink/40 mt-1.5">
              {a.created_by ?? "Fleet management"} · {new Date(a.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
