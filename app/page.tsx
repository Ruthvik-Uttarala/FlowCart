"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

const flow = [
  { step: "Sign up", desc: "Create your account with Supabase email auth." },
  { step: "Connect", desc: "Save Shopify, Instagram, and Airia settings." },
  { step: "Upload", desc: "Create a bucket and upload product images." },
  { step: "Enhance", desc: "AI-enhance titles and descriptions with Airia." },
  { step: "Launch", desc: "Publish to Shopify + Instagram in one click." },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function CursorGlow() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 60, damping: 20 });
  const springY = useSpring(y, { stiffness: 60, damping: 20 });

  return (
    <motion.div
      className="pointer-events-none absolute z-0 h-[420px] w-[420px] rounded-full opacity-40"
      style={{
        x: springX,
        y: springY,
        background:
          "radial-gradient(circle, rgba(224,122,58,0.18) 0%, rgba(212,165,116,0.08) 45%, transparent 70%)",
        translateX: "-50%",
        translateY: "-50%",
      }}
      onPointerMove={() => {}}
    />
  );
}

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);
  const springGlowX = useSpring(glowX, { stiffness: 50, damping: 18 });
  const springGlowY = useSpring(glowY, { stiffness: 50, damping: 18 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    glowX.set(e.clientX - rect.left);
    glowY.set(e.clientY - rect.top);
  };

  return (
    <div className="w-full space-y-8">
      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        onMouseMove={handleMouseMove}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="glass-card accent-ring relative overflow-hidden rounded-3xl p-8 sm:p-10"
      >
        {/* Cursor glow */}
        <motion.div
          className="pointer-events-none absolute z-0 h-[400px] w-[400px] rounded-full"
          style={{
            left: springGlowX,
            top: springGlowY,
            background:
              "radial-gradient(circle, rgba(224,122,58,0.15) 0%, rgba(212,165,116,0.06) 45%, transparent 70%)",
            translateX: "-50%",
            translateY: "-50%",
          }}
        />

        {/* Animated gradient band */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 opacity-30"
          style={{
            background:
              "linear-gradient(135deg, rgba(224,122,58,0.08) 0%, rgba(245,240,235,0.1) 35%, rgba(212,165,116,0.08) 65%, rgba(250,249,246,0.05) 100%)",
            animation: "gradientShift 8s ease-in-out infinite alternate",
          }}
        />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-orange-300/40 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
              FlowCart
            </span>
            <span className="rounded-full border border-amber-300/40 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
              Live Integrations
            </span>
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
            Upload once. Launch everywhere.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-stone-600">
            FlowCart is a launch cockpit for sellers who need one clean path from
            product idea to live storefront and social post, powered by Airia,
            Shopify, Instagram, and Supabase auth.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/auth"
              className="rounded-2xl bg-gradient-to-r from-orange-400 to-amber-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-105"
            >
              Get Started
            </Link>
            <Link
              href="/dashboard"
              className="rounded-2xl border border-stone-200 bg-white/60 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-white hover:shadow-sm"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Flow + Links */}
      <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="glass-card rounded-3xl p-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            How It Works
          </p>
          <div className="mt-4 space-y-3">
            {flow.map((s, index) => (
              <motion.div
                key={s.step}
                variants={item}
                whileHover={{ y: -2, boxShadow: "0 6px 20px rgba(41,37,36,0.06)" }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="rounded-2xl border border-stone-200 bg-white/60 px-4 py-3 text-sm transition"
              >
                <span className="mr-2 font-semibold text-orange-500">{index + 1}.</span>
                <span className="font-medium text-stone-800">{s.step}</span>
                <span className="text-stone-500"> &mdash; {s.desc}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15 }}
          className="glass-card rounded-3xl p-6"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            Quick Links
          </p>
          <div className="mt-4 space-y-3">
            <Link
              href="/settings"
              className="block rounded-2xl border border-stone-200 bg-white/60 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-white hover:shadow-sm"
            >
              Configure Integrations
            </Link>
            <Link
              href="/dashboard"
              className="block rounded-2xl border border-stone-200 bg-white/60 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-white hover:shadow-sm"
            >
              Manage Buckets
            </Link>
          </div>
        </motion.div>
      </section>

      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}
