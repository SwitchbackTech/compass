import { Status } from "@core/errors/status.codes";
import { BaseDriver } from "@backend/__tests__/drivers/base.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";

describe("EventController", () => {
  const baseDriver = new BaseDriver();

  beforeAll(async () => {
    await setupTestDb();
    await baseDriver.listen();
  });

  beforeEach(cleanupCollections);

  afterAll(async () => {
    await baseDriver.teardown();
    await cleanupTestDb();
  });

  it("accepts recurrence null on update payload", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const userId = user._id.toString();

    const createResponse = await baseDriver
      .getServer()
      .post("/api/event")
      .use(baseDriver.setSessionPlugin({ userId }))
      .send({
        title: "null recurrence repro",
        startDate: "2026-04-02",
        endDate: "2026-04-03",
        isSomeday: true,
      })
      .expect(Status.NO_CONTENT);

    expect(createResponse.status).toBe(Status.NO_CONTENT);

    const eventsResponse = await baseDriver
      .getServer()
      .get("/api/event")
      .use(baseDriver.setSessionPlugin({ userId }))
      .expect(Status.OK);

    const eventId = eventsResponse.body[0]?._id as string | undefined;

    expect(eventId).toBeDefined();

    const updateResponse = await baseDriver
      .getServer()
      .put(`/api/event/${eventId}`)
      .use(baseDriver.setSessionPlugin({ userId }))
      .send({
        title: "updated title",
        recurrence: null,
      })
      .expect(Status.NO_CONTENT);

    expect(updateResponse.status).toBe(Status.NO_CONTENT);
  });
});
