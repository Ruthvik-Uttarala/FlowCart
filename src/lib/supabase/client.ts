import { createClient } from "@supabase/supabase-js";

import {
  isSupabaseEnvConfigured,
  supabasePublicEnv,
} from "@/src/lib/supabase/env";

type SupabaseClient = ReturnType<typeof createClient>;

export const supabasePublicConfig = supabasePublicEnv;
export const isSupabaseClientConfigured = isSupabaseEnvConfigured;

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseClientConfigured) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient(
      supabasePublicEnv.url,
      supabasePublicEnv.anonKey
    );
  }

  return cachedClient;
}

export const supabaseClient = getSupabaseClient();
