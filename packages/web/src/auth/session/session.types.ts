export interface CompassSession {
  loading: boolean;
  authenticated: boolean;
  isSyncing: boolean;
  setAuthenticated: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setIsSyncing: (value: boolean) => void;
}
