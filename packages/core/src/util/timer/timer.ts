import { ObjectId } from "bson";
import dayjs from "dayjs";
import { EventEmitter2 } from "eventemitter2";
import { Observable, Subscription, timer } from "rxjs";
import { takeUntil } from "rxjs/operators";

export interface Duration {
  milliseconds: number;
  seconds: number;
  minutes: number;
  hours: number;
}

export type TimerEventType =
  | "start"
  | "stop"
  | "pause"
  | "resume"
  | "tick"
  | string;

interface TimerEventMap {
  start: [];
  stop: [];
  pause: [];
  resume: [];
  tick: [Duration];
}

export class Timer extends EventEmitter2 {
  public readonly id: ObjectId;
  public readonly startDate: Date;
  public readonly stopDate: Date;
  private timerObservable: Observable<number> | null = null;
  private timerSubscription: Subscription | null = null;
  private isPaused = false;
  private isRunning = false;
  private pausedAt: Date | null = null;
  private elapsedBeforePause = 0;
  private intervalMs = 1000; // Default to 1 second interval

  constructor(id: ObjectId | string, start: Date, stop: Date, interval = 1000) {
    super({
      wildcard: false,
      delimiter: ".",
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    });

    this.id = typeof id === "string" ? new ObjectId(id) : id;
    this.startDate = start;
    this.stopDate = stop;
    this.intervalMs = interval;

    if (this.stopDate <= this.startDate) {
      throw new Error("Stop date must be after start date");
    }
  }

  public start(): void {
    if (this.isRunning || this.timerSubscription) {
      return; // Already running
    }

    const now = dayjs();
    const startTime = dayjs(this.startDate);
    const endTime = dayjs(this.stopDate);

    // If start time is in the future, wait for it
    const delayToStart = startTime.diff(now);
    const startDelay = delayToStart > 0 ? delayToStart : 0;

    // Calculate duration from now (or start time) to end
    const effectiveStart = delayToStart > 0 ? startTime : now;
    const totalDuration = endTime.diff(effectiveStart);

    if (totalDuration <= 0) {
      // Timer has already expired
      this.emit("stop");
      return;
    }

    // Create timer that starts at startTime and ends at endTime
    const startTimer = timer(startDelay);
    const endTimer = timer(startDelay + totalDuration);
    const tickTimer = timer(startDelay, this.intervalMs);

    this.timerObservable = tickTimer.pipe(takeUntil(endTimer));

    this.timerSubscription = this.timerObservable.subscribe({
      next: (tick) => {
        if (tick === 0) {
          // First tick - emit start event
          this.isRunning = true;
          this.emit("start");
        }

        // Calculate remaining time
        const elapsed = tick * this.intervalMs + this.elapsedBeforePause;
        const remaining = totalDuration - elapsed;
        const duration = this.calculateDuration(remaining);

        this.emit("tick", duration);
      },
      complete: () => {
        this.isRunning = false;
        this.internalStop();
      },
      error: (err) => {
        console.error("Timer error:", err);
        this.isRunning = false;
      },
    });
  }

  private internalStop(): void {
    if (!this.isRunning && !this.timerSubscription) {
      return;
    }

    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }

    this.isRunning = false;
    this.isPaused = false;
    this.pausedAt = null;
    this.elapsedBeforePause = 0;
    this.emit("stop");
  }

  public stop(): void {
    this.internalStop();
  }

  public pause(): void {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    this.isPaused = true;
    this.pausedAt = new Date();

    if (this.timerSubscription) {
      // Calculate elapsed time before pause
      const pauseTime = dayjs(this.pausedAt);
      const startTime = dayjs(this.startDate);
      this.elapsedBeforePause = pauseTime.diff(startTime);

      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }

    this.isRunning = false;
    this.emit("pause");
  }

  public resume(): void {
    if (!this.isPaused) {
      return;
    }

    this.isPaused = false;
    const pauseDuration = this.pausedAt
      ? dayjs().diff(dayjs(this.pausedAt))
      : 0;

    // Adjust start and stop times by the pause duration
    const newStart = dayjs(this.startDate).add(pauseDuration, "millisecond");
    const newStop = dayjs(this.stopDate).add(pauseDuration, "millisecond");

    // Update the dates
    (this as any).startDate = newStart.toDate();
    (this as any).stopDate = newStop.toDate();

    this.pausedAt = null;

    this.emit("resume");

    // Restart the timer
    this.start();
  }

  public stop(): void {
    this.internalStop();
  }

  private calculateDuration(milliseconds: number): Duration {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      milliseconds: Math.max(0, milliseconds),
      seconds: Math.max(0, seconds),
      minutes: Math.max(0, minutes),
      hours: Math.max(0, hours),
    };
  }

  // Custom event listener methods that restrict access to built-in events
  public after(event: string, listener: (...args: any[]) => void): this {
    if (this.isBuiltInEvent(event)) {
      throw new Error(
        `Cannot add custom listeners for built-in event: ${event}`,
      );
    }
    return super.on(event, listener);
  }

  public every(
    event: string,
    interval: number,
    listener: (...args: any[]) => void,
  ): this {
    if (this.isBuiltInEvent(event)) {
      throw new Error(
        `Cannot add custom listeners for built-in event: ${event}`,
      );
    }
    // Emit the event every interval
    setInterval(() => {
      this.emit(event);
    }, interval);
    return super.on(event, listener);
  }

  private isBuiltInEvent(event: string): boolean {
    return ["start", "stop", "pause", "resume", "tick"].includes(event);
  }

  // Override on/off/once to prevent adding/removing built-in event listeners
  public on(event: TimerEventType, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  public off(event: TimerEventType, listener: (...args: any[]) => void): this {
    return super.off(event, listener);
  }

  public once(event: TimerEventType, listener: (...args: any[]) => void): this {
    return super.once(event, listener);
  }
}
