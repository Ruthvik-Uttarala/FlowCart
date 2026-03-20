import { z } from "zod";
import {
  serializeSessionCookies,
  signInWithSupabase,
  supabaseAuthConfigured,
} from "@/src/lib/supabase/server";
import { errorResponse, okResponse } from "@/src/lib/server/api-response";

const loginSchema = z.object({
  email: z.email().trim(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  if (!supabaseAuthConfigured) {
    return errorResponse(
      "Supabase auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse("Enter a valid email and password.", { status: 400 });
  }

  const result = await signInWithSupabase(parsed.data);
  if (!result.session) {
    return errorResponse(result.error ?? "Unable to sign in.", { status: 401 });
  }

  const response = okResponse({
    user: result.session.user,
    email: result.session.user.email ?? parsed.data.email,
  });

  for (const cookie of serializeSessionCookies(result.session)) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }

  return response;
}
