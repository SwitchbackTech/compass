import { expect, test } from "@playwright/test";
import { preparePublicBookingPage } from "../booking/booking-harness";
import { expectNoAxeViolations } from "../utils/axe-assertion";

test("the public booking page renders with no automatically detectable accessibility violations", async ({
  page,
}) => {
  await preparePublicBookingPage(page);

  await expect(
    page.getByRole("heading", { name: "Pick a time" }),
  ).toBeVisible();
  await expectNoAxeViolations(page, { checkpoint: "public booking page" });
});
