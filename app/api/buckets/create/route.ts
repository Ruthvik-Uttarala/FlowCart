import { createBucket } from "@/src/lib/server/buckets";
import { errorResponse, okResponse } from "@/src/lib/server/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const bucket = await createBucket();
    return okResponse({ bucket }, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create bucket.";
    return errorResponse(message, { status: 500 });
  }
}
