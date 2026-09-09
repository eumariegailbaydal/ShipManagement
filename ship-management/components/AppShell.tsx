"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/ships", label: "Ships" },
  { href: "/crew", label: "Crew" },
  { href: "/certifications", label: "Certifications" },
  { href: "/ship-certifications", label: "Ship Certs & Inspections" },
  { href: "/maintenance", label: "Maintenance" },
  { href: "/work-orders", label: "Work Orders" },
  { href: "/incidents", label: "Incidents" },
  { href: "/liquidation", label: "Liquidation" },
  { href: "/directory", label: "Directory" },
  { href: "/sea-service", label: "Sea Service" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navLinks = (onNavigate?: () => void) => (
    <nav className="flex-1 py-4">
      {NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
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
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-paper">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between bg-harbor-950 text-paper px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="RSL logo" className="w-8 h-8" />
          <span className="text-sm font-medium">Shipboard Division</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="p-2 -mr-2"
        >
          <span className="block w-5 h-0.5 bg-paper mb-1"></span>
          <span className="block w-5 h-0.5 bg-paper mb-1"></span>
          <span className="block w-5 h-0.5 bg-paper"></span>
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-72 bg-harbor-950 text-paper flex flex-col">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/logo.svg" alt="RSL logo" className="w-8 h-8" />
                <span className="text-sm font-medium">Shipboard Division</span>
              </div>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="text-2xl leading-none px-2">
                ×
              </button>
            </div>
            {navLinks(() => setMobileOpen(false))}
            <button
              onClick={signOut}
              className="px-5 py-4 text-sm text-paper/50 hover:text-paper text-left border-t border-white/10"
            >
              Sign out
            </button>
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 bg-harbor-950 text-paper flex-col">
        <div className="px-5 py-6 border-b border-white/10 flex items-center gap-3">
          <img src="/logo.svg" alt="RSL logo" className="w-10 h-10 shrink-0" />
          <div>
            <p className="data-label text-brass-400 text-[0.65rem] uppercase tracking-widest">
              RSL
            </p>
            <p className="text-sm font-medium mt-0.5 leading-snug">Shipboard Division Management</p>
          </div>
        </div>
        {navLinks()}
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
