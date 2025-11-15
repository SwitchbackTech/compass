import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";

export const renderWithMemoryRouter = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      {ui}
    </MemoryRouter>,
  );
};
