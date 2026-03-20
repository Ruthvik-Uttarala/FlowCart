import { getBuckets } from "@/src/lib/server/buckets";
import { errorResponse, okResponse } from "@/src/lib/server/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const buckets = await getBuckets();
    return okResponse({ buckets });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load buckets.";
    return errorResponse(message, { status: 500 });
  }
}
