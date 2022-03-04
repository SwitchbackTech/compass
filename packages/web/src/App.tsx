import React from "react";
import { Provider } from "react-redux";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { sagas } from "@web/store/sagas";
import { GlobalStyle } from "@web/components/GlobalStyle";

import { RootRouter } from "./routers";
import { store } from "./store";

sagaMiddleware.run(sagas);

export const App = () => {
  return (
    <React.StrictMode>
      <Provider store={store}>
        <GlobalStyle />
        <RootRouter />
      </Provider>
    </React.StrictMode>
  );
};
