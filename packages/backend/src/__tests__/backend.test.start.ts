import { mockNodeModules } from "@backend/__tests__/helpers/mock.setup";

mockNodeModules();

beforeEach(() => jest.clearAllMocks());

afterAll(() => jest.restoreAllMocks());
