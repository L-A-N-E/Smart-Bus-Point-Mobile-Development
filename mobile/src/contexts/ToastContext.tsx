import { createContext, ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { Animated } from 'react-native';

import { Toast, ToastData } from '../components/Toast';
import { useReduceMotion } from '../hooks/useReduceMotion';

const ToastContext = createContext<((options: ToastData) => void) | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReduceMotion();

  const hide = useCallback(
    (duration = 200) => {
      if (timer.current) clearTimeout(timer.current);
      if (reduceMotion) {
        setToast(null);
        return;
      }
      Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }).start(() => setToast(null));
    },
    [anim, reduceMotion],
  );

  const show = useCallback(
    (options: ToastData) => {
      if (timer.current) clearTimeout(timer.current);
      setToast(options);
      anim.setValue(reduceMotion ? 1 : 0);
      if (!reduceMotion) Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
      // com ação, dá mais tempo para o usuário reagir
      timer.current = setTimeout(() => hide(), options.action ? 5000 : 2200);
    },
    [anim, hide, reduceMotion],
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Toast
          toast={toast}
          anim={anim}
          onActionPress={() => {
            toast.action?.onPress();
            hide(150);
          }}
        />
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return context;
}
