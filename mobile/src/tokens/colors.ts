// Paleta do S.B.P. — tema claro, escuro e alto contraste.
//
// Regra de acessibilidade (WCAG AA, 4,5:1 mínimo para texto): teal (#2AB2B8) e verde (#2AB85E)
// têm luminosidade alta, então o texto SOBRE ELES (como preenchimento de botão) é SEMPRE escuro
// (slate #293738) — nunca branco. Já o terracota (#B8482A) é escuro o bastante para texto branco.
//
// Só que o inverso também é um problema: usar o teal/verde PUROS como cor de texto sobre um fundo
// claro (link, rótulo "Ao vivo") dá só ~2,5:1 — por isso existem `primaryText`/`successText`,
// versões mais escuras (ou mais claras, no escuro) feitas só para texto/ícone, nunca como fundo.
// `danger`/`dangerText` já nascem com contraste suficiente nos dois papéis no claro; no escuro,
// `dangerText` troca para um terracota mais claro (o original cai pra ~2,4:1 como texto no escuro).
//
// No tema de alto contraste (>= 7:1, nível AAA para texto normal) os pares de "texto sobre cor"
// trocam para um preto quase puro (#0B0E10) ou, no caso do terracota no escuro, para um tom mais
// claro da própria cor — manter branco/preto puro nesses pares cairia abaixo de 7:1.
//
// Todos os pares foram medidos com a fórmula de contraste relativo do WCAG 2.1 (luminância relativa).

export type ColorTokens = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  primary: string;
  primaryPressed: string;
  primarySoft: string;
  primaryText: string; // teal usado COMO TEXTO/ícone (link, rótulo "Ao vivo") — nunca como fundo
  onPrimary: string; // texto/ícone sobre `primary` (fundo) — sempre escuro

  success: string;
  successSoft: string;
  successText: string; // verde usado como texto/ícone
  onSuccess: string; // texto/ícone sobre `success` (fundo) — sempre escuro

  danger: string; // terracota: usado em erros, alertas e status "com problema"/"atrasado"
  dangerSoft: string;
  dangerText: string; // terracota usado como texto/ícone
  onDanger: string; // texto/ícone sobre `danger` (fundo)

  overlay: string;
  scrim: string;
  shadow: string;
  tabBar: string;
};

export const palette = {
  teal: '#2AB2B8',
  green: '#2AB85E',
  terracota: '#B8482A',
  slate: '#293738',
  brown: '#382C29',
  bgLight: '#F6FAFA',
  white: '#FFFFFF',
  black: '#000000',
};

export const lightColors: ColorTokens = {
  background: palette.bgLight,
  surface: palette.white,
  surfaceAlt: '#EEF5F5',
  border: '#CFE2E2',

  text: palette.slate,
  textSecondary: '#4C5B59', // 6.78:1 no fundo, 7.12:1 no cartão
  textTertiary: '#667673', // 4.54:1 no fundo, 4.77:1 no cartão
  textInverse: palette.white,

  primary: palette.teal,
  primaryPressed: '#228F94',
  primarySoft: '#DCF2F3',
  primaryText: '#146166', // 6.81:1 no fundo, 7.16:1 no cartão
  onPrimary: palette.slate, // 4.81:1

  success: palette.green,
  successSoft: '#DCF7E6',
  successText: '#18683A', // 6.48:1 no fundo, 6.82:1 no cartão
  onSuccess: palette.slate, // 4.78:1

  danger: palette.terracota,
  dangerSoft: '#FDF2EE', // 4.78:1 com texto `dangerText`
  dangerText: palette.terracota, // 5.00:1 no fundo, 5.25:1 no cartão
  onDanger: palette.white, // 5.25:1

  overlay: 'rgba(41, 55, 56, 0.45)',
  scrim: 'rgba(20, 28, 28, 0.55)',
  shadow: '#0F1817',
  tabBar: palette.white,
};

export const darkColors: ColorTokens = {
  background: palette.slate,
  surface: palette.brown,
  surfaceAlt: '#423430',
  border: '#4A3C38',

  text: '#F3F7F6',
  textSecondary: '#C3D1CF', // 7.86:1 no fundo, 8.55:1 no cartão
  textTertiary: '#9DACAA', // 5.25:1 no fundo, 5.71:1 no cartão
  textInverse: palette.slate,

  primary: palette.teal,
  primaryPressed: '#3AC6CC',
  primarySoft: '#1C3B3C',
  primaryText: '#4DD6DC', // 7.05:1 no fundo, 7.67:1 no cartão
  onPrimary: palette.slate, // 4.81:1

  success: palette.green,
  successSoft: '#1C3B2A',
  successText: '#55D383', // 6.50:1 no fundo, 7.07:1 no cartão
  onSuccess: palette.slate, // 4.78:1

  danger: palette.terracota,
  dangerSoft: '#3A2420',
  // No escuro, o terracota original cai pra ~2,4:1 como TEXTO (diferente de ser fundo, onde o
  // próprio tom escuro contrasta bem com fundo claro) — usa uma versão mais clara só para texto/ícone.
  dangerText: '#E68E6E', // 4.98:1 no fundo, 5.42:1 no cartão
  onDanger: palette.white, // 5.25:1

  overlay: 'rgba(14, 20, 19, 0.6)',
  scrim: 'rgba(0, 0, 0, 0.65)',
  shadow: palette.black,
  tabBar: '#332722',
};

// Alto contraste: ativado no Perfil, independente do tema claro/escuro escolhido.
// Mantém a identidade (teal/verde/terracota), mas troca o par "texto sobre cor" para >= 7:1.
export const highContrastLightColors: ColorTokens = {
  background: palette.white,
  surface: palette.white,
  surfaceAlt: '#F0F0F0',
  border: '#5B6B69',

  text: '#12171A', // 18.05:1
  textSecondary: '#32413F', // 10.70:1
  textTertiary: '#32413F',
  textInverse: palette.white,

  primary: palette.teal,
  primaryPressed: '#1F8084',
  primarySoft: '#DCF2F3',
  primaryText: '#0F5458', // 8.22:1 no fundo, 8.64:1 no cartão
  onPrimary: '#0B0E10', // 7.52:1 (no claro comum seria 4.81:1 com slate)

  success: palette.green,
  successSoft: '#DCF7E6',
  successText: '#115C2D', // 7.70:1 no fundo, 8.10:1 no cartão
  onSuccess: '#0B0E10', // 7.48:1

  danger: '#8F3620', // terracota escurecido para o par branco atingir 7:1
  dangerSoft: '#FDF2EE',
  dangerText: '#8F3620', // 7.73:1 sobre branco
  onDanger: palette.white, // 7.73:1

  overlay: 'rgba(0, 0, 0, 0.5)',
  scrim: 'rgba(0, 0, 0, 0.6)',
  shadow: palette.black,
  tabBar: palette.white,
};

export const highContrastDarkColors: ColorTokens = {
  background: '#0E1413',
  surface: '#1E1512',
  surfaceAlt: '#241A16',
  border: '#8A9290',

  text: '#FAFDFD', // 18.20:1
  textSecondary: '#D9E6E4', // 14.53:1
  textTertiary: '#D9E6E4',
  textInverse: '#0E1413',

  primary: palette.teal,
  primaryPressed: '#3AC6CC',
  primarySoft: '#163233',
  primaryText: '#63DEE3', // 7.71:1 no fundo, 8.39:1 no cartão
  onPrimary: '#0B0E10', // 7.52:1

  success: palette.green,
  successSoft: '#163323',
  successText: '#63DB90', // 7.11:1 no fundo, 7.73:1 no cartão
  onSuccess: '#0B0E10', // 7.48:1

  // No escuro, branco sobre o terracota original cai para ~4:1; usa um terracota mais claro
  // para o par com texto quase preto se manter em 7:1.
  danger: '#E68E6E',
  dangerSoft: '#3A2420',
  dangerText: '#E68E6E', // 7.50:1 sobre o fundo quase preto
  onDanger: '#0B0E10', // 7.80:1

  overlay: 'rgba(0, 0, 0, 0.6)',
  scrim: 'rgba(0, 0, 0, 0.7)',
  shadow: palette.black,
  tabBar: '#1E1512',
};

export function getColorTokens(isDark: boolean, highContrast: boolean): ColorTokens {
  if (highContrast) return isDark ? highContrastDarkColors : highContrastLightColors;
  return isDark ? darkColors : lightColors;
}
