import { QueryClient } from "@tanstack/react-query";

export const createCompassQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 5 * 60 * 1000,
      },
      mutations: {
        retry: false,
      },
    },
  });

export const queryClient = createCompassQueryClient();
