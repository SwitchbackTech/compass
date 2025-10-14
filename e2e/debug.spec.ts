import { expect, test } from "@playwright/test";

test("debug authentication flow", async ({ page }) => {
  console.log("=== DEBUG TEST STARTING ===");

  // Track all network requests
  const allRequests: string[] = [];
  const allResponses: string[] = [];

  // Log all requests
  page.on("request", (request) => {
    allRequests.push(`${request.method()} ${request.url()}`);
    console.log(`🌐 REQUEST: ${request.method()} ${request.url()}`);
  });

  // Log all responses
  page.on("response", (response) => {
    allResponses.push(`${response.status()} ${response.url()}`);
    console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
  });

  // Log console messages
  page.on("console", (msg) => {
    console.log(`🖥️  CONSOLE [${msg.type()}]:`, msg.text());
  });

  // Log page errors
  page.on("pageerror", (error) => {
    console.log("❌ PAGE ERROR:", error.message);
  });

  // Mock API calls
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    console.log(`🔧 MOCKING API: ${url}`);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        isValid: false,
        exists: false,
        status: "OK",
      }),
    });
  });

  console.log("Navigating to root page...");
  await page.goto("/");

  console.log("Initial URL:", page.url());

  // Wait and check what happens
  for (let i = 1; i <= 10; i++) {
    await page.waitForTimeout(1000);
    console.log(`After ${i}s - URL: ${page.url()}`);

    // Check for any visible elements
    const bodyText = await page.textContent("body");
    console.log(`Body content length: ${bodyText?.length || 0}`);

    // Check for specific elements
    const hasLoader =
      (await page
        .locator('[data-testid*="loader"], .loading, [class*="loader"]')
        .count()) > 0;
    const hasError =
      (await page
        .locator('[data-testid*="error"], .error, [class*="error"]')
        .count()) > 0;
    const hasLogin = (await page.locator("text=/login/i").count()) > 0;

    console.log(
      `Has loader: ${hasLoader}, Has error: ${hasError}, Has login text: ${hasLogin}`,
    );

    if (page.url().includes("/login")) {
      console.log("✅ Redirect to login detected!");
      break;
    }
  }

  console.log("=== FINAL STATE ===");
  console.log("Final URL:", page.url());
  console.log("Total requests:", allRequests.length);
  console.log("Total responses:", allResponses.length);
  console.log("All requests:", allRequests);
  console.log("All responses:", allResponses);

  // Take a screenshot
  await page.screenshot({ path: "debug-final-state.png" });
  console.log("Screenshot saved as debug-final-state.png");
});
