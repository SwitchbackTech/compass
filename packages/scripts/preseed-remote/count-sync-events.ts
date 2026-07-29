/**
 * Quick Sync DB counters for ops while preseed runs.
 * Usage: COMPASS_CONFIG_FILE=... bun packages/scripts/preseed-remote/count-sync-events.ts
 */

import { MongoClient } from "mongodb";
import { readFileSync } from "node:fs";

function mongoUriFromCompassYaml(text: string): string {
  const syncBlock = text.split(/^sync:\s*$/m)[1] ?? "";
  const match =
    syncBlock.match(/^\s*mongoUri:\s*["']?([^\s"']+)/m) ??
    text.match(/^\s*mongoUri:\s*["']?([^\s"']+)/m);
  if (!match?.[1]) {
    throw new Error("sync.mongoUri not found in COMPASS_CONFIG_FILE");
  }
  return match[1];
}

function dbNameFromUri(uri: string): string {
  const withoutQuery = uri.split("?")[0] ?? uri;
  const path = withoutQuery.replace(/^mongodb(\+srv)?:\/\//, "");
  const afterAt = path.includes("@") ? path.split("@").pop()! : path;
  const name = afterAt.split("/").slice(1).join("/") || "compass_sync";
  return name || "compass_sync";
}

const configPath = process.env.COMPASS_CONFIG_FILE;
if (!configPath) {
  console.error("COMPASS_CONFIG_FILE is required");
  process.exit(2);
}

const uri = mongoUriFromCompassYaml(readFileSync(configPath, "utf8"));
const client = new MongoClient(uri);
await client.connect();
const db = client.db(dbNameFromUri(uri));
const [events, calendars, connections] = await Promise.all([
  db.collection("events").estimatedDocumentCount(),
  db.collection("provider_calendars").estimatedDocumentCount(),
  db.collection("provider_connections").estimatedDocumentCount(),
]);
console.log(
  JSON.stringify(
    {
      db: db.databaseName,
      events,
      calendars,
      connections,
      t: new Date().toISOString(),
    },
    null,
    2,
  ),
);
await client.close();
