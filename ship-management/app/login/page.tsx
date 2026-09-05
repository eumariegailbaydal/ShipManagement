"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-harbor-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="data-label text-brass-400 text-xs uppercase tracking-widest mb-2">
            Fleet Operations
          </p>
          <h1 className="text-2xl font-semibold text-paper">Sign in</h1>
        </div>
        <form onSubmit={handleSubmit} className="panel rounded-sm p-6 space-y-4">
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
        <p className="text-center text-xs text-paper/50 mt-4">
          Accounts are created by your fleet administrator.
        </p>
      </div>
    </div>
  );
}
