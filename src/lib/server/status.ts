import { BucketStatus, ProductBucket } from "@/src/lib/types";

export function hasRequiredBucketFields(bucket: ProductBucket): boolean {
  const hasTitle = bucket.titleRaw.trim().length > 0;
  const hasDescription = bucket.descriptionRaw.trim().length > 0;
  const hasQuantity = typeof bucket.quantity === "number" && bucket.quantity > 0;
  const hasPrice = typeof bucket.price === "number" && bucket.price >= 0;
  const hasAtLeastOneImage = bucket.imageUrls.length > 0;

  return hasTitle && hasDescription && hasQuantity && hasPrice && hasAtLeastOneImage;
}

export function getStableBucketStatus(bucket: ProductBucket): BucketStatus {
  const hasError = bucket.errorMessage.trim().length > 0;
  if (hasError) {
    return "FAILED";
  }

  if (bucket.shopifyCreated && bucket.instagramPublished) {
    return "DONE";
  }

  return hasRequiredBucketFields(bucket) ? "READY" : "EMPTY";
}
