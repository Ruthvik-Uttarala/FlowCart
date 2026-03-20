import {
  SUPABASE_ACCESS_COOKIE,
  SUPABASE_REFRESH_COOKIE,
} from "@/src/lib/supabase/types";
import { buildClearCookieOptions } from "@/src/lib/supabase/server";
import { okResponse } from "@/src/lib/server/api-response";

export async function POST() {
  const response = okResponse({ signedOut: true });

  const clearOptions = buildClearCookieOptions();
  response.cookies.set(SUPABASE_ACCESS_COOKIE, "", clearOptions);
  response.cookies.set(SUPABASE_REFRESH_COOKIE, "", clearOptions);

  return response;
}
