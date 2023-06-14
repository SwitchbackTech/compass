import { GaxiosError } from "googleapis-common";

export const invalidGrant400Error = new GaxiosError(
  "invalid_grant",
  {},
  {
    config: {
      method: "POST",
      body: "'refresh_token=1%2F%2F01F_IBIEZx2TUCgYIARAAGAESNgF-L9IrE_2hx29jFovRvv0eIB_pNYnQsFy8QqSlmsq6nzCENaKrnItvDp72Qg9tF3OtDZrdwAZ&client_id=111711111111-mqq17c111hgpgn907j79kgnse1o0lchk.apps.googleusercontent.com&client_secret=Z8o&grant_type=refresh_token'",
      data: "refresh_token=1%2F%2F01F_IBIEZx2TUCgYIARAAGAESNgF-L9IrE_2hx29jFovRvv0eIB_pNYnQsFy8QqSlmsq6nzCENaKrnItvDp72Qg9tF3OtDZrdwAZ&client_id=111711111111-mqq17c111hgpgn907j79kgnse1o0lchk.apps.googleusercontent.com&client_secret=Z8o&grant_type=refresh_token",
      url: "https://oauth2.googleapis.com/token",
      responseType: "json",
    },
    data: {
      error: "invalid_grant",
      error_description: "Bad Request",
    },
    status: 400,
    statusText: "Bad Request",
    headers: {},
    request: {
      responseURL: "",
    },
  }
);
