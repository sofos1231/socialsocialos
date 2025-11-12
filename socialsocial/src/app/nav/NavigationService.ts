import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

export const navRef = createNavigationContainerRef();

export function resetToAuth() {
  if (!navRef.isReady()) return;
  navRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Auth' as never }] }));
}

export function resetToMain() {
  if (!navRef.isReady()) return;
  navRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Wallet' as never }] }));
}

export function navigate(route: string, params?: Record<string, unknown>) {
  if (!navRef.isReady()) return;
  // @ts-expect-error generic
  navRef.navigate(route as never, params as never);
}


