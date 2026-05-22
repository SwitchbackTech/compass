import { useSyncExternalStore } from "react";

/**
 * Tracks event ids that were just committed from a Someday-to-calendar drop.
 *
 * The floating overlay and the freshly mounted GridEvent / AllDayEvent are
 * two separate DOM nodes that hand off in a single frame; without an
 * entrance animation the drop reads as a swap. This module lets the
 * calendar event components opt into a one-shot acknowledgment animation
 * when they render for an id that has just landed.
 *
 * Marks auto-expire after {@link SOMEDAY_COMMIT_ACKNOWLEDGEMENT_MS} so a
 * later re-render of the same event (e.g. drag-to-resize) is not animated.
 */

const SOMEDAY_COMMIT_ACKNOWLEDGEMENT_MS = 440;

const recentIds = new Set<string>();
const listeners = new Set<() => void>();
const expirationTimers = new Map<string, ReturnType<typeof setTimeout>>();

const notify = () => {
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const markSomedayCommitAcknowledgement = (eventId: string) => {
  if (!eventId) {
    return;
  }

  const wasRecent = recentIds.has(eventId);
  const existingTimer = expirationTimers.get(eventId);

  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  recentIds.add(eventId);
  expirationTimers.set(
    eventId,
    setTimeout(() => {
      recentIds.delete(eventId);
      expirationTimers.delete(eventId);
      notify();
    }, SOMEDAY_COMMIT_ACKNOWLEDGEMENT_MS),
  );

  if (!wasRecent) {
    notify();
  }
};

export const useSomedayCommitAcknowledgement = (
  eventId: string | undefined,
) => {
  return useSyncExternalStore(
    subscribe,
    () => (eventId ? recentIds.has(eventId) : false),
    () => false,
  );
};

// Test-only escape hatch. Avoids leaking timers across vitest runs and lets
// tests assert specific marks without waiting on real timers.
export const __resetSomedayCommitAcknowledgementState = () => {
  for (const timer of expirationTimers.values()) {
    clearTimeout(timer);
  }

  expirationTimers.clear();
  recentIds.clear();
  notify();
};
