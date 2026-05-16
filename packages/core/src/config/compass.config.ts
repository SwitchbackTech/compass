import { parse } from "yaml";
import { z } from "zod";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const optionalString = z.string().nullish();

const CompassConfigSchema = z
  .object({
    web: z.object({
      port: z.union([z.string(), z.number()]).optional(),
      url: z.string(),
    }),
    backend: z.object({
      port: z.union([z.string(), z.number()]).optional(),
      apiUrl: z.string(),
      originsAllowed: z.array(z.string()).optional(),
      compassToken: z.string(),
    }),
    runtime: z.object({
      version: z.union([z.string(), z.number()]).optional(),
      nodeEnv: z.string(),
      logLevel: z.string().optional(),
      timezone: z.enum(["Etc/UTC", "UTC"]),
    }),
    mongo: z.object({
      username: z.string().optional(),
      password: z.string().optional(),
      replicaSetKey: z.string().optional(),
      uri: z.string(),
    }),
    supertokens: z.object({
      uri: z.string(),
      key: z.string(),
      postgres: z
        .object({
          user: z.string().optional(),
          password: z.string().optional(),
          database: z.string().optional(),
        })
        .nullish(),
    }),
    google: z
      .object({
        clientId: optionalString,
        clientSecret: optionalString,
        channelExpirationMin: z.union([z.string(), z.number()]).optional(),
        webhookUrl: optionalString,
        notificationToken: optionalString,
      })
      .nullish(),
    email: z
      .object({
        kitApiSecret: optionalString,
        kitUserTagId: z.union([z.string(), z.number()]).optional(),
      })
      .nullish(),
    posthog: z
      .object({
        key: optionalString,
        host: optionalString,
      })
      .nullish(),
  })
  .strict();

export type CompassConfig = z.infer<typeof CompassConfigSchema>;

const PLACEHOLDER_PREFIX = "REPLACE_WITH_";

function collectPlaceholderPaths(
  value: unknown,
  path: string,
  results: string[],
): void {
  if (typeof value === "string") {
    if (value.includes(PLACEHOLDER_PREFIX)) results.push(path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) =>
      collectPlaceholderPaths(item, `${path}[${i}]`, results),
    );
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(
      value as Record<string, unknown>,
    )) {
      collectPlaceholderPaths(child, path ? `${path}.${key}` : key, results);
    }
  }
}

export function parseCompassConfigText(
  text: string,
  filePath: string,
): CompassConfig {
  let rawConfig: unknown;
  try {
    rawConfig = parse(text);
  } catch (error) {
    throw new Error(
      `Could not parse Compass config file ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const parsed = CompassConfigSchema.safeParse(rawConfig);

  if (!parsed.success) {
    throw new Error(
      `Invalid Compass config file ${filePath}: ${parsed.error.message}`,
    );
  }

  const placeholderPaths: string[] = [];
  collectPlaceholderPaths(parsed.data, "", placeholderPaths);
  if (placeholderPaths.length > 0) {
    throw new Error(
      `Compass config file ${filePath} contains unfilled placeholder values.\n` +
        `Replace the following fields with real values:\n` +
        placeholderPaths.map((p) => `  - ${p}`).join("\n"),
    );
  }

  return parsed.data;
}

function findCompassConfigFile(
  explicitPath = process.env["COMPASS_CONFIG_FILE"],
): string {
  if (explicitPath) {
    return resolve(explicitPath);
  }

  // Walk up from CWD so scripts run from a subdirectory (e.g. packages/web)
  // still find compass.yaml at the repo root.
  let dir = process.cwd();
  for (;;) {
    const candidate = resolve(dir, "compass.yaml");
    if (existsSync(candidate)) return candidate;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }

  if (existsSync("/app/compass.yaml")) return "/app/compass.yaml";

  throw new Error(
    "Missing Compass config file. Create compass.yaml from compass.example.yaml.",
  );
}

function loadCompassConfigFile(filePath = findCompassConfigFile()) {
  return parseCompassConfigText(readFileSync(filePath, "utf8"), filePath);
}

export function loadCompassConfig(filePath?: string): CompassConfig {
  return loadCompassConfigFile(filePath);
}
