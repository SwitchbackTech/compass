# End-to-End Testing with Playwright

This directory contains Playwright end-to-end tests for the Compass web application, with a focus on Google OAuth authentication flows.

## Setup

### Prerequisites

1. Node.js (>= 18.18.0)
2. Yarn package manager
3. Playwright browsers installed

### Installation

```bash
# Install dependencies (from web package root)
yarn install

# Install Playwright browsers
npx playwright install chromium
```

### Configuration

The tests are configured to run against a local development server at `http://localhost:3001`. The configuration will automatically start the dev server if it's not already running.

## Test Structure

```
e2e/
├── auth/
│   ├── google-oauth.spec.ts       # Google OAuth flow tests
│   └── authenticated-flow.spec.ts # Tests for authenticated users
├── support/
│   └── auth-helpers.ts            # Authentication utilities
├── basic-navigation.spec.ts       # Basic app navigation tests
└── README.md                      # This file
```

## Running Tests

### All Tests

```bash
# Run all e2e tests
yarn playwright test

# Run with UI mode (recommended for development)
yarn playwright test --ui

# Run specific test file
yarn playwright test e2e/auth/google-oauth.spec.ts
```

### Headful Mode (See Browser)

```bash
# Run tests in headed mode to see the browser
yarn playwright test --headed

# Run with debug mode (pauses execution)
yarn playwright test --debug
```

## Google OAuth Testing

### Initial Setup (Manual Authentication Required)

The Google OAuth tests require manual completion of the authentication flow on first run:

1. **Run the OAuth test:**

   ```bash
   yarn playwright test e2e/auth/google-oauth.spec.ts --headed
   ```

2. **Complete the OAuth flow manually:**

   - The test will navigate to the Google OAuth button and click it
   - You'll be redirected to Google's consent screen
   - **Manually complete the authentication:**
     - Enter your Google credentials
     - Grant the requested permissions
     - Wait for redirect back to Compass

3. **Save the authenticated state:**
   - Once authentication is complete, the test will automatically save your browser state
   - This includes cookies, localStorage, and sessionStorage
   - The state is saved to `e2e/support/google-auth-state.json`

### Using Saved Authentication State

After completing the initial manual authentication:

1. **Subsequent tests will use the saved state:**

   ```bash
   yarn playwright test e2e/auth/authenticated-flow.spec.ts
   ```

2. **The saved state includes:**
   - Authentication cookies
   - Session tokens
   - Local storage data
   - Any other browser state needed for authentication

### State Management

#### Authentication State Files

- `pre-oauth-state.json` - Browser state before OAuth (automatically saved)
- `google-auth-state.json` - Authenticated browser state (saved after manual OAuth)

#### Helper Functions

The `auth-helpers.ts` file provides utilities for:

- Saving and loading authentication states
- Navigating through onboarding flows
- Waiting for OAuth completion
- Managing authentication state files

## Troubleshooting

### OAuth Not Working

1. **Check Google OAuth Configuration:**

   - Ensure `GOOGLE_CLIENT_ID` is set in your environment
   - Verify the OAuth client is configured for `http://localhost:3001`

2. **Clear Saved State:**

   ```bash
   # Remove saved authentication state to start fresh
   rm e2e/support/*.json
   ```

3. **Check Development Server:**
   - Ensure the backend is running (`yarn dev:backend`)
   - Verify the web server is accessible at `http://localhost:3001`

### Browser Installation Issues

If browser installation fails:

```bash
# Try installing specific browsers
npx playwright install chromium

# Or install system dependencies
npx playwright install-deps
```

### Test Timeouts

If tests timeout during OAuth:

- The default timeout is 5 minutes for OAuth completion
- You can modify the timeout in the test configuration
- Ensure you complete the OAuth flow quickly during testing

## Best Practices

### Credential Security

1. **Never commit authentication states to version control**

   - The `.gitignore` should exclude `e2e/support/*.json`
   - Use environment variables for test credentials when possible

2. **Use test accounts for OAuth**

   - Create dedicated Google accounts for testing
   - Don't use personal or production accounts

3. **Rotate test credentials regularly**
   - Authentication states may expire
   - Clear and regenerate states periodically

### Test Reliability

1. **Use robust locators:**

   - Prefer text content and ARIA labels over CSS selectors
   - Avoid brittle selectors that may change frequently

2. **Handle timing issues:**

   - Use `page.waitForSelector()` instead of fixed timeouts
   - Wait for network idle when appropriate

3. **Test isolation:**
   - Each test should be independent
   - Clear state between tests when necessary

## Advanced Usage

### Custom Authentication Flows

To test different authentication scenarios:

```typescript
import { test } from "@playwright/test";
import { clearAuthState, saveAuthState } from "../support/auth-helpers";

test("custom auth flow", async ({ page, context }) => {
  // Clear existing auth
  clearAuthState(AUTH_STATES.GOOGLE_AUTH);

  // Implement custom authentication logic
  // ...

  // Save new state
  await saveAuthState(context, AUTH_STATES.GOOGLE_AUTH);
});
```

### Parallel Testing

For faster test execution:

```bash
# Run tests in parallel
yarn playwright test --workers=4

# Run specific number of workers
yarn playwright test --workers=2
```

### CI/CD Integration

For continuous integration:

```bash
# Run tests in headless mode with specific output
yarn playwright test --reporter=junit --output-dir=test-results
```

## Further Reading

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Authentication Guide](https://playwright.dev/docs/auth)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
