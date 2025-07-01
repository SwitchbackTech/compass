import {
  PayloadAction,
  SliceCaseReducers,
  ValidateSliceCaseReducers,
  createSlice,
} from "@reduxjs/toolkit";

export interface AsyncState<SuccessPayload, ErrorPayload> {
  isProcessing?: boolean;
  isSuccess?: boolean;
  error?: ErrorPayload | null;
  value?: SuccessPayload | null;
  reason?: string | null;
  [key: string]: unknown;
}

export interface _AsyncState<SuccessPayload, ErrorPayload> {
  isProcessing: boolean;
  reason: string | null;
  isSuccess: boolean;
  error: ErrorPayload | null;
  value: SuccessPayload | null;
  [key: string]: unknown;
}

export interface _CreateSliceOptions<State> {
  initialState?: State;
  name: string;
  reducers?: ValidateSliceCaseReducers<State, SliceCaseReducers<State>>;
}

export interface SliceStateContext {
  /**
   * Special object that is used to pass additional context to the slice reducers.
   * Persisted for a single action, and cleared on the next action.
   */
  __context?: {
    /**
     * The reason for the action, could be anything
     */
    reason?: string;
  };
}

export const createAsyncSlice = <
  RequestPayload,
  SuccessPayload = undefined,
  ErrorPayload = undefined,
  ExtraState = never,
>(
  options: _CreateSliceOptions<
    AsyncState<SuccessPayload, ErrorPayload> & ExtraState
  >,
) => {
  type StateType = Exclude<typeof options.initialState, undefined>;

  const initialState = {
    isProcessing: false,
    reason: null,
    isSuccess: false,
    error: null,
    value: null,
  } as unknown as StateType;

  const setContext = (
    state: StateType,
    action: PayloadAction<SliceStateContext>,
  ) => {
    if (action.payload?.__context?.reason) {
      state.reason = action.payload.__context.reason;
    }
  };

  const resetContext = (state: StateType) => {
    state.reason = null;
  };

  const reducers = {
    request(
      state: StateType,
      _action: PayloadAction<RequestPayload & SliceStateContext>,
    ) {
      // When running tests, we use mock data, so we don't need to fetch the week events from the API
      // See comments in https://github.com/SwitchbackTech/compass/pull/338 for dev notes
      if (process.env.NODE_ENV === "test") {
        return;
      }

      resetContext(state);
      setContext(state, _action);

      state.isProcessing = true;
      state.isSuccess = false;
      state.error = null;
    },
    success(
      state: StateType,
      action: PayloadAction<SuccessPayload & SliceStateContext>,
    ) {
      resetContext(state);
      setContext(state, action);

      state.isProcessing = false;
      state.isSuccess = true;
      state.value = action.payload;
      state.error = null;
    },
    error(
      state: StateType,
      action: PayloadAction<ErrorPayload & SliceStateContext>,
    ) {
      resetContext(state);
      setContext(state, action);

      state.isProcessing = false;
      state.isSuccess = false;
      state.error = action.payload;
    },
    ...options.reducers,
  };

  const actionKeys = Object.keys(reducers);
  const actionNames = actionKeys.reduce<Record<string, string>>(
    (result, name) => {
      result[name] = `async/${options.name}/${name}`;
      return result;
    },
    {},
  );

  return {
    ...createSlice({
      ...options,
      initialState: {
        ...initialState,
        ...options.initialState,
      },
      name: `async/${options.name}`,
      // TS has bad time figuring out the dynamic nature of the reducers object
      // so need to assert it.
      reducers: reducers as SliceCaseReducers<StateType>,
    }),
    actionNames,
  };
};

export const isError = (asyncState: _AsyncState<unknown, unknown>) =>
  !asyncState.isProcessing && !!asyncState.error;

export const isProcessing = (asyncState: _AsyncState<unknown, unknown>) =>
  asyncState.isProcessing && !asyncState.error;

export const isSuccess = (asyncState: _AsyncState<unknown, unknown>) =>
  !asyncState.isProcessing && asyncState.isSuccess;

export const pure = <T>(state: T) => state;
