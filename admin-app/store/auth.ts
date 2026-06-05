import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'minhquyet08122003@gmail.com';

interface AuthState {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  setSession: (session: Session | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isAdmin: false,
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      isAdmin: session?.user?.email === ADMIN_EMAIL,
    }),
  clear: () => set({ session: null, user: null, isAdmin: false }),
}));
