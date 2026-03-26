import { createHash } from "node:crypto";
import { z } from "zod";
import { AiriaPayload, AiriaRequestBodyShape, AiriaResult, ConnectionSettings } from "@/src/lib/types";
import { getAiriaRuntimeConfig, logRuntimeMode } from "@/src/lib/server/config";

type AiriaPayloadWithoutMode = Omit<AiriaPayload, "mode">;
type AiriaEnhancementOutput = {
  title: string;
  description: string;
};

const airiaPayloadSchema = z.object({
  storeDomain: z.string(),
  shopifyAdminToken: z.string(),
  instagramAccessToken: z.string(),
  instagramBusinessAccountId: z.string(),
  titleRaw: z.string(),
  descriptionRaw: z.string(),
  price: z.number().nonnegative(),
  quantity: z.number().int().nonnegative(),
  imageUrls: z.array(z.string()),
  mode: z.enum(["enhanceTitle", "enhanceDescription", "fullLaunch"]),
});

const airiaResultSchema = z
  .object({
    success: z.boolean().nullish(),
    enhancedTitle: z.string().nullish(),
    enhancedDescription: z.string().nullish(),
    shopifyCreated: z.boolean().nullish(),
    shopifyProductId: z.string().nullish(),
    shopifyProductUrl: z.string().nullish(),
    instagramPublished: z.boolean().nullish(),
    instagramPostId: z.string().nullish(),
    instagramPostUrl: z.string().nullish(),
    errorMessage: z.string().nullish(),
  })
  .passthrough();

const airiaResultDefaults: AiriaResult = {
  success: false,
  enhancedTitle: "",
  enhancedDescription: "",
  shopifyCreated: false,
  shopifyProductId: "",
  shopifyProductUrl: "",
  instagramPublished: false,
  instagramPostId: "",
  instagramPostUrl: "",
  errorMessage: "",
};

type AiriaResponseCandidate = {
  data?: unknown;
  result?: unknown;
  response?: unknown;
  payload?: unknown;
  output?: unknown;
  outputs?: unknown;
  value?: unknown;
};

interface ParsedResultFromText {
  success?: boolean;
  enhancedTitle?: string;
  enhancedDescription?: string;
  shopifyCreated?: boolean;
  shopifyProductId?: string;
  shopifyProductUrl?: string;
  instagramPublished?: boolean;
  instagramPostId?: string;
  instagramPostUrl?: string;
  errorMessage?: string;
}

type ParsedEnhancementHints = {
  title: string;
  description: string;
};

function stableToken(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 10);
}

function redactUrlForLog(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.host || "unknown-host";
  } catch {
    return "invalid-url";
  }
}

function describeBodyShape(shape: AiriaRequestBodyShape): string {
  return shape;
}

function createFailureResult(message: string): AiriaResult {
  return {
    ...airiaResultDefaults,
    errorMessage: message,
  };
}

function normalizeAiriaResponseCandidate(input: unknown): unknown {
  if (typeof input !== "object" || input === null) {
    return input;
  }

  const candidate = input as AiriaResponseCandidate;
  return (
    candidate.data ??
    candidate.result ??
    candidate.response ??
    candidate.payload ??
    candidate.output ??
    candidate.outputs ??
    candidate.value ??
    input
  );
}

function buildCompatLiveRequestBody(
  payload: AiriaPayload,
  requestId: string,
  agentId: string
) {
  const modeLabel =
    payload.mode === "enhanceTitle"
      ? "enhanceTitle"
      : payload.mode === "enhanceDescription"
        ? "enhanceDescription"
        : "fullLaunch";
  const userInput = [
    "You are MerchFlow AI.",
    "Return strict JSON only. No markdown.",
    "Output keys: success, enhancedTitle, enhancedDescription, shopifyCreated, shopifyProductId, shopifyProductUrl, instagramPublished, instagramPostId, instagramPostUrl, errorMessage.",
    `mode: ${modeLabel}`,
    `titleRaw: ${payload.titleRaw}`,
    `descriptionRaw: ${payload.descriptionRaw}`,
    `price: ${payload.price}`,
    `quantity: ${payload.quantity}`,
    `imageUrls: ${JSON.stringify(payload.imageUrls)}`,
    "Rules: do not hallucinate details. Keep title <= 70 chars when enhancing title.",
  ].join("\n");

  return {
    UserInput: userInput,
    Images: payload.imageUrls.filter((url) => /^https?:\/\//i.test(url)),
    Files: [],
    Metadata: {
      requestId,
      agentId,
      mode: payload.mode,
      payload,
    },
  };
}

function buildLiveRequestBody(
  payload: AiriaPayload,
  requestId: string,
  agentId: string,
  bodyShape: AiriaRequestBodyShape
): Record<string, unknown> | AiriaPayload {
  switch (bodyShape) {
    case "payload":
      return payload;
    case "wrapped":
      return {
        requestId,
        agentId,
        mode: payload.mode,
        input: payload,
      };
    case "flat":
      return {
        requestId,
        agentId,
        mode: payload.mode,
        storeDomain: payload.storeDomain,
        shopifyAdminToken: payload.shopifyAdminToken,
        instagramAccessToken: payload.instagramAccessToken,
        instagramBusinessAccountId: payload.instagramBusinessAccountId,
        titleRaw: payload.titleRaw,
        descriptionRaw: payload.descriptionRaw,
        price: payload.price,
        quantity: payload.quantity,
        imageUrls: payload.imageUrls,
      };
    case "compat":
    default:
      return buildCompatLiveRequestBody(payload, requestId, agentId);
  }
}

function extractJsonFromText(raw: string): ParsedResultFromText | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch?.[1]?.trim() || trimmed;
  try {
    return JSON.parse(candidate) as ParsedResultFromText;
  } catch {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const partial = candidate.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(partial) as ParsedResultFromText;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function cleanTextValue(input: string, maxLength = 4000): string {
  return input
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function extractEnhancementHintsFromMalformedText(raw: string): ParsedEnhancementHints | null {
  const text = raw.trim();
  if (!text) {
    return null;
  }

  const titleMatch =
    text.match(/(?:enhanced[_\s-]*title|title)\s*[:=-]\s*(.+)/i) ??
    text.match(/headline\s*[:=-]\s*(.+)/i);
  const descriptionMatch =
    text.match(/(?:enhanced[_\s-]*description|description|body)\s*[:=-]\s*([\s\S]+)/i) ??
    null;

  const title = cleanTextValue(titleMatch?.[1] ?? "", 120);
  const description = cleanTextValue(descriptionMatch?.[1] ?? "", 3000);

  if (!title && !description) {
    return null;
  }

  return { title, description };
}

function readStringKey(
  value: unknown,
  keys: string[]
): string {
  if (!value || typeof value !== "object") {
    return "";
  }
  const candidate = value as Record<string, unknown>;
  for (const key of keys) {
    const raw = candidate[key];
    if (typeof raw === "string" && raw.trim()) {
      return raw.trim();
    }
  }
  return "";
}

function normalizeAiriaResponse(input: unknown, mode: AiriaPayload["mode"]): AiriaResult {
  const candidate = normalizeAiriaResponseCandidate(input);
  const directParsed = airiaResultSchema.safeParse(candidate);

  if (directParsed.success) {
    const value = directParsed.data;
    const fallbackTitle =
      readStringKey(candidate, ["enhanced_title", "title", "headline"]) ||
      readStringKey(input, ["enhancedTitle", "enhanced_title", "title"]);
    const fallbackDescription =
      readStringKey(candidate, ["enhanced_description", "description", "body"]) ||
      readStringKey(input, [
        "enhancedDescription",
        "enhanced_description",
        "description",
      ]);
    const enhancedTitle = value.enhancedTitle ?? (mode === "enhanceTitle" ? fallbackTitle : "");
    const enhancedDescription =
      value.enhancedDescription ??
      (mode === "enhanceDescription" ? fallbackDescription : "");
    return {
      success:
        value.success ??
        Boolean(
          enhancedTitle ||
            enhancedDescription ||
            value.shopifyCreated ||
            value.instagramPublished ||
            value.shopifyProductId ||
            value.shopifyProductUrl ||
            value.instagramPostId ||
            value.instagramPostUrl
        ),
      enhancedTitle,
      enhancedDescription,
      shopifyCreated: value.shopifyCreated ?? false,
      shopifyProductId: value.shopifyProductId ?? "",
      shopifyProductUrl: value.shopifyProductUrl ?? "",
      instagramPublished: value.instagramPublished ?? false,
      instagramPostId: value.instagramPostId ?? "",
      instagramPostUrl: value.instagramPostUrl ?? "",
      errorMessage: value.errorMessage ?? "",
    };
  }

  if (typeof candidate === "string") {
    const parsedFromText = extractJsonFromText(candidate);
    if (parsedFromText) {
      const merged = airiaResultSchema.safeParse(parsedFromText);
      if (merged.success) {
        const value = merged.data;
        const fallbackTitle = readStringKey(parsedFromText, [
          "enhanced_title",
          "title",
          "headline",
        ]);
        const fallbackDescription = readStringKey(parsedFromText, [
          "enhanced_description",
          "description",
          "body",
        ]);
        const enhancedTitle =
          value.enhancedTitle ?? (mode === "enhanceTitle" ? fallbackTitle : "");
        const enhancedDescription =
          value.enhancedDescription ??
          (mode === "enhanceDescription" ? fallbackDescription : "");
        return {
          success:
            value.success ??
            Boolean(enhancedTitle || enhancedDescription),
          enhancedTitle,
          enhancedDescription,
          shopifyCreated: value.shopifyCreated ?? false,
          shopifyProductId: value.shopifyProductId ?? "",
          shopifyProductUrl: value.shopifyProductUrl ?? "",
          instagramPublished: value.instagramPublished ?? false,
          instagramPostId: value.instagramPostId ?? "",
          instagramPostUrl: value.instagramPostUrl ?? "",
          errorMessage: value.errorMessage ?? "",
        };
      }
    }

    const malformedHints = extractEnhancementHintsFromMalformedText(candidate);
    if (malformedHints) {
      return {
        ...airiaResultDefaults,
        success:
          mode === "enhanceTitle"
            ? malformedHints.title.length > 0
            : malformedHints.description.length > 0,
        enhancedTitle:
          mode === "enhanceTitle"
            ? malformedHints.title
            : malformedHints.title || "",
        enhancedDescription:
          mode === "enhanceDescription"
            ? malformedHints.description
            : malformedHints.description || "",
      };
    }

    if (mode === "enhanceTitle") {
      const normalized = cleanTextValue(candidate, 120);
      return {
        ...airiaResultDefaults,
        success: normalized.length > 0,
        enhancedTitle: normalized,
      };
    }

    if (mode === "enhanceDescription") {
      const normalized = cleanTextValue(candidate, 3000);
      return {
        ...airiaResultDefaults,
        success: normalized.length > 0,
        enhancedDescription: normalized,
      };
    }
  }

  console.warn("[merchflow:airia] invalid response shape from upstream.");
  return createFailureResult("Airia returned an invalid response shape.");
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json().catch(() => ({}));
  }

  const text = await response.text().catch(() => "");
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function buildForcedFailureIfRequested(payload: AiriaPayload): AiriaResult | null {
  const failRequested =
    payload.titleRaw.includes("__FAIL__") || payload.descriptionRaw.includes("__FAIL__");
  if (!failRequested) {
    return null;
  }

  return createFailureResult("Forced failure triggered by __FAIL__.");
}

function previewBodyForLog(value: unknown): string {
  if (typeof value === "string") {
    return value.slice(0, 400);
  }
  try {
    return JSON.stringify(value).slice(0, 400);
  } catch {
    return "[unserializable]";
  }
}

async function executeAiriaRequest(
  payload: AiriaPayload,
  settings?: ConnectionSettings
): Promise<AiriaResult> {
  const runtime = getAiriaRuntimeConfig(settings);
  const requestId = stableToken(
    [
      payload.mode,
      payload.storeDomain,
      payload.titleRaw,
      payload.descriptionRaw,
      payload.quantity,
      payload.price,
      payload.imageUrls.join("|"),
    ].join("|")
  );

  console.info(
    `[merchflow:airia] request started requestId=${requestId} mode=${runtime.status.mode} liveConfigured=${runtime.status.liveConfigured} endpoint=${redactUrlForLog(runtime.apiUrl)} method=${runtime.status.request.method} bodyShape=${describeBodyShape(runtime.bodyShape)}`
  );
  logRuntimeMode("airia", settings);

  const forcedFailure = buildForcedFailureIfRequested(payload);
  if (forcedFailure) {
    return forcedFailure;
  }

  if (!runtime.status.liveConfigured) {
    console.error(
      `[merchflow:airia] live config missing requestId=${requestId} endpoint=${redactUrlForLog(runtime.apiUrl)}`
    );
    return createFailureResult(
      "Airia live configuration is missing. Set AIRIA_API_URL, AIRIA_API_KEY, and AIRIA_AGENT_ID or AIRIA_AGENT_GUID, or configure them in Settings."
    );
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(
    () => controller.abort(),
    runtime.status.request.timeoutMs
  );

  try {
    const requestBody = buildLiveRequestBody(
      payload,
      requestId,
      runtime.agentId,
      runtime.bodyShape
    );

    console.info(
      `[merchflow:airia] sending request requestId=${requestId} url=${redactUrlForLog(runtime.apiUrl)} agentId=${runtime.agentId.slice(0, 8)}... bodyShape=${runtime.bodyShape}`
    );

    const response = await fetch(runtime.apiUrl, {
      method: runtime.status.request.method,
      headers: {
        ...runtime.requestHeaders,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    const responseBody = await readResponseBody(response);

    console.info(
      `[merchflow:airia] response received requestId=${requestId} status=${response.status} body=${previewBodyForLog(responseBody)}`
    );

    const normalized = normalizeAiriaResponse(responseBody, payload.mode);

    if (!response.ok) {
      console.error(
        `[merchflow:airia] upstream failure requestId=${requestId} status=${response.status} endpoint=${redactUrlForLog(runtime.apiUrl)} body=${previewBodyForLog(responseBody)}`
      );
      return {
        ...normalized,
        success: false,
        shopifyCreated: false,
        instagramPublished: false,
        errorMessage:
          normalized.errorMessage ||
          `Airia request failed with status ${response.status}.`,
      };
    }

    return normalized;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Airia error.";
    console.error(
      `[merchflow:airia] upstream failure requestId=${requestId} endpoint=${redactUrlForLog(runtime.apiUrl)} error=${message}`
    );
    return createFailureResult(`Airia request failed: ${message}`);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export async function runAiria(rawPayload: unknown, settings?: ConnectionSettings): Promise<AiriaResult> {
  const payload = airiaPayloadSchema.parse(rawPayload);

  const firstAttempt = await executeAiriaRequest(payload, settings);

  if (
    !firstAttempt.success &&
    firstAttempt.errorMessage.includes("status 500")
  ) {
    console.warn(
      `[merchflow:airia] retrying after 500 error mode=${payload.mode}`
    );
    const retryResult = await executeAiriaRequest(payload, settings);
    return retryResult;
  }

  return firstAttempt;
}

export async function callAiriaAgent(payload: AiriaPayload, settings?: ConnectionSettings): Promise<AiriaResult> {
  return runAiria(payload, settings);
}

function toEnhancementOutput(
  payload: AiriaPayloadWithoutMode,
  mode: "enhanceTitle" | "enhanceDescription",
  result: AiriaResult
): AiriaEnhancementOutput {
  const title = result.enhancedTitle.trim();
  const description = result.enhancedDescription.trim();

  if (mode === "enhanceTitle" && (!result.success || !title)) {
    throw new Error(result.errorMessage || "Airia did not return an enhanced title.");
  }

  if (mode === "enhanceDescription" && (!result.success || !description)) {
    throw new Error(
      result.errorMessage || "Airia did not return an enhanced description."
    );
  }

  return {
    title: mode === "enhanceTitle" ? title : payload.titleRaw.trim(),
    description:
      mode === "enhanceDescription" ? description : payload.descriptionRaw.trim(),
  };
}

export async function enhanceTitleViaAiria(
  payload: AiriaPayloadWithoutMode,
  settings?: ConnectionSettings
): Promise<AiriaEnhancementOutput> {
  const result = await callAiriaAgent({
    ...payload,
    mode: "enhanceTitle",
  }, settings);
  return toEnhancementOutput(payload, "enhanceTitle", result);
}

export async function enhanceDescriptionViaAiria(
  payload: AiriaPayloadWithoutMode,
  settings?: ConnectionSettings
): Promise<AiriaEnhancementOutput> {
  const result = await callAiriaAgent({
    ...payload,
    mode: "enhanceDescription",
  }, settings);
  return toEnhancementOutput(payload, "enhanceDescription", result);
}

export async function fullLaunchViaAiria(
  payload: AiriaPayloadWithoutMode,
  settings?: ConnectionSettings
): Promise<AiriaResult> {
  return callAiriaAgent({
    ...payload,
    mode: "fullLaunch",
  }, settings);
}
