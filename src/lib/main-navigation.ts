export type MainTab = 'home' | 'groups' | 'settings';

const MAIN_TAB_ROUTES = {
  home: '/home',
  groups: '/groups',
  settings: '/settings',
} as const;

const AUTH_PATHS = new Set(['/', '/register', '/forgot-password', '/reset-password']);

export function mainTabForPath(pathname: string): MainTab | null {
  if (AUTH_PATHS.has(pathname)) return null;
  if (pathname === MAIN_TAB_ROUTES.home) return 'home';
  if (pathname === MAIN_TAB_ROUTES.settings) return 'settings';
  return 'groups';
}

export function mainTabDestination(pathname: string, tab: MainTab) {
  const destination = MAIN_TAB_ROUTES[tab];
  return pathname === destination ? null : destination;
}
