"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/ships", label: "Ships" },
  { href: "/crew", label: "Crew" },
  { href: "/ship-certifications", label: "Ship Certs & Inspections" },
  { href: "/maintenance", label: "Maintenance" },
  { href: "/work-orders", label: "Orders" },
  { href: "/liquidation", label: "Liquidation" },
  { href: "/incidents", label: "Incidents" }, 
  { href: "/directory", label: "Directory" }, 
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex bg-paper">
      <aside className="w-56 shrink-0 bg-harbor-950 text-paper flex flex-col">
        <div className="px-5 py-6 border-b border-white/10 flex items-center gap-3">
          <img src="/logo.svg" alt="RSL logo" className="w-10 h-10 shrink-0" />
          <div>
            <p className="data-label text-brass-400 text-[0.65rem] uppercase tracking-widest">
              RSL
            </p>
            <p className="text-sm font-medium mt-0.5 leading-snug">Shipboard Division Management</p>
          </div>
        </div>
        <nav className="flex-1 py-4">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-5 py-2.5 text-sm border-l-2 transition-colors ${
                  active
                    ? "border-brass-400 bg-white/5 text-paper"
                    : "border-transparent text-paper/60 hover:text-paper hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={signOut}
          className="px-5 py-4 text-sm text-paper/50 hover:text-paper text-left border-t border-white/10"
        >
          Sign out
        </button>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
