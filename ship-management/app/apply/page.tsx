"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

export default function ApplyPage() {
  const supabase = createClient();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    position_applied: "",
    message: "",
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    let resumeUrl: string | null = null;
    if (resumeFile) {
      const path = `${Date.now()}_${resumeFile.name}`;
      const { error: uploadError } = await supabase.storage.from("applications").upload(path, resumeFile);
      if (uploadError) {
        alert(`Couldn't upload your resume: ${uploadError.message}`);
        setSubmitting(false);
        return;
      }
      resumeUrl = path;
    }

    const { error } = await supabase.from("mailbox_messages").insert({
      type: "crew_application",
      full_name: form.full_name,
      email: form.email,
      phone: form.phone || null,
      position_applied: form.position_applied || null,
      message: form.message || null,
      resume_url: resumeUrl,
    });
    setSubmitting(false);
    if (error) {
      alert(`Couldn't submit your application: ${error.message}`);
      return;
    }
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="bg-harbor-950 text-paper">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="RSL logo" className="w-10 h-10" />
            <div>
              <p className="data-label text-brass-400 text-[0.65rem] uppercase tracking-widest">RSL</p>
              <p className="text-sm font-medium">Shipboard Division Management</p>
            </div>
          </div>
          <Link href="/login" className="text-sm text-brass-400 hover:underline">
            ← Back to homepage
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-16">
        <h1 className="text-2xl font-semibold text-harbor-900 mb-2">Crew Application</h1>
        <p className="text-sm text-ink/60 mb-8">
          Interested in joining our fleet? Fill out the form below and our crewing team will review your application.
        </p>

        {submitted ? (
          <div className="panel rounded-sm p-6 text-sm text-signal-ok">
            Thank you — your application has been received. Our crewing team will reach out if there's a fit.
          </div>
        ) : (
          <form onSubmit={submit} className="panel rounded-sm p-6 space-y-4">
            <div>
              <label className="block text-sm mb-1 text-ink/80">Full name</label>
              <input
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full border border-ink/20 rounded-sm px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1 text-ink/80">Email</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-ink/20 rounded-sm px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-ink/80">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-ink/20 rounded-sm px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1 text-ink/80">Position applying for</label>
              <input
                value={form.position_applied}
                onChange={(e) => setForm({ ...form, position_applied: e.target.value })}
                placeholder="e.g. Able Seaman, Chief Engineer"
                className="w-full border border-ink/20 rounded-sm px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-ink/80">Tell us about yourself</label>
              <textarea
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Experience, certifications, availability, etc."
                className="w-full border border-ink/20 rounded-sm px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-ink/80">Resume / CV (optional)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
              />
            </div>
            <button
              disabled={submitting}
              className="w-full bg-harbor-900 text-paper py-2 rounded-sm text-sm font-medium hover:bg-harbor-800 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit Application"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
