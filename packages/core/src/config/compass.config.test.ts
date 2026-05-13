import {
  mapCompassConfigToEnv,
  parseCompassConfigText,
} from "./compass.config";
import { describe, expect, it } from "bun:test";

const validYaml = `
compose:
  version: latest
ports:
  web: 9080
  backend: 3000
runtime:
  nodeEnv: development
  timezone: Etc/UTC
  logLevel: debug
urls:
  frontend: http://localhost:9080
  backendApi: http://localhost:3000/api
  cors:
    - http://localhost:3000
    - http://localhost:9080
mongo:
  username: compass
  password: mongo-password
  replicaSetKey: replica-set-key
  uri: mongodb://localhost:27017/compass
supertokens:
  uri: http://localhost:3567
  key: supertokens-key
  postgres:
    user: supertokens
    password: postgres-password
    database: supertokens
tokens:
  compassSync: sync-token
  googleCalendarNotification: notification-token
google:
  channelExpirationMin: 10
`;

describe("compass config", () => {
  it("maps grouped YAML to the existing env-shaped runtime contract", () => {
    const config = parseCompassConfigText(validYaml, "compass.yaml");

    expect(mapCompassConfigToEnv(config)).toEqual({
      BASEURL: "http://localhost:3000/api",
      CHANNEL_EXPIRATION_MIN: "10",
      CORS: "http://localhost:3000,http://localhost:9080",
      EMAILER_API_SECRET: undefined,
      EMAILER_USER_TAG_ID: undefined,
      FRONTEND_URL: "http://localhost:9080",
      GCAL_WEBHOOK_BASEURL: undefined,
      GOOGLE_CLIENT_ID: undefined,
      GOOGLE_CLIENT_SECRET: undefined,
      LOG_LEVEL: "debug",
      MONGO_INITDB_ROOT_PASSWORD: "mongo-password",
      MONGO_INITDB_ROOT_USERNAME: "compass",
      MONGO_REPLICA_SET_KEY: "replica-set-key",
      MONGO_URI: "mongodb://localhost:27017/compass",
      NODE_ENV: "development",
      PORT: "3000",
      POSTHOG_HOST: undefined,
      POSTHOG_KEY: undefined,
      SUPERTOKENS_KEY: "supertokens-key",
      SUPERTOKENS_POSTGRES_DB: "supertokens",
      SUPERTOKENS_POSTGRES_PASSWORD: "postgres-password",
      SUPERTOKENS_POSTGRES_USER: "supertokens",
      SUPERTOKENS_URI: "http://localhost:3567",
      TOKEN_COMPASS_SYNC: "sync-token",
      TOKEN_GCAL_NOTIFICATION: "notification-token",
      TZ: "Etc/UTC",
      WEB_PORT: "9080",
      COMPASS_VERSION: "latest",
      COMPASS_HEALTH_URL: undefined,
    });
  });

  it("omits optional Google and email config when keys are absent", () => {
    const env = mapCompassConfigToEnv(
      parseCompassConfigText(validYaml, "compass.yaml"),
    );

    expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
    expect(env.GOOGLE_CLIENT_SECRET).toBeUndefined();
    expect(env.EMAILER_API_SECRET).toBeUndefined();
    expect(env.EMAILER_USER_TAG_ID).toBeUndefined();
  });

  it("accepts optional sections that are empty because they only contain comments", () => {
    const env = mapCompassConfigToEnv(
      parseCompassConfigText(
        `${validYaml}
email:
posthog:
`,
        "compass.yaml",
      ),
    );

    expect(env.EMAILER_API_SECRET).toBeUndefined();
    expect(env.POSTHOG_KEY).toBeUndefined();
  });

  it("throws a clear error for invalid YAML", () => {
    expect(() =>
      parseCompassConfigText("runtime:\n  nodeEnv: [", "broken.yaml"),
    ).toThrow("Could not parse Compass config file broken.yaml");
  });
});
