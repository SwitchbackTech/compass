import { allday } from "./gcal.allday";
import { cancelled } from "./gcal.cancelled";
import { recurring } from "./gcal.recurring";
import { timed } from "./gcal.timed";

export const gcalEvents = {
  kind: "calendar#events",
  etag: '"p320cj0e0m6hf80g"',
  summary: "Miscellaneous Calendar",
  updated: "2021-11-18T17:00:20.816Z",
  timeZone: "America/Denver",
  accessRole: "owner",
  defaultReminders: [
    {
      method: "email",
      minutes: 30,
    },
    {
      method: "popup",
      minutes: 30,
    },
  ],
  nextPageToken:
    "CigKGnJqMDBhZ2owNHQ0M2hyZm1kcjFhM3VkcTE4GAEggIDAjP_KsfQTGg8IABIAGIDJgcCxovQCIAEiBwgCEOvBsRw=",
  items: [...cancelled, ...timed, ...allday, ...recurring],
};
