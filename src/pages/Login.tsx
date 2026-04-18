import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
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
    
    // Auto-formatting: If user typed an email, use it. If not, append the local school domain.
    const emailFormat = username.includes('@') ? username.trim() : `${username.toLowerCase().trim()}@edutest.local`;
    
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

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error(error);
      toast.error('Gagal login Google: ' + error.message);
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
               <div className="flex justify-between items-center">
                 <label className="text-sm font-medium">Password</label>
               </div>
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
        <CardFooter className="flex flex-col border-t bg-slate-50/50 pt-4 gap-4">
           <div className="relative w-full text-center">
             <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
             <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-50 px-2 text-muted-foreground">Staf / Admin</span></div>
           </div>
           <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Login menggunakan Google
           </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
