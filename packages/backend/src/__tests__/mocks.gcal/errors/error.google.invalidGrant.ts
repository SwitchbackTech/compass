import { GaxiosError } from "gaxios";

const error = new GaxiosError(
  "invalid_grant",
  {
    headers: new Headers(),
    url: new URL("https://oauth2.googleapis.com/token"),
    method: "POST",
    responseType: "json",
    data: "refresh_token=1%2F%2F01F_IBIEZx2TUCgYIARAAGAESNgF-L9IrE_2hx29jFovRvv0eIB_pNYnQsFy8QqSlmsq6nzCENaKrnItvDp72Qg9tF3OtDZrdwAZ&client_id=111711111111-mqq17c111hgpgn907j79kgnse1o0lchk.apps.googleusercontent.com&client_secret=Z8o&grant_type=refresh_token",
  },
  {
    config: {
      method: "POST",
      body: "refresh_token=1%2F%2F01F_IBIEZx2TUCgYIARAAGAESNgF-L9IrE_2hx29jFovRvv0eIB_pNYnQsFy8QqSlmsq6nzCENaKrnItvDp72Qg9tF3OtDZrdwAZ&client_id=111711111111-mqq17c111hgpgn907j79kgnse1o0lchk.apps.googleusercontent.com&client_secret=Z8o&grant_type=refresh_token",
      data: "refresh_token=1%2F%2F01F_IBIEZx2TUCgYIARAAGAESNgF-L9IrE_2hx29jFovRvv0eIB_pNYnQsFy8QqSlmsq6nzCENaKrnItvDp72Qg9tF3OtDZrdwAZ&client_id=111711111111-mqq17c111hgpgn907j79kgnse1o0lchk.apps.googleusercontent.com&client_secret=Z8o&grant_type=refresh_token",
      url: new URL("https://oauth2.googleapis.com/token"),
      responseType: "json",
      headers: new Headers(),
    },
    data: {
      error: "invalid_grant",
      error_description: "Bad Request",
    },
    status: 400,
    statusText: "Bad Request",
    headers: new Headers(),
    ok: false,
    redirected: false,
    type: "error" as ResponseType,
    url: "https://oauth2.googleapis.com/token",
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
    json: async () => ({
      error: "invalid_grant",
      error_description: "Bad Request",
    }),
    text: async () => {
      throw new Error("Not implemented");
    },
    bytes: async () => {
      throw new Error("Not implemented");
    },
  },
);

// Set the code property to match the HTTP status
error.code = "400";

export const invalidGrant400Error = error;
