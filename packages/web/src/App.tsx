import React from "react";
import { Provider } from "react-redux";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { sagas } from "@web/store/sagas";
import { GlobalStyle } from "@web/components/GlobalStyle";
import SuperTokens, { SuperTokensWrapper } from "supertokens-auth-react";
import Session from "supertokens-auth-react/recipe/session";

import { RootRouter } from "./routers";
import { store } from "./store";

SuperTokens.init({
  appInfo: {
    // learn more about this on https://supertokens.com/docs/session/appinfo
    appName: "Compass Calendar",
    apiDomain: "http://localhost:9080",
    websiteDomain: "http://localhost:9080",
    apiBasePath: "/api/auth",
    websiteBasePath: "/auth",
  },
  recipeList: [Session.init()],
});

export const isDev = () => process.env["NODE_ENV"] === "development";
const testClientId =
  "***REMOVED***";
const prodIdTemp =
  "***REMOVED***";
const clientId = isDev() ? testClientId : prodIdTemp;
console.log("using clientId for:", clientId === testClientId ? "TEST" : "PROD");

sagaMiddleware.run(sagas);

export const App = () => {
  return (
    <React.StrictMode>
      <SuperTokensWrapper
        onSessionExpired={() => {
          alert("Long time no see! Let's login again");
          location.reload();
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
