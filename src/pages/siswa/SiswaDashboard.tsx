import { useState, useEffect, ReactElement, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { auth } from '../../lib/firebase';
import { useAuthStore } from '../../store/auth.store';
import { LogOut, PlayCircle, BookOpen, AlertCircle, Clock } from 'lucide-react';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function SiswaDashboard() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [activeExams, setActiveExams] = useState<any[]>([]);
  
  // Token modal state
  const [examToStart, setExamToStart] = useState<any | null>(null);
  const [tokenInput, setTokenInput] = useState('');

  useEffect(() => {
    // Fetch ujian yang statusnya 'aktif'
    const qUjian = query(collection(db, 'ujian'), where('status', '==', 'aktif'));
    const unsub = onSnapshot(qUjian, (snap) => {
      // IDEALLY: filter by matching profile.kelasId == ujian.kelasId
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setActiveExams(list);
    });
    return () => unsub();
  }, []);

  const handleStartExam = (e: FormEvent) => {
    e.preventDefault();
    if (!tokenInput) return toast.error('Masukkan token ujian');
    
    // Validasi token sederhana / mock simulation (biasanya token dicocokkan dengan yg di database)
    if (tokenInput.length < 5) {
      return toast.error('Token tidak valid. Masukkan token resmi pengawas (Min 5 angka/huruf).');
    }
    
    toast.success('Token Benar! Menyiapkan soal untuk Anda...');
    const ujianIdToStart = examToStart.id;
    setExamToStart(null);
    setTokenInput('');
    navigate(`/siswa/ujian/${ujianIdToStart}`);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50">
      <nav className="h-16 bg-blue-600 text-white flex items-center justify-between px-4 md:px-8 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg shrink-0 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold text-xl tracking-tight hidden md:inline">EduTest CBT</span>
          <span className="bg-blue-800 text-blue-100 px-3 py-1 rounded-full text-xs font-semibold uppercase border border-blue-500/50">
            Siswa
          </span>
        </div>
        <div className="flex items-center gap-5">
           <div className="text-right hidden md:block">
             <p className="text-sm font-semibold">{profile?.displayName || 'Calon Peserta'}</p>
             <p className="text-xs text-blue-200">Siap Mengikuti Ujian</p>
           </div>
           <div 
             className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center cursor-pointer hover:bg-rose-500 transition-colors shadow-inner" 
             onClick={() => auth.signOut()}
             title="Keluar"
           >
             <LogOut className="h-4 w-4" />
           </div>
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full">
        
        <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border flex flex-col md:flex-row gap-6 items-center justify-between relative overflow-hidden text-slate-800">
           <div className="z-10 relative">
             <h2 className="text-2xl font-bold mb-2">Selamat Datang, {profile?.displayName || 'Peserta'}!</h2>
             <p className="text-muted-foreground text-sm max-w-lg leading-relaxed">
               Siapkan diri Anda dengan baik. Pastikan koneksi internet stabil sebelum memasukkan token kehadiran ujian. Segala bentuk kecurangan tab/browser akan direkam otomatis oleh sistem.
             </p>
           </div>
           <div className="w-32 h-32 bg-blue-50 rounded-full shrink-0 flex items-center justify-center shadow-inner z-10 hidden md:flex">
             <span className="text-5xl">🎓</span>
           </div>
           <div className="absolute right-[-10%] top-[-50%] w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <PlayCircle className="w-5 h-5 text-blue-600" />
          Ujian yang Sedang Aktif
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeExams.length === 0 ? (
            <div className="col-span-full bg-slate-100 border border-dashed p-10 rounded-xl text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Clock className="w-8 h-8 text-slate-400" />
              </div>
              <h4 className="font-bold text-slate-700 mb-1">Belum Ada Sesi Ujian</h4>
              <p className="text-sm text-slate-500">Tunggu aba-aba dari guru/pengawas untuk memulai.</p>
            </div>
          ) : (
            activeExams.map(u => (
              <Card key={u.id} className="overflow-hidden flex flex-col border border-blue-100 hover:border-blue-300 transition-colors shadow-sm hover:shadow-md bg-white">
                <div className="h-2 bg-emerald-500 w-full" />
                <div className="p-5 flex-1 flex flex-col">
                  <h4 className="font-bold text-lg mb-2 text-slate-800">{u.title}</h4>
                  <div className="text-sm text-slate-500 mb-6 space-y-1">
                    <p>Status: <span className="font-semibold text-emerald-600">Berlangsung Live</span></p>
                    <p>Durasi: <span className="font-medium text-slate-700">{u.duration} Menit</span></p>
                  </div>
                  <Button 
                    className="w-full mt-auto bg-blue-600 hover:bg-blue-700 font-bold" 
                    onClick={() => setExamToStart(u)}
                  >
                    Masuk Kelas Ujian
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="mt-12 bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-4">
          <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
          <div className="text-sm text-amber-800">
            <strong className="block mb-1">Peringatan Tata Tertib:</strong> 
            Anda tidak diperkenankan membuka tab baru, membuka aplikasi WhatsApp, atau sekadar me-*minimize* browser selama ujian berlangsung. Pelanggaran batas maksimal (5 kali pindah fokus layar) akan menyebabkan pengumpulan paksa oleh sistem.
          </div>
        </div>

      </main>

      {/* Token Modal */}
      <Dialog open={!!examToStart} onOpenChange={(open) => !open && setExamToStart(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Validasi Token Ujian</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-5">
              Anda akan memasuki ujian <strong className="text-foreground">{examToStart?.title}</strong>.<br/>
              Sebaris kode rahasia diperlukan untuk menarik naskah soal dari server.
            </p>
            <form onSubmit={handleStartExam} className="flex flex-col gap-4">
              <Input 
                autoFocus
                placeholder="Ketik Token Disini..." 
                value={tokenInput} 
                onChange={e => setTokenInput(e.target.value)}
                className="font-mono text-xl text-center tracking-widest uppercase p-6 border-blue-200 placeholder:text-base placeholder:tracking-normal"
              />
              <Button type="submit" size="lg" className="w-full font-bold text-base">VERIFIKASI & MULAI</Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
