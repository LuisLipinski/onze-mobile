import React, { type ReactElement, type PropsWithChildren } from 'react';
import { render } from '@testing-library/react-native';
import { TamaguiProvider } from 'tamagui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import config from '../../tamagui.config';

function Providers({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <TamaguiProvider config={config} defaultTheme="light">
        {children}
      </TamaguiProvider>
    </SafeAreaProvider>
  );
}
export function renderApp(element: ReactElement) {
  return render(element, { wrapper: Providers });
}
export * from '@testing-library/react-native';
