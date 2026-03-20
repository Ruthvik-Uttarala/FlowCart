"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const flow = [
  "Sign up with Supabase email auth.",
  "Save Shopify, Instagram, and Airia settings.",
  "Create a bucket and upload one or more images.",
  "Enhance title + description with Airia live.",
  "Launch to Shopify and Instagram from one action.",
];

export default function Home() {
  return (
    <div className="w-full space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="glass-card accent-ring overflow-hidden rounded-3xl p-8 sm:p-10"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-cyan-300/30 bg-cyan-300/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
            FlowCart
          </span>
          <span className="rounded-full border border-orange-300/25 bg-orange-300/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-orange-200">
            Live Integrations
          </span>
        </div>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Upload once. Launch everywhere.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
          FlowCart is a launch cockpit for sellers who need one clean path from
          product idea to live storefront and social post, powered by Airia,
          Shopify, Instagram, and Supabase auth.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/auth"
            className="rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-400 to-orange-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
          >
            Start With Login
          </Link>
          <Link
            href="/dashboard"
            className="rounded-2xl border border-white/20 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/12"
          >
            Open Dashboard
          </Link>
        </div>
      </motion.section>

      <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="glass-card rounded-3xl p-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Demo Flow
          </p>
          <div className="mt-4 space-y-3">
            {flow.map((step, index) => (
              <div
                key={step}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
              >
                <span className="mr-2 text-cyan-300">{index + 1}.</span>
                {step}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="glass-card rounded-3xl p-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Quick Links
          </p>
          <div className="mt-4 space-y-3">
            <Link
              href="/settings"
              className="block rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/12"
            >
              Configure Integrations
            </Link>
            <Link
              href="/dashboard"
              className="block rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/12"
            >
              Manage Buckets
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
