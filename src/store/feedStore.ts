import { create } from 'zustand';

interface FeedState {
  dismissedIds: string[];
  dismissJob: (jobId: string) => void;
  isDismissed: (jobId: string) => boolean;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  dismissedIds: [],
  dismissJob: (jobId) =>
    set((s) => (s.dismissedIds.includes(jobId) ? s : { dismissedIds: [...s.dismissedIds, jobId] })),
  isDismissed: (jobId) => get().dismissedIds.includes(jobId),
}));
