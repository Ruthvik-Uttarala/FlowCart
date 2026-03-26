import { enhanceBucket } from "@/src/lib/server/workflows";
import { createBucket } from "@/src/lib/server/buckets";
import { okResponse } from "@/src/lib/server/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ParamsContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: ParamsContext) {
  try {
    const { id } = await context.params;
    const result = await enhanceBucket(id, "enhanceDescription");

    if (result.notFound || !result.bucket) {
      const fallback = await createBucket();
      return okResponse({
        bucket: fallback,
        message: "Bucket was missing; created a new one.",
      });
    }

    if (result.error) {
      return Response.json(
        {
          ok: false,
          data: { bucket: result.bucket },
          error: { message: result.error },
        },
        { status: 502 }
      );
    }

    return okResponse({
      bucket: result.bucket,
      message: "Description enhanced.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Description enhancement failed.";
    console.error("[merchflow:enhance-description] unhandled error:", error);
    return Response.json(
      { ok: false, error: { message } },
      { status: 500 }
    );
  }
}
