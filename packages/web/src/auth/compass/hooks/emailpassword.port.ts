type EmailPasswordFormFields = {
  formFields: Array<{ id: string; value: string }>;
  shouldTryLinkingWithSessionUser?: boolean;
};

type EmailPasswordOkResponse = {
  status: "OK";
  user?: { emails: string[] };
};

type EmailPasswordFieldErrorResponse = {
  status: "FIELD_ERROR";
  formFields: Array<{ error?: string }>;
};

type EmailPasswordSignUpResponse =
  | EmailPasswordOkResponse
  | EmailPasswordFieldErrorResponse
  | { status: "SIGN_UP_NOT_ALLOWED"; reason: string };

type EmailPasswordSignInResponse =
  | EmailPasswordOkResponse
  | EmailPasswordFieldErrorResponse
  | { status: "WRONG_CREDENTIALS_ERROR" }
  | { status: "SIGN_IN_NOT_ALLOWED"; reason: string };

type EmailPasswordResetEmailResponse =
  | { status: "OK" }
  | EmailPasswordFieldErrorResponse
  | { status: "PASSWORD_RESET_NOT_ALLOWED"; reason: string };

type EmailPasswordSubmitNewPasswordResponse =
  | { status: "OK" }
  | EmailPasswordFieldErrorResponse
  | { status: "RESET_PASSWORD_INVALID_TOKEN_ERROR" };

export type EmailPasswordPort = {
  signUp: (
    input: EmailPasswordFormFields,
  ) => Promise<EmailPasswordSignUpResponse>;
  signIn: (
    input: EmailPasswordFormFields,
  ) => Promise<EmailPasswordSignInResponse>;
  sendPasswordResetEmail: (input: {
    formFields: Array<{ id: string; value: string }>;
  }) => Promise<EmailPasswordResetEmailResponse>;
  submitNewPassword: (input: {
    formFields: Array<{ id: string; value: string }>;
  }) => Promise<EmailPasswordSubmitNewPasswordResponse>;
  getResetPasswordTokenFromURL: () => string;
};

/**
 * Lazy-load the SuperTokens recipe so importing this module (or resetting the
 * port) does not eagerly patch XMLHttpRequest and fight MSW.
 */
function createProductionEmailPasswordPort(): EmailPasswordPort {
  // Dynamic import kept sync via require so callers stay sync; only runs when
  // production code path is used (tests register a mock port instead).
  const EmailPassword = require("supertokens-web-js/recipe/emailpassword")
    .default as EmailPasswordPort;
  return EmailPassword;
}

let emailPasswordPort: EmailPasswordPort | undefined;

export function getEmailPasswordPort(): EmailPasswordPort {
  emailPasswordPort ??= createProductionEmailPasswordPort();
  return emailPasswordPort;
}

export function registerEmailPasswordPort(port: EmailPasswordPort): void {
  emailPasswordPort = port;
}

export function resetEmailPasswordPort(): void {
  emailPasswordPort = undefined;
}
