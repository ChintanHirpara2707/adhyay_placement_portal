import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type UserRole = 'student' | 'company' | 'admin';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  /**
   * True when a Supabase session exists but there is NO row in `users` yet (first Google sign-in).
   * The user must pick Student/Company on /(auth)/choose-role. Never default a missing row to a role.
   */
  needsRole: boolean;
  /** False while the `users` lookup for the current session is in flight. */
  roleResolved: boolean;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setRole: (role: UserRole | null) => void;
  setNeedsRole: (needsRole: boolean) => void;
  setRoleResolved: (resolved: boolean) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  role: null,
  needsRole: false,
  roleResolved: false,
  loading: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setRole: (role) => set({ role }),
  setNeedsRole: (needsRole) => set({ needsRole }),
  setRoleResolved: (roleResolved) => set({ roleResolved }),
  setLoading: (loading) => set({ loading }),
  logout: async () => {
    // Clear the Supabase session (this also wipes the persisted web session so it cannot silently sign back in).
    // If the network call fails, still drop the local session so the user is really signed out on this device.
    try {
      const { error } = await supabase.auth.signOut();
      if (error) await supabase.auth.signOut({ scope: 'local' });
    } catch {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    }
    set({ user: null, session: null, role: null, needsRole: false, roleResolved: true });
  },
}));
