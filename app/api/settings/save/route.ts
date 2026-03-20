import { ZodError } from "zod";
import {
  getSettingsStatus,
  redactSettingsForClient,
  saveSettings,
} from "@/src/lib/server/settings";
import { getRuntimeConfigSnapshot } from "@/src/lib/server/config";
import { errorResponse, okResponse } from "@/src/lib/server/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const settings = await saveSettings(body);
    return okResponse({
      settings: redactSettingsForClient(settings),
      status: getSettingsStatus(settings),
      runtime: getRuntimeConfigSnapshot(settings),
      message: "Connections saved.",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(
        error.issues[0]?.message ?? "Invalid settings payload.",
        { status: 400 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to save settings.";
    return errorResponse(message, { status: 500 });
  }
}
