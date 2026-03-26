import { GoAllSummary, ProductBucket } from "@/src/lib/types";
import {
  createBucket,
  getBucketById,
  getBuckets,
  updateBucket,
} from "@/src/lib/server/buckets";
import {
  enhanceDescriptionViaAiria,
  enhanceTitleViaAiria,
} from "@/src/lib/server/airia";
import { areSettingsConfigured, getSettings } from "@/src/lib/server/settings";
import {
  getStableBucketStatus,
  hasRequiredBucketFields,
} from "@/src/lib/server/status";
import { createShopifyProductArtifact } from "@/src/lib/server/adapters/shopify";
import { publishInstagramPostArtifact } from "@/src/lib/server/adapters/instagram";
import { normalizeStoreDomain } from "@/src/lib/server/runtime";

interface WorkflowResult {
  bucket: ProductBucket | null;
  notFound: boolean;
  error?: string;
}

function buildSettingsError(): string {
  return "Settings are incomplete. Required: Shopify store domain, Shopify client id, Shopify client secret, Instagram access token, and Instagram business account id.";
}

async function markBucketFailed(
  bucketId: string,
  errorMessage: string
): Promise<ProductBucket | null> {
  return updateBucket(bucketId, (bucket) => ({
    ...bucket,
    status: "FAILED",
    errorMessage,
  }));
}

async function buildAiriaPayload(
  bucket: ProductBucket,
  mode: "enhanceTitle" | "enhanceDescription" | "fullLaunch"
) {
  const settings = await getSettings();
  const fallbackQuantity = bucket.quantity ?? 1;
  const fallbackPrice = bucket.price ?? 1;
  const fallbackSettings = areSettingsConfigured(settings)
    ? settings
    : {
        ...settings,
        shopifyStoreDomain:
          settings.shopifyStoreDomain || process.env.SHOPIFY_STORE_DOMAIN || "",
        shopifyClientId:
          settings.shopifyClientId || process.env.SHOPIFY_CLIENT_ID || "",
        shopifyClientSecret:
          settings.shopifyClientSecret ||
          process.env.SHOPIFY_CLIENT_SECRET ||
          "",
        instagramAccessToken:
          settings.instagramAccessToken ||
          process.env.INSTAGRAM_ACCESS_TOKEN ||
          "",
        instagramBusinessAccountId:
          settings.instagramBusinessAccountId ||
          process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ||
          "",
      };

  return {
    settings: fallbackSettings,
    payload: {
      storeDomain: fallbackSettings.shopifyStoreDomain,
      shopifyAdminToken: fallbackSettings.shopifyAdminToken,
      instagramAccessToken: fallbackSettings.instagramAccessToken,
      instagramBusinessAccountId: fallbackSettings.instagramBusinessAccountId,
      titleRaw: bucket.titleRaw,
      descriptionRaw: bucket.descriptionRaw,
      price: fallbackPrice,
      quantity: fallbackQuantity,
      imageUrls: bucket.imageUrls,
      mode,
    },
    error: "",
  };
}

export async function enhanceBucket(
  bucketId: string,
  mode: "enhanceTitle" | "enhanceDescription"
): Promise<WorkflowResult> {
  const existingBucket = (await getBucketById(bucketId)) ?? (await createBucket());

  const payloadBuild = await buildAiriaPayload(existingBucket, mode);
  if (!payloadBuild.payload) {
    const failed = await markBucketFailed(bucketId, payloadBuild.error);
    return { bucket: failed, notFound: false, error: payloadBuild.error };
  }

  await updateBucket(bucketId, (bucket) => ({
    ...bucket,
    status: "ENHANCING",
    errorMessage: "",
  }));

  try {
    const enhanced =
      mode === "enhanceTitle"
        ? await enhanceTitleViaAiria(payloadBuild.payload)
        : await enhanceDescriptionViaAiria(payloadBuild.payload);

    const updated = await updateBucket(bucketId, (bucket) => {
      const next = {
        ...bucket,
        titleEnhanced:
          mode === "enhanceTitle" ? enhanced.title : bucket.titleEnhanced,
        descriptionEnhanced:
          mode === "enhanceDescription"
            ? enhanced.description
            : bucket.descriptionEnhanced,
        errorMessage: "",
      };

      return {
        ...next,
        status: getStableBucketStatus(next),
      };
    });

    if (!updated) {
      const fallback = await getBucketById(bucketId);
      return { bucket: fallback, notFound: false, error: "" };
    }

    return { bucket: updated, notFound: false };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : mode === "enhanceTitle"
          ? "Airia did not return an enhanced title."
          : "Airia did not return an enhanced description.";
    const failed = await updateBucket(bucketId, (bucket) => ({
      ...bucket,
      status: "FAILED",
      errorMessage: message,
    }));
    return {
      bucket: failed,
      notFound: false,
      error: message,
    };
  }
}

export async function launchBucket(bucketId: string): Promise<WorkflowResult> {
  const existingBucket = (await getBucketById(bucketId)) ?? (await createBucket());

  const payloadBuild = await buildAiriaPayload(existingBucket, "fullLaunch");
  if (!payloadBuild.payload) {
    const fallbackPayload = {
      storeDomain: normalizeStoreDomain(process.env.SHOPIFY_STORE_DOMAIN ?? ""),
      shopifyAdminToken: "",
      instagramAccessToken: process.env.INSTAGRAM_ACCESS_TOKEN ?? "",
      instagramBusinessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ?? "",
      titleRaw: existingBucket.titleRaw || "Demo Product",
      descriptionRaw: existingBucket.descriptionRaw || "Demo description",
      price: existingBucket.price ?? 1,
      quantity: existingBucket.quantity ?? 1,
      imageUrls: existingBucket.imageUrls,
      mode: "fullLaunch" as const,
    };
    const fallbackSettings = await getSettings();
    return launchBucketWithPayload(bucketId, existingBucket, fallbackPayload, fallbackSettings);
  }

  return launchBucketWithPayload(
    bucketId,
    existingBucket,
    payloadBuild.payload,
    payloadBuild.settings
  );
}

async function launchBucketWithPayload(
  bucketId: string,
  existingBucket: ProductBucket,
  payload: {
    storeDomain: string;
    shopifyAdminToken: string;
    instagramAccessToken: string;
    instagramBusinessAccountId: string;
    titleRaw: string;
    descriptionRaw: string;
    price: number;
    quantity: number;
    imageUrls: string[];
    mode: "fullLaunch";
  },
  settings: Awaited<ReturnType<typeof getSettings>>
): Promise<WorkflowResult> {

  await updateBucket(bucketId, (bucket) => ({
    ...bucket,
    status: "PROCESSING",
    errorMessage: "",
  }));

  let enhancedTitle = existingBucket.titleEnhanced.trim();
  let enhancedDescription = existingBucket.descriptionEnhanced.trim();

  if (!enhancedTitle) {
    try {
       const titleOutput = await enhanceTitleViaAiria(payload);
      enhancedTitle = titleOutput.title.trim();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Airia title enhancement failed during launch.";
      const failed = await updateBucket(bucketId, (bucket) => ({
        ...bucket,
        errorMessage: message,
        status: "FAILED",
      }));
      return {
        bucket: failed,
        notFound: false,
        error: message,
      };
    }
  }

  if (!enhancedDescription) {
    try {
       const descriptionOutput = await enhanceDescriptionViaAiria(payload);
      enhancedDescription = descriptionOutput.description.trim();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Airia description enhancement failed during launch.";
      const failed = await updateBucket(bucketId, (bucket) => ({
        ...bucket,
        titleEnhanced: enhancedTitle,
        errorMessage: message,
        status: "FAILED",
      }));
      return {
        bucket: failed,
        notFound: false,
        error: message,
      };
    }
  }

  const result = {
    success: true,
    enhancedTitle,
    enhancedDescription,
    shopifyCreated: false,
    shopifyProductId: "",
    shopifyProductUrl: "",
    instagramPublished: false,
    instagramPostId: "",
    instagramPostUrl: "",
    errorMessage: "",
  };

  const launchPayload = {
    ...payload,
    storeDomain: normalizeStoreDomain(payload.storeDomain),
    titleRaw: enhancedTitle || existingBucket.titleRaw.trim(),
    descriptionRaw: enhancedDescription || existingBucket.descriptionRaw.trim(),
  };

  const shopifyArtifact = await createShopifyProductArtifact({
    payload: launchPayload,
    airiaResult: result,
    settings,
  });

  const instagramArtifact = shopifyArtifact.shopifyCreated
    ? await publishInstagramPostArtifact({
        payload: launchPayload,
        airiaResult: result,
        settings,
        shopifyProductUrl: shopifyArtifact.shopifyProductUrl,
        shopifyImageUrl: shopifyArtifact.shopifyImageUrl,
      })
    : {
        instagramPublished: false,
        instagramPostId: "",
        instagramPostUrl: "",
        adapterMode: "live" as const,
        errorMessage:
          "Instagram was not attempted because Shopify product creation failed.",
      };
  const updated = await updateBucket(bucketId, (bucket) => {
    const errors = [
      shopifyArtifact.errorMessage,
      instagramArtifact.errorMessage,
    ].filter((message): message is string => Boolean(message && message.trim().length > 0));
    const errorMessage = errors.join(" | ");
    const isDone =
      shopifyArtifact.shopifyCreated &&
      instagramArtifact.instagramPublished &&
      errorMessage.length === 0;

    return {
      ...bucket,
      titleEnhanced: result.enhancedTitle || bucket.titleEnhanced,
      descriptionEnhanced:
        result.enhancedDescription || bucket.descriptionEnhanced,
      shopifyCreated: shopifyArtifact.shopifyCreated,
      shopifyProductId: shopifyArtifact.shopifyProductId,
      shopifyProductUrl: shopifyArtifact.shopifyProductUrl,
      instagramPublished: instagramArtifact.instagramPublished,
      instagramPostId: instagramArtifact.instagramPostId,
      instagramPostUrl: instagramArtifact.instagramPostUrl,
      errorMessage,
      status: isDone ? "DONE" : "FAILED",
    };
  });

  if (!updated) {
    const fallback = await getBucketById(bucketId);
    return { bucket: fallback, notFound: false, error: "" };
  }

  return { bucket: updated, notFound: false };
}

export async function goAllSequentially(): Promise<GoAllSummary> {
  const buckets = await getBuckets();
  const readyBucketIds = buckets
    .filter(
      (bucket) => bucket.status === "READY" && hasRequiredBucketFields(bucket)
    )
    .map((bucket) => bucket.id);

  let succeeded = 0;
  let failed = 0;

  console.info(
    `[merchflow:workflow] go-all started readyCount=${readyBucketIds.length} sequential=true`
  );

  for (const bucketId of readyBucketIds) {
    console.info(`[merchflow:workflow] go-all processing bucketId=${bucketId}`);
    const result = await launchBucket(bucketId);
    if (result.bucket?.status === "DONE") {
      succeeded += 1;
    } else {
      failed += 1;
    }
    console.info(
      `[merchflow:workflow] go-all completed bucketId=${bucketId} status=${result.bucket?.status ?? "UNKNOWN"}`
    );
  }

  console.info(
    `[merchflow:workflow] go-all finished total=${readyBucketIds.length} succeeded=${succeeded} failed=${failed}`
  );

  return {
    total: readyBucketIds.length,
    succeeded,
    failed,
    bucketIds: readyBucketIds,
  };
}
