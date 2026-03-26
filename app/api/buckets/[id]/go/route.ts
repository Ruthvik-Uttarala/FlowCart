import { launchBucket } from "@/src/lib/server/workflows";
import { getBucketById } from "@/src/lib/server/buckets";
import { okResponse } from "@/src/lib/server/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ParamsContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: ParamsContext) {
  try {
    const { id } = await context.params;
    const result = await launchBucket(id);

    if (!result.bucket) {
      const fallback = await getBucketById(id);
      if (!fallback) {
        return Response.json(
          { ok: false, error: { message: "Bucket not found." } },
          { status: 404 }
        );
      }
      return okResponse({
        bucket: fallback,
        success: fallback.status === "DONE",
        status: fallback.status,
        message: result.error || "Launch completed with warnings.",
      });
    }

    const success = result.bucket.status === "DONE";
    return okResponse({
      bucket: result.bucket,
      status: result.bucket.status,
      success,
      message: success
        ? "Launch completed."
        : result.error || result.bucket.errorMessage || "Launch failed.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Launch failed unexpectedly.";
    console.error("[merchflow:go] unhandled error:", error);
    return Response.json(
      { ok: false, error: { message } },
      { status: 500 }
    );
  }
}
