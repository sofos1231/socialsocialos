import React, { PropsWithChildren, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setOnAuthLost } from '../api/apiClient';
import { resetToAuth } from './nav/NavigationService';
import { clearTokens, hydrateFromStorage } from '../store/tokens';

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 2, refetchOnWindowFocus: false }, mutations: { retry: 0 } },
});

export default function Providers({ children }: PropsWithChildren<{}>) {
  useEffect(() => {
    (async () => {
      await hydrateFromStorage();
      setOnAuthLost(async () => {
        await clearTokens();
        resetToAuth();
      });
    })();
  }, []);

  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}


