/**
 * @jest-environment node
 *
 * we do not need the database for this test
 */
import { randomUUID } from "node:crypto";
import { updateUserMetadata } from "supertokens-node/recipe/usermetadata";
import {
  EVENT_CHANGED,
  EVENT_CHANGE_PROCESSED,
  FETCH_USER_METADATA,
  USER_METADATA,
  USER_REFRESH_TOKEN,
} from "@core/constants/websocket.constants";
import { UserMetadata } from "@core/types/user.types";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";

describe("WebSocket Server", () => {
  const baseDriver = new BaseDriver();

  const userMetadata: UserMetadata = { sync: { importGCal: null } };

  beforeAll(async () => {
    baseDriver.initWebsocketServer();

    await baseDriver.listen();
  });

  afterAll(async () => baseDriver.teardown());

  describe("Connection: ", () => {
    describe("With Valid Session: ", () => {
      it("connects a client connecting with a valid session", async () => {
        const userId = randomUUID();

        const client = baseDriver.createWebsocketClient(
          { userId },
          { autoConnect: false },
        );

        await expect(
          baseDriver.waitUntilWebsocketEvent(
            client,
            "connect",
            async () => client.connect(),
            () => Promise.resolve(client.connected),
          ),
        ).resolves.toEqual(true);
      });
    });

    describe("With Invalid Session: ", () => {
      it("refuses connections from a client connecting without a valid session", async () => {
        const userId = Symbol("invalid-uuid") as unknown as string;

        const client = baseDriver.createWebsocketClient(
          { userId },
          { autoConnect: false },
        );

        await expect(
          baseDriver.waitUntilWebsocketEvent(
            client,
            "connect_error",
            async () => client.connect(),
            (error) => {
              client.disconnect();
              return Promise.resolve({ error, connected: client.connected });
            },
          ),
        ).resolves.toEqual(
          expect.objectContaining({
            error: expect.any(Error),
            connected: false,
          }),
        );
      });
    });

    describe("Without Session: ", () => {
      it("refuses connections from a client connecting without a session", async () => {
        const client = baseDriver.createWebsocketClient(undefined, {
          autoConnect: false,
        });

        await expect(
          baseDriver.waitUntilWebsocketEvent(
            client,
            "connect_error",
            async () => client.connect(),
            (error) => {
              client.disconnect();
              return Promise.resolve({ error, connected: client.connected });
            },
          ),
        ).resolves.toEqual(
          expect.objectContaining({
            error: expect.any(Error),
            connected: false,
          }),
        );
      });
    });
  });

  describe("Emission: ", () => {
    describe("To Specific User Session: ", () => {
      it("emits event to the correct user session socketId", async () => {
        const userId = randomUUID();
        const sessionIdOne = randomUUID();
        const sessionIdTwo = randomUUID();

        const clientOne = baseDriver.createWebsocketClient(
          { userId, sessionId: sessionIdOne },
          { autoConnect: false },
        );

        const clientTwo = baseDriver.createWebsocketClient(
          { userId, sessionId: sessionIdTwo },
          { autoConnect: false },
        );

        clientOne.once("connect", () => {
          webSocketServer.handleUserMetadata(sessionIdOne, userMetadata);
        });

        clientTwo.once("connect", () =>
          webSocketServer.handleUserRefreshToken(sessionIdTwo),
        );

        await expect(
          Promise.allSettled([
            baseDriver.waitUntilWebsocketEvent(clientOne, USER_METADATA, () =>
              Promise.resolve(clientOne.connect()),
            ),
            baseDriver.waitUntilWebsocketEvent(clientTwo, USER_METADATA, () =>
              Promise.resolve(clientTwo.connect()),
            ),
            baseDriver.waitUntilWebsocketEvent(clientOne, USER_REFRESH_TOKEN),
            baseDriver.waitUntilWebsocketEvent(clientTwo, USER_REFRESH_TOKEN),
          ]),
        ).resolves.toEqual([
          expect.objectContaining({
            status: "fulfilled",
            value: [userMetadata],
          }),
          expect.objectContaining({
            status: "rejected",
            reason: error(
              GenericError.OperationTimeout,
              `wait for ${USER_METADATA} timed out`,
            ),
          }),
          expect.objectContaining({
            status: "rejected",
            reason: error(
              GenericError.OperationTimeout,
              `wait for ${USER_REFRESH_TOKEN} timed out`,
            ),
          }),
          expect.objectContaining({ status: "fulfilled", value: [] }),
        ]);
      });
    });

    describe("To All User Sessions: ", () => {
      it("emits event to all the active sessions of a user", async () => {
        const userIdOne = randomUUID();
        const userIdTwo = randomUUID();
        const sessionIdOne = randomUUID();
        const sessionIdTwo = randomUUID();
        const sessionIdThree = randomUUID();

        const clientOne = baseDriver.createWebsocketClient(
          { userId: userIdOne, sessionId: sessionIdOne },
          { autoConnect: false },
        );

        const clientTwo = baseDriver.createWebsocketClient(
          { userId: userIdOne, sessionId: sessionIdTwo },
          { autoConnect: false },
        );

        const clientThree = baseDriver.createWebsocketClient(
          { userId: userIdTwo, sessionId: sessionIdThree },
          { autoConnect: false },
        );

        clientOne.once("connect", () => {
          clientTwo.connect();
        });

        clientTwo.once("connect", () => {
          clientThree.connect();
        });

        clientThree.once("connect", () => {
          webSocketServer.handleBackgroundCalendarChange(userIdOne);
        });

        await expect(
          Promise.allSettled([
            baseDriver.waitUntilWebsocketEvent(clientOne, EVENT_CHANGED, () =>
              Promise.resolve(clientOne.connect()),
            ),
            baseDriver.waitUntilWebsocketEvent(clientTwo, EVENT_CHANGED),
            baseDriver.waitUntilWebsocketEvent(clientThree, EVENT_CHANGED),
          ]),
        ).resolves.toEqual([
          expect.objectContaining({ status: "fulfilled", value: [] }),
          expect.objectContaining({ status: "fulfilled", value: [] }),
          expect.objectContaining({
            status: "rejected",
            reason: error(
              GenericError.OperationTimeout,
              `wait for ${EVENT_CHANGED} timed out`,
            ),
          }),
        ]);
      });
    });

    describe("To Disconnected Session: ", () => {
      it("ignores change if no connection between client and ws server", () => {
        const userId = randomUUID();
        const sessionId = randomUUID();

        expect(
          webSocketServer.handleBackgroundCalendarChange(userId),
        ).toBeUndefined();

        expect(webSocketServer.handleImportGCalStart(userId)).toBeUndefined();

        expect(webSocketServer.handleImportGCalEnd(userId)).toBeUndefined();

        expect(
          webSocketServer.handleUserMetadata(sessionId, userMetadata),
        ).toEqual("IGNORED");

        expect(webSocketServer.handleUserRefreshToken(sessionId)).toEqual(
          "IGNORED",
        );

        expect(webSocketServer.handleUserSignOut(sessionId)).toEqual("IGNORED");
      });
    });
  });

  describe("Server Sent Events: ", () => {
    describe("handleBackgroundCalendarChange: ", () => {
      it("emits the `EVENT_CHANGED` event without a payload to the client", async () => {
        const userId = randomUUID();

        const client = baseDriver.createWebsocketClient(
          { userId },
          { autoConnect: false },
        );

        client.once("connect", () =>
          webSocketServer.handleBackgroundCalendarChange(userId),
        );

        await expect(
          baseDriver.waitUntilWebsocketEvent(client, EVENT_CHANGED, async () =>
            client.connect(),
          ),
        ).resolves.toEqual([]);
      });
    });

    describe("handleUserMetadata: ", () => {
      it("emits the `USER_METADATA` event with a `UserMetadata` payload to the client", async () => {
        const userId = randomUUID();
        const sessionId = randomUUID();

        const client = baseDriver.createWebsocketClient(
          { userId, sessionId },
          { autoConnect: false },
        );

        client.once("connect", async () => {
          webSocketServer.handleUserMetadata(sessionId, userMetadata);
        });

        await expect(
          baseDriver.waitUntilWebsocketEvent(client, USER_METADATA, async () =>
            client.connect(),
          ),
        ).resolves.toEqual([userMetadata]);
      });
    });
  });

  describe("Client Sent Events: ", () => {
    describe(EVENT_CHANGE_PROCESSED, () => {
      it("listens for the `EVENT_CHANGE_PROCESSED` event", async () => {
        const userId = randomUUID();

        const client = baseDriver.createWebsocketClient(
          { userId },
          { autoConnect: false },
        );

        const connectedUserSockets =
          await baseDriver.getConnectedUserClientSockets(userId, client);

        await expect(
          Promise.all(
            connectedUserSockets.map((socket) =>
              baseDriver.waitUntilWebsocketEvent(
                socket,
                EVENT_CHANGE_PROCESSED,
                async () =>
                  Promise.resolve(client.emit(EVENT_CHANGE_PROCESSED)),
              ),
            ),
          ).then((res) => res.flat()),
        ).resolves.toEqual([]);
      });
    });

    describe(FETCH_USER_METADATA, () => {
      it("listens for the `FETCH_USER_METADATA` event", async () => {
        const userId = randomUUID();

        await updateUserMetadata(userId, userMetadata);

        const client = baseDriver.createWebsocketClient(
          { userId },
          { autoConnect: false },
        );

        const connectedUserSockets =
          await baseDriver.getConnectedUserClientSockets(userId, client);

        await expect(
          Promise.all(
            connectedUserSockets.map((socket) =>
              baseDriver.waitUntilWebsocketEvent(
                socket,
                FETCH_USER_METADATA,
                async () => Promise.resolve(client.emit(FETCH_USER_METADATA)),
              ),
            ),
          ).then((res) => res.flat()),
        ).resolves.toEqual([]);

        await expect(
          baseDriver.waitUntilWebsocketEvent(client, USER_METADATA),
        ).resolves.toEqual([userMetadata]);
      });
    });
  });
});
