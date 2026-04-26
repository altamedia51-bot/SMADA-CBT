import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { useAuthStore } from '../store/auth.store';
import { Navigate } from 'react-router-dom';
import { GraduationCap, User, Lock, ChevronDown, Search, ArrowLeft, EyeOff, Eye } from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';

export default function Login() {
  const { user, profile } = useAuthStore();
  
  // Login Mode: 'siswa' or 'manual' (guru/admin)
  const [loginMode, setLoginMode] = useState<'siswa' | 'manual'>('siswa');
  
  // Data Lists
  const [classList, setClassList] = useState<any[]>([]);
  const [studentList, setStudentList] = useState<any[]>([]);
  
  // Form State
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Fetch Classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const q = query(collection(db, 'kelas'), orderBy('name', 'asc'));
        const snap = await getDocs(q);
        setClassList(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
      } catch (err) {
        console.error("Failed to fetch classes", err);
      }
    };
    fetchClasses();
  }, []);

  // Fetch Students when class changes
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass) {
        setStudentList([]);
        return;
      }
      setIsDataLoading(true);
      try {
        const q = query(
          collection(db, 'users'), 
          where('role', '==', 'siswa'),
          where('kelas', '==', selectedClass),
          orderBy('displayName', 'asc')
        );
        const snap = await getDocs(q);
        setStudentList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setSelectedStudent(null); // Reset student on class change
      } catch (err) {
        console.error("Failed to fetch students", err);
        toast.error("Gagal memuat daftar siswa");
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchStudents();
  }, [selectedClass]);

  if (user && profile) {
    if (profile.role === 'admin') return <Navigate to="/admin" replace />;
    if (profile.role === 'guru') return <Navigate to="/guru" replace />;
    if (profile.role === 'siswa') return <Navigate to="/siswa" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let emailToUse = '';
    
    if (loginMode === 'siswa') {
      if (!selectedStudent) return toast.error('Pilih namamu terlebih dahulu');
      if (!password) return toast.error('Harap isi password');
      emailToUse = selectedStudent.email;
    } else {
      if (!username || !password) return toast.error('Harap isi username dan password');
      emailToUse = username.includes('@') ? username.trim() : `${username.toLowerCase().trim()}@edutest.local`;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, emailToUse, password);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Kredensial salah. Pastikan password sudah benar.');
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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 relative overflow-hidden font-sans">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-100/40 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-100/40 rounded-full blur-[120px] -z-10" />
      
      <div className="w-full max-w-[440px] animate-in fade-in zoom-in duration-500">
        <Card className="shadow-[0_8px_30px_rgb(0,0,0,0.06)] border-0 overflow-hidden rounded-[24px] bg-white">
          <CardContent className="p-8 md:p-10">
            <div className="text-center space-y-6 mb-8">
              <div className="mx-auto bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center ring-4 ring-indigo-50/50 shadow-inner">
                <User className="h-10 w-10 text-indigo-500" />
              </div>
              <div>
                <h1 className="text-[28px] font-black text-slate-800 tracking-tight leading-tight">Selamat Datang!</h1>
                <p className="text-slate-500 font-medium mt-1">Masuk untuk memulai ujian.</p>
              </div>
            </div>

            {loginMode === 'siswa' ? (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Pilih Kelas</label>
                  <div className="relative group">
                    <select 
                      className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
                      value={selectedClass}
                      onChange={e => setSelectedClass(e.target.value)}
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {classList.map(k => (
                        <option key={k.id} value={k.name}>{k.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" />
                  </div>
                </div>

                {selectedClass && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-sm font-bold text-slate-700 ml-1">Pilih Nama Kamu</label>
                    <div className="relative group">
                      <select 
                        className="w-full h-12 bg-white border-2 border-slate-900 rounded-xl px-4 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-800"
                        value={selectedStudent?.id || ''}
                        onChange={e => {
                          const student = studentList.find(s => s.id === e.target.value);
                          setSelectedStudent(student);
                        }}
                        disabled={isDataLoading}
                      >
                        <option value="">{isDataLoading ? 'Memuat data...' : `-- Cari Namamu di ${selectedClass} --`}</option>
                        {studentList.map(s => (
                          <option key={s.id} value={s.id}>{s.displayName}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {selectedStudent && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <label className="text-sm font-bold text-slate-700 ml-1">Password/PIN (Wajib)</label>
                    <div className="relative flex items-center">
                      <Input 
                        type={showPassword ? "text" : "password"}
                        placeholder="Masukkan password..."
                        className="h-12 bg-white border-indigo-200 border-2 rounded-xl focus-visible:ring-indigo-500/20 px-4 font-medium pr-10"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoFocus
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                <Button 
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98]" 
                  type="submit" 
                  disabled={isLoading || (selectedClass && !selectedStudent)}
                >
                  {isLoading ? 'Memverifikasi...' : 'Masuk Kelas'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-2 mb-2">
                  <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent text-indigo-600 font-bold" onClick={() => setLoginMode('siswa')}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Kembali ke Siswa
                  </Button>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Username / NIP</label>
                  <Input 
                    placeholder="Username..." 
                    className="h-12 bg-white border-slate-200 rounded-xl"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
                  <div className="relative flex items-center">
                    <Input 
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••" 
                      className="h-12 bg-white border-slate-200 rounded-xl pr-10"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <Button className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all" type="submit" disabled={isLoading}>
                  {isLoading ? 'Masuk...' : 'Masuk Sekarang'}
                </Button>
                
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-slate-400 bg-white px-2">Atau</div>
                </div>
                
                <Button variant="outline" className="w-full h-12 border-slate-200 rounded-xl flex items-center justify-center gap-2 font-bold text-slate-600 hover:bg-slate-50 transition-all" onClick={handleGoogleLogin}>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google Login
                </Button>
              </form>
            )}

            <div className="mt-10 pt-4 border-t border-slate-100 flex justify-center">
              {loginMode === 'siswa' && (
                <button 
                  type="button"
                  className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-medium text-sm transition-all py-2"
                  onClick={() => setLoginMode('manual')}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Masuk sebagai Guru
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

