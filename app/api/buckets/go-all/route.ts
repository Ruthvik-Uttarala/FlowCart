import { getBuckets } from "@/src/lib/server/buckets";
import { goAllSequentially } from "@/src/lib/server/workflows";
import { errorResponse, okResponse } from "@/src/lib/server/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const summary = await goAllSequentially();
    const buckets = await getBuckets();
    return okResponse({
      summary,
      buckets,
      message: "Sequential Go(All) completed.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process ready buckets.";
    return errorResponse(message, { status: 500 });
  }
}
