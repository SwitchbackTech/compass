# Google Sync And Websocket Flow (Legacy)

This page is kept only as a pointer for old links and historical context.

Compass realtime sync no longer uses websocket transport in current codepaths.
The canonical runtime documentation is:

- [Google Sync And Server-Sent Events (SSE)](./google-sync-and-sse-flow.md)

Current source anchors for realtime behavior:

- `packages/core/src/constants/sse.constants.ts`
- `packages/core/src/types/sse.types.ts`
- `packages/backend/src/events/events.routes.config.ts`
- `packages/backend/src/servers/sse/sse.server.ts`
- `packages/web/src/sse/provider/SSEProvider.tsx`

If you are debugging stale UI refresh or import lifecycle behavior, use:

- [Troubleshoot](../development/troubleshoot.md)
- [Frontend Runtime Flow](../frontend/frontend-runtime-flow.md)
- [Compass API Documentation](../backend/api-documentation.md)
