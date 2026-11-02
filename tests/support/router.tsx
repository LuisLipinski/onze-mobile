import React, { type ReactElement, type ReactNode } from 'react';
import { Text } from 'react-native';

export const navigation = {
  replace: jest.fn(),
  push: jest.fn(),
  dismissTo: jest.fn(),
  back: jest.fn(),
};
export const route = { pathname: '/home', params: {} as Record<string, string> };
export const useRouter = () => navigation;
export const usePathname = () => route.pathname;
export const useLocalSearchParams = () => route.params;
// One focused route is mounted by the harness; preserve effect cleanup and dependencies.
export const useFocusEffect = (effect: React.EffectCallback) => React.useEffect(effect, [effect]);
export function Link({
  href,
  asChild,
  children,
}: {
  href: unknown;
  asChild?: boolean;
  children: ReactNode;
}) {
  const onPress = () => navigation.push(href);
  return asChild ? (
    React.cloneElement(children as ReactElement<{ onPress: () => void }>, { onPress })
  ) : (
    <Text onPress={onPress}>{children}</Text>
  );
}

export function resetNavigation() {
  route.pathname = '/home';
  route.params = {};
}
