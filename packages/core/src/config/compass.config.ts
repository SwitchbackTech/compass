import { parseDocument } from "yaml";
import { z } from "zod";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const optionalString = z.string().nullish();

const CompassConfigSchema = z
  .object({
    compose: z
      .object({
        version: z.union([z.string(), z.number()]).optional(),
      })
      .optional(),
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
      nodeEnv: z.string(),
      timezone: z.enum(["Etc/UTC", "UTC"]),
      logLevel: z.string().optional(),
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

export function parseCompassConfigText(
  text: string,
  filePath: string,
): CompassConfig {
  const document = parseDocument(text);

  if (document.errors.length > 0) {
    throw new Error(
      `Could not parse Compass config file ${filePath}: ${document.errors[0]?.message}`,
    );
  }

  const parsed = CompassConfigSchema.safeParse(document.toJS());

  if (!parsed.success) {
    throw new Error(
      `Invalid Compass config file ${filePath}: ${parsed.error.message}`,
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
