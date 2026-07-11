import { QueryClient } from "@tanstack/react-query";

export const createCompassQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

export const queryClient = createCompassQueryClient();
