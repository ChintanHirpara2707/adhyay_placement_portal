import { Platform } from 'react-native';

/**
 * Single source of truth for the visual language.
 * White canvas, soft-gray secondary surfaces, charcoal text, restrained blue accent.
 * Every screen and component must import from here (or from `@/theme/theme`, which derives from it).
 */
export const C = {
  // Text
  ink: '#111827', // charcoal – primary text
  inkSoft: '#374151', // secondary strong text
  muted: '#6B7280', // secondary text (4.8:1 on white)
  faint: '#9CA3AF', // placeholders / decorative only

  // Surfaces
  paper: '#FFFFFF', // page canvas
  card: '#FFFFFF', // cards sit on the canvas, separated by a hairline border
  surface: '#F8FAFC', // soft gray secondary surface (hero panels, inputs, tiles)
  soft: '#F3F4F6', // neutral chips / tracks
  line: '#E5E7EB', // hairline borders and dividers

  // Accent (important actions only)
  accent: '#2563EB',
  accentStrong: '#1D4ED8',
  accentSoft: '#EFF6FF',

  // Status
  success: '#047857',
  successSoft: '#ECFDF5',
  danger: '#B91C1C',
  dangerSoft: '#FEF2F2',
  warning: '#B45309',
  warningSoft: '#FFFBEB',
  teal: '#0F766E',
  tealSoft: '#F0FDFA',
  amber: '#F59E0B', // progress / highlight fills (never text)
};

export const LOGO_RATIO = 259 / 217;

export const BP = { small: 380, mobile: 768, desktop: 1024 };

/** Minimum comfortable touch target (WCAG / platform guidelines). */
export const TOUCH = 44;

/**
 * Elevation is intentionally restrained: a hairline border does most of the work,
 * the shadow is just enough to lift a surface. Requested values are clamped.
 */
export const shadow = (y: number, blur: number, opacity: number) => {
  const sy = Math.min(Math.max(y, 1), 4);
  const sb = Math.min(Math.max(blur, 2), 12);
  const so = Math.min(opacity, 0.06);
  return Platform.select({
    ios: {
      shadowColor: '#111827',
      shadowOffset: { width: 0, height: sy },
      shadowOpacity: so,
      shadowRadius: sb,
    },
    android: { elevation: 1 },
    web: { boxShadow: `0px ${sy}px ${sb}px rgba(17,24,39,${so})` } as any,
    default: {},
  });
};

export const R = {
  card: 14,
  button: 10,
  input: 10,
  chip: 8,
  pill: 999,
};

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const T = {
  eyebrow: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  h1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.6 },
  h2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.4 },
  h3: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 18 },
  inputText: { fontSize: 16 },
};
