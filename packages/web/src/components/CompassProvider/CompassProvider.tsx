// biome-ignore-all assist/source/organizeImports: PostHog must load before SuperTokens patches XMLHttpRequest in tests.
import { PostHogProvider } from "@web/auth/posthog/posthog-react";
import { type PropsWithChildren } from "react";
import { Slide, ToastContainer } from "react-toastify";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { SessionProvider } from "@web/auth/compass/session/SessionProvider";
import { isPosthogEnabled } from "@web/auth/posthog/posthog.util";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { CompassRefsProvider } from "@web/common/refs/compass-refs";
import { PointerPositionProvider } from "@web/common/pointer/pointer-position";
import { queryClient as defaultQueryClient } from "@web/common/query/query-client";
import { IconProvider } from "@web/components/IconProvider/IconProvider";
import { LogoutConfirmationProvider } from "@web/components/LogoutConfirmation/LogoutConfirmationProvider";
import { useGlobalShortcuts } from "@web/views/Week/hooks/shortcuts/useGlobalShortcuts";
import { useUndoRedoShortcuts } from "@web/views/Week/hooks/shortcuts/useUndoRedoShortcuts";

/**
 * Mount once under {@link HotkeysProvider} and inside React Router so
 * {@link useGlobalShortcuts} can register app hotkeys (via useAppHotkey).
 */
export function GlobalShortcutsHost() {
  useGlobalShortcuts();
  useUndoRedoShortcuts();
  return null;
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
      <CompassRefsProvider>
        <SessionProvider>
          <GoogleOAuthProvider
            clientId={ENV_WEB.GOOGLE_CLIENT_ID || "google-not-configured"}
          >
            <PointerPositionProvider>
              <IconProvider>
                <LogoutConfirmationProvider>
                  {children}
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
                    theme="dark"
                    limit={1}
                    transition={Slide}
                  />
                </LogoutConfirmationProvider>
              </IconProvider>
            </PointerPositionProvider>
          </GoogleOAuthProvider>
        </SessionProvider>
      </CompassRefsProvider>
    </HotkeysProvider>
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
);

export const CompassOptionalProviders = ({ children }: PropsWithChildren) => {
  let wrappedChildren = children;

  if (isPosthogEnabled()) {
    wrappedChildren = (
      <PostHogProvider
        apiKey={ENV_WEB.POSTHOG_KEY as string}
        options={{
          api_host: ENV_WEB.POSTHOG_HOST!,
          capture_exceptions: {
            capture_unhandled_errors: true,
            capture_unhandled_rejections: true,
            capture_console_errors: true,
          },
          opt_in_site_apps: true,
          person_profiles: "always",
        }}
      >
        {wrappedChildren}
      </PostHogProvider>
    );
  }

  return wrappedChildren;
};
