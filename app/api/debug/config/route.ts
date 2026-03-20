import { getSettings, getSettingsStatus } from "@/src/lib/server/settings";
import { getRuntimeConfigSnapshot } from "@/src/lib/server/config";
import { describeExecutionReadiness } from "@/src/lib/server/runtime";
import { errorResponse, okResponse } from "@/src/lib/server/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSettings();
    const snapshot = getRuntimeConfigSnapshot(settings);
    const execution = describeExecutionReadiness(settings);
    return okResponse({
      timestamp: new Date().toISOString(),
      appRunning: true,
      airiaMode: snapshot.airiaMode,
      airiaLiveConfigured: snapshot.airiaLiveConfigured,
      airia: snapshot.airia,
      settings: snapshot.settings,
      settingsStatus: getSettingsStatus(settings),
      launch: snapshot.launch,
      execution,
      runtime: snapshot,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load config.";
    return errorResponse(message, { status: 500 });
  }
}
