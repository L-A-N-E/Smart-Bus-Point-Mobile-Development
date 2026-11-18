import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from './AuthContext';

export type RoutePoint = { label: string; lat: number; lng: number };

export type RoutePreferences = { onlyAccessible: boolean; lessWalking: boolean };

// Dias da semana: 0 = domingo ... 6 = sábado (igual a Date#getDay()).
export type Routine = { days: number[]; time: string };

export type SavedRoute = {
  id: string;
  name: string;
  origin: RoutePoint;
  destination: RoutePoint;
  preferences: RoutePreferences;
  routine?: Routine;
  createdAt: string;
};

type SavedRoutesContextValue = {
  routes: SavedRoute[];
  addRoute: (route: Omit<SavedRoute, 'id' | 'createdAt'>) => Promise<SavedRoute>;
  renameRoute: (id: string, name: string) => void;
  removeRoute: (id: string) => void;
  restoreRoute: (route: SavedRoute) => void; // usado pelo "desfazer" do toast de exclusão
};

const SavedRoutesContext = createContext<SavedRoutesContextValue | undefined>(undefined);

const storageKey = (userId: string) => `@sbp:saved-routes:${userId}`;

export function SavedRoutesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<SavedRoute[]>([]);

  useEffect(() => {
    if (!user) {
      setRoutes([]);
      return;
    }
    AsyncStorage.getItem(storageKey(user.id)).then((raw) => {
      setRoutes(raw ? (JSON.parse(raw) as SavedRoute[]) : []);
    });
  }, [user]);

  const persist = (next: SavedRoute[]) => {
    setRoutes(next);
    if (user) AsyncStorage.setItem(storageKey(user.id), JSON.stringify(next));
  };

  const value = useMemo<SavedRoutesContextValue>(
    () => ({
      routes,
      addRoute: async (route) => {
        const newRoute: SavedRoute = { ...route, id: Crypto.randomUUID(), createdAt: new Date().toISOString() };
        persist([newRoute, ...routes]);
        return newRoute;
      },
      renameRoute: (id, name) => persist(routes.map((r) => (r.id === id ? { ...r, name } : r))),
      removeRoute: (id) => persist(routes.filter((r) => r.id !== id)),
      restoreRoute: (route) => persist([route, ...routes]),
    }),
    [routes, user],
  );

  return <SavedRoutesContext.Provider value={value}>{children}</SavedRoutesContext.Provider>;
}

export function useSavedRoutes() {
  const context = useContext(SavedRoutesContext);
  if (!context) throw new Error('useSavedRoutes deve ser usado dentro de SavedRoutesProvider');
  return context;
}
