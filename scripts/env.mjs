import { readFile } from "node:fs/promises";
import path from "node:path";

const ENV_FILES_IN_PRIORITY = [
  ".env.local",
  ".env.development.local",
  ".env.development",
  ".env",
];

let envCache = null;

function parseEnvFile(contents) {
  const parsed = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const splitIndex = trimmed.indexOf("=");
    if (splitIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, splitIndex).trim();
    const rawValue = trimmed.slice(splitIndex + 1).trim();
    const value =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue;

    parsed[key] = value;
  }

  return parsed;
}

async function readEnvFile(fileName) {
  try {
    const file = await readFile(path.join(process.cwd(), fileName), "utf8");
    return parseEnvFile(file);
  } catch {
    return {};
  }
}

async function readLocalEnv() {
  if (envCache) {
    return envCache;
  }

  const merged = {};

  for (const fileName of [...ENV_FILES_IN_PRIORITY].reverse()) {
    Object.assign(merged, await readEnvFile(fileName));
  }

  envCache = merged;
  return envCache;
}

export async function envValue(name) {
  const direct = (process.env[name] ?? "").trim();
  if (direct) {
    return direct;
  }

  const localEnv = await readLocalEnv();
  return typeof localEnv[name] === "string" ? localEnv[name].trim() : "";
}

export async function envFlag(name) {
  return (await envValue(name)).length > 0;
}

export async function envSnapshot(names) {
  const snapshot = {};

  for (const name of names) {
    snapshot[name] = await envFlag(name);
  }

  return snapshot;
}
