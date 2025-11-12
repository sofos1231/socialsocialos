import React from 'react';
import { useTokens, hydrateFromStorage } from '../store/tokens';

export default function AuthGate({ children, AuthScreen }: { children: React.ReactNode; AuthScreen: React.ComponentType }) {
  const accessToken = useTokens(s => s.accessToken);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      await hydrateFromStorage();
      setReady(true);
    })();
  }, []);

  if (!ready) return null;
  return accessToken ? <>{children}</> : <AuthScreen />;
}


