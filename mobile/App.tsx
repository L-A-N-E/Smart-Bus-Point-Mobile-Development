import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ActiveTripProvider } from './src/contexts/ActiveTripContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { FavoritesProvider } from './src/contexts/FavoritesContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { PreferencesProvider } from './src/contexts/PreferencesContext';
import { SavedRoutesProvider } from './src/contexts/SavedRoutesContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { fontAssets } from './src/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const ready = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Se a fonte falhar, segue com a fonte do sistema em vez de travar numa tela em branco.
  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ThemeProvider>
          <ToastProvider>
            <PreferencesProvider>
              <AuthProvider>
                <FavoritesProvider>
                  <SavedRoutesProvider>
                    <ActiveTripProvider>
                      <RootNavigator />
                    </ActiveTripProvider>
                  </SavedRoutesProvider>
                </FavoritesProvider>
              </AuthProvider>
            </PreferencesProvider>
          </ToastProvider>
        </ThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
