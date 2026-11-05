// Sage & Forest Palette (Foco em Leitura, Conforto Visual e Identidade Orgânica)
// Modos Dark e Light compartilham a mesma essência botânica/mineral:
// Tons sálvia, verde floresta e ouro/âmbar para o token +1.

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceHover: string;
  surfaceBorder: string;

  primary: string;
  primaryDark: string;
  primarySubtle: string;
  primaryBorder: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  targetToken: string;
  targetTokenSubtle: string;
  targetTokenBorder: string;

  accent: string;
  accentLight: string;
  accentSubtle: string;
  accentBorder: string;

  posNoun: string;
  posVerb: string;
  posAdjective: string;
  posAdverb: string;
  posIdiom: string;
  posDefault: string;

  success: string;
  error: string;
  errorSubtle: string;
}

export const darkColors: ThemeColors = {
  background: '#0F1715',
  surface: '#16221F',
  surfaceHover: '#1C2B27',
  surfaceBorder: '#22332F',

  primary: '#4E9B78',
  primaryDark: '#2D5A46',
  primarySubtle: 'rgba(78, 155, 120, 0.16)',
  primaryBorder: 'rgba(78, 155, 120, 0.35)',

  textPrimary: '#ECF2EF',
  textSecondary: '#8FA89F',
  textMuted: '#5F756D',

  targetToken: '#F2C94C',
  targetTokenSubtle: 'rgba(242, 201, 76, 0.16)',
  targetTokenBorder: 'rgba(242, 201, 76, 0.4)',

  accent: '#F2C94C',
  accentLight: '#F2C94C',
  accentSubtle: 'rgba(242, 201, 76, 0.16)',
  accentBorder: 'rgba(242, 201, 76, 0.4)',

  posNoun: '#4E9B78',
  posVerb: '#62A894',
  posAdjective: '#8EB59B',
  posAdverb: '#B39DDB',
  posIdiom: '#F2C94C',
  posDefault: '#8FA89F',

  success: '#4E9B78',
  error: '#E06C75',
  errorSubtle: 'rgba(224, 108, 117, 0.14)',
};

export const lightColors: ThemeColors = {
  // Fundo em linho/sálvia suave (evita o branco estéril e cansativo)
  background: '#F3F6F4',
  // Cartões em branco limpo com leve acabamento
  surface: '#FFFFFF',
  surfaceHover: '#EBF1ED',
  surfaceBorder: '#D7E2DC',

  // Verde-floresta encorpado para alto contraste sobre fundo claro
  primary: '#266C4D',
  primaryDark: '#194A34',
  primarySubtle: 'rgba(38, 108, 77, 0.10)',
  primaryBorder: 'rgba(38, 108, 77, 0.25)',

  // Texto principal em tom floresta profundo (remete à cor de fundo do modo escuro)
  textPrimary: '#11221B',
  textSecondary: '#445E54',
  textMuted: '#6E857C',

  // Ouro âmbar aquecido escurecido para perfeita legibilidade no fundo claro
  targetToken: '#B87802',
  targetTokenSubtle: 'rgba(184, 120, 2, 0.12)',
  targetTokenBorder: 'rgba(184, 120, 2, 0.35)',

  accent: '#B87802',
  accentLight: '#CA8605',
  accentSubtle: 'rgba(184, 120, 2, 0.12)',
  accentBorder: 'rgba(184, 120, 2, 0.35)',

  posNoun: '#266C4D',
  posVerb: '#2A7A64',
  posAdjective: '#4B7763',
  posAdverb: '#6F549B',
  posIdiom: '#B87802',
  posDefault: '#445E54',

  success: '#266C4D',
  error: '#C6303D',
  errorSubtle: 'rgba(198, 48, 61, 0.10)',
};

// Export padrão com fallback para o tema escuro
export const colors = darkColors;
