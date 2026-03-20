import {
  AiriaConfigStatus,
  AiriaHeaderConfigStatus,
  AiriaRequestBodyShape,
  ConnectionSettings,
  LaunchReadinessStatus,
  SafeSettingsStatus,
  RuntimeConfigSnapshot,
} from "@/src/lib/types";
import { getSettingsStatus } from "@/src/lib/server/settings";
import { getExecutionReadiness } from "@/src/lib/server/runtime";
import { getStorageDirectory, getUploadsDirectory } from "@/src/lib/server/store";

const DEFAULT_AIRIA_AUTH_HEADER_NAME = "Authorization";
const DEFAULT_AIRIA_AUTH_HEADER_PREFIX = "Bearer ";
const DEFAULT_AIRIA_API_KEY_HEADER_NAME = "x-api-key";
const DEFAULT_AIRIA_METHOD = "POST";
const DEFAULT_AIRIA_TIMEOUT_MS = 30_000;
const DEFAULT_AIRIA_BODY_SHAPE: AiriaRequestBodyShape = "compat";
type AiriaEnvKey = "AIRIA_API_URL" | "AIRIA_API_KEY";
const AIRIA_CUSTOM_HEADER_ENV_KEYS = [
  "AIRIA_API_HEADERS_JSON",
  "AIRIA_EXTRA_HEADERS_JSON",
] as const;

function getTrimmedEnv(name: AiriaEnvKey): string {
  return process.env[name]?.trim() ?? "";
}

function getOptionalTrimmedEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function parseTimeoutMs(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return DEFAULT_AIRIA_TIMEOUT_MS;
}

function parseBodyShape(value: string | undefined): AiriaRequestBodyShape {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === "compat" ||
    normalized === "payload" ||
    normalized === "wrapped" ||
    normalized === "flat"
  ) {
    return normalized;
  }

  return DEFAULT_AIRIA_BODY_SHAPE;
}

function getAuthHeaderPrefix(): string {
  const configured = getOptionalTrimmedEnv("AIRIA_API_AUTH_HEADER_PREFIX");
  if (configured.length === 0) {
    return DEFAULT_AIRIA_AUTH_HEADER_PREFIX;
  }

  return `${configured} `;
}

function parseHeadersJson(raw: string): Record<string, string> {
  if (!raw.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      console.warn("[merchflow:airia-config] Ignoring non-object custom headers config.");
      return {};
    }

    return Object.entries(parsed).reduce<Record<string, string>>((acc, [key, value]) => {
      const trimmedKey = key.trim();
      const trimmedValue =
        typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();

      if (trimmedKey.length > 0 && trimmedValue.length > 0) {
        acc[trimmedKey] = trimmedValue;
      }

      return acc;
    }, {});
  } catch {
    console.warn("[merchflow:airia-config] Ignoring invalid custom headers JSON.");
    return {};
  }
}

function getCustomAiriaHeadersConfig(): {
  headers: Record<string, string>;
  status: AiriaHeaderConfigStatus;
} {
  const headers = AIRIA_CUSTOM_HEADER_ENV_KEYS.reduce<Record<string, string>>(
    (acc, envName) => ({ ...acc, ...parseHeadersJson(getOptionalTrimmedEnv(envName)) }),
    {}
  );

  const customHeaderNames = Object.keys(headers).sort();

  return {
    headers,
    status: {
      customHeadersPresent: customHeaderNames.length > 0,
      customHeaderNames,
    },
  };
}

function getAiriaRequiredFieldStatus() {
  const apiUrl = getTrimmedEnv("AIRIA_API_URL");
  const apiKey = getTrimmedEnv("AIRIA_API_KEY");
  const agentId =
    getOptionalTrimmedEnv("AIRIA_AGENT_ID") ||
    getOptionalTrimmedEnv("AIRIA_AGENT_GUID");

  return {
    apiUrl,
    apiKey,
    agentId,
    apiUrlPresent: apiUrl.length > 0,
    apiKeyPresent: apiKey.length > 0,
    agentIdPresent: agentId.length > 0,
    liveConfigured: apiUrl.length > 0 && apiKey.length > 0 && agentId.length > 0,
  };
}

export function getAiriaConfigStatus(): AiriaConfigStatus {
  const airia = getAiriaRequiredFieldStatus();
  const customHeaders = getCustomAiriaHeadersConfig();

  return {
    mode: airia.liveConfigured ? ("live" as const) : ("missing" as const),
    liveConfigured: airia.liveConfigured,
    apiUrlPresent: airia.apiUrlPresent,
    apiKeyPresent: airia.apiKeyPresent,
    agentIdPresent: airia.agentIdPresent,
    request: {
      method:
        getOptionalTrimmedEnv("AIRIA_API_METHOD") || DEFAULT_AIRIA_METHOD,
      timeoutMs: parseTimeoutMs(process.env.AIRIA_API_TIMEOUT_MS),
      authHeaderName:
        getOptionalTrimmedEnv("AIRIA_API_AUTH_HEADER_NAME") ||
        DEFAULT_AIRIA_AUTH_HEADER_NAME,
      apiKeyHeaderName:
        getOptionalTrimmedEnv("AIRIA_API_KEY_HEADER_NAME") ||
        DEFAULT_AIRIA_API_KEY_HEADER_NAME,
      bodyShape: parseBodyShape(process.env.AIRIA_API_BODY_SHAPE),
      customHeaders: customHeaders.status,
    },
  };
}

export function hasLiveAiriaConfig(): boolean {
  return getAiriaConfigStatus().liveConfigured;
}

export interface AiriaRuntimeConfig {
  status: AiriaConfigStatus;
  apiUrl: string;
  apiKey: string;
  agentId: string;
  authHeaderPrefix: string;
  bodyShape: AiriaRequestBodyShape;
  requestHeaders: Record<string, string>;
}

function buildRequestHeaders(
  status: AiriaConfigStatus,
  apiKey: string
): Record<string, string> {
  const customHeaders = getCustomAiriaHeadersConfig().headers;
  const authHeaderPrefix = getAuthHeaderPrefix();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (status.request.authHeaderName.trim().length > 0 && apiKey.length > 0) {
    headers[status.request.authHeaderName] = `${authHeaderPrefix}${apiKey}`;
  }

  if (status.request.apiKeyHeaderName.trim().length > 0 && apiKey.length > 0) {
    headers[status.request.apiKeyHeaderName] = apiKey;
  }

  Object.entries(customHeaders).forEach(([key, value]) => {
    const normalizedKey = key.trim();
    if (!normalizedKey) {
      return;
    }

    if (
      normalizedKey.toLowerCase() === "content-type" ||
      normalizedKey.toLowerCase() === status.request.authHeaderName.toLowerCase() ||
      normalizedKey.toLowerCase() === status.request.apiKeyHeaderName.toLowerCase()
    ) {
      return;
    }

    headers[normalizedKey] = value;
  });

  return headers;
}

export function getAiriaRuntimeConfig(): AiriaRuntimeConfig {
  const status = getAiriaConfigStatus();
  const bodyShape = parseBodyShape(process.env.AIRIA_API_BODY_SHAPE);
  const apiUrl = getTrimmedEnv("AIRIA_API_URL");
  const apiKey = getTrimmedEnv("AIRIA_API_KEY");
  const agentId =
    getOptionalTrimmedEnv("AIRIA_AGENT_ID") ||
    getOptionalTrimmedEnv("AIRIA_AGENT_GUID");
  return {
    status,
    apiUrl,
    apiKey,
    agentId,
    authHeaderPrefix: getAuthHeaderPrefix(),
    bodyShape,
    requestHeaders: buildRequestHeaders(status, apiKey),
  };
}

export function getAiriaCredentials() {
  const runtime = getAiriaRuntimeConfig();
  return {
    ...runtime,
    mode: runtime.status.mode,
    liveConfigured: runtime.status.liveConfigured,
  };
}

export function getSafeSettingsStatus(settings: ConnectionSettings): SafeSettingsStatus {
  return getSettingsStatus(settings);
}

export function getLaunchReadinessStatus(
  settings: ConnectionSettings
): LaunchReadinessStatus {
  const airia = getAiriaConfigStatus();
  const safeSettings = getSafeSettingsStatus(settings);
  const executionReadiness = getExecutionReadiness(settings);
  const missingSettingsFields = executionReadiness.missingRequirements;

  const missingAiriaFields: string[] = [];
  if (!airia.apiUrlPresent) missingAiriaFields.push("AIRIA_API_URL");
  if (!airia.apiKeyPresent) missingAiriaFields.push("AIRIA_API_KEY");
  if (!airia.agentIdPresent) {
    missingAiriaFields.push("AIRIA_AGENT_ID|AIRIA_AGENT_GUID");
  }

  const readyToLaunch = safeSettings.readyForLaunch && airia.liveConfigured;
  const modeLabel = readyToLaunch
    ? "Live Airia Ready"
    : !airia.liveConfigured
      ? "Live Airia Missing"
      : "External Settings Incomplete";

  return {
    appRunning: true,
    liveCapable: airia.liveConfigured && safeSettings.readyForLaunch,
    readyToLaunch,
    settingsConfigured: safeSettings.readyForLaunch,
    airiaConfigured: airia.liveConfigured,
    missingSettingsFields,
    missingAiriaFields,
    modeLabel,
  };
}

export function getRuntimeConfigSnapshot(
  settings: ConnectionSettings
): RuntimeConfigSnapshot {
  const airia = getAiriaConfigStatus();
  return {
    appRunning: true,
    airiaMode: airia.mode,
    airiaLiveConfigured: airia.liveConfigured,
    airia,
    settings: getSafeSettingsStatus(settings),
    launch: getLaunchReadinessStatus(settings),
    storage: {
      persistence: "file",
      dataDirectory: `${getStorageDirectory().replace(/\\/g, "/")}/data`,
      uploadsDirectory: getUploadsDirectory().replace(/\\/g, "/"),
    },
  };
}

export function logRuntimeMode(context: string): void {
  const airia = getAiriaConfigStatus();
  console.info(
    `[merchflow:${context}] airiaMode=${airia.mode} liveConfigured=${airia.liveConfigured} apiUrl=${airia.apiUrlPresent ? "yes" : "no"} apiKey=${airia.apiKeyPresent ? "yes" : "no"} agentId=${airia.agentIdPresent ? "yes" : "no"} method=${airia.request.method} bodyShape=${airia.request.bodyShape} headers=${airia.request.customHeaders.customHeadersPresent ? airia.request.customHeaders.customHeaderNames.join(",") : "none"}`
  );
}
