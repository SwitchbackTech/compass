import { Priorities } from "@core/constants/core.constants";
import {
  type ApiAdapter,
  type ApiRequestConfig,
} from "@web/common/apis/api.types";
import { BaseApi } from "@web/common/apis/base/base.api";
import { EventApi } from "./event.api";
import { afterEach, describe, expect, it } from "bun:test";

describe("EventApi.get", () => {
  afterEach(() => {
    BaseApi.defaults.adapter = undefined;
  });

  it("sends priority filters with event reads", async () => {
    const requests: ApiRequestConfig[] = [];
    const adapter: ApiAdapter = async <T>(
      config: ApiRequestConfig & { body?: unknown },
    ) => {
      requests.push(config);

      return {
        config,
        data: {
          data: [],
          count: 0,
          page: 1,
          pageSize: 0,
          offset: 0,
        } as T,
        headers: new Headers(),
        status: 200,
        statusText: "OK",
      };
    };
    BaseApi.defaults.adapter = adapter;

    await EventApi.get({
      startDate: "2026-04-01",
      endDate: "2026-05-01",
      someday: false,
      priorities: [Priorities.WORK, Priorities.SELF],
    });

    expect(requests[0]?.url).toBe(
      "/event?start=2026-04-01&end=2026-05-01&priorities=work,self",
    );
  });
});
