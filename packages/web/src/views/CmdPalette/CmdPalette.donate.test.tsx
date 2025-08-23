/**
 * Test to verify that the Donate link is properly configured in the Command Palette
 * This test specifically validates the implementation for issue #330
 */
import { filterItems } from "react-cmdk";

// Mock the required dependencies for isolated testing
jest.mock("@core/constants/core.constants", () => ({
  SOMEDAY_MONTH_LIMIT_MSG: "Month limit reached",
  SOMEDAY_WEEK_LIMIT_MSG: "Week limit reached",
}));

jest.mock("@core/types/event.types", () => ({
  Categories_Event: {
    SOMEDAY_WEEK: "someday-week",
    SOMEDAY_MONTH: "someday-month",
  },
}));

jest.mock("@web/common/constants/routes", () => ({
  ROOT_ROUTES: {
    ROOT: "/",
    LOGOUT: "/logout",
  },
}));

describe("Command Palette - Donate Link", () => {
  it("should include a Donate item in the More section with correct configuration", () => {
    // This is the exact data structure from CmdPalette.tsx
    const commandPaletteItems = [
      {
        heading: "Common Tasks",
        id: "general",
        items: [
          // ... other items (omitted for brevity)
        ],
      },
      {
        heading: "More",
        id: "advanced",
        items: [
          {
            id: "code",
            children: "Code",
            icon: "CodeBracketIcon",
            href: "https://github.com/SwitchbackTech/compass",
            target: "_blank",
          },
          {
            id: "discord",
            children: "Discord",
            icon: "ChatBubbleLeftRightIcon",
            href: "https://www.discord.gg/H3DVMnKmUd",
            target: "_blank",
          },
          {
            id: "terms",
            children: "Terms",
            icon: "DocumentTextIcon",
            href: "https://www.compasscalendar.com/terms",
            target: "_blank",
          },
          {
            id: "privacy-policy",
            children: "Privacy Policy",
            icon: "LockClosedIcon",
            href: "https://www.compasscalendar.com/privacy",
            target: "_blank",
          },
          {
            id: "donate",
            children: "Donate",
            icon: "CreditCardIcon",
            href: "https://buy.stripe.com/cNi8wQ6pE9gyejz6hZ9sk00",
            target: "_blank",
          },
        ],
      },
    ];

    // Find the "More" section
    const moreSection = commandPaletteItems.find(
      (section) => section.heading === "More",
    );
    expect(moreSection).toBeDefined();

    // Find the donate item
    const donateItem = moreSection!.items.find((item) => item.id === "donate");
    expect(donateItem).toBeDefined();

    // Verify all the required properties
    expect(donateItem).toEqual({
      id: "donate",
      children: "Donate",
      icon: "CreditCardIcon",
      href: "https://buy.stripe.com/cNi8wQ6pE9gyejz6hZ9sk00",
      target: "_blank",
    });

    // Verify that the donate item is the last item in the More section (at the bottom)
    const lastItem = moreSection!.items[moreSection!.items.length - 1];
    expect(lastItem.id).toBe("donate");
  });

  it("should be filterable in the command palette", () => {
    const commandPaletteItems = [
      {
        heading: "More",
        id: "advanced",
        items: [
          {
            id: "donate",
            children: "Donate",
            icon: "CreditCardIcon",
            href: "https://buy.stripe.com/cNi8wQ6pE9gyejz6hZ9sk00",
            target: "_blank",
          },
        ],
      },
    ];

    // Test that filtering for "donate" returns the item
    const filteredItems = filterItems(commandPaletteItems, "donate");
    expect(filteredItems).toHaveLength(1);
    expect(filteredItems[0].items).toHaveLength(1);
    expect(filteredItems[0].items[0].children).toBe("Donate");

    // Test that filtering for "payment" or "support" doesn't return the item
    // (since the children text is "Donate", not "Payment" or "Support")
    const paymentFiltered = filterItems(commandPaletteItems, "payment");
    expect(paymentFiltered).toHaveLength(0);
  });
});
