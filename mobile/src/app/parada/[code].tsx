// Deep link curto do totem/QR impresso (sbp://parada/<codigo>) — redireciona pro mesmo destino
// de /stop/[code] sem duplicar a tela.
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ParadaRedirect() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <Redirect href={`/stop/${code}`} />;
}
