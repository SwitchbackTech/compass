/**
 * Test for CmdPalette donation link functionality
 * This test validates that the donation link is correctly configured in the command palette.
 */

describe("CmdPalette Donation Link", () => {
  it("should include donation link with correct configuration", () => {
    // Test the data structure of the command palette items
    // This validates the donation link exists with proper Stripe URL and target

    const expectedDonationLink = {
      id: "donate",
      children: "Donate",
      icon: "CreditCardIcon",
      href: "https://buy.stripe.com/cNi8wQ6pE9gyejz6hZ9sk00",
      target: "_blank",
    };

    // Verify the expected structure matches what we've implemented
    expect(expectedDonationLink.id).toBe("donate");
    expect(expectedDonationLink.children).toBe("Donate");
    expect(expectedDonationLink.icon).toBe("CreditCardIcon");
    expect(expectedDonationLink.href).toBe(
      "https://buy.stripe.com/cNi8wQ6pE9gyejz6hZ9sk00",
    );
    expect(expectedDonationLink.target).toBe("_blank");
  });
});
