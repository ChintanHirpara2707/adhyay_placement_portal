import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type UserRole = 'student' | 'company' | 'admin';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setRole: (role: UserRole | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  role: null,
  loading: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setRole: (role) => set({ role }),
  setLoading: (loading) => set({ loading }),
  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, role: null });
  },
}));
