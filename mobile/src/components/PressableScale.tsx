import { ReactNode, useRef } from 'react';
import { AccessibilityRole, Animated, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';

import { useReduceMotion } from '../hooks/useReduceMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  accessibilityRole?: AccessibilityRole;
};

// Pressable com leve efeito de "afundar" ao toque. Respeita "reduzir movimento" (não anima nesse caso).
// O estilo vai direto no Pressable, para que flex/largura funcionem quando ele é filho de uma linha.
export function PressableScale({ children, style, scaleTo = 0.97, onPressIn, onPressOut, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();

  const animate = (to: number) => {
    if (reduceMotion) return;
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };

  return (
    <AnimatedPressable
      onPressIn={(e) => {
        animate(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animate(1);
        onPressOut?.(e);
      }}
      style={[style, reduceMotion ? null : { transform: [{ scale }] }]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
