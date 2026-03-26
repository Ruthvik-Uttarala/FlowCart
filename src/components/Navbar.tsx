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
    <header className="sticky top-0 z-20 border-b border-stone-200/60 bg-white/80 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 text-sm font-bold text-white shadow-[0_4px_16px_rgba(224,122,58,0.25)]">
            FC
          </span>
          <div>
            <p className="text-sm font-semibold tracking-[0.08em] text-stone-800">
              FlowCart
            </p>
            <p className="text-xs text-stone-500">Upload once. Launch everywhere.</p>
          </div>
        </div>

        <nav className="glass-card flex flex-wrap items-center gap-1 rounded-2xl px-2 py-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-stone-800 text-white shadow-sm"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
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
