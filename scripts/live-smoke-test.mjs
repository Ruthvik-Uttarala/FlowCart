import { envSnapshot, envValue } from "./env.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const REQUEST_TIMEOUT_MS = Number(process.env.SCRIPT_TIMEOUT_MS ?? 10_000);
const RETRIES = 2;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function hasFlag(name) {
  return process.argv.includes(name);
}

async function currentEnvSnapshot() {
  const snapshot = await envSnapshot([
    "AIRIA_API_URL",
    "AIRIA_API_KEY",
    "AIRIA_AGENT_ID",
    "AIRIA_AGENT_GUID",
  ]);
  snapshot.AIRIA_AGENT = snapshot.AIRIA_AGENT_ID || snapshot.AIRIA_AGENT_GUID;
  return snapshot;
}

async function request(pathname) {
  let lastError;

  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${BASE_URL}${pathname}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      const text = await response.text();

      let payload = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        payload = { raw: text };
      }

      return { response, payload };
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function printJson(label, value) {
  console.log(label);
  console.log(JSON.stringify(value, null, 2));
}

async function assertNoSecretLeak(payload, secrets, label) {
  const serialized = JSON.stringify(payload);
  const resolvedSecrets = [];
  for (const secret of secrets) {
    resolvedSecrets.push(await envValue(secret));
  }

  resolvedSecrets.forEach((secret) => {
    if (secret && serialized.includes(secret)) {
      throw new Error(`${label} exposed a secret value.`);
    }
  });
}

async function main() {
  console.log(`LIVE_SMOKE=START baseUrl=${BASE_URL}`);

  const [health, config, settings, buckets] = await Promise.all([
    request("/api/health"),
    request("/api/debug/config"),
    request("/api/settings"),
    request("/api/buckets"),
  ]);

  assert(health.response.ok, "Health endpoint failed.");
  assert(config.response.ok, "Config endpoint failed.");
  assert(settings.response.ok, "Settings endpoint failed.");
  assert(buckets.response.ok, "Buckets endpoint failed.");

  const expectLive = hasFlag("--expect-live");
  const envSnapshotData = await currentEnvSnapshot();
  const healthSummary = {
    appRunning: Boolean(health.payload.data?.appRunning),
    airiaMode: health.payload.data?.airiaMode ?? "unknown",
    airiaLiveConfigured: Boolean(health.payload.data?.airiaLiveConfigured),
    settingsConfigured: Boolean(health.payload.data?.settings?.configured),
    storagePersistence: health.payload.data?.storage?.persistence ?? "unknown",
    bucketCount: Array.isArray(buckets.payload.data?.buckets)
      ? buckets.payload.data.buckets.length
      : 0,
  };

  const configSummary = {
    appRunning: Boolean(config.payload.data?.appRunning),
    airiaMode: config.payload.data?.runtime?.airiaMode ?? "unknown",
    airiaLiveConfigured: Boolean(config.payload.data?.runtime?.airiaLiveConfigured),
    apiUrlPresent: Boolean(config.payload.data?.runtime?.airia?.apiUrlPresent),
    apiKeyPresent: Boolean(config.payload.data?.runtime?.airia?.apiKeyPresent),
    agentIdPresent: Boolean(config.payload.data?.runtime?.airia?.agentIdPresent),
  };

  assert(healthSummary.appRunning, "Health endpoint did not report app running.");
  assert(
    configSummary.apiUrlPresent === envSnapshotData.AIRIA_API_URL &&
      configSummary.apiKeyPresent === envSnapshotData.AIRIA_API_KEY &&
      configSummary.agentIdPresent === envSnapshotData.AIRIA_AGENT,
    "Config presence flags do not match local env snapshot."
  );

  if (expectLive) {
    assert(
      healthSummary.airiaLiveConfigured && configSummary.airiaLiveConfigured,
      "Live Airia config is incomplete."
    );
  }

  await assertNoSecretLeak(
    config.payload,
    ["AIRIA_API_URL", "AIRIA_API_KEY", "AIRIA_AGENT_ID", "AIRIA_AGENT_GUID"],
    "Debug config response"
  );
  await assertNoSecretLeak(
    settings.payload,
    ["AIRIA_API_URL", "AIRIA_API_KEY", "AIRIA_AGENT_ID", "AIRIA_AGENT_GUID"],
    "Settings response"
  );

  printJson("LIVE_SMOKE_HEALTH", healthSummary);
  printJson("LIVE_SMOKE_CONFIG", configSummary);
  printJson("LIVE_SMOKE_LOCAL_ENV", envSnapshotData);

  if (healthSummary.airiaMode === "live" || healthSummary.airiaLiveConfigured) {
    console.log("LIVE_SMOKE_MODE=LIVE_READY");
  } else {
    console.log("LIVE_SMOKE_MODE=LIVE_CONFIG_MISSING");
  }

  console.log("LIVE_SMOKE=PASS");
}

main().catch((error) => {
  console.error("LIVE_SMOKE=FAIL");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
