import { getBaseUrl } from "./web.constants";

//++ move to _tests__
describe("parses env variables", () => {
  const env = process.env;

  beforeEach(() => {
    // mock process.env
    jest.resetModules();
    process.env = { ...env };
  });

  afterEach(() => {
    // reset
    process.env = env;
  });

  it("uses HTTPS in production", () => {
    process.env.NODE_ENV = "production";
    const baseUrl = getBaseUrl();
    expect(baseUrl.includes("https://")).toBe(true);
  });

  it("uses HTTP and localhost in dev", () => {
    process.env.NODE_ENV = "development";
    const baseUrl = getBaseUrl();
    expect(baseUrl.includes("http://localhost:")).toBe(true);
  });
});
