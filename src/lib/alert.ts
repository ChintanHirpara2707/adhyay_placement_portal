import { AlertButton, useAlertStore } from '@/store/alertStore';

/**
 * Drop-in replacement for `Alert.alert`.
 *
 * React Native Web implements `Alert.alert` as an empty function, so on web every error and
 * success message (and every button callback) was silently lost. This renders the same dialog
 * through `AlertHost` on every platform.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  useAlertStore.getState().show({
    title,
    message,
    buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
  });
}

/** Message used when a write "succeeds" but no row changed (row-level security filtered it out). */
export const NO_ROWS_MESSAGE =
  'Nothing was changed. This is usually a missing database permission (RLS policy) for your role. Ask the administrator to check the policies.';
