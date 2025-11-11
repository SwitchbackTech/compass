import { PostHogProvider } from "posthog-js/react";
import React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import { ThemeProvider } from "styled-components";
import SuperTokens, { SuperTokensWrapper } from "supertokens-auth-react";
import Session from "supertokens-auth-react/recipe/session";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { APP_NAME, PORT_DEFAULT_WEB } from "@core/constants/core.constants";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { theme } from "@web/common/styles/theme";
import { GlobalStyle } from "@web/components/GlobalStyle";
import { IconProvider } from "@web/components/IconProvider/IconProvider";
import { RootRouter } from "@web/routers";
import { store } from "@web/store";
import { sagas } from "@web/store/sagas";

SuperTokens.init({
  appInfo: {
    appName: APP_NAME,
    apiDomain: ENV_WEB.API_BASEURL,
    apiBasePath: ROOT_ROUTES.API,
    websiteBasePath: ROOT_ROUTES.LOGIN,
    websiteDomain: `http://localhost:${PORT_DEFAULT_WEB}`,
  },
  recipeList: [
    Session.init({
      maxRetryAttemptsForSessionRefresh: 1,
      override: {
        functions(originalImplementation) {
          return {
            ...originalImplementation,
            shouldDoInterceptionBasedOnUrl(
              toCheckUrl,
              apiDomain,
              sessionTokenBackendDomain,
            ) {
              const dontCheckUrls = ["/socket.io", "/auth/google"];

              if (dontCheckUrls.some((url) => toCheckUrl.includes(url))) {
                return false;
              }

              return originalImplementation.shouldDoInterceptionBasedOnUrl(
                toCheckUrl,
                apiDomain,
                sessionTokenBackendDomain,
              );
            },
          };
        },
      },
    }),
  ],
});

sagaMiddleware.run(sagas);

export const App = () => {
  const renderRequiredProviders = () => (
    <DndProvider backend={HTML5Backend}>
      <Provider store={store}>
        <GoogleOAuthProvider clientId={ENV_WEB.GOOGLE_CLIENT_ID || ""}>
          <SuperTokensWrapper>
            <GlobalStyle />
            <ThemeProvider theme={theme}>
              <IconProvider>
                <RootRouter />
              </IconProvider>
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
            </ThemeProvider>
          </SuperTokensWrapper>
        </GoogleOAuthProvider>
      </Provider>
    </DndProvider>
  );

  const renderOptionalProviders = (children: React.ReactNode) => {
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

  return (
    <React.StrictMode>
      {renderOptionalProviders(renderRequiredProviders())}
    </React.StrictMode>
  );
};

function isPosthogEnabled() {
  return !!ENV_WEB.POSTHOG_HOST && !!ENV_WEB.POSTHOG_KEY;
}
