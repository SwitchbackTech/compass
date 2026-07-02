import { queryClient } from "@web/common/query/query-client";
import { createEventListenerMiddleware } from "@web/ducks/events/listeners/event.listeners";

export const eventListenerMiddleware = createEventListenerMiddleware(queryClient);
