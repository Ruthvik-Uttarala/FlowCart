import { envFlag, envValue } from "./env.mjs";

const REQUIRED_ENV_KEYS = ["AIRIA_API_URL", "AIRIA_API_KEY", "AIRIA_AGENT"];

function hasFlag(flag) {
  return process.argv.includes(flag);
}

async function main() {
  const status = {
    AIRIA_API_URL: await envFlag("AIRIA_API_URL"),
    AIRIA_API_KEY: await envFlag("AIRIA_API_KEY"),
    AIRIA_AGENT_ID: await envFlag("AIRIA_AGENT_ID"),
    AIRIA_AGENT_GUID: await envFlag("AIRIA_AGENT_GUID"),
    AIRIA_API_METHOD: await envFlag("AIRIA_API_METHOD"),
    AIRIA_API_BODY_SHAPE: await envFlag("AIRIA_API_BODY_SHAPE"),
    AIRIA_API_TIMEOUT_MS: await envFlag("AIRIA_API_TIMEOUT_MS"),
    AIRIA_API_AUTH_HEADER_NAME: await envFlag("AIRIA_API_AUTH_HEADER_NAME"),
    AIRIA_API_AUTH_HEADER_PREFIX: await envFlag("AIRIA_API_AUTH_HEADER_PREFIX"),
    AIRIA_API_KEY_HEADER_NAME: await envFlag("AIRIA_API_KEY_HEADER_NAME"),
    AIRIA_API_HEADERS_JSON:
      (await envFlag("AIRIA_API_HEADERS_JSON")) ||
      (await envFlag("AIRIA_EXTRA_HEADERS_JSON")),
    BASE_URL: await envFlag("BASE_URL"),
  };

  status.AIRIA_AGENT = status.AIRIA_AGENT_ID || status.AIRIA_AGENT_GUID;

  const liveConfigured = REQUIRED_ENV_KEYS.every((key) => status[key]);
  const expectLive = hasFlag("--expect-live");

  if (expectLive && !liveConfigured) {
    console.error("AIRIA_CONFIG_CHECK=FAIL");
    console.error(
      JSON.stringify(
        {
          mode: "missing",
          liveConfigured,
          required: status,
          message:
            "Live Airia env vars are missing. Set AIRIA_API_URL, AIRIA_API_KEY, and AIRIA_AGENT_ID or AIRIA_AGENT_GUID.",
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  const output = {
    mode: liveConfigured ? "live" : "missing",
    liveConfigured,
    readyForLiveSwitch: liveConfigured,
    required: status,
  };

  if (liveConfigured) {
    output.values = {
      AIRIA_API_URL: await envValue("AIRIA_API_URL"),
      AIRIA_API_KEY: await envValue("AIRIA_API_KEY"),
      AIRIA_AGENT_ID: await envValue("AIRIA_AGENT_ID"),
      AIRIA_AGENT_GUID: await envValue("AIRIA_AGENT_GUID"),
    };
  }

  console.log("AIRIA_CONFIG_CHECK=PASS");
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error("AIRIA_CONFIG_CHECK=FAIL");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
