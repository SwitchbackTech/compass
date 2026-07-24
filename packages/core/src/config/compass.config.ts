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
        // Retained solely so existing config files remain valid after tags
        // stopped being part of Compass's email subscription flow.
        kitUserTagId: z.union([z.string(), z.number()]).optional(),
      })
      .nullish(),
    posthog: z
      .object({
        key: optionalString,
        host: optionalString,
      })
      .nullish(),
    // Compass Sync service configuration. Optional so existing deployments
    // (and the legacy backend) parse unchanged until Sync is provisioned.
    // Sync owns its OWN isolated Mongo database (mongoUri) and never reads
    // the backend's mongo.uri, per the sync-service ownership boundary.
    sync: z
      .object({
        port: z.union([z.string(), z.number()]).optional(),
        mongoUri: z.string(),
        internalAuthToken: z.string(),
        // The base URL the backend uses to reach the Sync service (e.g.
        // http://localhost:3010 in dev, an internal service URL in prod). Optional
        // so a deployment that does not delegate to Sync omits it.
        serviceUrl: z.string().optional(),
        // Which implementation serves the browser-facing provider-connection
        // routes. "legacy" (default) keeps today's in-backend flow; "sync"
        // delegates to the standalone Sync service. A single global switch, so
        // every connection is owned end-to-end by one implementation. "sync"
        // requires serviceUrl (validated backend-side).
        connectionRouting: z.enum(["legacy", "sync"]).optional(),
        // Which implementation serves the browser-facing calendar/event reads
        // and durable write commands. Independent of connectionRouting so the
        // riskier event path can be rolled out (and rolled back) on its own
        // schedule. "legacy" (default) keeps today's in-backend event store;
        // "sync" delegates to the standalone Sync service and requires
        // serviceUrl (validated backend-side).
        eventRouting: z.enum(["legacy", "sync"]).optional(),
        callbackBaseUrl: z.string(),
        // Where the OAuth callback redirects the browser after connecting;
        // defaults to callbackBaseUrl when omitted.
        postConnectRedirectUrl: z.string().optional(),
        execution: z.enum(["passive", "active"]).optional(),
        maxConcurrency: z.union([z.string(), z.number()]).optional(),
        enforceLeastPrivilege: z.union([z.boolean(), z.string()]).optional(),
        // The Compass API's database name, used by the least-privilege check.
        compassApiDatabase: z.string().optional(),
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
