import { MD3LightTheme } from 'react-native-paper';

export const Theme = {
  colors: {
    background: '#FFFFFF',
    card: '#F9FAFB',
    cardBackground: '#F9FAFB',
    surface: '#F9FAFB',
    primary: '#1E3A8A', // deep blue
    primaryAccent: '#1E3A8A',
    primaryText: '#111827',
    textPrimary: '#111827',
    secondaryText: '#6B7280',
    textSecondary: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',

    // Buttons
    buttonDisabledBg: '#E5E7EB',
    buttonDisabledText: '#9CA3AF',

    // Status Pills
    status: {
      applied: {
        bg: '#F3F4F6',
        text: '#6B7280',
      },
      round_cleared: {
        bg: '#CCFBF1',
        text: '#0F766E',
      },
      shortlisted: {
        bg: '#DBEAFE',
        text: '#1E3A8A',
      },
      interview_scheduled: {
        bg: '#FEF3C7',
        text: '#F59E0B',
      },
      selected: {
        bg: '#D1FAE5',
        text: '#10B981',
      },
      rejected: {
        bg: '#FEE2E2',
        text: '#EF4444',
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
      color: '#111827',
    },
    sectionHeader: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: '#111827',
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: '#111827',
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      color: '#111827',
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      color: '#6B7280',
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
    primary: Theme.colors.primaryAccent,
    onPrimary: '#FFFFFF',
    background: Theme.colors.background,
    surface: Theme.colors.cardBackground,
    onSurface: Theme.colors.primaryText,
    surfaceVariant: Theme.colors.background,
    onSurfaceVariant: Theme.colors.secondaryText,
    outline: Theme.colors.border,
    error: Theme.colors.error,
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
