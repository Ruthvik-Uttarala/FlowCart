import {
  SUPABASE_ACCESS_COOKIE,
  SUPABASE_REFRESH_COOKIE,
} from "@/src/lib/supabase/types";
import { buildClearCookieOptions } from "@/src/lib/supabase/server";
import { okResponse } from "@/src/lib/server/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const response = okResponse({ signedOut: true });

    const clearOptions = buildClearCookieOptions();
    response.cookies.set(SUPABASE_ACCESS_COOKIE, "", clearOptions);
    response.cookies.set(SUPABASE_REFRESH_COOKIE, "", clearOptions);

    return response;
  } catch (error) {
    console.error(error);
    return Response.json({ success: true });
  }
}
