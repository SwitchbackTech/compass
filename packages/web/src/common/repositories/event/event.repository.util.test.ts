import { getEventRepository } from "./event.repository.util";
import { LocalEventRepository } from "./local.event.repository";
import { RemoteEventRepository } from "./remote.event.repository";

jest.mock("@web/common/classes/Session");

describe("getEventRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return RemoteEventRepository when session exists", () => {
    const repository = getEventRepository(true);
    expect(repository).toBeInstanceOf(RemoteEventRepository);
  });

  it("should return LocalEventRepository when session does not exist", () => {
    const repository = getEventRepository(false);
    expect(repository).toBeInstanceOf(LocalEventRepository);
  });
});
