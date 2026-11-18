import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from './AuthContext';

// Paradas favoritas — por conta (cada usuário vê só as suas), salvas só no aparelho.
type FavoritesContextValue = {
  favoriteCodes: string[];
  isFavorite: (stopCode: string) => boolean;
  toggleFavorite: (stopCode: string) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

const storageKey = (userId: string) => `@sbp:favorites:${userId}`;

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favoriteCodes, setFavoriteCodes] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setFavoriteCodes([]);
      return;
    }
    AsyncStorage.getItem(storageKey(user.id)).then((raw) => {
      setFavoriteCodes(raw ? (JSON.parse(raw) as string[]) : []);
    });
  }, [user]);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoriteCodes,
      isFavorite: (stopCode) => favoriteCodes.includes(stopCode),
      toggleFavorite: (stopCode) => {
        if (!user) return;
        setFavoriteCodes((prev) => {
          const next = prev.includes(stopCode) ? prev.filter((c) => c !== stopCode) : [...prev, stopCode];
          AsyncStorage.setItem(storageKey(user.id), JSON.stringify(next));
          return next;
        });
      },
    }),
    [favoriteCodes, user],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites deve ser usado dentro de FavoritesProvider');
  return context;
}
