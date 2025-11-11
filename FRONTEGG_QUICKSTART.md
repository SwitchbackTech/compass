# Frontegg POC Quick Start

This guide helps you quickly test the Frontegg POC implementation.

## Prerequisites

1. Frontegg account (sign up at https://portal.frontegg.com/)
2. A Frontegg workspace configured with your application

## Setup

### 1. Get Frontegg Credentials

1. Log into [Frontegg Portal](https://portal.frontegg.com/)
2. Navigate to **Settings > General > API Keys**
3. Copy your:
   - Client ID
   - API Key
4. Note your Base URL (e.g., `https://app-xxxx.frontegg.com`)

### 2. Configure Backend

Create or update `packages/backend/.env`:

```bash
# ... existing env vars ...

# Frontegg POC Configuration
FRONTEGG_CLIENT_ID=your-client-id-here
FRONTEGG_API_KEY=your-api-key-here
FRONTEGG_BASE_URL=https://app-xxxx.frontegg.com
```

### 3. Configure Frontend (Optional)

To enable the Frontegg React provider, set environment variables for webpack:

```bash
export FRONTEGG_CLIENT_ID=your-client-id-here
export FRONTEGG_BASE_URL=https://app-xxxx.frontegg.com
```

Or add to your webpack environment configuration.

## Testing

### Backend Testing

1. **Start the backend**:

   ```bash
   yarn dev:backend
   ```

2. **Test health endpoint**:

   ```bash
   curl http://localhost:3000/api/frontegg/health
   ```

   Expected response:

   ```json
   {
     "service": "frontegg",
     "status": "configured",
     "message": "Frontegg is configured and ready"
   }
   ```

3. **Test with a Frontegg JWT token** (get from Frontegg dashboard or login UI):

   ```bash
   TOKEN="your-frontegg-jwt-token"

   # Verify session
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/api/frontegg/auth/verify

   # Get user info
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/api/frontegg/auth/me
   ```

### Frontend Integration (Optional)

To add Frontegg provider to the web app, wrap your App component:

```tsx
// In packages/web/src/App.tsx
import { FronteggProvider } from "@web/auth/FronteggProvider";

// Wrap your app
<FronteggProvider>{/* Your existing app content */}</FronteggProvider>;
```

Then start the web app:

```bash
yarn dev:web
```

## API Endpoints

The POC adds these new endpoints:

- `GET /api/frontegg/health` - Check if Frontegg is configured
- `GET /api/frontegg/auth/verify` - Verify JWT token (requires auth header)
- `GET /api/frontegg/auth/me` - Get current user (requires auth header)
- `POST /api/frontegg/auth/session/revoke` - Revoke sessions (dev only, requires auth header)

## Troubleshooting

### "Frontegg not configured" message

**Cause**: Environment variables not set or backend not restarted.

**Solution**:

1. Verify `.env` file has correct values
2. Restart backend: `yarn dev:backend`

### API returns 401 Unauthorized

**Cause**: Invalid or expired JWT token.

**Solution**:

1. Get a fresh token from Frontegg portal or login UI
2. Verify token format: `Bearer your-jwt-token-here`

### Health endpoint returns "not configured"

**Cause**: Environment variables missing.

**Solution**:

1. Check `FRONTEGG_CLIENT_ID` and `FRONTEGG_API_KEY` in `.env`
2. Restart backend

## Session Testing

### Test Idle Timeout (recommended for POC validation)

1. **Configure timeout in Frontegg dashboard**:
   - Go to Security > Session Management
   - Set idle timeout to 5 minutes (for testing)
   - Save configuration

2. **Test the flow**:
   - Login through Frontegg
   - Wait 6 minutes without activity
   - Try to access a protected endpoint
   - Should receive 401 Unauthorized

3. **Test active session**:
   - Login through Frontegg
   - Make API requests every 2-3 minutes
   - Session should remain valid beyond idle timeout

### Test Session Revocation

```bash
# With valid token
TOKEN="your-token"

# Revoke sessions
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/frontegg/auth/session/revoke

# Try to use token again - should fail
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/frontegg/auth/verify
```

## Notes

- This is a **POC implementation** for evaluation purposes
- SuperTokens remains the primary authentication system
- All SuperTokens functionality is preserved and unchanged
- Frontegg runs in parallel and can be disabled by removing env vars

## Documentation

See [FRONTEGG_POC.md](./FRONTEGG_POC.md) for complete documentation.
