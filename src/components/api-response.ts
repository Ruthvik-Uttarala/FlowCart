import type { ApiResponseShape } from "@/src/lib/types";

export async function readApiResponse<T>(
  response: Response
): Promise<ApiResponseShape<T> | null> {
  return (await response.json().catch(() => null)) as ApiResponseShape<T> | null;
}

export function apiErrorMessage<T>(
  payload: ApiResponseShape<T> | null | undefined,
  fallback: string
): string {
  const message = payload?.error?.message;
  return typeof message === "string" && message.trim() ? message.trim() : fallback;
}
