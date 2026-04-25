import React, { useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuthStore, UserRole } from '../store/auth.store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      
      if (user) {
        // Fetch or create user profile
        try {
          let userDoc = await getDoc(doc(db, 'users', user.uid));
          
          // Fallback: If UID doc missing, try searching by email (for re-uploaded students)
          if (!userDoc.exists() && user.email) {
            const { query, where, collection, getDocs, limit } = await import('firebase/firestore');
            const q = query(collection(db, 'users'), where('email', '==', user.email), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
              // Found a legacy/re-uploaded doc, we should "adopt" it by moving/linking to UID
              const data = snap.docs[0].data();
              const oldId = snap.docs[0].id;
              
              // Create the UID-based doc with the data
              const profileData = { 
                ...data, 
                uid: user.uid,
                updatedAt: serverTimestamp() 
              };
              await setDoc(doc(db, 'users', user.uid), profileData);
              
              // Note: We don't delete the oldId one here to be safe and avoid rule issues, 
              // but the main profile is now at user.uid
              userDoc = await getDoc(doc(db, 'users', user.uid));
            }
          }

          if (userDoc.exists()) {
            setProfile(userDoc.data() as any);
          } else {
            // Create default profile as siswa for demo
            const newProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'Unknown',
              role: 'siswa' as UserRole,
              isActive: true,
              createdAt: serverTimestamp(),
            };
            await setDoc(doc(db, 'users', user.uid), newProfile);
            setProfile(newProfile as any);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setProfile, setLoading]);

  return <>{children}</>;
}
