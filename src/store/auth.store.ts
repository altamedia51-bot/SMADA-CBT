import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';

export type UserRole = 'admin' | 'guru' | 'siswa' | null;

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  waliKelas?: string;
  mengampu?: { mapelId: string; kelas: string[] }[];
  nip?: string;
}

interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  activeTahunAjaran: string | null;
  setUser: (user: FirebaseUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setActiveTahunAjaran: (ta: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  activeTahunAjaran: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setActiveTahunAjaran: (ta) => set({ activeTahunAjaran: ta }),
}));
