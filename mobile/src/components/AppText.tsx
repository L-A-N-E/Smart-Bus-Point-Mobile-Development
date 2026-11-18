import { Text, TextProps } from 'react-native';

import { useTheme } from '../contexts/ThemeContext';
import { typography, TypographyVariant } from '../tokens';

type Tone = 'default' | 'secondary' | 'tertiary' | 'inverse' | 'primary' | 'success' | 'danger';

type Props = TextProps & {
  variant?: TypographyVariant;
  tone?: Tone;
  color?: string;
  align?: 'left' | 'center' | 'right';
};

// Nunca define `allowFontScaling={false}`: o app respeita o tamanho de fonte do sistema.
export function AppText({ variant = 'body', tone = 'default', color, align, style, ...rest }: Props) {
  const { colors } = useTheme();
  const toneColor: Record<Tone, string> = {
    default: colors.text,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    inverse: colors.textInverse,
    primary: colors.primaryText,
    success: colors.successText,
    danger: colors.dangerText,
  };

  return <Text style={[typography[variant], { color: color ?? toneColor[tone], textAlign: align }, style]} {...rest} />;
}
