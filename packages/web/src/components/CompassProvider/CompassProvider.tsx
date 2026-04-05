import { PostHogProvider } from "posthog-js/react";
import { type PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import { ThemeProvider } from "styled-components";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { SessionProvider } from "@web/auth/compass/session/SessionProvider";
import { filterPosthogExceptionEvent } from "@web/auth/posthog/posthog-exception-filter.util";
import { isPosthogEnabled } from "@web/auth/posthog/posthog.util";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { CompassRefsProvider } from "@web/common/context/compass-refs";
import { PointerPositionProvider } from "@web/common/context/pointer-position";
import { theme } from "@web/common/styles/theme";
import { AuthModal } from "@web/components/AuthModal/AuthModal";
import { AuthModalProvider } from "@web/components/AuthModal/AuthModalProvider";
import { DNDContext } from "@web/components/DND/DNDContext";
import { DNDOverlay } from "@web/components/DND/DNDOverlay";
import { IconProvider } from "@web/components/IconProvider/IconProvider";
import { store } from "@web/store";
import { useGlobalShortcuts } from "@web/views/Calendar/hooks/shortcuts/useGlobalShortcuts";

/**
 * Mount once under {@link HotkeysProvider} and inside React Router so
 * {@link useGlobalShortcuts} can register app hotkeys (via useAppHotkey).
 */
export function GlobalShortcutsHost() {
  useGlobalShortcuts();
  return null;
}

export const CompassRequiredProviders = (
  props: PropsWithChildren<{ store?: typeof store }>,
) => (
  <HotkeysProvider>
    <CompassRefsProvider>
      <SessionProvider>
        <Provider store={props?.store ?? store}>
          <GoogleOAuthProvider clientId={ENV_WEB.GOOGLE_CLIENT_ID || ""}>
            <ThemeProvider theme={theme}>
              <PointerPositionProvider>
                <DNDContext>
                  <IconProvider>
                    <AuthModalProvider>
                      {props.children}
                      <AuthModal />
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
                      />
                    </AuthModalProvider>
                  </IconProvider>

                  <DNDOverlay />
                </DNDContext>
              </PointerPositionProvider>
            </ThemeProvider>
          </GoogleOAuthProvider>
        </Provider>
      </SessionProvider>
    </CompassRefsProvider>
  </HotkeysProvider>
);

export const CompassOptionalProviders = ({ children }: PropsWithChildren) => {
  let wrappedChildren = children;

  if (isPosthogEnabled()) {
    wrappedChildren = (
      <PostHogProvider
        apiKey={ENV_WEB.POSTHOG_KEY as string}
        options={{
          api_host: ENV_WEB.POSTHOG_HOST!,
          before_send: filterPosthogExceptionEvent,
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
