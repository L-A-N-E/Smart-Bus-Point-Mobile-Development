import AsyncStorage from '@react-native-async-storage/async-storage';

// Estatísticas simples por conta (viagens concluídas e CO2 evitado acumulado), só no aparelho.
export type TripStats = { trips: number; co2Grams: number };

const storageKey = (userId: string) => `@sbp:stats:${userId}`;

export async function getTripStats(userId: string): Promise<TripStats> {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  return raw ? (JSON.parse(raw) as TripStats) : { trips: 0, co2Grams: 0 };
}

export async function recordCompletedTrip(userId: string, co2Grams: number): Promise<void> {
  const current = await getTripStats(userId);
  const next: TripStats = { trips: current.trips + 1, co2Grams: current.co2Grams + co2Grams };
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
}
