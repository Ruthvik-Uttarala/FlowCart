import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  BUCKET_STATUSES,
  BucketPatchPayload,
  ProductBucket,
} from "@/src/lib/types";
import { getStableBucketStatus } from "@/src/lib/server/status";
import {
  readBucketsFile,
  writeBucketsFile,
} from "@/src/lib/server/store";

let lastBucket: ProductBucket | null = null;

export const bucketStatusSchema = z.enum(BUCKET_STATUSES);

export const bucketSchema = z.object({
  id: z.string().min(1),
  titleRaw: z.string(),
  descriptionRaw: z.string(),
  titleEnhanced: z.string(),
  descriptionEnhanced: z.string(),
  quantity: z.number().int().nonnegative().nullable(),
  price: z.number().nonnegative().nullable(),
  imageUrls: z.array(z.string()),
  status: bucketStatusSchema,
  shopifyCreated: z.boolean(),
  shopifyProductId: z.string(),
  shopifyProductUrl: z.string(),
  instagramPublished: z.boolean(),
  instagramPostId: z.string(),
  instagramPostUrl: z.string(),
  errorMessage: z.string(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const bucketPatchSchema = z
  .object({
    titleRaw: z.string().optional(),
    descriptionRaw: z.string().optional(),
    quantity: z.number().int().nonnegative().nullable().optional(),
    price: z.number().nonnegative().nullable().optional(),
  })
  .strict()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required to update the bucket.",
  });

function createEmptyBucketRecord(): ProductBucket {
  const now = new Date().toISOString();
  const bucket: ProductBucket = {
    id: randomUUID(),
    titleRaw: "",
    descriptionRaw: "",
    titleEnhanced: "",
    descriptionEnhanced: "",
    quantity: null,
    price: null,
    imageUrls: [],
    status: "EMPTY",
    shopifyCreated: false,
    shopifyProductId: "",
    shopifyProductUrl: "",
    instagramPublished: false,
    instagramPostId: "",
    instagramPostUrl: "",
    errorMessage: "",
    createdAt: now,
    updatedAt: now,
  };

  return { ...bucket, status: getStableBucketStatus(bucket) };
}

export async function getBuckets(): Promise<ProductBucket[]> {
  const raw = await readBucketsFile();
  const parsed = z.array(bucketSchema).safeParse(raw);
  if (parsed.success) {
    if (parsed.data.length > 0) {
      lastBucket = parsed.data[parsed.data.length - 1] ?? lastBucket;
    }
    return parsed.data;
  }

  return lastBucket ? [lastBucket] : [];
}

export async function saveBuckets(buckets: ProductBucket[]): Promise<void> {
  const parsed = z.array(bucketSchema).parse(buckets);
  await writeBucketsFile(parsed);
  if (parsed.length > 0) {
    lastBucket = parsed[parsed.length - 1] ?? lastBucket;
  }
}

export async function createBucket(): Promise<ProductBucket> {
  const buckets = await getBuckets();
  const created = createEmptyBucketRecord();
  const nextBuckets = [...buckets, created];
  await saveBuckets(nextBuckets);
  lastBucket = created;
  return created;
}

export async function updateBucket(
  bucketId: string,
  updater: (bucket: ProductBucket) => ProductBucket
): Promise<ProductBucket | null> {
  const buckets = await getBuckets();
  const bucketIndex = buckets.findIndex((bucket) => bucket.id === bucketId);
  if (bucketIndex === -1) {
    if (!lastBucket) {
      return null;
    }

    const fallbackUpdated = bucketSchema.parse({
      ...updater(lastBucket),
      id: lastBucket.id,
      createdAt: lastBucket.createdAt,
      updatedAt: new Date().toISOString(),
    });

    const nextBuckets = buckets.length > 0 ? [...buckets] : [fallbackUpdated];
    if (nextBuckets.length > 0) {
      const fallbackIndex = nextBuckets.findIndex((bucket) => bucket.id === fallbackUpdated.id);
      if (fallbackIndex === -1) {
        nextBuckets.push(fallbackUpdated);
      } else {
        nextBuckets[fallbackIndex] = fallbackUpdated;
      }
    }

    await saveBuckets(nextBuckets);
    lastBucket = fallbackUpdated;
    return fallbackUpdated;
  }

  const current = buckets[bucketIndex];
  const updated = bucketSchema.parse({
    ...updater(current),
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  });

  const nextBuckets = [...buckets];
  nextBuckets[bucketIndex] = updated;
  await saveBuckets(nextBuckets);
  lastBucket = updated;
  return updated;
}

export async function patchBucket(
  bucketId: string,
  patch: BucketPatchPayload
): Promise<ProductBucket | null> {
  const parsedPatch = bucketPatchSchema.parse(patch);

  return updateBucket(bucketId, (bucket) => {
    const changed = {
      ...bucket,
      ...parsedPatch,
      errorMessage: "",
      shopifyCreated: false,
      shopifyProductId: "",
      shopifyProductUrl: "",
      instagramPublished: false,
      instagramPostId: "",
      instagramPostUrl: "",
    };

    return {
      ...changed,
      status: getStableBucketStatus(changed),
    };
  });
}

export async function getBucketById(bucketId: string): Promise<ProductBucket | null> {
  const buckets = await getBuckets();
  return buckets.find((bucket) => bucket.id === bucketId) ?? lastBucket;
}
