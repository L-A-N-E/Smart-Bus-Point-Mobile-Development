import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';

export const fontAssets = {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
};

export const fonts = {
  regular: 'Montserrat_400Regular',
  medium: 'Montserrat_500Medium',
  semiBold: 'Montserrat_600SemiBold',
  bold: 'Montserrat_700Bold',
};

// Tamanhos em `fontSize`/`lineHeight`: a escala do SISTEMA ainda se aplica por cima (o app nunca
// usa `allowFontScaling={false}`), então estes números são a base em 100%. Testado até 200%.
export const typography = {
  hero: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 38, letterSpacing: -0.4 },
  h1: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.2 },
  h2: { fontFamily: fonts.semiBold, fontSize: 21, lineHeight: 27 },
  h3: { fontFamily: fonts.semiBold, fontSize: 18, lineHeight: 24 },
  title: { fontFamily: fonts.semiBold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodySm: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  label: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  overline: {
    fontFamily: fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
};

export type TypographyVariant = keyof typeof typography;
