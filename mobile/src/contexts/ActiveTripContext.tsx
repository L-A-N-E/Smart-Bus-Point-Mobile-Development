import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import { RouteOption } from '../services/api';

export type ActiveTrip = { option: RouteOption; originLabel: string; destinationLabel: string; startedAt: string };

type ActiveTripContextValue = {
  trip: ActiveTrip | null;
  startTrip: (option: RouteOption, originLabel: string, destinationLabel: string) => void;
  endTrip: () => void;
};

const ActiveTripContext = createContext<ActiveTripContextValue | undefined>(undefined);

// Viagem ativa fica só em memória (não precisa sobreviver a reiniciar o app — se isso acontecer,
// o usuário recomeça do planejador, o que é aceitável para o protótipo).
export function ActiveTripProvider({ children }: { children: ReactNode }) {
  const [trip, setTrip] = useState<ActiveTrip | null>(null);

  const value = useMemo<ActiveTripContextValue>(
    () => ({
      trip,
      startTrip: (option, originLabel, destinationLabel) => setTrip({ option, originLabel, destinationLabel, startedAt: new Date().toISOString() }),
      endTrip: () => setTrip(null),
    }),
    [trip],
  );

  return <ActiveTripContext.Provider value={value}>{children}</ActiveTripContext.Provider>;
}

export function useActiveTrip() {
  const context = useContext(ActiveTripContext);
  if (!context) throw new Error('useActiveTrip deve ser usado dentro de ActiveTripProvider');
  return context;
}
