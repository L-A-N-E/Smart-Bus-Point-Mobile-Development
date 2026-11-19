// Link web curto de divulgação (https://sbp.app/p/<codigo>) — mesmo destino de /stop/[code].
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function PRedirect() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <Redirect href={`/stop/${code}`} />;
}
