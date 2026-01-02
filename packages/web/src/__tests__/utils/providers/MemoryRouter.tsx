import { act } from "react";
import { MemoryRouter } from "react-router-dom";
import { render } from "@web/__tests__/__mocks__/mock.render";

export const renderWithMemoryRouter = async (
  ui: React.ReactElement,
  initialEntries?: string[],
) => {
  return await act(() =>
    render(
      <MemoryRouter
        initialEntries={initialEntries}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        {ui}
      </MemoryRouter>,
    ),
  );
};
