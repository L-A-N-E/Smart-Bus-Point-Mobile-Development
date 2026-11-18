import { DarkTheme, DefaultTheme, getStateFromPath, LinkingOptions, NavigationContainer, Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { parseStopCode } from '../utils/qr';
import { AuthStack } from './AuthStack';
import { RootStack } from './RootStack';
import { RootStackParamList } from './types';

// sbp://parada/<codigo> e https://sbp.app/p/<codigo> abrem a parada direto (ex.: QR impresso,
// link compartilhado) — dois formatos de path diferentes pro mesmo destino, por isso o parsing é
// feito à mão aqui (reaproveitando `parseStopCode`, a mesma função do scanner) em vez da config
// declarativa simples, que só aceita um path por tela.
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['sbp://', 'https://sbp.app'],
  config: {
    screens: {
      Tabs: '',
      ScanQr: 'escanear',
      LineDetail: 'linha/:routeId',
    },
  },
  getStateFromPath: (path, options) => {
    const code = parseStopCode(path.startsWith('/') ? path.slice(1) : path);
    if (code) {
      return {
        routes: [{ name: 'Tabs' as const }, { name: 'StopDetail' as const, params: { code } }],
      };
    }
    return getStateFromPath(path, options);
  },
};

export function RootNavigator() {
  const { user, isLoading } = useAuth();
  const { colors, isDark } = useTheme();

  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const navigationTheme: Theme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primaryText} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme} linking={linking}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {user ? <RootStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
