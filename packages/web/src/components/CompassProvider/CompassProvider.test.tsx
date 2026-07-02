import { useQueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { rest } from "msw";
import { server } from "@web/__tests__/__mocks__/server/mock.server";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { createCompassQueryClient } from "@web/common/query/query-client";
import { CompassRequiredProviders } from "./CompassProvider";
import { expect, test } from "bun:test";

test("provides the injected query client", () => {
  server.use(
    rest.get(`${ENV_WEB.API_BASEURL}/config`, (_req, res, ctx) =>
      res(ctx.json({ google: { isConfigured: false } })),
    ),
  );
  const queryClient = createCompassQueryClient();

  function Probe() {
    const observedClient = useQueryClient();
    return (
      <output aria-label="query client match">
        {String(observedClient === queryClient)}
      </output>
    );
  }

  render(
    <CompassRequiredProviders queryClient={queryClient}>
      <Probe />
    </CompassRequiredProviders>,
  );

  expect(screen.getByLabelText("query client match")).toHaveTextContent("true");
});
