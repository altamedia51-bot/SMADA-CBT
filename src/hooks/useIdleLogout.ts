import { useEffect } from 'react';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../store/auth.store';

/**
 * Hook untuk auto logout jika idle
 * Sesuai requirement: "Auto logout jika idle 10 menit" untuk Admin & Guru
 */
export function useIdleLogout(timeoutMinutes: number = 10) {
  const { profile } = useAuthStore();

  useEffect(() => {
    // Siswa tidak dibatasi idle karena mereka sedang ujian
    if (!profile || profile.role === 'siswa') return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        alert(`Sesi Anda telah berakhir karena tidak ada aktivitas selama ${timeoutMinutes} menit.`);
        auth.signOut();
      }, timeoutMinutes * 60 * 1000);
    };

    // Listen to user activities
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => document.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [profile, timeoutMinutes]);
}
