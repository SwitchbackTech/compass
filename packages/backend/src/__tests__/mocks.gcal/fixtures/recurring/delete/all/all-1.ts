import { gSchema$Events } from "@core/types/gcal";
import { EventStatus } from "../../../../../../../../core/src/types/event.types";

export const deleteAllPayload1: gSchema$Events = {
  kind: "calendar#events",
  etag: '"p32nsfe61kqioo0o"',
  summary: "test.user@gmail.com",
  description: "",
  updated: "2025-03-25T13:07:46.505Z",
  timeZone: "America/Chicago",
  accessRole: "owner",
  defaultReminders: [
    {
      method: "popup",
      minutes: 30,
    },
  ],
  nextSyncToken: "CK_HuMGmpYwDEK_HuMGmpYwDGAUg24mI4AIo24mI4AI=",
  items: [
    {
      kind: "calendar#event",
      etag: '"3485816133011294"',
      id: "6pbua6vjeic3e73gvponeo1qp6",
      status: EventStatus.CANCELLED,
    },
  ],
};
