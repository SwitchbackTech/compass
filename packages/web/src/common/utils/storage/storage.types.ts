/**
 * Event detail for the "compass.tasks.saved" custom event.
 * Dispatched when tasks are saved to localStorage to enable same-tab synchronization.
 */
export interface CompassTasksSavedEventDetail {
  dateKey: string;
}

export type CompassTasksSavedEvent = CustomEvent<CompassTasksSavedEventDetail>;
