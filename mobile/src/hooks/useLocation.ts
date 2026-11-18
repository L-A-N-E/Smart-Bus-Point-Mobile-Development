import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

export type Coordinates = { lat: number; lng: number };

type State = {
  location: Coordinates | null;
  loading: boolean;
  permissionDenied: boolean;
  error: string | null;
};

// Localização "em uso" (não em segundo plano) — pedida só quando a tela que precisa dela abre.
export function useLocation() {
  const [state, setState] = useState<State>({ location: null, loading: true, permissionDenied: false, error: null });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState({ location: null, loading: false, permissionDenied: true, error: null });
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setState({
        location: { lat: position.coords.latitude, lng: position.coords.longitude },
        loading: false,
        permissionDenied: false,
        error: null,
      });
    } catch (err) {
      setState({ location: null, loading: false, permissionDenied: false, error: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}
