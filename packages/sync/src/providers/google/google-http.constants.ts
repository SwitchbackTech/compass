// Every Google Calendar client below is built with no request timeout
// (gaxios default: none), so a hung socket blocks whatever awaits it forever.
// On the job-worker path (sync-job-worker.service.ts), the lease heartbeat
// keeps renewing while a job is in flight, so a hung request there silently
// occupies a worker slot indefinitely instead of ever failing and freeing it
// up for retry. 30s comfortably covers real Google Calendar API latency
// (typically sub-second) while still bounding the worst case.
export const GOOGLE_REQUEST_TIMEOUT_MS = 30_000;
