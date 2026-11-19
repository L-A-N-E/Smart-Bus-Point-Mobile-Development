import { useRouter } from 'expo-router';
import { BottomTabBarProps } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../components/AppText';
import { Icon, IconName } from '../components/Icon';
import { PressableScale } from '../components/PressableScale';
import { useI18n } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { TranslationKey } from '../i18n';
import { fonts, radii, shadows, sizes, spacing } from '../tokens';
import { tap } from '../utils/haptics';

// Nomes das rotas de arquivo em src/app/(tabs)/ (index = Home).
type TabRouteName = 'index' | 'routes' | 'explore' | 'profile';

const tabs: Record<TabRouteName, { labelKey: TranslationKey; icon: IconName; activeIcon: IconName }> = {
  index: { labelKey: 'tabs.Home', icon: 'home-outline', activeIcon: 'home' },
  routes: { labelKey: 'tabs.Routes', icon: 'map-marker-path', activeIcon: 'map-marker-path' },
  explore: { labelKey: 'tabs.Explore', icon: 'compass-outline', activeIcon: 'compass' },
  profile: { labelKey: 'tabs.Profile', icon: 'account-outline', activeIcon: 'account' },
};

// A aba "Escanear" não é uma tela da barra (o toque sempre abre o modal de QR, nunca troca de
// aba) — por isso não está em `tabs`; é inserida visualmente no meio.
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const openScanner = () => {
    tap();
    router.push('/scan-qr');
  };

  const routes = state.routes as (typeof state.routes[number] & { name: TabRouteName })[];
  const half = Math.ceil(routes.length / 2);
  const leftRoutes = routes.slice(0, half);
  const rightRoutes = routes.slice(half);

  const renderTab = (route: (typeof routes)[number], index: number) => {
    const focused = state.index === index;
    const config = tabs[route.name];
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) {
        tap();
        navigation.navigate(route.name, route.params);
      }
    };

    return (
      <TabItem
        key={route.key}
        label={t(config.labelKey)}
        icon={config.icon}
        activeIcon={config.activeIcon}
        focused={focused}
        onPress={onPress}
      />
    );
  };

  return (
    <View
      style={[
        styles.bar,
        shadows.lg,
        {
          backgroundColor: colors.tabBar,
          borderColor: colors.border,
          shadowColor: colors.shadow,
          paddingBottom: Math.max(insets.bottom, spacing.md),
        },
      ]}
    >
      {leftRoutes.map((route) => renderTab(route, routes.indexOf(route)))}

      <PressableScale
        onPress={openScanner}
        accessibilityRole="button"
        accessibilityLabel={t('tabs.Scan')}
        accessibilityHint={t('scan.hint')}
        style={[
          styles.centerButton,
          { backgroundColor: colors.primary, borderColor: colors.tabBar, shadowColor: colors.shadow },
          shadows.md,
        ]}
      >
        <Icon name="qrcode-scan" size={26} color={colors.onPrimary} />
      </PressableScale>

      {rightRoutes.map((route) => renderTab(route, routes.indexOf(route)))}
    </View>
  );
}

type TabItemProps = { label: string; icon: IconName; activeIcon: IconName; focused: boolean; onPress: () => void };

function TabItem({ label, icon, activeIcon, focused, onPress }: TabItemProps) {
  const { colors, isDark } = useTheme();
  const idle = isDark ? colors.textSecondary : colors.textTertiary;
  const active = colors.primaryText;

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={styles.item}
      scaleTo={0.94}
    >
      <Icon name={focused ? activeIcon : icon} size={22} color={focused ? active : idle} />
      <AppText
        numberOfLines={1}
        variant="caption"
        color={focused ? active : idle}
        style={[styles.label, focused ? { fontFamily: fonts.bold } : null]}
      >
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingTop: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
  },
  item: { flex: 1, minHeight: sizes.iconButton, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 11, letterSpacing: 0.1 },
  centerButton: {
    width: sizes.tabBarCenter,
    height: sizes.tabBarCenter,
    borderRadius: sizes.tabBarCenter / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -sizes.tabBarCenter / 3,
    borderWidth: 4,
  },
});
