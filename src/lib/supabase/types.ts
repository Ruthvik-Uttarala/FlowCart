export const SUPABASE_ACCESS_COOKIE = "flowcart-sb-access";
export const SUPABASE_REFRESH_COOKIE = "flowcart-sb-refresh";
export const SUPABASE_USER_COOKIE = "flowcart-sb-user";

export interface SupabaseAuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: SupabaseUser;
}

export interface SupabaseUser {
  id: string;
  aud?: string;
  role?: string;
  email?: string | null;
  confirmed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  last_sign_in_at?: string | null;
}

export interface SupabaseAuthErrorShape {
  error?: string;
  msg?: string;
  message?: string;
}

export interface AuthApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface AuthCredentials {
  email: string;
  password: string;
}

