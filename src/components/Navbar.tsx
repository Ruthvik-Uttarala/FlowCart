"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings", label: "Settings" },
  { href: "/auth", label: "Login" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/40 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 via-sky-400 to-orange-400 text-sm font-bold text-slate-950 shadow-[0_10px_30px_rgba(56,189,248,0.22)]">
            FC
          </span>
          <div>
            <p className="text-sm font-semibold tracking-[0.08em] text-slate-100">
              FlowCart
            </p>
            <p className="text-xs text-slate-400">Upload once. Launch everywhere.</p>
          </div>
        </div>

        <nav className="glass-card flex flex-wrap items-center gap-1 rounded-2xl px-2 py-1.5 shadow-[0_16px_54px_rgba(2,6,23,0.22)]">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-white/12 text-white shadow-[0_10px_24px_rgba(255,255,255,0.05)]"
                    : "text-slate-300 hover:bg-white/8 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
