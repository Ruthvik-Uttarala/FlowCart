import { ConnectionSettings, ShopifyAuthMode } from "@/src/lib/types";

function parseBooleanEnv(value: string | undefined, defaultValue = false): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(normalized);
}

export function isInstagramEnabled(): boolean {
  return parseBooleanEnv(process.env.INSTAGRAM_ENABLED, true);
}

export function getShopifyAuthMode(settings: ConnectionSettings): ShopifyAuthMode {
  const clientIdPresent = (settings.shopifyClientId ?? "").trim().length > 0;
  const clientSecretPresent = (settings.shopifyClientSecret ?? "").trim().length > 0;
  const clientCredentialsPresent = clientIdPresent && clientSecretPresent;
  const adminTokenPresent = settings.shopifyAdminToken.trim().length > 0;
  const accessTokenPresent = (settings.shopifyAccessToken ?? "").trim().length > 0;

  if (clientCredentialsPresent) {
    return "client-credentials";
  }

  if (adminTokenPresent || accessTokenPresent) {
    return "admin-token";
  }

  return "missing";
}

export function hasPublicUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

export function normalizeStoreDomain(storeDomain: string): string {
  const normalized = storeDomain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  if (!normalized) {
    return "";
  }

  if (normalized.includes(".")) {
    return normalized;
  }

  return `${normalized}.myshopify.com`;
}

export function getExecutionReadiness(settings: ConnectionSettings) {
  const shopifyAuthMode = getShopifyAuthMode(settings);
  const shopifyStoreDomainReady = normalizeStoreDomain(settings.shopifyStoreDomain).length > 0;
  const shopifyClientIdReady = (settings.shopifyClientId ?? "").trim().length > 0;
  const shopifyClientSecretReady = (settings.shopifyClientSecret ?? "").trim().length > 0;
  const shopifyClientCredentialsReady = shopifyClientIdReady && shopifyClientSecretReady;
  const shopifyDirectExecutionReady = shopifyStoreDomainReady && shopifyClientCredentialsReady;
  const shopifyReady = shopifyDirectExecutionReady;
  const instagramEnabled = isInstagramEnabled();
  const instagramConfigured =
    !instagramEnabled ||
    ((settings.instagramAccessToken ?? "").trim().length > 0 &&
      settings.instagramBusinessAccountId.trim().length > 0);

  const missingRequirements: string[] = [];
  if (!shopifyStoreDomainReady) {
    missingRequirements.push("shopifyStoreDomain");
  }
  if (!shopifyClientIdReady) {
    missingRequirements.push("shopifyClientId");
  }
  if (!shopifyClientSecretReady) {
    missingRequirements.push("shopifyClientSecret");
  }
  if (instagramEnabled && (settings.instagramAccessToken ?? "").trim().length === 0) {
    missingRequirements.push("instagramAccessToken");
  }
  if (instagramEnabled && settings.instagramBusinessAccountId.trim().length === 0) {
    missingRequirements.push("instagramBusinessAccountId");
  }

  return {
    instagramEnabled,
    shopifyAuthMode,
    shopifyReady,
    shopifyDirectExecutionReady,
    instagramConfigured,
    readyToLaunch:
      shopifyStoreDomainReady &&
      shopifyDirectExecutionReady &&
      instagramConfigured,
    missingRequirements,
  };
}

export function describeExecutionReadiness(settings: ConnectionSettings) {
  const readiness = getExecutionReadiness(settings);
  return {
    ...readiness,
    modeLabel: readiness.readyToLaunch ? "Ready to Launch" : "Configuration Incomplete",
  };
}
