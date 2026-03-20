import { launchBucket } from "@/src/lib/server/workflows";
import { errorResponse, okResponse } from "@/src/lib/server/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ParamsContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: ParamsContext) {
  try {
    const { id } = await context.params;
    const result = await launchBucket(id);

    if (result.notFound || !result.bucket) {
      return errorResponse("Bucket not found.", { status: 404 });
    }

    if (result.error) {
      return errorResponse(result.error, { status: 400, data: { bucket: result.bucket } });
    }

    return okResponse({
      bucket: result.bucket,
      message:
        result.bucket.status === "DONE"
          ? "Launch completed."
          : "Launch finished with failure state.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Launch failed.";
    return errorResponse(message, { status: 500 });
  }
}
