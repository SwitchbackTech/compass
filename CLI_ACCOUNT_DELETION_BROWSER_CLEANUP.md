# CLI Account Deletion with Browser Data Cleanup

## Overview

When you delete your Compass account via the CLI, your account data is removed from the backend database. However, your browser may still contain local data such as session cookies, localStorage, and IndexedDB entries. This feature provides a streamlined way to clear all browser-side data after account deletion.

## What Gets Cleaned Up

When you complete the browser cleanup process, the following data is cleared:

1. **Session Cookies** - Your SuperTokens authentication session is terminated
2. **LocalStorage** - All Compass-related localStorage entries are removed:
   - Task data (`compass.today.tasks.*`)
   - User preferences (`compass.reminder`, `compass.auth.*`)
   - UI state flags
3. **IndexedDB** - The `compass-local` database is deleted (if it exists)

## How It Works

### Step 1: Delete Your Account via CLI

Run the delete command with your email or user ID:

```bash
yarn cli delete --user your-email@example.com
```

Or with force flag to skip the confirmation prompt:

```bash
yarn cli delete --user your-email@example.com --force
```

### Step 2: Browser Cleanup Prompt

After the backend deletion completes, the CLI will prompt you:

```
🧹 Browser Data Cleanup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Your account has been deleted from the backend.
However, browser storage may still contain:
  • Session cookies (SuperTokens)
  • LocalStorage data (tasks, preferences)
  • IndexedDB (compass-local database)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

? Would you like to clear browser data for a fresh start? (Y/n)
```

### Step 3: Complete Cleanup in Browser

If you choose "Yes", the CLI will provide a cleanup URL:

```
📋 Follow these steps to complete cleanup:

1. Open this URL in your browser:
   http://localhost:8080/cleanup

2. The page will automatically:
   ✓ Log you out of your session
   ✓ Clear all localStorage data
   ✓ Delete the IndexedDB database
   ✓ Redirect you to the login page

✨ You'll have a completely clean slate!
```

### Step 4: Automatic Cleanup

When you visit the cleanup URL:

1. The page automatically clears all browser storage
2. You're logged out of your session
3. After 2 seconds, you're redirected to the login page

## Environment-Specific URLs

The cleanup URL varies by environment:

- **Local Development**: `http://localhost:8080/cleanup`
- **Staging**: `https://staging.compass.switchback.tech/cleanup`
- **Production**: `https://compass.switchback.tech/cleanup`

The CLI automatically selects the correct URL based on your `NODE_ENV`.

## Manual Cleanup

If you skip the cleanup during account deletion, you can manually visit the cleanup URL later to clear your browser data:

1. Navigate to the appropriate cleanup URL for your environment
2. The cleanup will run automatically
3. You'll be redirected to the login page

## Benefits

### For Regular Users

- **Complete Privacy**: No traces of your account remain in the browser
- **Fresh Start**: Clean slate for re-onboarding or testing
- **Cross-Device Friendly**: Works on any device with a browser
- **Secure**: No browser automation or credential sharing needed

### For Developers

- **Easy Testing**: Quickly reset to a clean state during development
- **Consistent Environment**: Avoid stale data causing test failures
- **Fast Iteration**: No manual browser data clearing required

## Technical Details

### CLI Implementation

- Location: `packages/scripts/src/commands/delete.ts`
- Uses `inquirer` for interactive prompts
- Integrates with existing deletion flow
- No breaking changes to existing functionality

### Web Implementation

- Route: `/cleanup` (added to router)
- Component: `packages/web/src/views/Cleanup/Cleanup.tsx`
- Utility: `packages/web/src/common/utils/cleanup/browserCleanup.util.ts`
- Clears storage using browser APIs (no server communication needed)

### Security Considerations

- No sensitive data transmitted over the network
- Cleanup happens entirely in the browser
- No authentication required for cleanup URL (it only clears local data)
- Session termination uses SuperTokens' official signOut method

## Troubleshooting

### IndexedDB Deletion Blocked

If you see a warning about IndexedDB deletion being blocked:

- Close all other Compass browser tabs
- Revisit the cleanup URL
- The deletion should complete successfully

### Cleanup Fails

If cleanup fails:

- Check browser console for error messages
- Try manually clearing browser data via browser settings
- Contact support if issues persist

## Future Enhancements

Potential improvements for future versions:

- Support for clearing data across multiple browsers simultaneously
- Export data before deletion option
- Backup and restore functionality
- Scheduled automatic cleanup for inactive accounts
