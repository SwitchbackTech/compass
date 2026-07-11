/**
 * SSE transport (B10): the server publishes ONE SSE event name, `message`,
 * whose `data` is a JSON-serialized ServerMessage union member
 * (@core/types/server-message.contracts). Clients parse once and switch on
 * `type`.
 */
export const SSE_MESSAGE_EVENT = "message";
