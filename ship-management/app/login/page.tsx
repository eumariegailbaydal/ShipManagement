"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

type Ship = { id: string; name: string; type: string | null; photo_url: string | null };

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [ships, setShips] = useState<Ship[]>([]);

  const [inquiry, setInquiry] = useState({ full_name: "", email: "", phone: "", message: "" });
  const [inquirySent, setInquirySent] = useState(false);
  const [sendingInquiry, setSendingInquiry] = useState(false);

  useEffect(() => {
    async function loadShips() {
      const { data } = await supabase.from("ships").select("id, name, type, photo_url").order("name");
      setShips(data ?? []);
    }
    loadShips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function submitInquiry(e: React.FormEvent) {
    e.preventDefault();
    setSendingInquiry(true);
    const { error } = await supabase.from("mailbox_messages").insert({
      type: "charter_inquiry",
      full_name: inquiry.full_name,
      email: inquiry.email,
      phone: inquiry.phone || null,
      message: inquiry.message,
    });
    setSendingInquiry(false);
    if (error) {
      alert(`Couldn't send your inquiry: ${error.message}`);
      return;
    }
    setInquirySent(true);
    setInquiry({ full_name: "", email: "", phone: "", message: "" });
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* Top bar */}
      <div className="bg-harbor-950 text-paper">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="RSL logo" className="w-10 h-10" />
            <div>
              <p className="data-label text-brass-400 text-[0.65rem] uppercase tracking-widest">RSL</p>
              <p className="text-sm font-medium">Shipboard Division Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/apply" className="border border-brass-400 text-brass-400 text-sm px-4 py-1.5 rounded-sm hover:bg-brass-400 hover:text-harbor-950 transition-colors">
              Apply Now
            </Link>
            <a href="#login" className="bg-brass-500 text-harbor-950 text-sm px-4 py-1.5 rounded-sm font-medium hover:bg-brass-400">
              Log In
            </a>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-harbor-950 text-paper pb-16 pt-8">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-3xl md:text-4xl font-semibold mb-3">Reliable Shipping. Trusted Service.</h1>
          <p className="text-paper/70 max-w-2xl mx-auto">
            {/* EDIT ME: replace with your real one-line company tagline */}
            RSL Shipboard Division manages a fleet dedicated to safe, timely, and dependable maritime operations across the Philippines.
          </p>
        </div>
      </div>

      {/* About Us */}
      <section id="about" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-semibold text-harbor-900 mb-8">About Us</h2>
        <div className="grid grid-cols-2 gap-10 mb-10">
          <div>
            <h3 className="text-sm font-medium text-ink/50 uppercase tracking-wide mb-2">Company Description</h3>
            {/* EDIT ME: replace with your real company description */}
            <p className="text-sm text-ink/80 leading-relaxed">
              RSL Shipboard Division Management operates a fleet of vessels serving inter-island cargo and logistics needs
              across the Philippines. With a focus on safety, compliance, and reliability, we work closely with our crew,
              partners, and clients to keep operations running smoothly from port to port.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-ink/50 uppercase tracking-wide mb-2">A Message From Our Owner</h3>
            {/* EDIT ME: replace with the owner's real message */}
            <p className="text-sm text-ink/80 leading-relaxed italic">
              "Every voyage we undertake carries the trust of our clients and the safety of our crew. That responsibility
              guides every decision we make — from the maintenance of our vessels to the training of the people aboard them."
            </p>
            <p className="text-sm text-ink/60 mt-2">— [Owner Name], Founder</p>
          </div>
        </div>

        {ships.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-ink/50 uppercase tracking-wide mb-3">Our Fleet</h3>
            <div className="grid grid-cols-4 gap-4">
              {ships.map((s) => (
                <div key={s.id} className="panel rounded-sm overflow-hidden">
                  <div className="h-28 bg-ink/5 flex items-center justify-center">
                    {s.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.photo_url} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-ink/30">No photo</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-ink/50">{s.type ?? "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Contact Us */}
      <section id="contact" className="bg-white border-y border-ink/10">
        <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl font-semibold text-harbor-900 mb-6">Contact Us</h2>
            <div className="space-y-3 text-sm">
              {/* EDIT ME: replace every bracketed placeholder below with your real details */}
              <p>
                <span className="text-ink/50">Phone:</span> [Insert phone number]
              </p>
              <p>
                <span className="text-ink/50">Email:</span> [Insert email address]
              </p>
              <p>
                <span className="text-ink/50">Facebook:</span>{" "}
                <a href="https://facebook.com/[your-page]" target="_blank" rel="noopener noreferrer" className="text-harbor-700 hover:underline">
                  facebook.com/[your-page]
                </a>
              </p>
              <p>
                <span className="text-ink/50">Address:</span> [Insert office/port address]
              </p>
            </div>
          </div>

          {/* Charter Inquiry */}
          <div id="charter">
            <h2 className="text-2xl font-semibold text-harbor-900 mb-6">Charter Inquiry</h2>
            {inquirySent ? (
              <div className="panel rounded-sm p-5 text-sm text-signal-ok">
                Thank you — your inquiry has been sent to RSL. We'll get back to you soon.
              </div>
            ) : (
              <form onSubmit={submitInquiry} className="space-y-3">
                <input
                  required
                  placeholder="Full name"
                  value={inquiry.full_name}
                  onChange={(e) => setInquiry({ ...inquiry, full_name: e.target.value })}
                  className="w-full border border-ink/20 rounded-sm px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    required
                    type="email"
                    placeholder="Email"
                    value={inquiry.email}
                    onChange={(e) => setInquiry({ ...inquiry, email: e.target.value })}
                    className="w-full border border-ink/20 rounded-sm px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="Phone (optional)"
                    value={inquiry.phone}
                    onChange={(e) => setInquiry({ ...inquiry, phone: e.target.value })}
                    className="w-full border border-ink/20 rounded-sm px-3 py-2 text-sm"
                  />
                </div>
                <textarea
                  required
                  placeholder="Tell us about your charter needs — cargo type, dates, route, etc."
                  rows={4}
                  value={inquiry.message}
                  onChange={(e) => setInquiry({ ...inquiry, message: e.target.value })}
                  className="w-full border border-ink/20 rounded-sm px-3 py-2 text-sm"
                />
                <button
                  disabled={sendingInquiry}
                  className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800 disabled:opacity-60"
                >
                  {sendingInquiry ? "Sending…" : "Send Inquiry"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Login */}
      <section id="login" className="max-w-sm mx-auto px-6 py-16">
        <div className="mb-6 text-center">
          <p className="data-label text-brass-500 text-xs uppercase tracking-widest mb-2">Staff Access</p>
          <h2 className="text-xl font-semibold text-harbor-900">Sign in</h2>
        </div>
        <form onSubmit={handleLogin} className="panel rounded-sm p-6 space-y-4">
          <div>
            <label className="block text-sm mb-1 text-ink/80">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-ink/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-harbor-700"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-ink/80">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-ink/20 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-harbor-700"
            />
          </div>
          {error && <p className="text-sm text-signal-bad">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-harbor-900 text-paper py-2 rounded-sm text-sm font-medium hover:bg-harbor-800 transition-colors disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-center text-xs text-ink/40 mt-4">Accounts are created by your fleet administrator.</p>
      </section>

      <footer className="bg-harbor-950 text-paper/50 text-center text-xs py-6">
        © {new Date().getFullYear()} RSL Shipboard Division Management. All rights reserved.
      </footer>
    </div>
  );
}
