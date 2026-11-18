import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { ColorTokens, getColorTokens } from '../tokens';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  colors: ColorTokens;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  highContrast: boolean;
  setHighContrast: (value: boolean) => void;
};

const PREFERENCE_KEY = '@sbp:theme';
const HIGH_CONTRAST_KEY = '@sbp:high-contrast';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [highContrast, setHighContrastState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREFERENCE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') setPreferenceState(stored);
    });
    AsyncStorage.getItem(HIGH_CONTRAST_KEY).then((stored) => {
      if (stored === 'on') setHighContrastState(true);
    });
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = preference === 'system' ? systemScheme === 'dark' : preference === 'dark';

    const setPreference = (next: ThemePreference) => {
      setPreferenceState(next);
      AsyncStorage.setItem(PREFERENCE_KEY, next);
    };
    const setHighContrast = (next: boolean) => {
      setHighContrastState(next);
      AsyncStorage.setItem(HIGH_CONTRAST_KEY, next ? 'on' : 'off');
    };

    return {
      colors: getColorTokens(isDark, highContrast),
      isDark,
      preference,
      setPreference,
      highContrast,
      setHighContrast,
    };
  }, [preference, systemScheme, highContrast]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
}
