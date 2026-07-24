import { describe, expect, it } from "bun:test";

process.env.PORT = "3000";

const { getApiBaseUrl } = await import("./env.constants");

describe("getApiBaseUrl", () => {
  it("defaults to the local backend API using the configured port", () => {
    expect(getApiBaseUrl(undefined, "3001")).toBe("http://localhost:3001/api");
  });

  it("uses the configured API base URL when provided", () => {
    expect(getApiBaseUrl("https://calendar.example.com/api")).toBe(
      "https://calendar.example.com/api",
    );
  });

  it("requires a port when no API base URL is configured", () => {
    expect(() => getApiBaseUrl()).toThrow(
      "PORT is required when API_BASEURL is not configured",
    );
  });
});
