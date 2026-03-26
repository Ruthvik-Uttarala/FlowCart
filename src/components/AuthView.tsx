"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { isSupabaseClientConfigured } from "@/src/lib/supabase/client";
import { apiErrorMessage, readApiResponse } from "@/src/components/api-response";

type AuthMode = "login" | "signup";

interface AuthViewProps {
  redirectTo: string;
  reason: string;
}

interface SessionState {
  authenticated: boolean;
  configured: boolean;
  user?: {
    email?: string | null;
  };
}

function readMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "Something went wrong. Please try again.";
}

export function AuthView({ redirectTo, reason }: AuthViewProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const isConfigured = isSupabaseClientConfigured;
  const isAuthUnavailable = !isConfigured || reason === "auth-not-configured";
  const authDisabledMessage = "Auth not configured \u2014 demo mode active";
  const [status, setStatus] = useState(isAuthUnavailable ? authDisabledMessage : "");
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isAuthUnavailable) {
      setSessionState(null);
      setStatus(authDisabledMessage);
      return;
    }

    let mounted = true;

    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const payload = await readApiResponse<SessionState>(response);

        if (!mounted || !response.ok || !payload?.ok || !payload.data) {
          return;
        }

        setSessionState(payload.data);
        if (payload.data.authenticated) {
          router.replace(redirectTo);
          router.refresh();
        }
      } catch {
        if (mounted) {
          setSessionState(null);
        }
      }
    };

    loadSession();

    return () => {
      mounted = false;
    };
  }, [authDisabledMessage, isAuthUnavailable, redirectTo, router]);

  const submit = async (nextMode: AuthMode) => {
    if (isAuthUnavailable) {
      return;
    }

    setStatus("");
    const endpoint = nextMode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await readApiResponse<{
      message?: string;
      needsConfirmation?: boolean;
    }>(response);

    if (!response.ok || !payload?.ok || !payload.data) {
      throw new Error(apiErrorMessage(payload, "Authentication failed."));
    }

    return payload.data;
  };

  const handleSubmit = (nextMode: AuthMode) => {
    if (isAuthUnavailable) {
      setStatus(authDisabledMessage);
      return;
    }

    startTransition(() => {
      submit(nextMode)
        .then((data) => {
          if (!data) {
            return;
          }

          if (nextMode === "signup" && data.needsConfirmation) {
            setStatus(
              data.message ?? "Account created. Check your email to confirm it."
            );
            setMode("login");
            return;
          }

          router.replace(redirectTo);
          router.refresh();
        })
        .catch((error: unknown) => {
          setStatus(readMessage(error));
        });
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid w-full gap-6 rounded-[2rem] border border-stone-200 bg-white/70 p-6 shadow-[0_8px_40px_rgba(41,37,36,0.08)] backdrop-blur-xl lg:grid-cols-[1.02fr_0.98fr] lg:p-8"
      >
        <section className="relative overflow-hidden rounded-[1.75rem] border border-stone-200 bg-gradient-to-br from-orange-50 via-amber-50/60 to-stone-50 p-8 text-stone-900">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-orange-700">
              FlowCart
            </span>
            <h1 className="text-4xl font-semibold tracking-tight">
              Upload once. Launch everywhere.
            </h1>
            <p className="text-sm leading-7 text-stone-600">
              Sign in with Supabase email auth to access protected settings and
              dashboard routes with session persistence via secure cookies.
            </p>
            <div className="rounded-2xl border border-stone-200 bg-white/60 p-4 text-sm text-stone-700">
              {isAuthUnavailable ? (
                <p>{authDisabledMessage}</p>
              ) : (
                <p>After login, FlowCart routes you straight into the dashboard.</p>
              )}
            </div>
          </div>
        </section>

        <section className="glass-card rounded-[1.75rem] p-6">
          <div className="flex gap-2 rounded-2xl border border-stone-200 bg-white/60 p-1 text-sm">
            <button
              type="button"
              disabled={isAuthUnavailable}
              onClick={() => setMode("login")}
              className={`flex-1 rounded-xl px-4 py-3 font-semibold transition ${
                mode === "login"
                  ? "bg-stone-800 text-white"
                  : "text-stone-600 hover:text-stone-900"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              Log in
            </button>
            <button
              type="button"
              disabled={isAuthUnavailable}
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-xl px-4 py-3 font-semibold transition ${
                mode === "signup"
                  ? "bg-stone-800 text-white"
                  : "text-stone-600 hover:text-stone-900"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              Sign up
            </button>
          </div>

          <div className="mt-6 space-y-4">
            <label className="block space-y-2 text-sm">
              <span className="text-stone-600">Email</span>
              <input
                value={email}
                disabled={isAuthUnavailable}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                className="w-full rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400/60 focus:ring-1 focus:ring-orange-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="you@example.com"
              />
            </label>

            <label className="block space-y-2 text-sm">
              <span className="text-stone-600">Password</span>
              <input
                value={password}
                disabled={isAuthUnavailable}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="w-full rounded-2xl border border-stone-200 bg-white/80 px-4 py-3 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400/60 focus:ring-1 focus:ring-orange-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder={mode === "login" ? "Your password" : "At least 8 characters"}
              />
            </label>

            <button
              type="button"
              disabled={isPending || isAuthUnavailable}
              onClick={() => handleSubmit(mode)}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-orange-400 to-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Working..." : mode === "login" ? "Log in" : "Create account"}
            </button>

            <div className="rounded-2xl border border-stone-200 bg-white/60 px-4 py-3 text-sm text-stone-600">
              {isAuthUnavailable
                ? authDisabledMessage
                : status ||
                  (sessionState?.authenticated
                    ? `Already signed in as ${sessionState.user?.email ?? "your account"}.`
                    : "Sessions persist securely after sign-in.")}
            </div>

            <button
              type="button"
              disabled={isAuthUnavailable}
              onClick={async () => {
                if (isAuthUnavailable) {
                  setStatus(authDisabledMessage);
                  return;
                }

                const response = await fetch("/api/auth/logout", { method: "POST" });
                const payload = await readApiResponse<{ message?: string }>(response);
                if (!response.ok || !payload?.ok) {
                  setStatus(apiErrorMessage(payload, "Failed to sign out."));
                  return;
                }
                setStatus(payload.data?.message ?? "Signed out.");
                router.refresh();
              }}
              className="text-sm font-medium text-stone-500 underline decoration-stone-300 underline-offset-4 transition hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Sign out
            </button>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
