import React from 'react';
import { StyleSheet } from 'react-native';
import { ErrorState } from '@/components/ui/kit';
import { Button } from '@/components/ui/AppButton';
import { C } from '@/theme/design';

/** Shown when a screen's data failed to load: the real message plus a "Try again" button. Never a blank screen. */
export const LoadError: React.FC<{ message?: string | null; onRetry: () => void; title?: string }> = ({
  message,
  onRetry,
  title = 'Could not load this screen',
}) => (
  <ErrorState
    title={title}
    hint={message || 'Check your connection and try again.'}
    action={
      <Button mode="outlined" onPress={onRetry} textColor={C.accent} style={styles.btn} icon="refresh">
        Try again
      </Button>
    }
  />
);

const styles = StyleSheet.create({
  btn: { borderColor: C.line, marginTop: 8 },
});
