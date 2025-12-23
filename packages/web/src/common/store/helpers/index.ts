import { produce } from "immer";
import {
  ActionCreatorWithPayload,
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

export interface _CreateSliceOptions<
  State,
  Reducers extends SliceCaseReducers<State> = SliceCaseReducers<State>,
> {
  initialState?: State;
  name: string;
  reducers?: ValidateSliceCaseReducers<State, Reducers>;
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
    reason?: string | null;
  };
}

export const createAsyncSlice = <
  RequestPayload,
  SuccessPayload = undefined,
  ErrorPayload = undefined,
  ExtraState = never,
  Reducers extends SliceCaseReducers<
    AsyncState<SuccessPayload, ErrorPayload> & ExtraState
  > = SliceCaseReducers<AsyncState<SuccessPayload, ErrorPayload> & ExtraState>,
>(
  options: _CreateSliceOptions<
    AsyncState<SuccessPayload, ErrorPayload> & ExtraState,
    Reducers
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

  const reducers: Reducers & {
    request: (
      state: StateType,
      _action: PayloadAction<RequestPayload & SliceStateContext>,
    ) => void;
    success: (
      state: StateType,
      action: PayloadAction<SuccessPayload & SliceStateContext>,
    ) => void;
    error: (
      state: StateType,
      action: PayloadAction<ErrorPayload & SliceStateContext>,
    ) => void;
  } = {
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
    ...(options.reducers as Reducers),
  };

  const slice = createSlice({
    ...options,
    initialState: {
      ...initialState,
      ...options.initialState,
    },
    name: `async/${options.name}`,
    reducers: reducers as ValidateSliceCaseReducers<StateType, typeof reducers>,
  });

  const actionNames = Object.keys(reducers).reduce(
    (result, _name) => {
      const name = _name as keyof Reducers;
      result[name] = `async/${options.name}/${String(name)}`;

      return result;
    },
    {} as Record<keyof typeof reducers, string>,
  );

  return {
    ...slice,
    actionNames,
    actions: {
      ...slice.actions,
      request: slice.actions.request as ActionCreatorWithPayload<
        RequestPayload & SliceStateContext,
        typeof actionNames.request
      >,
      success: slice.actions.success as ActionCreatorWithPayload<
        SuccessPayload & SliceStateContext,
        typeof actionNames.success
      >,
      error: slice.actions.error as ActionCreatorWithPayload<
        ErrorPayload & SliceStateContext,
        typeof actionNames.error
      >,
      // custom reducers will remain as in slice.actions
    },
  };
};

export const isError = (asyncState: _AsyncState<unknown, unknown>) =>
  !asyncState.isProcessing && !!asyncState.error;

export const isProcessing = (asyncState: AsyncState<unknown, unknown>) =>
  asyncState.isProcessing && !asyncState.error;

export const isSuccess = <SuccessPayload, ErrorPayload>(
  asyncState: AsyncState<SuccessPayload, ErrorPayload>,
) => !asyncState.isProcessing && asyncState.isSuccess;

export const pure = <T>(state: T) => state;

export function write<S>(updater: (state: S) => void): (state: S) => S {
  return function (state) {
    return produce(state, (draft) => {
      updater(draft as S);
    });
  };
}
