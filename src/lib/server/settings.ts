import { z } from "zod";
import { ConnectionSettings } from "@/src/lib/types";
import { readSettingsFile, writeSettingsFile } from "@/src/lib/server/store";
import {
  describeExecutionReadiness,
  getExecutionReadiness,
  getShopifyAuthMode,
} from "@/src/lib/server/runtime";

export const settingsSchema = z.object({
  shopifyStoreDomain: z.string(),
  shopifyAdminToken: z.string(),
  shopifyAccessToken: z.string().optional().default(""),
  shopifyClientId: z.string().optional().default(""),
  shopifyClientSecret: z.string().optional().default(""),
  instagramAccessToken: z.string(),
  instagramBusinessAccountId: z.string(),
});

function getEnvSetting(name: string): string {
  return (process.env[name] ?? "").trim();
}

function getEnvSettingsFallback(): ConnectionSettings {
  return {
    shopifyStoreDomain: getEnvSetting("SHOPIFY_STORE_DOMAIN"),
    shopifyAdminToken: "",
    shopifyAccessToken: "",
    shopifyClientId: getEnvSetting("SHOPIFY_CLIENT_ID"),
    shopifyClientSecret: getEnvSetting("SHOPIFY_CLIENT_SECRET"),
    instagramAccessToken: getEnvSetting("INSTAGRAM_ACCESS_TOKEN"),
    instagramBusinessAccountId: getEnvSetting("INSTAGRAM_BUSINESS_ACCOUNT_ID"),
  };
}

export async function getSettings(): Promise<ConnectionSettings> {
  const stored = await readSettingsFile();
  const envFallback = getEnvSettingsFallback();
  const parsed = settingsSchema.safeParse(stored);

  if (parsed.success) {
    return {
      ...parsed.data,
      shopifyStoreDomain:
        parsed.data.shopifyStoreDomain.trim() || envFallback.shopifyStoreDomain,
      shopifyClientId:
        (parsed.data.shopifyClientId ?? "").trim() || envFallback.shopifyClientId,
      shopifyClientSecret:
        (parsed.data.shopifyClientSecret ?? "").trim() ||
        envFallback.shopifyClientSecret,
      instagramAccessToken:
        parsed.data.instagramAccessToken.trim() || envFallback.instagramAccessToken,
      instagramBusinessAccountId:
        parsed.data.instagramBusinessAccountId.trim() ||
        envFallback.instagramBusinessAccountId,
    };
  }

  return envFallback;
}

export function redactSettingsForClient(
  settings: ConnectionSettings
): ConnectionSettings {
  return {
    ...settings,
    shopifyAdminToken: "",
    shopifyAccessToken: "",
    shopifyClientSecret: "",
    instagramAccessToken: "",
  };
}

export function getSettingsStatus(settings: ConnectionSettings) {
  const readiness = describeExecutionReadiness(settings);
  return {
    shopifyStoreDomainPresent: settings.shopifyStoreDomain.trim().length > 0,
    shopifyAdminTokenPresent: settings.shopifyAdminToken.trim().length > 0,
    shopifyAccessTokenPresent:
      (settings.shopifyAccessToken ?? "").trim().length > 0,
    shopifyClientIdPresent: (settings.shopifyClientId ?? "").trim().length > 0,
    shopifyClientSecretPresent:
      (settings.shopifyClientSecret ?? "").trim().length > 0,
    shopifyClientCredentialsPresent:
      (settings.shopifyClientId ?? "").trim().length > 0 &&
      (settings.shopifyClientSecret ?? "").trim().length > 0,
    shopifyAuthMode: getShopifyAuthMode(settings),
    instagramAccessTokenPresent: settings.instagramAccessToken.trim().length > 0,
    instagramBusinessAccountIdPresent:
      settings.instagramBusinessAccountId.trim().length > 0,
    instagramEnabled: readiness.instagramEnabled,
    configured: areSettingsConfigured(settings),
    readyForLaunch: readiness.readyToLaunch,
  };
}

export async function saveSettings(input: unknown): Promise<ConnectionSettings> {
  const parsed = settingsSchema.parse(input);
  const existing = await getSettings();
  const nextSettings: ConnectionSettings = {
    shopifyStoreDomain:
      parsed.shopifyStoreDomain.trim() || existing.shopifyStoreDomain,
    shopifyAdminToken:
      parsed.shopifyAdminToken.trim() || existing.shopifyAdminToken,
    shopifyAccessToken:
      parsed.shopifyAccessToken?.trim() || existing.shopifyAccessToken || "",
    shopifyClientId: parsed.shopifyClientId?.trim() || existing.shopifyClientId || "",
    shopifyClientSecret:
      parsed.shopifyClientSecret?.trim() || existing.shopifyClientSecret || "",
    instagramAccessToken:
      parsed.instagramAccessToken.trim() || existing.instagramAccessToken,
    instagramBusinessAccountId:
      parsed.instagramBusinessAccountId.trim() || existing.instagramBusinessAccountId,
  };

  await writeSettingsFile(nextSettings);
  return nextSettings;
}

export function areSettingsConfigured(settings: ConnectionSettings): boolean {
  return getExecutionReadiness(settings).readyToLaunch;
}
