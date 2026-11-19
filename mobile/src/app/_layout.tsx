import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

import { ActiveTripProvider } from '../contexts/ActiveTripContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { FavoritesProvider } from '../contexts/FavoritesContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { PreferencesProvider } from '../contexts/PreferencesContext';
import { SavedRoutesProvider } from '../contexts/SavedRoutesContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { ToastProvider } from '../contexts/ToastContext';
import { fontAssets } from '../tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
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
                      <Gate />
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

// Decide entre o fluxo autenticado e o de login/cadastro. Fica num componente à parte porque
// precisa do AuthContext e do ThemeContext, que só existem dentro dos providers acima.
function Gate() {
  const { user, isLoading } = useAuth();
  const { colors, isDark } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primaryText} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="scan-qr" options={{ presentation: 'modal' }} />
          <Stack.Screen name="stop/[code]" />
          <Stack.Screen name="parada/[code]" />
          <Stack.Screen name="p/[code]" />
          <Stack.Screen name="line/[routeId]" />
          <Stack.Screen name="route-planner" />
          <Stack.Screen name="route-results" />
          <Stack.Screen name="route-detail" />
          <Stack.Screen name="active-trip" options={{ gestureEnabled: false }} />
          <Stack.Screen name="rail-status" />
          <Stack.Screen name="report" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
