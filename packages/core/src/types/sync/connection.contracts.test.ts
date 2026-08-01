import { faker } from "@faker-js/faker";
import {
  CalendarAccessRoleSchema,
  CalendarListQuerySchema,
  CalendarListResponseSchema,
  ConnectionListResponseSchema,
  ConnectionStateSchema,
  GoogleConnectionAdoptionRequestSchema,
  ProviderAccountFactsSchema,
  ProviderCalendarSchema,
  ProviderConnectionSchema,
} from "@core/types/sync/connection.contracts";

const objectId = () => faker.database.mongodbObjectId();

const validConnection = () => ({
  id: objectId(),
  tenantId: objectId(),
  principalId: objectId(),
  provider: "google",
  account: {
    providerAccountId: "112233445566778899000",
    email: "user@gmail.com",
    displayName: "Test User",
  },
  capabilities: ["readEvents", "writeEvents"],
  state: "healthy",
  stateReason: null,
  lastSyncedAt: "2026-07-20T12:00:00.000Z",
  lastHealthyAt: "2026-07-20T12:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-20T12:00:00.000Z",
});

const validCalendar = () => ({
  id: objectId(),
  tenantId: objectId(),
  principalId: objectId(),
  connectionId: objectId(),
  providerCalendarId: "primary",
  displayName: "Personal",
  color: "#9fe1e7",
  active: true,
  primary: true,
  accessRole: "owner",
  capabilities: {
    canReadEvents: true,
    canWriteEvents: true,
    canReadBusy: true,
    canInviteAttendees: true,
  },
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-20T12:00:00.000Z",
});

describe("Sync connection contracts", () => {
  describe("ProviderConnectionSchema", () => {
    it("accepts a healthy connection", () => {
      expect(
        ProviderConnectionSchema.safeParse(validConnection()).success,
      ).toBe(true);
    });

    it.each([
      "connecting",
      "importing",
      "catchingUp",
      "disconnected",
    ] as const)("accepts state %s without a reason", (state) => {
      const connection = { ...validConnection(), state };
      expect(ProviderConnectionSchema.safeParse(connection).success).toBe(true);
    });

    it("accepts delayed with and without a reason", () => {
      const delayed = { ...validConnection(), state: "delayed" };
      expect(ProviderConnectionSchema.safeParse(delayed).success).toBe(true);
      expect(
        ProviderConnectionSchema.safeParse({
          ...delayed,
          stateReason: "workOverdue",
        }).success,
      ).toBe(true);
    });

    it("accepts actionRequired with a reason", () => {
      const connection = {
        ...validConnection(),
        state: "actionRequired",
        stateReason: "authorizationRevoked",
      };
      expect(ProviderConnectionSchema.safeParse(connection).success).toBe(true);
    });

    it("rejects actionRequired without a reason", () => {
      const connection = { ...validConnection(), state: "actionRequired" };
      expect(ProviderConnectionSchema.safeParse(connection).success).toBe(
        false,
      );
    });

    it.each([
      "connecting",
      "importing",
      "catchingUp",
      "healthy",
      "disconnected",
    ] as const)("rejects a reason on state %s", (state) => {
      const connection = {
        ...validConnection(),
        state,
        stateReason: "workOverdue",
      };
      expect(ProviderConnectionSchema.safeParse(connection).success).toBe(
        false,
      );
    });

    it("accepts null evidence timestamps before first sync", () => {
      const connection = {
        ...validConnection(),
        state: "connecting",
        lastSyncedAt: null,
        lastHealthyAt: null,
      };
      expect(ProviderConnectionSchema.safeParse(connection).success).toBe(true);
    });

    it("rejects unknown fields", () => {
      const connection = { ...validConnection(), accessToken: "leak" };
      expect(ProviderConnectionSchema.safeParse(connection).success).toBe(
        false,
      );
    });

    it("rejects an unknown provider", () => {
      const connection = { ...validConnection(), provider: "caldav" };
      expect(ProviderConnectionSchema.safeParse(connection).success).toBe(
        false,
      );
    });

    it("rejects an unknown state", () => {
      const connection = { ...validConnection(), state: "syncing" };
      expect(ProviderConnectionSchema.safeParse(connection).success).toBe(
        false,
      );
    });

    it("round-trips through JSON unchanged", () => {
      const parsed = ProviderConnectionSchema.parse(validConnection());
      expect(
        ProviderConnectionSchema.parse(JSON.parse(JSON.stringify(parsed))),
      ).toEqual(parsed);
    });
  });

  describe("ConnectionStateSchema", () => {
    it("covers exactly the seven user-facing states", () => {
      expect(ConnectionStateSchema.options).toEqual([
        "connecting",
        "importing",
        "catchingUp",
        "healthy",
        "delayed",
        "actionRequired",
        "disconnected",
      ]);
    });
  });

  describe("ProviderAccountFactsSchema", () => {
    it("accepts null display fields", () => {
      const facts = {
        providerAccountId: "1122334455",
        email: null,
        displayName: null,
      };
      expect(ProviderAccountFactsSchema.safeParse(facts).success).toBe(true);
    });

    it("rejects unknown fields", () => {
      const facts = {
        providerAccountId: "1122334455",
        email: null,
        displayName: null,
        refreshToken: "leak",
      };
      expect(ProviderAccountFactsSchema.safeParse(facts).success).toBe(false);
    });
  });

  describe("GoogleConnectionAdoptionRequestSchema", () => {
    it("accepts the trusted server-side authorization handoff", () => {
      expect(
        GoogleConnectionAdoptionRequestSchema.safeParse({
          account: {
            providerAccountId: "1122334455",
            email: "connected@example.com",
            displayName: "Connected User",
          },
          credential: {
            iv: "aGVsbG8=",
            ciphertext: "Y2lwaGVydGV4dA==",
            authTag: "dGFn",
          },
          grantedScopes: ["https://www.googleapis.com/auth/calendar.readonly"],
        }).success,
      ).toBe(true);
    });

    it("rejects an empty scope set", () => {
      expect(
        GoogleConnectionAdoptionRequestSchema.safeParse({
          account: {
            providerAccountId: "1122334455",
            email: null,
            displayName: null,
          },
          credential: {
            iv: "aGVsbG8=",
            ciphertext: "Y2lwaGVydGV4dA==",
            authTag: "dGFn",
          },
          grantedScopes: [],
        }).success,
      ).toBe(false);
    });
  });

  describe("ProviderCalendarSchema", () => {
    it("accepts a writable primary calendar", () => {
      expect(ProviderCalendarSchema.safeParse(validCalendar()).success).toBe(
        true,
      );
    });

    // Every capability combination is representable: facts describe what the
    // provider permits, and no combination is privileged.
    it.each(
      Array.from({ length: 16 }, (_, mask) => [
        {
          canReadEvents: Boolean(mask & 1),
          canWriteEvents: Boolean(mask & 2),
          canReadBusy: Boolean(mask & 4),
          canInviteAttendees: Boolean(mask & 8),
        },
      ]),
    )("accepts capability combination %o", (capabilities) => {
      const calendar = { ...validCalendar(), capabilities };
      expect(ProviderCalendarSchema.safeParse(calendar).success).toBe(true);
    });

    it.each([
      "owner",
      "editor",
      "viewer",
      "busyOnly",
    ] as const)("accepts access role %s", (accessRole) => {
      const calendar = { ...validCalendar(), accessRole };
      expect(ProviderCalendarSchema.safeParse(calendar).success).toBe(true);
    });

    it("rejects a provider-specific access role", () => {
      expect(CalendarAccessRoleSchema.safeParse("freeBusyReader").success).toBe(
        false,
      );
    });

    it("accepts an inactive, null-color calendar", () => {
      const calendar = { ...validCalendar(), active: false, color: null };
      expect(ProviderCalendarSchema.safeParse(calendar).success).toBe(true);
    });

    it("rejects product preference fields", () => {
      const calendar = { ...validCalendar(), visible: true };
      expect(ProviderCalendarSchema.safeParse(calendar).success).toBe(false);
    });

    it("rejects a missing capability field", () => {
      const { canReadBusy: _dropped, ...partial } =
        validCalendar().capabilities;
      const calendar = { ...validCalendar(), capabilities: partial };
      expect(ProviderCalendarSchema.safeParse(calendar).success).toBe(false);
    });
  });

  describe("list and query contracts", () => {
    it("accepts a connection list", () => {
      const response = { connections: [validConnection()] };
      expect(ConnectionListResponseSchema.safeParse(response).success).toBe(
        true,
      );
    });

    it("accepts an empty calendar list", () => {
      expect(
        CalendarListResponseSchema.safeParse({ calendars: [] }).success,
      ).toBe(true);
    });

    it("accepts an empty calendar query", () => {
      expect(CalendarListQuerySchema.safeParse({}).success).toBe(true);
    });

    it("accepts a narrowed calendar query", () => {
      const query = { connectionId: objectId(), activeOnly: true };
      expect(CalendarListQuerySchema.safeParse(query).success).toBe(true);
    });

    it("rejects principal scoping via the query body", () => {
      const query = { principalId: objectId() };
      expect(CalendarListQuerySchema.safeParse(query).success).toBe(false);
    });
  });
});
