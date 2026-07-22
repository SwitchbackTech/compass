import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { faker } from "@faker-js/faker";
import * as googleapisCalendar from "@googleapis/calendar";
import * as googleAuthLibrary from "google-auth-library";
import { BaseError } from "@core/errors/errors.base";
import { CONFIG } from "@backend/common/constants/config.constants";
import { AuthError } from "@backend/common/errors/auth/auth.errors";
import GoogleOAuthClient from "./google.oauth.client";

class MockOAuth2Client {
  credentials: Record<string, unknown> = {};
  _clientId = "mock-client-id";
  getToken = mock();
  setCredentials = mock((credentials: Record<string, unknown>) => {
    this.credentials = credentials;
  });
  verifyIdToken = mock();
  getAccessToken = mock();
}

type MockOAuthClientInstance = {
  credentials: Record<string, unknown>;
  _clientId: string;
  getToken: Mock;
  setCredentials: Mock;
  verifyIdToken: Mock;
  getAccessToken: Mock;
};

const getMockOAuthClient = (
  client: GoogleOAuthClient,
): MockOAuthClientInstance =>
  client.oauthClient as unknown as MockOAuthClientInstance;

describe("GoogleOAuthClient", () => {
  beforeEach(() => {
    spyOn(googleAuthLibrary, "OAuth2Client").mockImplementation(
      () => new MockOAuth2Client() as unknown as googleAuthLibrary.OAuth2Client,
    );
    spyOn(googleapisCalendar, "calendar");
  });

  afterEach(() => {
    mock.restore();
  });

  it("creates a calendar client using the oauth client instance", () => {
    const gcalClient = { calendars: true };
    (googleapisCalendar.calendar as Mock).mockReturnValue(gcalClient);

    const client = new GoogleOAuthClient();

    expect(googleAuthLibrary.OAuth2Client).toHaveBeenCalledWith(
      CONFIG.GOOGLE_CLIENT_ID,
      CONFIG.GOOGLE_CLIENT_SECRET,
      "http://localhost:9080/auth/google/callback",
    );
    expect(client.getGcalClient()).toBe(gcalClient);
    expect(googleapisCalendar.calendar).toHaveBeenCalledWith({
      version: "v3",
      auth: client.oauthClient,
    });
  });

  it("throws when credentials are absent", () => {
    const originalClientId = CONFIG.GOOGLE_CLIENT_ID;
    const originalClientSecret = CONFIG.GOOGLE_CLIENT_SECRET;
    CONFIG.GOOGLE_CLIENT_ID = undefined;
    CONFIG.GOOGLE_CLIENT_SECRET = undefined;

    try {
      expect(() => new GoogleOAuthClient()).toThrow(
        AuthError.GoogleNotConfigured.description,
      );
    } finally {
      CONFIG.GOOGLE_CLIENT_ID = originalClientId;
      CONFIG.GOOGLE_CLIENT_SECRET = originalClientSecret;
    }
  });

  it("throws when getGoogleUserInfo is called without an id token", async () => {
    const client = new GoogleOAuthClient();
    const result = client.getGoogleUserInfo();

    await expect(result).rejects.toBeInstanceOf(BaseError);
    await expect(result).rejects.toMatchObject({
      message: "oauth client is missing id_token, so couldn't verify user",
    });
  });

  it("returns decoded user info and stored tokens when an id token is present", async () => {
    const client = new GoogleOAuthClient();
    const mockOAuthClient = getMockOAuthClient(client);
    const payload = {
      sub: faker.string.uuid(),
      email: faker.internet.email(),
    };

    mockOAuthClient.credentials = { id_token: "token", access_token: "abc" };
    mockOAuthClient.verifyIdToken.mockResolvedValue({
      getPayload: () => payload,
    });

    await expect(client.getGoogleUserInfo()).resolves.toEqual({
      gUser: payload,
      tokens: mockOAuthClient.credentials,
    });

    expect(mockOAuthClient.verifyIdToken).toHaveBeenCalledWith({
      idToken: "token",
      audience: "mock-client-id",
    });
  });

  it("exchanges an auth code for tokens and returns the Google user info", async () => {
    const client = new GoogleOAuthClient();
    const mockOAuthClient = getMockOAuthClient(client);
    const payload = {
      sub: faker.string.uuid(),
      email: faker.internet.email(),
    };
    const tokens = {
      access_token: faker.internet.jwt(),
      id_token: "token",
      refresh_token: faker.string.uuid(),
    };

    mockOAuthClient.getToken.mockResolvedValue({ tokens });
    mockOAuthClient.verifyIdToken.mockResolvedValue({
      getPayload: () => payload,
    });

    await expect(
      client.exchangeAuthCode({
        clientType: "web",
        thirdPartyId: "google",
        redirectURIInfo: {
          redirectURIOnProviderDashboard:
            "http://localhost:9080/auth/google/callback",
          redirectURIQueryParams: { code: "auth-code" },
        },
      }),
    ).resolves.toEqual({
      gUser: payload,
      tokens,
    });

    expect(mockOAuthClient.getToken).toHaveBeenCalledWith({
      code: "auth-code",
      codeVerifier: undefined,
    });
    expect(mockOAuthClient.setCredentials).toHaveBeenCalledWith(tokens);
  });

  it("rejects auth code exchange from an unexpected redirect URI", async () => {
    const client = new GoogleOAuthClient();
    const mockOAuthClient = getMockOAuthClient(client);

    await expect(
      client.exchangeAuthCode({
        clientType: "web",
        thirdPartyId: "google",
        redirectURIInfo: {
          redirectURIOnProviderDashboard:
            "https://evil.example/auth/google/callback",
          redirectURIQueryParams: { code: "auth-code" },
        },
      }),
    ).rejects.toMatchObject({
      description: AuthError.GoogleRedirectUriMismatch.description,
    });

    expect(mockOAuthClient.getToken).not.toHaveBeenCalled();
  });

  it("returns the access token when refreshAccessToken receives a non-empty token", async () => {
    const client = new GoogleOAuthClient();
    const mockOAuthClient = getMockOAuthClient(client);
    const token = faker.string.uuid();
    mockOAuthClient.getAccessToken.mockResolvedValue({ token });

    await expect(client.refreshAccessToken()).resolves.toBe(token);
  });

  it("throws AuthError.NoGAuthAccessToken when refreshAccessToken returns an empty token", async () => {
    const client = new GoogleOAuthClient();
    const mockOAuthClient = getMockOAuthClient(client);
    mockOAuthClient.getAccessToken.mockResolvedValue({ token: "" });

    await expect(client.refreshAccessToken()).rejects.toMatchObject({
      description: AuthError.NoGAuthAccessToken.description,
    });
  });
});
