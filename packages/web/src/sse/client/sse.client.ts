import { ENV_WEB } from "@web/common/constants/env.constants";

let es: EventSource | null = null;

export const openStream = (): EventSource => {
  if (es) return es;
  es = new EventSource(`${ENV_WEB.BACKEND_BASEURL}/api/events/stream`, {
    withCredentials: true,
  });
  return es;
};

export const closeStream = (): void => {
  es?.close();
  es = null;
};

export const getStream = (): EventSource | null => es;
