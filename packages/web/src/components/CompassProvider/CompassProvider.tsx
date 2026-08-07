import { GoogleOAuthProvider } from "@react-oauth/google";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { type PropsWithChildren } from "react";
import { Slide, ToastContainer } from "react-toastify";
import { queryClient as defaultQueryClient } from "@web/api/query-client";
import { SessionProvider } from "@web/auth/compass/session/SessionProvider";
import { getPosthogClient } from "@web/auth/posthog/posthog.bootstrap";
import { PostHogProvider } from "@web/auth/posthog/posthog-react";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { useEscapeToDismissToast } from "@web/common/utils/toast/useEscapeToDismissToast";
import { AboutModal } from "@web/components/About/AboutModal";
import { DeleteAccountConfirmationProvider } from "@web/components/DeleteAccountConfirmation/DeleteAccountConfirmationProvider";
import { FeedbackDialogHost } from "@web/components/Feedback/FeedbackDialogHost";
import { IconProvider } from "@web/components/IconProvider/IconProvider";
import { LogoutConfirmationProvider } from "@web/components/LogoutConfirmation/LogoutConfirmationProvider";
import { SettingsModal } from "@web/components/Settings/SettingsModal";
import { RecurrenceScopeOpportunityHost } from "@web/events/recurrence/RecurrenceScopeOpportunityHost";
import { selectTheme, useThemeStore } from "@web/settings/theme/theme.store";
import { useUndoRedoShortcuts } from "@web/views/Week/hooks/shortcuts/useUndoRedoShortcuts";

/**
 * Mount once under {@link HotkeysProvider} and inside React Router so
 * {@link useGlobalShortcuts} can register app hotkeys (via useAppShortcut).
 */
export function GlobalShortcutsHost() {
  useUndoRedoShortcuts();
  return <RecurrenceScopeOpportunityHost />;
}

function ThemeAwareToastContainer() {
  const theme = useThemeStore(selectTheme);
  useEscapeToDismissToast();

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
                <SettingsModal />
                <AboutModal />
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
  const posthogClient = getPosthogClient();

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
