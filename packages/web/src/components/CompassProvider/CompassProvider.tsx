import { PostHogProvider } from "posthog-js/react";
import { PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import { ThemeProvider } from "styled-components";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { SessionProvider } from "@web/auth/session/SessionProvider";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { CompassRefsProvider } from "@web/common/context/compass-refs";
import { PointerPositionProvider } from "@web/common/context/pointer-position";
import { theme } from "@web/common/styles/theme";
import { DNDContext } from "@web/components/DND/DNDContext";
import { DNDOverlay } from "@web/components/DND/DNDOverlay";
import { IconProvider } from "@web/components/IconProvider/IconProvider";
import { store } from "@web/store";

function isPosthogEnabled() {
  return !!ENV_WEB.POSTHOG_HOST && !!ENV_WEB.POSTHOG_KEY;
}

export const CompassRequiredProviders = (
  props: PropsWithChildren<{ store?: typeof store }>,
) => (
  <CompassRefsProvider>
    <SessionProvider>
      <Provider store={props?.store ?? store}>
        <GoogleOAuthProvider clientId={ENV_WEB.GOOGLE_CLIENT_ID || ""}>
          <ThemeProvider theme={theme}>
            <PointerPositionProvider>
              <DNDContext>
                <IconProvider>{props.children}</IconProvider>

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

                <DNDOverlay />
              </DNDContext>
            </PointerPositionProvider>
          </ThemeProvider>
        </GoogleOAuthProvider>
      </Provider>
    </SessionProvider>
  </CompassRefsProvider>
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
