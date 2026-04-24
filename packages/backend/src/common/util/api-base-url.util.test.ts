import { ENV } from "@backend/common/constants/env.constants";
import { getApiBaseURL } from "@backend/common/util/api-base-url.util";

describe("api-base-url.util", () => {
  describe("getApiBaseURL", () => {
    const originalBaseUrl = ENV.BASEURL;

    afterEach(() => {
      ENV.BASEURL = originalBaseUrl;
    });

    it("throws a clear error when ENV.BASEURL is blank", () => {
      ENV.BASEURL = "   ";

      expect(() => getApiBaseURL()).toThrow("ENV.BASEURL is not set");
    });

    it("returns the original ENV.BASEURL value when set", () => {
      ENV.BASEURL = " https://api.example.com/api ";

      expect(getApiBaseURL()).toBe(" https://api.example.com/api ");
    });
  });
});
