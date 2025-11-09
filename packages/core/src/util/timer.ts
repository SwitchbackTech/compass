import type { ObjectId } from "bson";
import { EventEmitter2 } from "eventemitter2";
import {
  Observable,
  Subject,
  race,
  switchMap,
  takeUntil,
  tap,
  timer,
} from "rxjs";
import { z } from "zod/v4";
import { zObjectId } from "@core/types/type.utils";
import dayjs from "@core/util/date/dayjs";

export class Timer {
  public readonly _id: ObjectId;
  public readonly startDate: Date;
  public readonly endDate: Date;

  #interval: number; // in milliseconds
  #start: Observable<number>;
  #end: Observable<0>;
  #tick: Observable<number>;
  #manualStart: Subject<Date> = new Subject<Date>();
  #manualEnd: Subject<0> = new Subject<0>();
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
  }: {
    _id: ObjectId;
    startDate: Date;
    endDate: Date;
    interval?: number; // in milliseconds
  }) {
    this._id = zObjectId.parse(_id);
    this.startDate = this.#validateStartDate(startDate, endDate);
    this.endDate = this.#validateEndDate(endDate, startDate);

    const $manualStart = this.#manualStart.pipe(
      switchMap((date) => timer(date, this.#interval)),
    );

    this.#interval = z.number().min(100).default(1000).parse(interval);

    this.#start = race(
      timer(this.startDate, this.#interval),
      $manualStart,
    ).pipe(
      tap((interval) => {
        if (interval === 0) this.#emitter.emit("start", interval);
      }),
    );

    this.#end = race(timer(this.endDate), this.#manualEnd).pipe(
      tap((interval) => this.#emitter.emit("end", interval)),
      tap(() => this.#emitter.removeAllListeners()),
    );

    this.#tick = this.#start.pipe(
      takeUntil(this.#end),
      tap((interval) => this.#emitter.emit("tick", interval)),
    );

    this.#init();
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

  #init(): void {
    this.#tick.subscribe();
  }

  public start(): void {
    const startDate = this.#validateStartDate(new Date(), this.endDate);

    this.#manualStart.next(startDate);
  }

  public end(): void {
    this.#manualEnd.next(0);
  }

  public on(
    event: "start" | "end" | "tick",
    listener: (...args: [number]) => void,
  ): void {
    this.#emitter.on(event, listener);
  }

  public once(
    event: "start" | "end" | "tick",
    listener: (...args: [number]) => void,
  ): void {
    this.#emitter.once(event, listener);
  }
}
