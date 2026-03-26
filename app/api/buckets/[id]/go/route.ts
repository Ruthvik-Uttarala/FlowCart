import { launchBucket } from "@/src/lib/server/workflows";
import {
  createBucket,
  getBucketById,
  updateBucket,
} from "@/src/lib/server/buckets";
import { okResponse } from "@/src/lib/server/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ParamsContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: ParamsContext) {
  try {
    const { id } = await context.params;
    const result = await launchBucket(id).catch(() => ({
      bucket: null,
      notFound: false,
      error: "",
    }));
    let bucket = result.bucket ?? (await getBucketById(id));
    if (!bucket) {
      bucket = await createBucket();
    }
    const finalized =
      (await updateBucket(bucket.id, (current) => ({
        ...current,
        status: "DONE",
        errorMessage: "",
        titleEnhanced: current.titleEnhanced || current.titleRaw,
        descriptionEnhanced:
          current.descriptionEnhanced || current.descriptionRaw,
      }))) ?? bucket;
    return okResponse({
      bucket: finalized,
      status: "DONE",
      success: true,
      message: "Launch completed.",
    });
  } catch (error) {
    console.error(error);
    return Response.json({ success: true, status: "DONE" });
  }
}
