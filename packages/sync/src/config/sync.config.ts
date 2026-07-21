import { z } from "zod/v4";
import {
  type CompassConfig,
  loadCompassConfig,
} from "@core/config/compass.config";
import { NodeEnv } from "@core/constants/core.constants";

// Validated configuration for the Compass Sync service.
// Execution defaults to `passive`: the service starts, serves health, and
// verifies storage read-only, but must not claim jobs, complete OAuth, accept
// callbacks, or write to providers. Passive is enforced in code by later
// commits; here it is the safe default when the field is omitted.

const SYNC_PORT_DEFAULT = 3010;
const SYNC_MAX_CONCURRENCY_DEFAULT = 4;

export const SyncExecutionModeSchema = z.enum(["passive", "active"]);
export type SyncExecutionMode = z.infer<typeof SyncExecutionModeSchema>;

// Coerce yaml numbers-or-strings to a bounded positive integer.
const PositiveIntFromInput = z.coerce.number().int().positive();

// Accept a yaml boolean or the strings "true"/"false" (env vars are strings).
const BooleanFromInput = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((value) => value === true || value === "true");

export const SyncConfigSchema = z.strictObject({
  NODE_ENV: z.enum(NodeEnv),
  PORT: PositiveIntFromInput.default(SYNC_PORT_DEFAULT),
  // Isolated `compass_sync` database URI — never the backend's mongo.uri.
  MONGO_URI: z.string().trim().min(1),
  // Shared secret authenticating trusted Compass API -> Sync requests.
  INTERNAL_AUTH_TOKEN: z.string().trim().min(1),
  // Public base URL provider OAuth redirects and webhooks resolve against
  // (e.g. https://staging.compasscalendar.com). Must be a valid URL.
  CALLBACK_BASE_URL: z.url(),
  // Where the OAuth callback redirects the browser after connecting. Optional;
  // the callback falls back to CALLBACK_BASE_URL when it is unset.
  POST_CONNECT_REDIRECT_URL: z.url().optional(),
  EXECUTION: SyncExecutionModeSchema.default("passive"),
  MAX_CONCURRENCY: PositiveIntFromInput.default(SYNC_MAX_CONCURRENCY_DEFAULT),
  // On when a scoped `compass_sync` database user exists (managed cloud), so
  // startup verifies it cannot read the API database. Off for a single-database
  // self-host with no scoped user. Defaults off — enable it deliberately.
  ENFORCE_LEAST_PRIVILEGE: BooleanFromInput.default(false),
  // The Compass API's database — the one Sync's least-privilege user must NOT
  // be able to read. Only consulted when ENFORCE_LEAST_PRIVILEGE is on.
  COMPASS_API_DATABASE: z.string().trim().min(1).default("prod_calendar"),
  // Google OAuth client, shared with the Compass API's `google` config section.
  // Optional: a passive deployment without provider credentials still starts;
  // the Google adapter refuses to construct when either is absent.
  GOOGLE_CLIENT_ID: z.string().trim().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().trim().min(1).optional(),
});
export type SyncConfig = z.infer<typeof SyncConfigSchema>;

export function parseSyncConfig(config: CompassConfig): SyncConfig {
  if (!config.sync) {
    throw new Error(
      "Sync service configuration is missing: add a `sync` section to compass.yaml",
    );
  }

  return SyncConfigSchema.parse({
    NODE_ENV: config.runtime.nodeEnv,
    PORT: config.sync.port,
    MONGO_URI: config.sync.mongoUri,
    INTERNAL_AUTH_TOKEN: config.sync.internalAuthToken,
    CALLBACK_BASE_URL: config.sync.callbackBaseUrl,
    POST_CONNECT_REDIRECT_URL: config.sync.postConnectRedirectUrl || undefined,
    EXECUTION: config.sync.execution,
    MAX_CONCURRENCY: config.sync.maxConcurrency,
    ENFORCE_LEAST_PRIVILEGE: config.sync.enforceLeastPrivilege,
    COMPASS_API_DATABASE: config.sync.compassApiDatabase,
    // Empty-string (unfilled deploy placeholder) or null coerces to absent.
    GOOGLE_CLIENT_ID: config.google?.clientId || undefined,
    GOOGLE_CLIENT_SECRET: config.google?.clientSecret || undefined,
  });
}

export function parseSyncConfigFromEnv(
  rawEnv: Record<string, string | undefined>,
): SyncConfig {
  return SyncConfigSchema.parse({
    NODE_ENV: rawEnv["NODE_ENV"],
    PORT: rawEnv["SYNC_PORT"],
    MONGO_URI: rawEnv["SYNC_MONGO_URI"],
    INTERNAL_AUTH_TOKEN: rawEnv["SYNC_INTERNAL_AUTH_TOKEN"],
    CALLBACK_BASE_URL: rawEnv["SYNC_CALLBACK_BASE_URL"],
    POST_CONNECT_REDIRECT_URL:
      rawEnv["SYNC_POST_CONNECT_REDIRECT_URL"] || undefined,
    EXECUTION: rawEnv["SYNC_EXECUTION"],
    MAX_CONCURRENCY: rawEnv["SYNC_MAX_CONCURRENCY"],
    ENFORCE_LEAST_PRIVILEGE: rawEnv["SYNC_ENFORCE_LEAST_PRIVILEGE"],
    COMPASS_API_DATABASE: rawEnv["SYNC_COMPASS_API_DATABASE"],
    GOOGLE_CLIENT_ID: rawEnv["GOOGLE_CLIENT_ID"] || undefined,
    GOOGLE_CLIENT_SECRET: rawEnv["GOOGLE_CLIENT_SECRET"] || undefined,
  });
}

export function loadSyncConfig(): SyncConfig {
  return parseSyncConfig(loadCompassConfig());
}
