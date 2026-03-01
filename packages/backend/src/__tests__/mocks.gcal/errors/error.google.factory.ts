import { GaxiosError } from "gaxios";

export const createGoogleError = (
  overrides: {
    code?: string | number;
    responseStatus?: number;
    message?: string;
  } = {},
) => {
  const url = new URL("https://www.googleapis.com/calendar/v3");
  const headers = new Headers();

  const error = new GaxiosError(
    overrides.message ?? "test google error",
    {
      headers,
      url,
    },
    overrides.responseStatus
      ? {
          config: {
            headers,
            url,
          },
          status: overrides.responseStatus,
          statusText: "ERROR",
          headers,
          data: {},
          ok: false,
          redirected: false,
          type: "error" as ResponseType,
          url: url.toString(),
          body: null,
          bodyUsed: false,
          clone: () => {
            throw new Error("Not implemented");
          },
          arrayBuffer: async () => {
            throw new Error("Not implemented");
          },
          blob: async () => {
            throw new Error("Not implemented");
          },
          formData: async () => {
            throw new Error("Not implemented");
          },
          json: async () => ({}),
          text: async () => "",
          bytes: async () => {
            throw new Error("Not implemented");
          },
        }
      : undefined,
  );

  error.code = overrides.code;

  return error;
};
