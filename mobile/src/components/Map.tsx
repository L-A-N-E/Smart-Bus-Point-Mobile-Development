import { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import MapView from 'react-native-maps';

import { useTheme } from '../contexts/ThemeContext';

type Props = ComponentProps<typeof MapView>;

// Wrapper fino do MapView: só aplica o estilo escuro do app quando o tema está no escuro
// (o mapa em si usa os provedores nativos — Apple Maps no iOS, Google Maps no Android).
export function Map({ style, ...rest }: Props) {
  const { isDark } = useTheme();

  return (
    <MapView
      style={[styles.flex, style]}
      userInterfaceStyle={isDark ? 'dark' : 'light'}
      showsUserLocation
      showsMyLocationButton
      {...rest}
    />
  );
}

export { Marker, Polyline } from 'react-native-maps';

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
