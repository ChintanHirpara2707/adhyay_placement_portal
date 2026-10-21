import { create } from 'zustand';

export interface AlertButton {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface AlertRequest {
  title: string;
  message?: string;
  buttons: AlertButton[];
}

interface AlertState {
  queue: AlertRequest[];
  show: (req: AlertRequest) => void;
  /** Close the visible alert and show the next one, if any. */
  next: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  queue: [],
  show: (req) => set((s) => ({ queue: [...s.queue, req] })),
  next: () => set((s) => ({ queue: s.queue.slice(1) })),
}));
