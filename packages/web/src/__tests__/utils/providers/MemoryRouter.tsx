import { render } from "@web/__tests__/__mocks__/mock.render";
import { type ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";

export const renderWithMemoryRouter = async (
  ui: ReactElement,
  initialEntries?: string[],
) => {
  return render(
    <MemoryRouter
      initialEntries={initialEntries}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      {ui}
    </MemoryRouter>,
  );
};
