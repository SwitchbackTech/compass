import { _confirm } from "@scripts/common/cli.utils";
import mongoService from "@backend/common/services/mongo.service";
import eventService from "@backend/event/services/event.service";
import { startSeedFlow } from "../commands/seed";

jest.mock("@backend/event/services/event.service");
jest.mock("@backend/common/services/mongo.service");
jest.mock("@scripts/common/cli.utils", () => ({
  _confirm: jest.fn(),
  log: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("seed command", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.exit = jest.fn() as any;
  });

  it("should create sample events when force flag is true", async () => {
    await startSeedFlow(true);

    expect(mongoService.waitUntilConnected).toHaveBeenCalled();
    expect(_confirm).not.toHaveBeenCalled();
    expect(eventService.createEvent).toHaveBeenCalledTimes(3);
  });

  it("should prompt for confirmation when force flag is false", async () => {
    (_confirm as jest.Mock).mockResolvedValue(true);

    await startSeedFlow(false);

    expect(_confirm).toHaveBeenCalled();
    expect(eventService.createEvent).toHaveBeenCalledTimes(3);
  });

  it("should exit when user denies confirmation", async () => {
    (_confirm as jest.Mock).mockResolvedValue(false);

    await startSeedFlow(false);

    expect(_confirm).toHaveBeenCalled();
    expect(eventService.createEvent).not.toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it("should handle errors gracefully", async () => {
    const error = new Error("Test error");
    (eventService.createEvent as jest.Mock).mockRejectedValue(error);

    await startSeedFlow(true);

    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
