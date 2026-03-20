import {
  SUPABASE_ACCESS_COOKIE,
  SUPABASE_REFRESH_COOKIE,
  type AuthCredentials,
  type SupabaseAuthErrorShape,
  type SupabaseAuthSession,
  type SupabaseUser,
} from "@/src/lib/supabase/types";
import {
  isSupabaseEnvConfigured,
  supabaseConfigError,
  supabasePublicEnv,
} from "@/src/lib/supabase/env";

const authBaseUrl = supabasePublicEnv.url;
const anonKey = supabasePublicEnv.anonKey;

export const supabaseAuthConfigured = isSupabaseEnvConfigured;

function authHeaders(extraHeaders?: HeadersInit): Headers {
  const headers = new Headers(extraHeaders);
  headers.set("apikey", anonKey);
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${anonKey}`);
  }
  headers.set("Content-Type", "application/json");
  return headers;
}

function authUrl(path: string): string {
  return `${authBaseUrl.replace(/\/$/, "")}/auth/v1${path}`;
}

function parseAuthError(body: SupabaseAuthErrorShape | null | undefined): string {
  return body?.message ?? body?.msg ?? body?.error ?? "Authentication request failed.";
}

async function supabaseAuthRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data?: T; error?: string }> {
  if (!supabaseAuthConfigured) {
    return { error: supabaseConfigError };
  }

  const response = await fetch(authUrl(path), {
    ...init,
    headers: authHeaders(init?.headers),
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? ((await response.json().catch(() => null)) as T | SupabaseAuthErrorShape | null)
    : null;

  if (!response.ok) {
    return { error: parseAuthError(payload as SupabaseAuthErrorShape | null) };
  }

  return { data: payload as T };
}

export function buildSessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function buildClearCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

export async function signUpWithSupabase(credentials: AuthCredentials): Promise<{
  session?: SupabaseAuthSession | null;
  error?: string;
}> {
  const result = await supabaseAuthRequest<SupabaseAuthSession | { user: SupabaseUser | null }>(
    "/signup",
    {
      method: "POST",
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    },
  );

  if (result.error) {
    return { error: result.error };
  }

  const payload = result.data as SupabaseAuthSession | { user: SupabaseUser | null } | undefined;
  if (payload && "access_token" in payload && "refresh_token" in payload) {
    return { session: payload };
  }

  return { session: null };
}

export async function signInWithSupabase(credentials: AuthCredentials): Promise<{
  session?: SupabaseAuthSession;
  error?: string;
}> {
  const result = await supabaseAuthRequest<SupabaseAuthSession>("/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
  });

  if (result.error) {
    return { error: result.error };
  }

  return { session: result.data };
}

export async function refreshSupabaseSession(refreshToken: string): Promise<{
  session?: SupabaseAuthSession;
  error?: string;
}> {
  const result = await supabaseAuthRequest<SupabaseAuthSession>("/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (result.error) {
    return { error: result.error };
  }

  return { session: result.data };
}

export async function getSupabaseUser(accessToken: string): Promise<{
  user?: SupabaseUser;
  error?: string;
}> {
  const result = await supabaseAuthRequest<SupabaseUser>("/user", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (result.error) {
    return { error: result.error };
  }

  return { user: result.data };
}

export function serializeSessionCookies(session: SupabaseAuthSession): Array<{
  name: string;
  value: string;
  options: ReturnType<typeof buildSessionCookieOptions>;
}> {
  return [
    {
      name: SUPABASE_ACCESS_COOKIE,
      value: session.access_token,
      options: buildSessionCookieOptions(session.expires_in),
    },
    {
      name: SUPABASE_REFRESH_COOKIE,
      value: session.refresh_token,
      options: buildSessionCookieOptions(60 * 60 * 24 * 30),
    },
  ];
}
