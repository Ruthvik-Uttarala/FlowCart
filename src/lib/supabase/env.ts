export interface SupabasePublicEnv {
  url: string;
  anonKey: string;
}

export const supabaseConfigError =
  "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";

export const supabasePublicEnv: SupabasePublicEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "",
};

export const isSupabaseEnvConfigured = Boolean(
  supabasePublicEnv.url && supabasePublicEnv.anonKey,
);
