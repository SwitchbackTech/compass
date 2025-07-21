import { mockNodeModules } from "@backend/__tests__/helpers/mock.setup";

mockNodeModules();

afterAll(() => jest.clearAllMocks());
