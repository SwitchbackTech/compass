import { type ConflictBehavior, type Hotkey } from "@tanstack/react-hotkeys";
import { HOTKEY_SEQUENCE_TIMEOUT_MS } from "../constants/hotkey.constants";

interface SequenceRegistration {
  blurOnTrigger: boolean;
  conflictBehavior: ConflictBehavior;
  enabled: boolean;
  handler: (event: KeyboardEvent) => void;
  id: number;
  ignoreInputs?: boolean;
  sequence: string[];
}

interface PendingSequenceState {
  candidateIds: number[];
  nextIndex: number;
}

type SequenceSnapshot = {
  expectedHotkey: string | null;
  pendingSequences: string[][];
};

function getElementFromEventTarget(
  target: EventTarget | null,
): HTMLElement | null {
  if (target instanceof HTMLElement) {
    return target;
  }

  if (target instanceof Node) {
    return target.parentElement;
  }

  return null;
}

function isEditableTarget(target: EventTarget | null): boolean {
  const element = getElementFromEventTarget(target);

  if (!element) {
    return false;
  }

  if (
    element.isContentEditable ||
    element.closest("[contenteditable='true']")
  ) {
    return true;
  }

  const formElement = element.closest("input, select, textarea");

  return Boolean(formElement);
}

function normalizeEventKey(event: KeyboardEvent): string | null {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return null;
  }

  if (
    event.key === "Shift" ||
    event.key === "Control" ||
    event.key === "Alt" ||
    event.key === "Meta"
  ) {
    return null;
  }

  return event.key.toUpperCase();
}

function normalizeSequence(sequence: readonly Hotkey[]): string[] {
  const normalizedSequence = sequence.map((key) => {
    if (typeof key !== "string") {
      throw new Error("Hotkey sequences must use string keys");
    }

    return key.toUpperCase();
  });

  if (normalizedSequence.length < 2) {
    throw new Error("Hotkey sequences must include at least two keys");
  }

  return normalizedSequence;
}

class HotkeySequenceController {
  private activePending: PendingSequenceState | null = null;
  private nextRegistrationId = 1;
  private readonly registrations = new Map<number, SequenceRegistration>();
  private readonly snapshotListeners = new Set<() => void>();
  private snapshotVersion = 0;
  private readonly suppressedHotkeysByEvent = new WeakMap<
    KeyboardEvent,
    Set<string>
  >();
  private timeoutId: number | null = null;

  register(
    registration: Omit<SequenceRegistration, "id" | "sequence"> & {
      sequence: readonly Hotkey[];
    },
  ) {
    const id = this.nextRegistrationId++;

    this.registrations.set(id, {
      ...registration,
      id,
      sequence: normalizeSequence(registration.sequence),
    });

    this.syncListener();
    this.reconcilePendingState();
    return id;
  }

  unregister(id: number) {
    if (!this.registrations.has(id)) {
      return;
    }

    this.registrations.delete(id);
    this.reconcilePendingState();
    this.syncListener();
  }

  subscribe(listener: () => void) {
    this.snapshotListeners.add(listener);

    return () => {
      this.snapshotListeners.delete(listener);
    };
  }

  getSnapshot(): SequenceSnapshot {
    if (!this.activePending) {
      return {
        expectedHotkey: null,
        pendingSequences: [],
      };
    }

    const pendingSequences = this.activePending.candidateIds
      .map((id) => this.registrations.get(id)?.sequence)
      .filter((sequence): sequence is string[] => Boolean(sequence));

    const expectedHotkey =
      pendingSequences[0]?.[this.activePending.nextIndex] ?? null;

    return {
      expectedHotkey,
      pendingSequences,
    };
  }

  isPendingForSequence(sequence: readonly Hotkey[]) {
    const normalizedSequence = normalizeSequence(sequence);
    const snapshot = this.getSnapshot();

    return snapshot.pendingSequences.some(
      (pendingSequence) =>
        pendingSequence.length === normalizedSequence.length &&
        pendingSequence.every(
          (key, index) => key === normalizedSequence[index],
        ),
    );
  }

  getSnapshotVersion() {
    return this.snapshotVersion;
  }

  shouldSuppressHotkey(event: KeyboardEvent, hotkey: string | null): boolean {
    if (!hotkey) {
      return false;
    }

    const suppressedHotkeys = this.suppressedHotkeysByEvent.get(event);

    if (suppressedHotkeys?.has(hotkey)) {
      return true;
    }

    return this.getSnapshot().expectedHotkey === hotkey;
  }

  resetForTests() {
    this.clearPendingState();
    this.registrations.clear();
    this.nextRegistrationId = 1;
    this.syncListener();
    this.emitSnapshot();
  }

  private readonly handleKeyUp = (event: KeyboardEvent) => {
    if (document.body.dataset.appLocked === "true") {
      this.clearPendingState();
      return;
    }

    const normalizedKey = normalizeEventKey(event);

    if (!normalizedKey) {
      return;
    }

    const eligibleRegistrations = this.getEligibleRegistrations(event);
    const expectedHotkey = this.getSnapshot().expectedHotkey;

    if (expectedHotkey === normalizedKey) {
      this.markHotkeySuppressed(event, normalizedKey);
    }

    if (!this.activePending) {
      this.startPendingState(eligibleRegistrations, normalizedKey);
      return;
    }

    const matchingRegistrations = this.activePending.candidateIds
      .map((id) => eligibleRegistrations.get(id))
      .filter(
        (registration): registration is SequenceRegistration =>
          Boolean(registration) &&
          registration.sequence[this.activePending!.nextIndex] ===
            normalizedKey,
      );

    if (matchingRegistrations.length === 0) {
      this.clearPendingState();
      this.startPendingState(eligibleRegistrations, normalizedKey);
      return;
    }

    const nextIndex = this.activePending.nextIndex + 1;
    const completedRegistrations = matchingRegistrations.filter(
      (registration) => registration.sequence.length === nextIndex,
    );

    if (completedRegistrations.length > 0) {
      this.clearPendingState();
      this.runHandlers(completedRegistrations, event);
      return;
    }

    this.setPendingState({
      candidateIds: matchingRegistrations.map(
        (registration) => registration.id,
      ),
      nextIndex,
    });
  };

  private clearPendingState() {
    if (!this.activePending && this.timeoutId === null) {
      return;
    }

    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.activePending = null;
    this.emitSnapshot();
  }

  private emitSnapshot() {
    this.snapshotVersion += 1;
    this.snapshotListeners.forEach((listener) => listener());
  }

  private getEligibleRegistrations(event: KeyboardEvent) {
    const isEditable = isEditableTarget(event.target);
    const registrations = new Map<number, SequenceRegistration>();

    this.registrations.forEach((registration, id) => {
      if (!registration.enabled) {
        return;
      }

      if (registration.ignoreInputs !== false && isEditable) {
        return;
      }

      registrations.set(id, registration);
    });

    return registrations;
  }

  private markHotkeySuppressed(event: KeyboardEvent, hotkey: string) {
    const suppressedHotkeys =
      this.suppressedHotkeysByEvent.get(event) ?? new Set<string>();

    suppressedHotkeys.add(hotkey);
    this.suppressedHotkeysByEvent.set(event, suppressedHotkeys);
  }

  private reconcilePendingState() {
    if (!this.activePending) {
      return;
    }

    const candidateIds = this.activePending.candidateIds.filter((id) => {
      const registration = this.registrations.get(id);

      return Boolean(registration?.enabled);
    });

    if (candidateIds.length === 0) {
      this.clearPendingState();
      return;
    }

    const nextIndex = this.activePending.nextIndex;
    const validCandidateIds = candidateIds.filter((id) => {
      const registration = this.registrations.get(id);

      return Boolean(registration?.sequence[nextIndex]);
    });

    if (validCandidateIds.length === 0) {
      this.clearPendingState();
      return;
    }

    this.setPendingState({
      candidateIds: validCandidateIds,
      nextIndex,
    });
  }

  private runHandlers(
    registrations: SequenceRegistration[],
    event: KeyboardEvent,
  ) {
    for (const registration of registrations) {
      if (registration.blurOnTrigger) {
        (document.activeElement as HTMLElement | null)?.blur?.();
      }

      registration.handler(event);

      if (registration.conflictBehavior !== "allow") {
        return;
      }
    }
  }

  private setPendingState(pendingState: PendingSequenceState) {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
    }

    this.activePending = pendingState;
    this.timeoutId = window.setTimeout(() => {
      this.timeoutId = null;
      this.activePending = null;
      this.emitSnapshot();
    }, HOTKEY_SEQUENCE_TIMEOUT_MS);
    this.emitSnapshot();
  }

  private startPendingState(
    eligibleRegistrations: Map<number, SequenceRegistration>,
    normalizedKey: string,
  ) {
    const candidateIds = Array.from(eligibleRegistrations.values())
      .filter((registration) => registration.sequence[0] === normalizedKey)
      .map((registration) => registration.id);

    if (candidateIds.length === 0) {
      return;
    }

    this.setPendingState({
      candidateIds,
      nextIndex: 1,
    });
  }

  private syncListener() {
    document.removeEventListener("keyup", this.handleKeyUp, true);

    if (this.registrations.size > 0) {
      document.addEventListener("keyup", this.handleKeyUp, true);
    }
  }
}

export const hotkeySequenceController = new HotkeySequenceController();
