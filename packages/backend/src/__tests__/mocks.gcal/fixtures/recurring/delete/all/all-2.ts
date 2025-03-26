import { gSchema$Events } from "@core/types/gcal";

export const deleteAllPayload2: gSchema$Events = {
  kind: "calendar#events",
  etag: '"p33nv5euikqioo0o"',
  summary: "test.user@gmail.com",
  description: "",
  updated: "2025-03-25T13:08:22.211Z",
  timeZone: "America/Chicago",
  accessRole: "owner",
  defaultReminders: [
    {
      method: "popup",
      minutes: 30,
    },
  ],
  nextSyncToken: "CO_yu9KmpYwDEO_yu9KmpYwDGAUg24mI4AIo24mI4AI=",
  items: [
    {
      kind: "calendar#event",
      etag: '"3485816204423902"',
      id: "0oije1knkkthb56vr149dub9qa",
      status: "cancelled",
    },
  ],
};
