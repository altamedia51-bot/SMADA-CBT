import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface AppSettings {
  logo?: string;
  appName?: string;
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    appName: 'CBT System',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings({
          logo: data.logo || '',
          appName: data.appName || 'CBT System',
        });
      }
      setLoading(false);
    }, (error) => {
      console.error("Gagal mengambil app settings:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { settings, loading };
}
