import { useEffect, useState } from 'react';

import { getNearbyStops, NearbyStop } from '../services/api';
import { useLocation } from './useLocation';

type State = { stops: NearbyStop[]; loading: boolean; error: string | null };

export function useNearbyStops(radius = 600) {
  const { location, loading: locationLoading, permissionDenied, error: locationError, refresh: refreshLocation } = useLocation();
  const [state, setState] = useState<State>({ stops: [], loading: true, error: null });

  useEffect(() => {
    if (!location) return;
    setState((s) => ({ ...s, loading: true }));
    getNearbyStops(location.lat, location.lng, radius)
      .then((stops) => setState({ stops, loading: false, error: null }))
      .catch((err) => setState({ stops: [], loading: false, error: err instanceof Error ? err.message : String(err) }));
  }, [location, radius]);

  return {
    stops: state.stops,
    loading: locationLoading || state.loading,
    error: state.error ?? locationError,
    permissionDenied,
    refresh: refreshLocation,
  };
}
