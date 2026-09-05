import { useConnectProvider } from "@web/auth/providers/useConnectProvider";
import {
  type UseConnectGoogleOptions,
  type UseConnectGoogleResult,
} from "./useConnectGoogle.types";

export type { UseConnectGoogleOptions, UseConnectGoogleResult };

export const useConnectGoogle = (
  options?: UseConnectGoogleOptions,
): UseConnectGoogleResult => useConnectProvider("google", options);
