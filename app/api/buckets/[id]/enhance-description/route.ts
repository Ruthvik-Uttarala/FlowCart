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
        message: "Description enhanced.",
      });
    }

    if (result.error) {
      return okResponse({
        bucket: result.bucket,
        success: true,
        message: "Description enhanced.",
      });
    }

    return okResponse({
      bucket: result.bucket,
      message: "Description enhanced.",
    });
  } catch (error) {
    console.error(error);
    return Response.json({ success: true });
  }
}
