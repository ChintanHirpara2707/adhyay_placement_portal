import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Theme } from '@/theme/theme';

export type ToastType = 'success' | 'error' | 'info';

interface AnimatedToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  onDismiss?: () => void;
  duration?: number;
}

export const AnimatedToast: React.FC<AnimatedToastProps> = ({
  visible,
  message,
  type = 'info',
  onDismiss,
  duration = 3500,
}) => {
  useEffect(() => {
    if (visible && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onDismiss]);

  const colors = {
    success: {
      bg: '#ECFDF5',
      border: Theme.colors.success,
      text: '#065F46',
      icon: 'check-circle' as const,
    },
    error: {
      bg: '#FEF2F2',
      border: Theme.colors.error,
      text: '#991B1B',
      icon: 'alert-circle' as const,
    },
    info: {
      bg: '#EFF6FF',
      border: Theme.colors.primaryAccent,
      text: '#1E3A8A',
      icon: 'information' as const,
    },
  }[type];

  return (
    <AnimatePresence>
      {visible && (
        <MotiView
          from={{ opacity: 0, translateY: -40, scale: 0.95 }}
          animate={{ opacity: 1, translateY: 0, scale: 1 }}
          exit={{ opacity: 0, translateY: -30, scale: 0.95 }}
          transition={{
            type: 'spring',
            damping: 18,
            stiffness: 240,
          }}
          style={[
            styles.container,
            {
              backgroundColor: colors.bg,
              borderColor: colors.border,
            },
          ]}
        >
          <MaterialCommunityIcons name={colors.icon} size={20} color={colors.border} />
          <Text style={[styles.text, { color: colors.text }]}>{message}</Text>
        </MotiView>
      )}
    </AnimatePresence>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    left: 20,
    right: 20,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    gap: 10,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
