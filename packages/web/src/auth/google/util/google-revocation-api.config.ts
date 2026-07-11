import { BaseApi } from "@web/api/base/base.api";
import { handleGoogleRevoked } from "@web/auth/google/util/google.auth.util";

export function configureGoogleRevocationApiHandler(): void {
  BaseApi.defaults.onGoogleRevoked = handleGoogleRevoked;
}
