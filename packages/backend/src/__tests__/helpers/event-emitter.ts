import EventEmitter from "node:events";

export const mockEventEmitter = new EventEmitter({ captureRejections: true });
