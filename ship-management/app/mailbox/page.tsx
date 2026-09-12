"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";

type Message = {
  id: string;
  type: string;
  full_name: string;
  email: string;
  phone: string | null;
  position_applied: string | null;
  message: string | null;
  resume_url: string | null;
  status: string;
  created_at: string;
};

export default function MailboxPage() {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState<"all" | "charter_inquiry" | "crew_application">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("mailbox_messages").select("*").order("created_at", { ascending: false });
    setMessages(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id: string, currentStatus: string) {
    if (currentStatus !== "new") return;
    await supabase.from("mailbox_messages").update({ status: "read" }).eq("id", id);
    load();
  }

  async function archiveMessage(id: string) {
    await supabase.from("mailbox_messages").update({ status: "archived" }).eq("id", id);
    load();
  }

  async function getResumeLink(path: string) {
    const { data } = await supabase.storage.from("applications").createSignedUrl(path, 60 * 5);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  function toggle(m: Message) {
    setExpanded(expanded === m.id ? null : m.id);
    markRead(m.id, m.status);
  }

  const visible = messages.filter((m) => filter === "all" || m.type === filter);
  const newCount = messages.filter((m) => m.status === "new").length;

  return (
    <AppShell>
      <div className="p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold mb-1">Mailbox</h1>
            <p className="text-sm text-ink/60">
              Charter inquiries and crew applications submitted from the public homepage.
              {newCount > 0 && <span className="text-signal-bad font-medium"> {newCount} new</span>}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {(["all", "charter_inquiry", "crew_application"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                filter === f ? "bg-harbor-900 text-paper border-harbor-900" : "border-ink/20 text-ink/60"
              }`}
            >
              {f === "all" ? "All" : f === "charter_inquiry" ? "Charter Inquiries" : "Crew Applications"}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {visible.map((m) => (
            <div key={m.id} className="panel rounded-sm overflow-hidden">
              <button onClick={() => toggle(m)} className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-paper/50">
                <div className="flex items-center gap-3">
                  {m.status === "new" && <span className="w-2 h-2 rounded-full bg-signal-bad shrink-0"></span>}
                  <div>
                    <p className={`text-sm ${m.status === "new" ? "font-semibold" : "font-medium"}`}>{m.full_name}</p>
                    <p className="text-xs text-ink/50">
                      {m.type === "charter_inquiry" ? "Charter Inquiry" : `Crew Application${m.position_applied ? ` — ${m.position_applied}` : ""}`} ·{" "}
                      {new Date(m.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-ink/40">{expanded === m.id ? "▲" : "▼"}</span>
              </button>

              {expanded === m.id && (
                <div className="border-t border-ink/10 p-5 text-sm">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <p>
                      <span className="text-ink/40">Email:</span> {m.email}
                    </p>
                    <p>
                      <span className="text-ink/40">Phone:</span> {m.phone ?? "—"}
                    </p>
                  </div>
                  {m.message && (
                    <div className="mb-3">
                      <p className="text-xs text-ink/40 mb-1">Message</p>
                      <p className="text-ink/80 whitespace-pre-wrap">{m.message}</p>
                    </div>
                  )}
                  {m.resume_url && (
                    <button onClick={() => getResumeLink(m.resume_url!)} className="text-xs text-harbor-700 hover:underline">
                      View attached resume/CV
                    </button>
                  )}
                  <div className="mt-4">
                    <button onClick={() => archiveMessage(m.id)} className="text-xs text-ink/40 hover:text-signal-bad">
                      Archive
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {visible.length === 0 && (
            <div className="panel rounded-sm p-8 text-center text-ink/50 text-sm">No messages here.</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
