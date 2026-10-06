import { MD3LightTheme } from 'react-native-paper';
import { C } from './design';

export const Theme = {
  colors: {
    background: C.paper,
    card: C.card,
    cardBackground: C.card,
    surface: C.card,
    primary: C.ink, // deep ink: primary buttons, headings
    primaryAccent: C.accent, // links, active states, highlights
    primaryText: C.ink,
    textPrimary: C.ink,
    secondaryText: C.muted,
    textSecondary: C.muted,
    success: C.success,
    warning: C.warning,
    error: C.danger,
    border: C.line,
    borderLight: C.line,

    // Buttons
    buttonDisabledBg: '#E5E7EB',
    buttonDisabledText: '#9CA3AF',

    // Status Pills
    status: {
      applied: {
        bg: '#EEF0F4',
        text: C.muted,
      },
      round_cleared: {
        bg: C.tealSoft,
        text: C.teal,
      },
      shortlisted: {
        bg: C.accentSoft,
        text: C.accent,
      },
      interview_scheduled: {
        bg: C.warningSoft,
        text: C.warning,
      },
      selected: {
        bg: C.successSoft,
        text: C.success,
      },
      rejected: {
        bg: C.dangerSoft,
        text: C.danger,
      },
    },
  },
  typography: {
    sizes: {
      screenTitle: 24,
      sectionHeader: 18,
      cardTitle: 16,
      body: 14,
      caption: 12,
    },
    weights: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
    screenTitle: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: C.ink,
    },
    sectionHeader: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: C.ink,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: C.ink,
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      color: C.ink,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      color: C.muted,
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    screenPadding: 16,
    elementGap: 12,
  },
  borderRadius: {
    button: 8,
    card: 12,
    input: 8,
    pill: 999,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
  },
  shadows: {
    subtle: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
  },
};

// React Native Paper theme override
export const customPaperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: C.accent,
    onPrimary: '#FFFFFF',
    background: C.paper,
    surface: C.card,
    onSurface: C.ink,
    surfaceVariant: C.paper,
    onSurfaceVariant: C.muted,
    outline: C.line,
    error: C.danger,
    elevation: {
      level0: 'transparent',
      level1: '#FFFFFF',
      level2: '#F9FAFB',
      level3: '#FFFFFF',
      level4: '#FFFFFF',
      level5: '#FFFFFF',
    },
  },
};

export default Theme;
