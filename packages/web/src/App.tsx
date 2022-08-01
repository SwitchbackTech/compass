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
import {
  API_BASEURL,
  GOOGLE_CLIENT_ID_PROD,
  GOOGLE_CLIENT_ID_TEST,
} from "@web/common/constants/web.constants";
import { IS_DEV } from "@web/common/constants/env.constants";

import { RootRouter } from "./routers";
import { store } from "./store";

SuperTokens.init({
  appInfo: {
    appName: APP_NAME,
    apiDomain: API_BASEURL,
    websiteDomain: `http://localhost:${PORT_DEFAULT_WEB}`,
    apiBasePath: "/api",
  },
  // enableDebugLogs: true,
  recipeList: [Session.init()],
});

const clientId = IS_DEV ? GOOGLE_CLIENT_ID_TEST : GOOGLE_CLIENT_ID_PROD;
console.log(
  "using clientId for:",
  clientId === GOOGLE_CLIENT_ID_TEST ? "TEST" : "PROD"
);

sagaMiddleware.run(sagas);

export const App = () => {
  return (
    <React.StrictMode>
      <SuperTokensWrapper
        onSessionExpired={() => {
          alert("Long time no see! Let's login again");
          window.location = `#${ROOT_ROUTES.LOGIN}`;
        }}
      >
        <DndProvider backend={HTML5Backend}>
          <Provider store={store}>
            <GoogleOAuthProvider clientId={clientId}>
              <GlobalStyle />
              <RootRouter />
            </GoogleOAuthProvider>
          </Provider>
        </DndProvider>
      </SuperTokensWrapper>
    </React.StrictMode>
  );
};
