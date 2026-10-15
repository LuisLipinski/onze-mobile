import { createContext, useContext } from 'react';

export const StartupReadinessContext = createContext<() => void>(() => undefined);

export function useStartupReadiness() {
  return useContext(StartupReadinessContext);
}
