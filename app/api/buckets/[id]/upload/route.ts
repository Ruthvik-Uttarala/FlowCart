import { getBucketById, updateBucket } from "@/src/lib/server/buckets";
import { getStableBucketStatus } from "@/src/lib/server/status";
import { saveUploadedFiles } from "@/src/lib/server/uploads";
import { errorResponse, okResponse } from "@/src/lib/server/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ParamsContext {
  params: Promise<{ id: string }>;
}

function collectFiles(formData: FormData): File[] {
  const imageFiles = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
  if (imageFiles.length > 0) {
    return imageFiles;
  }

  return formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

export async function POST(request: Request, context: ParamsContext) {
  try {
    const { id } = await context.params;
    const existingBucket = await getBucketById(id);
    if (!existingBucket) {
      return errorResponse("Bucket not found.", { status: 404 });
    }

    const formData = await request.formData();
    const files = collectFiles(formData);

    if (files.length === 0) {
      return errorResponse("At least one image file is required.", { status: 400 });
    }

    const imageUrls = await saveUploadedFiles(files);
    const updated = await updateBucket(id, (bucket) => {
      const next = {
        ...bucket,
        imageUrls: [...bucket.imageUrls, ...imageUrls],
        errorMessage: "",
        shopifyCreated: false,
        shopifyProductId: "",
        shopifyProductUrl: "",
        instagramPublished: false,
        instagramPostId: "",
        instagramPostUrl: "",
      };

      return {
        ...next,
        status: getStableBucketStatus(next),
      };
    });

    if (!updated) {
      return errorResponse("Bucket not found.", { status: 404 });
    }

    return okResponse({
      imageUrls: updated.imageUrls,
      bucket: updated,
      message: "Images uploaded.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload images.";
    return errorResponse(message, { status: 500 });
  }
}
