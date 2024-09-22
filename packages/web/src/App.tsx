import React from "react";
import { SuperTokensWrapper } from "supertokens-auth-react";
import { Provider } from "react-redux";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Session from "supertokens-auth-react/recipe/session";
import SuperTokens from "supertokens-auth-react";
import { APP_NAME, PORT_DEFAULT_WEB } from "@core/constants/core.constants";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { sagas } from "@web/store/sagas";
import { GlobalStyle } from "@web/components/GlobalStyle";
import { ENV_WEB } from "@web/common/constants/env.constants";
import { ToastContainer } from "react-toastify";

import { RootRouter } from "./routers";
import { store } from "./store";

SuperTokens.init({
  appInfo: {
    appName: APP_NAME,
    apiDomain: ENV_WEB.API_BASEURL,
    apiBasePath: ROOT_ROUTES.API,
    websiteBasePath: ROOT_ROUTES.LOGIN,
    websiteDomain: `http://localhost:${PORT_DEFAULT_WEB}`,
  },
  recipeList: [Session.init()],
});

sagaMiddleware.run(sagas);

export const App = () => {
  return (
    <React.StrictMode>
      <DndProvider backend={HTML5Backend}>
        <Provider store={store}>
          <GoogleOAuthProvider clientId={ENV_WEB.CLIENT_ID}>
            <SuperTokensWrapper>
              <GlobalStyle />
              <RootRouter />
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
              />
            </SuperTokensWrapper>
          </GoogleOAuthProvider>
        </Provider>
      </DndProvider>
    </React.StrictMode>
  );
};
