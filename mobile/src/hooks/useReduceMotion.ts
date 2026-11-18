import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Preferência de sistema "reduzir movimento": componentes de animação consultam este hook
// para pular (ou encurtar) transições.
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  return reduceMotion;
}
