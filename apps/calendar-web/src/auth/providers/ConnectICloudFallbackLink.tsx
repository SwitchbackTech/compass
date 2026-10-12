import { type FC } from "react";
import { connectAppleActions } from "@web/auth/providers/connect-apple.store";
import {
  CONNECT_OTHER_ICLOUD_LINK,
  CONNECT_OTHER_ICLOUD_LINK_HINT,
} from "@web/auth/providers/connect-icloud-fallback.copy";

type ConnectICloudFallbackLinkProps = {
  disabled?: boolean;
};

export const ConnectICloudFallbackLink: FC<ConnectICloudFallbackLinkProps> = ({
  disabled = false,
}) => (
  <div className="flex w-full flex-col items-center gap-0.5">
    <button
      className="c-focus-ring rounded-md px-2 py-1 text-text-muted text-xs hover:bg-surface-overlay hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={() => connectAppleActions.open()}
      type="button"
    >
      {CONNECT_OTHER_ICLOUD_LINK}
    </button>
    <p className="text-center text-text-muted text-xs">
      {CONNECT_OTHER_ICLOUD_LINK_HINT}
    </p>
  </div>
);
