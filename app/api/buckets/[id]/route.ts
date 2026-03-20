import { ZodError } from "zod";
import { patchBucket } from "@/src/lib/server/buckets";
import { errorResponse, okResponse } from "@/src/lib/server/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ParamsContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: ParamsContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const bucket = await patchBucket(id, body);

    if (!bucket) {
      return errorResponse("Bucket not found.", { status: 404 });
    }

    return okResponse({ bucket });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(
        error.issues[0]?.message ?? "Invalid bucket payload.",
        { status: 400 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to update bucket.";
    return errorResponse(message, { status: 500 });
  }
}
