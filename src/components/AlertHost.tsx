import React from 'react';
import { StyleSheet } from 'react-native';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { C, R } from '@/theme/design';
import { useAlertStore } from '@/store/alertStore';

/** Mount once inside PaperProvider. Renders the dialogs requested through `showAlert`. */
export const AlertHost: React.FC = () => {
  const current = useAlertStore((s) => s.queue[0]);
  const next = useAlertStore((s) => s.next);

  if (!current) return null;

  const cancel = current.buttons.find((b) => b.style === 'cancel');
  const close = (button?: { onPress?: () => void }) => {
    next();
    // Run the callback after the dialog state has updated.
    setTimeout(() => button?.onPress?.(), 0);
  };

  return (
    <Portal>
      <Dialog visible onDismiss={() => close(cancel)} style={styles.dialog} dismissable={!!cancel || current.buttons.length === 1}>
        <Dialog.Title style={styles.title}>{current.title}</Dialog.Title>
        {current.message ? (
          <Dialog.Content>
            <Text style={styles.message}>{current.message}</Text>
          </Dialog.Content>
        ) : null}
        <Dialog.Actions style={styles.actions}>
          {current.buttons.map((b, i) => (
            <Button
              key={`${b.text}-${i}`}
              onPress={() => close(b)}
              textColor={b.style === 'destructive' ? C.danger : b.style === 'cancel' ? C.muted : C.accent}
              labelStyle={styles.label}
              contentStyle={styles.btn}
            >
              {b.text ?? 'OK'}
            </Button>
          ))}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: { backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line, maxWidth: 420, width: '92%', alignSelf: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: C.ink },
  message: { fontSize: 15, lineHeight: 22, color: C.inkSoft },
  actions: { paddingHorizontal: 12, paddingBottom: 12 },
  label: { fontSize: 15, fontWeight: '600' },
  btn: { minHeight: 44, paddingHorizontal: 8 },
});
