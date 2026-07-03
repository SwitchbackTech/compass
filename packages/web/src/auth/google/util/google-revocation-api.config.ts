import { handleGoogleRevoked } from "@web/auth/google/util/google.auth.util";
import { BaseApi } from "@web/common/apis/base/base.api";

export function configureGoogleRevocationApiHandler(): void {
  BaseApi.defaults.onGoogleRevoked = handleGoogleRevoked;
}
