import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { mock } from "bun:test";
import "fake-indexeddb/auto";

GlobalRegistrator.register();

process.env["API_BASEURL"] = "http://localhost:3000";
process.env["BACKEND_BASEURL"] = "http://localhost:3000";
process.env["NODE_ENV"] = "test";

mock.module("@web/common/constants/env.constants", () => ({
  ENV_WEB: {
    API_BASEURL: "http://localhost:3000",
    BACKEND_BASEURL: "http://localhost:3000",
    NODE_ENV: "test",
  },
  IS_DEV: false,
}));

// Mock supertokens to prevent initialization errors
const createMock = () => mock();
const sessionMock = {
  init: createMock(),
  doesSessionExist: createMock().mockResolvedValue(true),
  getUserId: createMock().mockResolvedValue("mock-user-id"),
  signOut: createMock().mockResolvedValue(undefined),
  getAccessToken: createMock().mockResolvedValue("mock-access-token"),
  validateClaims: createMock().mockResolvedValue([]),
  getClaimValue: createMock(),
  PrimitiveClaim: createMock(),
  BooleanClaim: createMock(),
  PrimitiveArrayClaim: createMock(),
  attemptRefreshingSession: createMock().mockResolvedValue(true),
  getInvalidClaimsFromResponse: createMock().mockResolvedValue([]),
  getAccessTokenPayloadSecurely: createMock().mockResolvedValue({
    mockKey: "mockValue",
  }),
};

mock.module("supertokens-web-js/recipe/session", () => ({
  default: sessionMock,
  ...sessionMock,
}));

mock.module("supertokens-web-js/recipe/thirdparty", () => ({
  default: { init: createMock() },
  init: createMock(),
}));

mock.module("supertokens-web-js/recipe/emailpassword", () => ({
  default: { init: createMock() },
  init: createMock(),
  signIn: createMock().mockResolvedValue({ status: "OK" }),
  signUp: createMock().mockResolvedValue({ status: "OK" }),
  sendPasswordResetEmail: createMock().mockResolvedValue({ status: "OK" }),
  submitNewPassword: createMock().mockResolvedValue({ status: "OK" }),
}));

mock.module("supertokens-web-js/recipe/emailverification", () => ({
  default: { init: createMock() },
  init: createMock(),
}));

mock.module("supertokens-web-js", () => ({
  default: { init: createMock() },
  init: createMock(),
}));
