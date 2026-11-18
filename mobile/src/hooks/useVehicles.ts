import { useCallback, useEffect, useRef, useState } from 'react';

import { getLineVehicles, Vehicle } from '../services/api';

const POLL_MS = 12_000;

type State = { vehicles: Vehicle[]; loading: boolean; error: string | null; stale: boolean };

// Posição dos veículos de uma linha, atualizada a cada 10-15s (aqui, 12s).
export function useVehicles(vehiclesCode: number | null) {
  const [state, setState] = useState<State>({ vehicles: [], loading: true, error: null, stale: false });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (vehiclesCode === null) {
      setState({ vehicles: [], loading: false, error: null, stale: false });
      return;
    }
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await getLineVehicles(vehiclesCode);
      setState({ vehicles: data.vehicles, loading: false, error: null, stale: data.stale });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err instanceof Error ? err.message : String(err) }));
    }
  }, [vehiclesCode]);

  useEffect(() => {
    load(false);
    timer.current = setInterval(() => load(true), POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  return state;
}
