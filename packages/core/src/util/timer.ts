import { EventEmitter2, ListenerFn } from "eventemitter2";
import {
  BehaviorSubject,
  Observable,
  Subject,
  Subscription,
  race,
  switchMap,
  takeUntil,
  tap,
  timer,
} from "rxjs";
import { z } from "zod/v4";
import { StringV4Schema } from "@core/types/type.utils";
import dayjs from "@core/util/date/dayjs";

export class Timer {
  public readonly _id: string;
  public readonly startDate: Date;
  public readonly endDate: Date;

  #interval: number; // in milliseconds
  #start: Observable<number>;
  #end: Observable<0>;
  #tick: Observable<number>;
  #manualStart: BehaviorSubject<Date>;
  #manualEnd: Subject<0> = new Subject<0>();
  #subscription: Subscription | undefined;
  #firstStart: boolean = true;
  #emitter: EventEmitter2 = new EventEmitter2({
    wildcard: false,
    delimiter: ".",
    newListener: false,
    removeListener: false,
    maxListeners: 10,
    verboseMemoryLeak: false,
    ignoreErrors: false,
  });

  /**
   * Timer utility to emit events at specified intervals
   * between start and end dates.
   *
   * specify interval in milliseconds (default: 1000ms)
   */
  constructor({
    _id,
    startDate,
    endDate,
    interval,
    autoStart = true,
  }: {
    _id: string;
    startDate: Date;
    endDate: Date;
    interval?: number; // in milliseconds
    autoStart?: boolean;
  }) {
    this._id = StringV4Schema.parse(_id);
    this.startDate = this.#validateStartDate(startDate, endDate);
    this.endDate = this.#validateEndDate(endDate, startDate);
    this.#interval = z.number().min(100).default(1000).parse(interval);
    this.#manualStart = new BehaviorSubject<Date>(this.startDate);

    this.#start = this.#manualStart
      .pipe(switchMap((date) => timer(date, this.#interval)))
      .pipe(
        tap((interval) => {
          if (interval === 0) this.#emitter.emit("start", interval);
        }),
      );

    this.#end = race(timer(this.endDate), this.#manualEnd).pipe(
      tap((interval) => this.#emitter.emit("end", interval)),
    );

    this.#tick = this.#start.pipe(
      takeUntil(this.#end),
      tap((interval) => this.#emitter.emit("tick", interval)),
    );

    if (autoStart) this.#init(true);
  }

  get currentStartDate(): Date {
    return this.#manualStart.getValue();
  }

  #validateStartDate(startDate: Date, endDate: Date): Date {
    return z
      .date()
      .pipe(
        z.custom<Date>((v) => dayjs(endDate).isAfter(v as Date), {
          error: () => `Start date must be before End date`,
        }),
      )
      .parse(startDate);
  }

  #validateEndDate(endDate: Date, startDate: Date): Date {
    return z
      .date()
      .pipe(
        z.custom<Date>((v) => dayjs(startDate).isBefore(v as Date), {
          error: () => "End date must be after Start date",
        }),
      )
      .pipe(
        z.custom<Date>((v) => dayjs().isBefore(v as Date), {
          error: () => "End date must be in the future",
        }),
      )
      .parse(endDate);
  }

  #init(first: boolean = false): void {
    const firstStart = this.#firstStart;

    this.#firstStart = first;

    this.#subscription = this.#tick.subscribe({
      error: () => {
        this.#firstStart = firstStart;
      },
    });
  }

  public start(): void {
    const started = !this.#subscription?.closed;
    const startDate = this.#validateStartDate(new Date(), this.endDate);

    if (!this.#firstStart && started) return;

    if (started) {
      this.once("end", () => {
        this.#manualStart.next(startDate);
        this.#init();
      });

      return this.end();
    }

    this.#manualStart.next(startDate);
    this.#init();
  }

  public end(): void {
    this.#manualEnd.next(0);
  }

  public close(): void {
    this.#subscription?.unsubscribe();
    this.#emitter.removeAllListeners();
    Object.assign(this, {
      start: () => {},
      end: () => {},
      on: () => {},
      off: () => {},
      once: () => {},
    });
  }

  public on(event: "start" | "end" | "tick", listener: ListenerFn): void {
    this.#emitter.on(event, listener);
  }

  public once(event: "start" | "end" | "tick", listener: ListenerFn): void {
    this.#emitter.once(event, listener);
  }

  public off(event: "start" | "end" | "tick", listener: ListenerFn): void {
    this.#emitter.off(event, listener);
  }
}
