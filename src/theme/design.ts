import { Platform } from 'react-native';

export const C = {
  ink: '#0B1020',
  inkSoft: '#1F2640',
  paper: '#F7F5F0',
  card: '#FFFFFF',
  line: '#E7E3DA',
  muted: '#5B6272',
  faint: '#9AA0AE',
  accent: '#1F5BFF',
  accentSoft: '#E8EEFF',
  amber: '#F5B544',
  success: '#12A150',
  successSoft: '#E7F6EE',
  danger: '#D92D20',
  dangerSoft: '#FDECEA',
  warning: '#B54708',
  warningSoft: '#FFF4E5',
  soft: '#EEF0F4',
  teal: '#0F766E',
  tealSoft: '#CCFBF1',
};

export const LOGO_RATIO = 259 / 217;

export const BP = { small: 380, mobile: 768, desktop: 1024 };

export const shadow = (y: number, blur: number, opacity: number) =>
  Platform.select({
    ios: {
      shadowColor: '#0B1020',
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacity,
      shadowRadius: blur,
    },
    android: { elevation: Math.max(1, Math.round(y / 2)) },
    web: { boxShadow: `0px ${y}px ${blur}px rgba(11,16,32,${opacity})` } as any,
    default: {},
  });

export const R = {
  card: 24,
  button: 14,
  input: 14,
  pill: 999,
};

export const T = {
  eyebrow: {
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
  },
  h1: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -1.5 },
  h2: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.8 },
  h3: { fontSize: 18, fontWeight: '800' as const, letterSpacing: -0.5 },
  body: { fontSize: 15, lineHeight: 23 },
  inputText: { fontSize: 16 },
};
