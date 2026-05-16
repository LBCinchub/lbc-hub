import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: false,
			staleTime: 5 * 60 * 1000,      // 5 minutes — don't refetch if data is fresh
			gcTime: 10 * 60 * 1000,         // 10 minutes — keep in memory after unmount
			refetchOnMount: false,           // use cached data when navigating back
			refetchOnReconnect: false,
		},
	},
});