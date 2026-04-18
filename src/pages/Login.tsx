import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../store/auth.store';
import { Navigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const { user, profile } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (user && profile) {
    if (profile.role === 'admin') return <Navigate to="/admin" replace />;
    if (profile.role === 'guru') return <Navigate to="/guru" replace />;
    if (profile.role === 'siswa') return <Navigate to="/siswa" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return toast.error('Harap isi username dan password');
    setIsLoading(true);
    
    // We append a fake domain because Firebase Auth requires email format
    const emailFormat = `${username.toLowerCase()}@edutest.local`;
    
    try {
      await signInWithEmailAndPassword(auth, emailFormat, password);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Username atau password salah.');
      } else {
        toast.error('Gagal login: ' + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-3xl opacity-50" />
      
      <Card className="w-full max-w-md z-10 shadow-xl border-slate-200">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">CBT School Modern</CardTitle>
          <CardDescription>Masuk untuk memulai sesi Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username / NIS / NIP</label>
              <Input 
                type="text" 
                placeholder="Masukkan username Anda..." 
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input 
                type="password" 
                placeholder="••••••" 
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <Button className="w-full mt-4" size="lg" type="submit" disabled={isLoading}>
              {isLoading ? 'Memeriksa kredensial...' : 'Masuk Sistem'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
