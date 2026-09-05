import { type CSSProperties, type FC } from "react";
import { type ProviderKind } from "@core/types/sync/identity.contracts";
import { SIGN_IN_WELCOME_SUBLINE } from "@web/auth/providers/provider-copy.util";
import {
  CONTINUE_WITH_LABEL,
  SIGN_IN_SHORTCUT_KEY,
} from "@web/auth/providers/sign-in-provider.util";
import { AppleButton } from "@web/components/AuthModal/components/AppleButton";
import { GoogleButton } from "@web/components/AuthModal/components/GoogleButton";
import { MicrosoftButton } from "@web/components/AuthModal/components/MicrosoftButton";

type SignInProviderButtonsProps = {
  available: readonly ProviderKind[];
  loadingKind: ProviderKind | null;
  onSignIn: (kind: ProviderKind) => void;
  variant?: "auth" | "welcome";
  fullWidth?: boolean;
};

const SIGN_IN_BUTTONS = {
  google: GoogleButton,
  microsoft: MicrosoftButton,
  apple: AppleButton,
} as const;

const renderProviderButton = (
  kind: ProviderKind,
  props: Omit<SignInProviderButtonsProps, "available" | "variant"> & {
    style?: CSSProperties;
  },
) => {
  const { loadingKind, onSignIn, style } = props;
  const Button = SIGN_IN_BUTTONS[kind];
  return (
    <Button
      key={kind}
      disabled={loadingKind != null}
      label={CONTINUE_WITH_LABEL[kind]}
      onClick={() => onSignIn(kind)}
      shortcutKey={SIGN_IN_SHORTCUT_KEY[kind]}
      style={style}
    />
  );
};

export const SignInProviderButtons: FC<SignInProviderButtonsProps> = ({
  available,
  loadingKind,
  onSignIn,
  variant = "auth",
  fullWidth = true,
}) => {
  if (available.length === 0) {
    return null;
  }

  const buttonStyle = fullWidth ? { width: "100%" } : undefined;

  if (variant === "welcome") {
    return (
      <>
        {available.map((kind) => (
          <div key={kind} className="flex w-full flex-col items-center gap-3">
            {renderProviderButton(kind, {
              loadingKind,
              onSignIn,
              style: buttonStyle,
            })}
            <p className="text-center text-text-muted text-xs">
              {SIGN_IN_WELCOME_SUBLINE[kind]}
            </p>
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {available.map((kind) =>
        renderProviderButton(kind, {
          loadingKind,
          onSignIn,
          style: buttonStyle,
        }),
      )}
    </>
  );
};
