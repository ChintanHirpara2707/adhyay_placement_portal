import { create } from 'zustand';
import { showAlert } from '@/lib/alert';

/**
 * One source of truth for "something is loading" (route changes and async actions).
 *
 * Anti-flicker rules:
 *  - nothing is shown until the wait exceeds SHOW_AFTER_MS
 *  - once shown it stays visible for at least MIN_VISIBLE_MS
 *  - any key is force-cleared after MAX_MS so a loader can never get stuck, and the user is told why
 */
export const SHOW_AFTER_MS = 150;
export const MIN_VISIBLE_MS = 400;
export const MAX_MS = 10_000;
const FINISH_MS = 500; // time the bar needs to complete and fade out

export type LoadingKind = 'nav' | 'action';
export type BarPhase = 'idle' | 'running' | 'finishing';

interface LoadingState {
  keys: Record<string, LoadingKind>;
  pendingNavigations: number;
  pendingActions: number;
  /** Drives <TopProgressBar/>. */
  phase: BarPhase;
  /** Screens that mounted but are still fetching their first data (see useScreenReady). */
  waitingScreens: number;
  startLoading: (key: string, kind?: LoadingKind) => void;
  stopLoading: (key: string) => void;
  registerWaitingScreen: () => void;
  unregisterWaitingScreen: () => void;
}

// Timers live outside the store: they are implementation detail, not state anyone renders.
const autoClear = new Map<string, ReturnType<typeof setTimeout>>();
let showTimer: ReturnType<typeof setTimeout> | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;
let shownAt = 0;

const clear = (t: ReturnType<typeof setTimeout> | null) => {
  if (t) clearTimeout(t);
  return null;
};

export const useLoadingStore = create<LoadingState>((set, get) => {
  const counts = (keys: Record<string, LoadingKind>) => ({
    pendingNavigations: Object.values(keys).filter((k) => k === 'nav').length,
    pendingActions: Object.values(keys).filter((k) => k === 'action').length,
  });

  /** Re-evaluates the bar after the set of pending keys changed. */
  const settle = () => {
    const busy = Object.keys(get().keys).length > 0;
    if (busy) {
      hideTimer = clear(hideTimer);
      idleTimer = clear(idleTimer);
      if (get().phase === 'finishing') set({ phase: 'running' });
      if (get().phase === 'idle' && !showTimer) {
        showTimer = setTimeout(() => {
          showTimer = null;
          if (Object.keys(get().keys).length > 0) {
            shownAt = Date.now();
            set({ phase: 'running' });
          }
        }, SHOW_AFTER_MS);
      }
      return;
    }
    // Nothing pending any more.
    showTimer = clear(showTimer); // finished before SHOW_AFTER_MS: never shown, no flicker
    if (get().phase === 'running' && !hideTimer) {
      const wait = Math.max(0, MIN_VISIBLE_MS - (Date.now() - shownAt));
      hideTimer = setTimeout(() => {
        hideTimer = null;
        if (Object.keys(get().keys).length > 0) return;
        set({ phase: 'finishing' });
        idleTimer = clear(idleTimer);
        idleTimer = setTimeout(() => {
          idleTimer = null;
          if (get().phase === 'finishing') set({ phase: 'idle' });
        }, FINISH_MS);
      }, wait);
    }
  };

  return {
    keys: {},
    pendingNavigations: 0,
    pendingActions: 0,
    phase: 'idle',
    waitingScreens: 0,

    startLoading: (key, kind = 'action') => {
      if (get().keys[key]) return;
      const keys = { ...get().keys, [key]: kind };
      set({ keys, ...counts(keys) });
      autoClear.set(
        key,
        setTimeout(() => {
          if (!get().keys[key]) return;
          get().stopLoading(key);
          showAlert('This is taking longer than expected', 'Check your connection and try again.');
        }, MAX_MS)
      );
      settle();
    },

    stopLoading: (key) => {
      const timer = autoClear.get(key);
      if (timer) clearTimeout(timer);
      autoClear.delete(key);
      if (!get().keys[key]) return;
      const { [key]: _removed, ...keys } = get().keys;
      set({ keys, ...counts(keys) });
      settle();
    },

    registerWaitingScreen: () => set((s) => ({ waitingScreens: s.waitingScreens + 1 })),
    unregisterWaitingScreen: () => set((s) => ({ waitingScreens: Math.max(0, s.waitingScreens - 1) })),
  };
});

/** Runs an async action while keeping the progress bar honest (also guarantees stopLoading on error). */
export async function withLoading<T>(key: string, fn: () => Promise<T>, kind: LoadingKind = 'action'): Promise<T> {
  useLoadingStore.getState().startLoading(key, kind);
  try {
    return await fn();
  } finally {
    useLoadingStore.getState().stopLoading(key);
  }
}
