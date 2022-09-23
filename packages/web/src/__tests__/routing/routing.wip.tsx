import { CompassRoot } from "@web/routers/index";
describe("Routing", () => {
  it("goes to login page when not authenticated", () => {
    render(CompassRoot);
    expect(
      screen.getByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
  });
});
