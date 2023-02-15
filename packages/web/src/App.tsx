import React from "react";
import { Provider } from "react-redux";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import Session from "supertokens-auth-react/recipe/session";
import SuperTokens, { SuperTokensWrapper } from "supertokens-auth-react";
import { APP_NAME, PORT_DEFAULT_WEB } from "@core/constants/core.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { sagas } from "@web/store/sagas";
import { GlobalStyle } from "@web/components/GlobalStyle";
import { ENV_WEB } from "@web/common/constants/env.constants";

import { RootRouter } from "./routers";
import { store } from "./store";

SuperTokens.init({
  appInfo: {
    appName: APP_NAME,
    apiDomain: ENV_WEB.API_BASEURL,
    websiteDomain: `http://localhost:${PORT_DEFAULT_WEB}`,
    apiBasePath: "/api",
  },
  recipeList: [Session.init()],
});

sagaMiddleware.run(sagas);

export const App = () => {
  return (
    <React.StrictMode>
      <SuperTokensWrapper
        onSessionExpired={() => {
          alert("Login required, cuz security 😇");
          window.location = `#${ROOT_ROUTES.LOGIN}`;
          // window.location.reload();
        }}
      >
        <DndProvider backend={HTML5Backend}>
          <Provider store={store}>
            <GoogleOAuthProvider clientId={ENV_WEB.CLIENT_ID}>
              <GlobalStyle />
              <RootRouter />
            </GoogleOAuthProvider>
          </Provider>
        </DndProvider>
      </SuperTokensWrapper>
    </React.StrictMode>
  );
};
