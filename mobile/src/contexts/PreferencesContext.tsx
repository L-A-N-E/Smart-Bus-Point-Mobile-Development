import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

// Preferências do app (não são dados de conta — ficam no aparelho, independente de quem logou).
export type Preferences = {
  onlyAccessible: boolean;
  lessWalking: boolean;
  voiceEnabled: boolean;
  descentAlerts: boolean;
  rainAlerts: boolean;
};

const DEFAULT_PREFERENCES: Preferences = {
  onlyAccessible: false,
  lessWalking: false,
  voiceEnabled: true,
  descentAlerts: true,
  rainAlerts: true,
};

const STORAGE_KEY = '@sbp:preferences';

type PreferencesContextValue = {
  preferences: Preferences;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(raw) });
    });
  }, []);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      preferences,
      setPreference: (key, val) => {
        setPreferences((prev) => {
          const next = { ...prev, [key]: val };
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      },
    }),
    [preferences],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences deve ser usado dentro de PreferencesProvider');
  return context;
}
