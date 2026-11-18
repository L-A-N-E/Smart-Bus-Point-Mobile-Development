import { useCallback, useEffect, useRef, useState } from 'react';

import { Arrival, ArrivalsResponse, getArrivals, Stop } from '../services/api';

const POLL_MS = 15_000;

type State = {
  stop: Stop | null;
  arrivals: Arrival[];
  loading: boolean;
  error: string | null;
  stale: boolean;
  lastUpdatedAt: number | null;
};

// Busca as chegadas de uma parada e atualiza sozinho a cada 15s (regra do app para a parada).
export function useArrivals(stopCode: string, onlyAccessible: boolean) {
  const [state, setState] = useState<State>({ stop: null, arrivals: [], loading: true, error: null, stale: false, lastUpdatedAt: null });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data: ArrivalsResponse = await getArrivals(stopCode, onlyAccessible);
      setState({ stop: data.stop, arrivals: data.arrivals, loading: false, error: null, stale: data.stale, lastUpdatedAt: Date.now() });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err instanceof Error ? err.message : String(err) }));
    }
  }, [stopCode, onlyAccessible]);

  useEffect(() => {
    load(false);
    timer.current = setInterval(() => load(true), POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  return { ...state, refresh: () => load(false) };
}
