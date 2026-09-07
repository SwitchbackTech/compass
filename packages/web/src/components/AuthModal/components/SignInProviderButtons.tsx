import { type CSSProperties, type FC } from "react";
import { type ProviderKind } from "@core/types/sync/identity.contracts";
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
  fullWidth?: boolean;
  labels?: Record<ProviderKind, string>;
  shortcutKeys?: Record<ProviderKind, string> | null;
  busyLabel?: (kind: ProviderKind) => string;
};

const SIGN_IN_BUTTONS = {
  google: GoogleButton,
  microsoft: MicrosoftButton,
  apple: AppleButton,
} as const;

const renderProviderButton = (
  kind: ProviderKind,
  props: Omit<SignInProviderButtonsProps, "available"> & {
    style?: CSSProperties;
    resolvedLabels: Record<ProviderKind, string>;
    resolvedShortcutKeys: Record<ProviderKind, string> | null;
  },
) => {
  const {
    loadingKind,
    onSignIn,
    style,
    busyLabel,
    resolvedLabels,
    resolvedShortcutKeys,
  } = props;
  const Button = SIGN_IN_BUTTONS[kind];
  const isBusy = loadingKind === kind;
  const label = isBusy && busyLabel ? busyLabel(kind) : resolvedLabels[kind];
  const shortcutKey =
    resolvedShortcutKeys === null ? undefined : resolvedShortcutKeys[kind];

  return (
    <Button
      key={kind}
      busy={isBusy || undefined}
      disabled={loadingKind != null}
      label={label}
      onClick={() => onSignIn(kind)}
      shortcutKey={shortcutKey}
      style={style}
    />
  );
};

export const SignInProviderButtons: FC<SignInProviderButtonsProps> = ({
  available,
  loadingKind,
  onSignIn,
  fullWidth = true,
  labels,
  shortcutKeys,
  busyLabel,
}) => {
  if (available.length === 0) {
    return null;
  }

  const resolvedLabels = labels ?? CONTINUE_WITH_LABEL;
  const resolvedShortcutKeys =
    shortcutKeys === undefined ? SIGN_IN_SHORTCUT_KEY : shortcutKeys;
  const buttonStyle = fullWidth ? { width: "100%" } : undefined;

  const buttons = available.map((kind) =>
    renderProviderButton(kind, {
      loadingKind,
      onSignIn,
      style: buttonStyle,
      busyLabel,
      resolvedLabels,
      resolvedShortcutKeys,
    }),
  );

  if (fullWidth) {
    return <div className="flex w-full flex-col gap-3">{buttons}</div>;
  }

  return <>{buttons}</>;
};
