import { createClient } from "@supabase/supabase-js";
import { supabasePublicEnv } from "@/src/lib/supabase/env";

type SupabaseClient = ReturnType<typeof createClient>;

const BUCKET_NAME = "product_images";

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";

export const isSupabaseStorageConfigured = Boolean(
  supabasePublicEnv.url && serviceRoleKey
);

let cachedClient: SupabaseClient | null = null;
let bucketEnsured = false;

export function getSupabaseServiceClient(): SupabaseClient | null {
  if (!isSupabaseStorageConfigured) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient(supabasePublicEnv.url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return cachedClient;
}

export async function ensureStorageBucket(): Promise<void> {
  if (bucketEnsured) return;

  const client = getSupabaseServiceClient();
  if (!client) return;

  try {
    const { error } = await client.storage.createBucket(BUCKET_NAME, {
      public: true,
    });
    if (error && !error.message.includes("already exists")) {
      console.error("[merchflow:storage] Failed to create bucket:", error.message);
    }
  } catch (err) {
    console.error("[merchflow:storage] Bucket creation error:", err);
  }

  bucketEnsured = true;
}

export { BUCKET_NAME };
