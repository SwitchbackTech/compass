import { parseCompassConfigText } from "./compass.config";
import { describe, expect, it } from "bun:test";

const validYaml = `
runtime:
  version: latest
  nodeEnv: development
  logLevel: debug
  timezone: Etc/UTC
web:
  port: 9080
  url: http://localhost:9080
backend:
  port: 3000
  apiUrl: http://localhost:3000/api
  originsAllowed:
    - http://localhost:3000
    - http://localhost:9080
  compassToken: sync-token
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
`;

describe("compass config", () => {
  it("parses grouped YAML into a typed CompassConfig object", () => {
    const config = parseCompassConfigText(validYaml, "compass.yaml");

    expect(config.runtime.nodeEnv).toBe("development");
    expect(config.runtime.timezone).toBe("Etc/UTC");
    expect(config.runtime.logLevel).toBe("debug");
    expect(config.backend.apiUrl).toBe("http://localhost:3000/api");
    expect(config.backend.compassToken).toBe("sync-token");
    expect(config.backend.originsAllowed).toEqual([
      "http://localhost:3000",
      "http://localhost:9080",
    ]);
    expect(config.backend.port).toBe(3000);
    expect(config.web.port).toBe(9080);
    expect(config.web.url).toBe("http://localhost:9080");
    expect(config.mongo.uri).toBe("mongodb://localhost:27017/compass");
    expect(config.mongo.username).toBe("compass");
    expect(config.supertokens.uri).toBe("http://localhost:3567");
    expect(config.supertokens.key).toBe("supertokens-key");
    expect(config.supertokens.postgres?.user).toBe("supertokens");
    expect(config.runtime.version).toBe("latest");
  });

  it("omits optional Google and email config when keys are absent", () => {
    const config = parseCompassConfigText(validYaml, "compass.yaml");

    expect(config.google?.clientId).toBeUndefined();
    expect(config.google?.clientSecret).toBeUndefined();
    expect(config.email).toBeUndefined();
    expect(config.posthog).toBeUndefined();
  });

  it("accepts optional sections that are empty because they only contain comments", () => {
    const config = parseCompassConfigText(
      `${validYaml}
email:
posthog:
`,
      "compass.yaml",
    );

    expect(config.email?.kitApiSecret).toBeUndefined();
    expect(config.posthog?.key).toBeUndefined();
  });

  it("parses google section when provided", () => {
    const config = parseCompassConfigText(
      `${validYaml}
google:
  clientId: my-client-id
  clientSecret: my-client-secret
  channelExpirationMin: 30
  webhookUrl: https://example.trycloudflare.com/api
  notificationToken: my-notification-token
`,
      "compass.yaml",
    );

    expect(config.google?.clientId).toBe("my-client-id");
    expect(config.google?.clientSecret).toBe("my-client-secret");
    expect(config.google?.channelExpirationMin).toBe(30);
    expect(config.google?.webhookUrl).toBe(
      "https://example.trycloudflare.com/api",
    );
    expect(config.google?.notificationToken).toBe("my-notification-token");
  });

  it("throws a clear error for invalid YAML", () => {
    expect(() =>
      parseCompassConfigText("runtime:\n  nodeEnv: [", "broken.yaml"),
    ).toThrow("Could not parse Compass config file broken.yaml");
  });

  it("throws a clear error for missing required fields", () => {
    expect(() =>
      parseCompassConfigText(
        "runtime:\n  nodeEnv: development\n  timezone: Etc/UTC\n",
        "incomplete.yaml",
      ),
    ).toThrow("Invalid Compass config file incomplete.yaml");
  });
});

describe("compass config — placeholder detection", () => {
  it("throws with the field path when a single value contains REPLACE_WITH_", () => {
    const yaml = validYaml.replace(
      "supertokens-key",
      "REPLACE_WITH_SUPERTOKENS_KEY",
    );
    expect(() => parseCompassConfigText(yaml, "compass.yaml")).toThrow(
      "supertokens.key",
    );
  });

  it("collects all placeholder fields into a single error", () => {
    const yaml = validYaml
      .replace("sync-token", "REPLACE_WITH_COMPASS_TOKEN")
      .replace("supertokens-key", "REPLACE_WITH_SUPERTOKENS_KEY");
    expect(() => parseCompassConfigText(yaml, "compass.yaml")).toThrow(
      /backend\.compassToken[\s\S]*supertokens\.key/,
    );
  });

  it("detects a placeholder embedded inside a URI string", () => {
    const yaml = validYaml.replace(
      "mongodb://localhost:27017/compass",
      "mongodb://compass:REPLACE_WITH_MONGO_PASSWORD@mongo:27017/compass",
    );
    expect(() => parseCompassConfigText(yaml, "compass.yaml")).toThrow(
      "mongo.uri",
    );
  });

  it("detects a placeholder inside an originsAllowed array entry", () => {
    const yaml = validYaml.replace(
      "- http://localhost:3000",
      "- REPLACE_WITH_YOUR_WEB_URL",
    );
    expect(() => parseCompassConfigText(yaml, "compass.yaml")).toThrow(
      "backend.originsAllowed[0]",
    );
  });

  it("includes the file path in the placeholder error message", () => {
    const yaml = validYaml.replace(
      "supertokens-key",
      "REPLACE_WITH_SUPERTOKENS_KEY",
    );
    expect(() => parseCompassConfigText(yaml, "my-compass.yaml")).toThrow(
      "my-compass.yaml",
    );
  });
});
