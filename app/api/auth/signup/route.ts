import { z } from "zod";
import {
  serializeSessionCookies,
  signUpWithSupabase,
  supabaseAuthConfigured,
} from "@/src/lib/supabase/server";
import { errorResponse, okResponse } from "@/src/lib/server/api-response";

const signupSchema = z.object({
  email: z.email().trim(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  if (!supabaseAuthConfigured) {
    return errorResponse(
      "Supabase auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return errorResponse(
      "Use a valid email and a password with at least 8 characters.",
      { status: 400 }
    );
  }

  const result = await signUpWithSupabase(parsed.data);
  if (result.error) {
    return errorResponse(result.error, { status: 400 });
  }

  const response = okResponse({
    needsConfirmation: !result.session,
    message: result.session
      ? "Account created and signed in."
      : "Account created. Check your email to confirm the account, then sign in.",
  });

  if (result.session) {
    for (const cookie of serializeSessionCookies(result.session)) {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    }
  }

  return response;
}
