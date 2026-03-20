import {
  getSettings,
  redactSettingsForClient,
  getSettingsStatus,
} from "@/src/lib/server/settings";
import { getRuntimeConfigSnapshot } from "@/src/lib/server/config";
import { errorResponse, okResponse } from "@/src/lib/server/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSettings();
    return okResponse({
      settings: redactSettingsForClient(settings),
      status: getSettingsStatus(settings),
      runtime: getRuntimeConfigSnapshot(settings),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load settings.";
    return errorResponse(message, { status: 500 });
  }
}
