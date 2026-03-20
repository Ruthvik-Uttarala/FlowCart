import path from "node:path";
import { promises as fs } from "node:fs";
import { envValue } from "./env.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3100";

const defaultSettings = {
  shopifyStoreDomain: "",
  shopifyAdminToken: "",
  shopifyAccessToken: "",
  shopifyClientId: "",
  shopifyClientSecret: "",
  instagramAccessToken: "",
  instagramBusinessAccountId: "",
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function extractError(payload, fallback) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  if (typeof payload.error === "string" && payload.error) {
    return payload.error;
  }

  if (payload.error && typeof payload.error === "object" && typeof payload.error.message === "string") {
    return payload.error.message;
  }

  return fallback;
}

async function request(pathname, options = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, options);
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }

  return { response, payload, text };
}

async function resetLocalStorageFiles() {
  const root = process.cwd();
  const dataDir = path.join(root, "data");
  const uploadsDir = path.join(root, "uploads");
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(uploadsDir, { recursive: true });

  await fs.writeFile(
    path.join(dataDir, "settings.json"),
    `${JSON.stringify(defaultSettings, null, 2)}\n`,
    "utf8"
  );
  await fs.writeFile(path.join(dataDir, "buckets.json"), "[]\n", "utf8");

  const uploadEntries = await fs.readdir(uploadsDir);
  await Promise.all(
    uploadEntries.map((entry) => fs.rm(path.join(uploadsDir, entry), { force: true }))
  );
}

async function buildLiveSettingsPayload() {
  const payload = {
    shopifyStoreDomain: await envValue("SHOPIFY_STORE_DOMAIN"),
    shopifyClientId: await envValue("SHOPIFY_CLIENT_ID"),
    shopifyClientSecret: await envValue("SHOPIFY_CLIENT_SECRET"),
    instagramAccessToken: await envValue("INSTAGRAM_ACCESS_TOKEN"),
    instagramBusinessAccountId: await envValue("INSTAGRAM_BUSINESS_ACCOUNT_ID"),
    shopifyAdminToken: "",
    shopifyAccessToken: "",
  };

  const missing = [];
  if (!payload.shopifyStoreDomain) missing.push("SHOPIFY_STORE_DOMAIN");
  if (!payload.shopifyClientId) missing.push("SHOPIFY_CLIENT_ID");
  if (!payload.shopifyClientSecret) missing.push("SHOPIFY_CLIENT_SECRET");
  if (!payload.instagramAccessToken) missing.push("INSTAGRAM_ACCESS_TOKEN");
  if (!payload.instagramBusinessAccountId) {
    missing.push("INSTAGRAM_BUSINESS_ACCOUNT_ID");
  }

  return { payload, missing };
}

async function createReadyBucket(titleRaw, descriptionRaw) {
  const created = await request("/api/buckets/create", { method: "POST" });
  assert(created.response.status === 201, extractError(created.payload, "Bucket creation failed."));
  const bucketId = created.payload.data?.bucket?.id;
  assert(typeof bucketId === "string" && bucketId.length > 0, "Missing bucket id.");

  const patch = await request(`/api/buckets/${bucketId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titleRaw,
      descriptionRaw,
      quantity: 3,
      price: 19.99,
    }),
  });
  assert(patch.response.ok, extractError(patch.payload, "Bucket patch failed."));

  const pngBuffer = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAwMB/6nH8WQAAAAASUVORK5CYII=",
    "base64"
  );
  const formData = new FormData();
  formData.append("images", new Blob([pngBuffer], { type: "image/png" }), "tiny.png");

  const upload = await request(`/api/buckets/${bucketId}/upload`, {
    method: "POST",
    body: formData,
  });
  assert(upload.response.ok, extractError(upload.payload, "Bucket upload failed."));
  const firstUrl = upload.payload.data?.bucket?.imageUrls?.[0];
  assert(typeof firstUrl === "string", "Uploaded image URL missing.");

  const uploadResponse = await fetch(`${BASE_URL}${firstUrl}`);
  assert(uploadResponse.ok, "Uploaded image endpoint failed.");

  const loaded = await request("/api/buckets");
  const persistedBucket = loaded.payload.data?.buckets?.find((item) => item.id === bucketId);
  assert(Boolean(persistedBucket), "Created bucket not persisted.");

  return bucketId;
}

async function assertAiriaLiveConfigured() {
  const config = await request("/api/debug/config");
  assert(config.response.ok, "Debug config endpoint failed.");
  const runtime = config.payload?.data?.runtime;
  assert(Boolean(runtime?.airiaLiveConfigured), "Airia live mode is not configured.");
}

async function main() {
  const liveSettings = await buildLiveSettingsPayload();
  assert(
    liveSettings.missing.length === 0,
    `Missing required env vars for live verification: ${liveSettings.missing.join(", ")}`
  );

  await resetLocalStorageFiles();
  await assertAiriaLiveConfigured();

  const home = await fetch(`${BASE_URL}/`);
  assert(home.status === 200, "Home page did not load.");

  const settingsPage = await fetch(`${BASE_URL}/settings`);
  assert(settingsPage.status === 200, "Settings page did not load.");

  const dashboardPage = await fetch(`${BASE_URL}/dashboard`);
  assert(dashboardPage.status === 200, "Dashboard page did not load.");

  const saveSettingsResponse = await request("/api/settings/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(liveSettings.payload),
  });
  assert(saveSettingsResponse.response.ok, extractError(saveSettingsResponse.payload, "Settings save failed."));

  const getSettingsResponse = await request("/api/settings");
  assert(getSettingsResponse.response.ok, extractError(getSettingsResponse.payload, "Settings load failed."));
  assert(
    getSettingsResponse.payload.data?.settings?.shopifyStoreDomain ===
      liveSettings.payload.shopifyStoreDomain,
    "Saved settings were not persisted."
  );

  const primaryBucketId = await createReadyBucket(
    "Primary Product Live",
    "Primary description for live launch."
  );

  const titleEnhance = await request(
    `/api/buckets/${primaryBucketId}/enhance-title`,
    { method: "POST" }
  );
  assert(titleEnhance.response.ok, extractError(titleEnhance.payload, "Enhance title failed."));
  assert(
    typeof titleEnhance.payload.data?.bucket?.titleEnhanced === "string" &&
      titleEnhance.payload.data.bucket.titleEnhanced.length > 0,
    "Enhanced title missing."
  );

  const descriptionEnhance = await request(
    `/api/buckets/${primaryBucketId}/enhance-description`,
    { method: "POST" }
  );
  assert(
    descriptionEnhance.response.ok,
    extractError(descriptionEnhance.payload, "Enhance description failed.")
  );
  assert(
    typeof descriptionEnhance.payload.data?.bucket?.descriptionEnhanced === "string" &&
      descriptionEnhance.payload.data.bucket.descriptionEnhanced.length > 0,
    "Enhanced description missing."
  );

  const goPrimary = await request(`/api/buckets/${primaryBucketId}/go`, {
    method: "POST",
  });
  assert(
    goPrimary.response.ok || goPrimary.response.status === 400,
    "Go endpoint should return a handled response."
  );
  const goPrimaryBucket =
    goPrimary.payload.data?.bucket ?? goPrimary.payload.error?.details?.bucket;
  assert(Boolean(goPrimaryBucket), "Go endpoint did not return bucket payload.");
  assert(
    goPrimaryBucket.shopifyCreated === true || goPrimaryBucket.status === "FAILED",
    "Shopify launch path did not execute."
  );
  assert(
    goPrimaryBucket.status === "DONE" || goPrimaryBucket.status === "FAILED",
    "Go endpoint did not resolve to DONE or FAILED."
  );

  const failureBucketId = await createReadyBucket(
    "__FAIL__ Failure Product",
    "Description that triggers __FAIL__"
  );
  const failureGo = await request(`/api/buckets/${failureBucketId}/go`, {
    method: "POST",
  });
  assert(
    failureGo.response.ok || failureGo.response.status === 400,
    "Forced failure should return a handled response."
  );
  const failureBucket =
    failureGo.payload.data?.bucket ?? failureGo.payload.error?.details?.bucket;
  assert(failureBucket?.status === "FAILED", "Forced failure should be FAILED.");

  const batchSuccessId = await createReadyBucket("Batch Success", "Batch A");
  const batchFailId = await createReadyBucket("__FAIL__ Batch Fail", "Batch B");

  const goAll = await request("/api/buckets/go-all", { method: "POST" });
  assert(goAll.response.ok, extractError(goAll.payload, "Go(All) failed."));
  assert(goAll.payload.data?.summary?.total === 2, "Go(All) did not process 2 READY buckets.");
  assert(
    Array.isArray(goAll.payload.data?.summary?.bucketIds) &&
      goAll.payload.data.summary.bucketIds[0] === batchSuccessId &&
      goAll.payload.data.summary.bucketIds[1] === batchFailId,
    "Go(All) did not process buckets sequentially in ready order."
  );

  const finalBuckets = await request("/api/buckets");
  assert(finalBuckets.response.ok, "Final bucket load failed.");
  const finalSuccess = finalBuckets.payload.data?.buckets?.find(
    (bucket) => bucket.id === batchSuccessId
  );
  const finalFail = finalBuckets.payload.data?.buckets?.find(
    (bucket) => bucket.id === batchFailId
  );
  assert(
    finalSuccess?.status === "DONE" || finalSuccess?.status === "FAILED",
    "Go(All) success bucket did not resolve."
  );
  assert(finalFail?.status === "FAILED", "Go(All) failure bucket not FAILED.");

  console.log("VERIFY_RESULT=PASS");
  console.log("CHECK_1_APP_START=PASS");
  console.log("CHECK_2_SETTINGS_LOAD_SAVE=PASS");
  console.log("CHECK_3_DASHBOARD_PAGE_LOAD=PASS");
  console.log("CHECK_4_FIELD_PERSISTENCE=PASS");
  console.log("CHECK_5_IMAGE_UPLOAD_PERSISTENCE=PASS");
  console.log("CHECK_6_ENHANCE_TITLE=PASS");
  console.log("CHECK_7_ENHANCE_DESCRIPTION=PASS");
  console.log("CHECK_8_GO_BACKEND=PASS");
  console.log("CHECK_9_DONE_OR_EXPLICIT_FAIL=PASS");
  console.log("CHECK_10_FORCED_FAIL=PASS");
  console.log("CHECK_11_GO_ALL_SEQUENTIAL=PASS");
}

main().catch((error) => {
  console.error("VERIFY_RESULT=FAIL");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
