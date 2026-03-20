import { NextResponse } from "next/server";
import type { ApiErrorShape } from "@/src/lib/types";

export function okResponse<T>(
  data: T,
  status = 200
): NextResponse {
  return NextResponse.json(
    {
      ok: true,
      data,
    },
    { status }
  );
}

export function errorResponse(
  message: string,
  options?: {
    data?: unknown;
    status?: number;
  }
): NextResponse {
  const error: ApiErrorShape = {
    message,
  };

  return NextResponse.json(
    {
      ok: false,
      data: options?.data,
      error,
    },
    { status: options?.status ?? 500 }
  );
}
