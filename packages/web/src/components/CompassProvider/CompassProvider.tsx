// biome-ignore-all assist/source/organizeImports: PostHog must load before SuperTokens patches XMLHttpRequest in tests.
import { PostHogProvider } from "@web/auth/posthog/posthog-react";
import { type PropsWithChildren } from "react";
import { Slide, ToastContainer } from "react-toastify";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { SessionProvider } from "@web/auth/compass/session/SessionProvider";
import { initPosthog } from "@web/auth/posthog/posthog.bootstrap";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { queryClient as defaultQueryClient } from "@web/api/query-client";
import { DeleteAccountConfirmationProvider } from "@web/components/DeleteAccountConfirmation/DeleteAccountConfirmationProvider";
import { FeedbackDialogHost } from "@web/components/Feedback/FeedbackDialogHost";
import { IconProvider } from "@web/components/IconProvider/IconProvider";
import { LogoutConfirmationProvider } from "@web/components/LogoutConfirmation/LogoutConfirmationProvider";
import { selectTheme, useThemeStore } from "@web/settings/theme/theme.store";
import { useUndoRedoShortcuts } from "@web/views/Week/hooks/shortcuts/useUndoRedoShortcuts";

/**
 * Mount once under {@link HotkeysProvider} and inside React Router so
 * {@link useGlobalShortcuts} can register app hotkeys (via useAppShortcut).
 */
export function GlobalShortcutsHost() {
  useUndoRedoShortcuts();
  return null;
}

function ThemeAwareToastContainer() {
  const theme = useThemeStore(selectTheme);

  return (
    <ToastContainer
      position="bottom-left"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme={theme === "dark-abyss" ? "dark" : "light"}
      limit={1}
      transition={Slide}
    />
  );
}

interface CompassRequiredProvidersProps extends PropsWithChildren {
  queryClient?: QueryClient;
}

export const CompassRequiredProviders = ({
  children,
  queryClient = defaultQueryClient,
}: CompassRequiredProvidersProps) => (
  <QueryClientProvider client={queryClient}>
    <HotkeysProvider>
      <SessionProvider>
        <GoogleOAuthProvider
          clientId={ENV_WEB.GOOGLE_CLIENT_ID || "google-not-configured"}
        >
          <IconProvider>
            <LogoutConfirmationProvider>
              <DeleteAccountConfirmationProvider>
                {children}
              </DeleteAccountConfirmationProvider>
              <ThemeAwareToastContainer />
            </LogoutConfirmationProvider>
          </IconProvider>
        </GoogleOAuthProvider>
      </SessionProvider>
    </HotkeysProvider>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);

export const CompassOptionalProviders = ({ children }: PropsWithChildren) => {
  // PostHog is initialized once outside the React tree (see index.tsx) so its
  // exception handlers cover boot before this ever mounts. initPosthog() is
  // idempotent: here it just hands back that already-initialized instance (or
  // undefined when PostHog is disabled, e.g. in tests).
  const posthogClient = initPosthog();

  if (!posthogClient) {
    return children;
  }

  return (
    <PostHogProvider client={posthogClient}>
      {children}
      <FeedbackDialogHost />
    </PostHogProvider>
  );
};
