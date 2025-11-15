# Frontegg Authentication POC Documentation

## Overview

This document describes the Frontegg authentication proof-of-concept (POC) implementation for the Compass Calendar application. This POC runs **parallel** to the existing SuperTokens implementation and does not replace or modify any SuperTokens code.

## Goals

The POC demonstrates:

1. **Authentication & Session Management**: Frontegg's auth flows including signup, login, and logout
2. **Session Reliability**: Idle session timeout configuration and session refresh mechanics
3. **Session Revocation**: Ability to revoke user sessions
4. **Developer Ergonomics**: Comparison with SuperTokens integration
5. **Migration Feasibility**: Identification of any blockers for full migration

## Architecture

### Backend Components

#### 1. Frontegg Middleware (`/packages/backend/src/common/middleware/frontegg.middleware.ts`)

- Initializes the Frontegg client with API credentials
- Provides CORS configuration for Frontegg requests
- Gracefully degrades if Frontegg is not configured

**Key Features:**

- Optional initialization - won't break if env vars are missing
- Singleton client instance
- Logging for debugging

#### 2. Frontegg Auth Service (`/packages/backend/src/auth/services/frontegg.auth.service.ts`)

Handles core authentication operations:

- `validateAccessToken()` - Validates JWT tokens from Frontegg
- `revokeUserSessions()` - Revokes all sessions for a user
- `getUserById()` - Fetches user information
- `isConfigured()` - Checks if Frontegg is properly set up

#### 3. Frontegg Auth Middleware (`/packages/backend/src/auth/middleware/frontegg.auth.middleware.ts`)

Express middleware that:

- Extracts JWT from Authorization header
- Validates token with Frontegg
- Attaches user info to Express request object
- Returns appropriate error responses for auth failures

#### 4. Frontegg Controller (`/packages/backend/src/auth/controllers/frontegg.controller.ts`)

API endpoints for:

- `/api/frontegg/auth/verify` - Verify session validity
- `/api/frontegg/auth/me` - Get current user info
- `/api/frontegg/auth/session/revoke` - Revoke user sessions (dev only)
- `/api/frontegg/health` - Check Frontegg configuration status

#### 5. Frontegg Routes (`/packages/backend/src/auth/frontegg.routes.config.ts`)

Configures all Frontegg-specific routes in Express.

### Frontend Components

#### 1. Frontegg Provider (`/packages/web/src/auth/FronteggProvider.tsx`)

React context provider that:

- Wraps the app with Frontegg authentication context
- Only activates when Frontegg is configured
- Enables session keep-alive for long sessions
- Supports hosted login box UI

#### 2. Frontegg Utilities (`/packages/web/src/auth/frontegg.util.ts`)

Helper functions:

- `useFronteggAuth()` - React hook for auth state
- `getFronteggUserId()` - Get current user ID
- `getFronteggUserEmail()` - Get current user email
- `isFronteggConfigured()` - Check if Frontegg is set up

## Configuration

### Environment Variables

#### Backend (`packages/backend/.env`)

```bash
# Frontegg POC Configuration (optional)
FRONTEGG_CLIENT_ID=your-client-id-from-frontegg
FRONTEGG_API_KEY=your-api-key-from-frontegg
FRONTEGG_BASE_URL=https://app-xxxx.frontegg.com
```

#### Frontend (webpack environment or `.env`)

```bash
# Frontegg POC Configuration (optional)
FRONTEGG_CLIENT_ID=your-client-id-from-frontegg
FRONTEGG_BASE_URL=https://app-xxxx.frontegg.com
```

### Getting Frontegg Credentials

1. Sign up at [Frontegg Portal](https://portal.frontegg.com/)
2. Create a new application/environment
3. Navigate to Settings > General > API Keys
4. Copy your Client ID and API Key
5. Note your Base URL from the environment settings

## Session Management

### Idle Session Timeout Configuration

Frontegg supports configurable session timeouts through their dashboard:

1. **Navigate to**: Security > Session Management in Frontegg Portal
2. **Configure**:
   - Maximum session duration
   - Idle timeout period
   - Absolute session timeout
   - Remember me duration

**Default POC Settings:**

- `keepSessionAlive: true` - Enables automatic session refresh
- Session refresh happens before expiration
- Configurable timeout periods in Frontegg dashboard

### Session Refresh Mechanics

Frontegg handles session refresh automatically:

- Access tokens are short-lived JWTs
- Refresh tokens are used to obtain new access tokens
- React SDK handles refresh automatically in the background
- No manual intervention required

### Testing Idle Session Timeout (24+ hours)

To test long idle sessions:

1. Configure a short timeout in Frontegg dashboard (e.g., 5 minutes)
2. Log in to the application
3. Leave idle for the configured period
4. Verify session expires and user is logged out
5. For production, configure 24+ hour timeout as needed

## Authentication Flows

### 1. Sign Up

**Frontegg Flow:**

```
User → Frontegg Hosted Login Box → Sign Up Form → Email Verification → Dashboard
```

**Implementation:**

- Frontegg provides hosted UI for signup
- Email verification can be enabled/disabled
- Custom branding available in Frontegg portal
- Social login (Google, GitHub, etc.) available

### 2. Login

**Frontegg Flow:**

```
User → Frontegg Hosted Login Box → Credentials → JWT Token → Application
```

**Backend Validation:**

```typescript
// Middleware extracts token
const token = req.headers.authorization?.substring(7);

// Service validates token
const user = await fronteggAuthService.validateAccessToken(token);

// Attach to request
req.fronteggUser = user;
```

### 3. Logout

**Frontegg Flow:**

```
User → Logout Action → Frontegg Session Termination → Redirect to Login
```

### 4. Session Validation

**API Request Flow:**

```
Client → Request with Bearer Token → verifyFronteggSession Middleware → API Endpoint
```

## Testing the POC

### Prerequisites

1. Set up Frontegg account and get credentials
2. Configure environment variables (backend and frontend)
3. Install dependencies: `yarn install`

### Backend Testing

```bash
# Start backend (with Frontegg env vars configured)
yarn dev:backend

# Test health endpoint
curl http://localhost:3000/api/frontegg/health

# Expected response if configured:
# {
#   "service": "frontegg",
#   "status": "configured",
#   "message": "Frontegg is configured and ready"
# }

# Expected response if not configured:
# {
#   "service": "frontegg",
#   "status": "not configured",
#   "message": "Frontegg environment variables not set"
# }
```

### Frontend Testing (when Frontegg is configured)

1. **Wrap App.tsx** with FronteggProvider (optional integration)
2. **Start web app**: `yarn dev:web`
3. **Navigate to**: http://localhost:9080
4. **Test login flow** through Frontegg UI

### Session Testing

#### Test Session Validation

```bash
# Get token from Frontegg login (from browser dev tools or Frontegg dashboard)
TOKEN="your-frontegg-jwt-token"

# Test session validation
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/frontegg/auth/verify
```

#### Test Session Revocation (Dev Only)

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/frontegg/auth/session/revoke
```

## Comparison with SuperTokens

### Similarities

| Feature            | SuperTokens | Frontegg |
| ------------------ | ----------- | -------- |
| JWT-based auth     | ✅          | ✅       |
| Session refresh    | ✅          | ✅       |
| Session revocation | ✅          | ✅       |
| React SDK          | ✅          | ✅       |
| Backend middleware | ✅          | ✅       |

### Differences

| Aspect               | SuperTokens            | Frontegg          |
| -------------------- | ---------------------- | ----------------- |
| **Hosting**          | Self-hosted or managed | Fully hosted      |
| **Dashboard**        | Limited UI             | Full admin portal |
| **Session Config**   | Code-based             | Dashboard UI      |
| **Social Login**     | Requires setup         | Pre-configured    |
| **User Management**  | API only               | Full dashboard    |
| **Pricing**          | Free tier generous     | Usage-based       |
| **Setup Complexity** | Higher                 | Lower             |

### Developer Ergonomics

**Frontegg Advantages:**

- Dashboard for configuration (no code changes needed)
- Built-in user management UI
- Pre-configured social providers
- Visual session management
- Better observability through dashboard

**SuperTokens Advantages:**

- More control over implementation
- Can be self-hosted
- More flexible customization
- Lower cost at scale

## Migration Considerations

### Potential Blockers

1. **User Data Export**
   - Need to export users from SuperTokens
   - Map SuperTokens user IDs to Frontegg user IDs
   - Preserve user metadata

2. **Password Hashing**
   - SuperTokens and Frontegg may use different algorithms
   - May need password reset for all users
   - Or implement custom password migration

3. **Session Migration**
   - Active sessions would be invalidated
   - Users would need to re-login
   - Plan for gradual rollout

4. **Custom Roles/RBAC**
   - Review Compass's role requirements
   - Map to Frontegg's RBAC model
   - Test edge cases

5. **Integration Points**
   - Update all auth checks to use Frontegg
   - Update session middleware
   - Update frontend auth hooks

### Migration Strategy

**Recommended Approach:**

1. **Phase 1: Parallel Running** (Current POC)
   - Both systems running simultaneously
   - New users can choose provider
   - Test in staging environment

2. **Phase 2: User Migration**
   - Export SuperTokens users
   - Import to Frontegg
   - Send password reset emails

3. **Phase 3: Code Migration**
   - Replace SuperTokens calls with Frontegg
   - Update all auth middleware
   - Update frontend components

4. **Phase 4: Deprecation**
   - Monitor for SuperTokens usage
   - Remove SuperTokens dependencies
   - Clean up unused code

## Session Timeout Testing Plan

### Test Scenarios

1. **Short Idle Test** (5 minutes)
   - Configure 5-minute idle timeout in Frontegg dashboard
   - Log in and remain idle
   - Verify automatic logout after timeout

2. **Active Session Test**
   - Configure 5-minute idle timeout
   - Keep browser active (click/scroll)
   - Verify session remains valid beyond 5 minutes

3. **Long Idle Test** (24+ hours)
   - Configure 24-hour idle timeout
   - Log in and close browser
   - Return after 25 hours
   - Verify session expired

4. **Session Refresh Test**
   - Monitor network tab during active session
   - Verify token refresh before expiration
   - Confirm seamless UX (no interruptions)

### Expected Results

- ✅ Session refreshes automatically when active
- ✅ Session expires after configured idle period
- ✅ User is redirected to login after expiry
- ✅ No silent refresh bugs (session truly expires)
- ✅ Concurrent session handling works correctly

## Deployment to Staging

### Prerequisites

1. Staging Frontegg environment configured
2. Environment variables set in staging
3. Frontend build includes Frontegg provider

### Steps

1. **Update staging environment variables**

   ```bash
   FRONTEGG_CLIENT_ID=staging-client-id
   FRONTEGG_API_KEY=staging-api-key
   FRONTEGG_BASE_URL=https://app-staging-xxx.frontegg.com
   ```

2. **Build and deploy backend**

   ```bash
   yarn cli build nodePckgs --environment staging
   # Deploy to staging server
   ```

3. **Build and deploy frontend**

   ```bash
   yarn cli build web --environment staging --clientId "staging-google-client-id"
   # Deploy to staging CDN/server
   ```

4. **Verify deployment**
   ```bash
   curl https://staging.yourdomain.com/api/frontegg/health
   ```

### Testing in Staging

1. Navigate to staging URL
2. Test login/signup flows
3. Test session timeout (with short timeout configured)
4. Test session revocation
5. Monitor logs for errors

## Known Limitations

### Current POC Limitations

1. **No Google Calendar Integration**
   - POC focuses on auth only
   - Google OAuth still handled separately
   - Would need integration planning

2. **No User Migration Tool**
   - Manual export/import required
   - Scripts would need to be written

3. **Limited Customization**
   - Using Frontegg hosted login
   - Custom UI would require embedded mode

4. **Cost Considerations**
   - Need to evaluate pricing at scale
   - Compare with SuperTokens costs

## Next Steps for Full Migration

1. **Cost Analysis**
   - Calculate Frontegg costs at current user count
   - Project future costs
   - Compare with SuperTokens

2. **User Migration Planning**
   - Design migration script
   - Plan user communication
   - Test migration in staging

3. **Integration Testing**
   - Test with Google Calendar sync
   - Test with all API endpoints
   - Performance testing

4. **Documentation Updates**
   - Update developer docs
   - Update deployment guides
   - Update troubleshooting guides

## Support and Resources

### Frontegg Documentation

- [Frontegg Docs](https://docs.frontegg.com/)
- [Session Management](https://developers.frontegg.com/ciam/guides/security-center/session-management/self-service)
- [React SDK](https://docs.frontegg.com/docs/react-sdk)
- [REST API](https://docs.frontegg.com/reference/restapi_overview)

### Internal Resources

- Parent Epic: [#1209](https://github.com/SwitchbackTech/compass/issues/1209)
- SuperTokens Bug Reports: See parent epic

## Conclusion

This POC demonstrates that Frontegg is a viable alternative to SuperTokens with:

- ✅ Equivalent authentication capabilities
- ✅ Better developer experience (dashboard)
- ✅ Robust session management
- ✅ Easy configuration
- ⚠️ Migration effort required
- ⚠️ Cost considerations needed

The choice between SuperTokens and Frontegg depends on:

- Budget constraints
- Preference for managed vs. self-hosted
- Importance of admin dashboard
- Migration effort appetite
