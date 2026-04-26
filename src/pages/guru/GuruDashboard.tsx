import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '../../store/auth.store';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { RefreshCcw, Search, Clock, Users, FileText, Activity, Server, ScrollText, LogOut, User } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function GuruDashboard() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  
  const [ujianList, setUjianList] = useState<any[]>([]);
  const [selectedUjian, setSelectedUjian] = useState<string>('');
  const [pesertaList, setPesertaList] = useState<any[]>([]);
  const [searchPeserta, setSearchPeserta] = useState('');
  
  const [paketSoalCount, setPaketSoalCount] = useState(0);

  useEffect(() => {
    const qUjian = query(collection(db, 'ujian'));
    const unsub = onSnapshot(qUjian, (snap) => {
      setUjianList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!profile?.uid) return;
    const qPaket = query(collection(db, 'paket_soal'));
    const unsub = onSnapshot(qPaket, (snap) => {
      setPaketSoalCount(snap.docs.length);
    });
    return () => unsub();
  }, [profile?.uid]);

  useEffect(() => {
    if (!selectedUjian) {
      setPesertaList([]);
      return;
    }
    const qPeserta = query(collection(db, 'jawaban_siswa'));
    const unsub = onSnapshot(qPeserta, (snap) => {
      const allPeserta = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      const filtered = allPeserta.filter(p => p.ujianId === selectedUjian);
      setPesertaList(filtered);
    });
    
    return () => unsub();
  }, [selectedUjian]);

  const handleResetTimer = async (pesertaId: string, siswaName: string) => {
    if (!confirm(`Yakin ingin menyetel ulang timer untuk ${siswaName}?`)) return;
    try {
      await updateDoc(doc(db, 'jawaban_siswa', pesertaId), {
        startTime: serverTimestamp(),
        forceReset: true,
        resetCounter: 1
      });
      toast.success(`Timer ${siswaName} berhasil di-reset.`);
    } catch (err: any) {
      toast.error('Gagal reset timer: ' + err.message);
    }
  };

  const filteredPeserta = pesertaList.filter(p => {
    const name = p.siswaName || p.id;
    return name.toLowerCase().includes(searchPeserta.toLowerCase());
  });

  return (
    <div className="font-sans pb-24 relative bg-[#F8FAFC] min-h-screen">
      {/* HEADER MOBILE & DESKTOP */}
      <div className="bg-white border-b border-slate-100 px-5 py-4 md:px-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)] sticky top-0 z-30 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
             <div className="w-10 h-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-200">
                <User className="w-5 h-5 fill-current"/>
             </div>
             <div>
                <h1 className="text-xl md:text-2xl font-bold text-[#1E293B] tracking-tight">Dashboard</h1>
             </div>
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE] transition-all active:scale-90"
          >
             <LogOut className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </div>

      <main className="p-5 md:p-8 lg:p-10 space-y-7 max-w-5xl mx-auto">
        
        {/* Statistics Grid (2x2 on Mobile) */}
        <div className="grid grid-cols-2 gap-3.5 md:gap-6">
          <Card className="p-5 rounded-[18px] border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white">
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] md:text-sm text-slate-400 font-bold uppercase tracking-wider">Paket Soal</p>
              <p className="text-2xl md:text-4xl font-black text-[#1E293B] leading-none">{paketSoalCount}</p>
            </div>
          </Card>
          
          <Card className="p-5 rounded-[18px] border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white">
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] md:text-sm text-slate-400 font-bold uppercase tracking-wider">Ujian Aktif</p>
              <p className="text-2xl md:text-4xl font-black text-[#1E293B] leading-none text-emerald-500">{ujianList.length}</p>
            </div>
          </Card>
          
          <Card className="p-5 rounded-[18px] border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white">
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] md:text-sm text-slate-400 font-bold uppercase tracking-wider">Peserta Aktif</p>
              <p className="text-2xl md:text-4xl font-black text-[#1E293B] leading-none">{pesertaList.length > 0 ? pesertaList.length : '--'}</p>
            </div>
          </Card>
          
          <Card className="p-5 rounded-[18px] border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white">
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] md:text-sm text-slate-400 font-bold uppercase tracking-wider">Status Server</p>
              <p className="text-base md:text-xl font-black text-emerald-500 leading-none mt-1">Normal</p>
            </div>
          </Card>
        </div>

        {/* Monitoring Card */}
        <Card className="rounded-[20px] border-0 shadow-[0_10px_40px_rgb(0,0,0,0.05)] bg-white overflow-hidden flex flex-col min-h-[420px]">
           <div className="px-6 py-5 flex flex-col gap-1.5">
              <h3 className="font-bold flex items-center gap-2.5 text-[#1E293B] text-base md:text-lg">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Monitoring Real-time
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs font-medium">
                Pilih ujian dari menu di atas untuk mulai melihat peserta.
              </p>
           </div>

           <div className="flex-1 bg-slate-50/40 border-t border-slate-50 flex flex-col">
             {!selectedUjian ? (
               <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
                 <div className="w-16 h-16 bg-[#EFF6FF] text-[#2563EB] rounded-full flex items-center justify-center mb-4 shadow-inner">
                   <Users className="w-7 h-7" />
                 </div>
                 <h3 className="text-sm font-extrabold text-[#1E293B] mb-2 tracking-tight">Pilih Ujian Aktif</h3>
                 <p className="text-slate-400 text-[11px] font-medium leading-relaxed max-w-[180px] mx-auto">Pilih ujian dari menu di atas untuk mulai memantau peserta.</p>
                 
                 <div className="mt-8 w-full max-w-[240px]">
                    <Select value={selectedUjian} onValueChange={setSelectedUjian}>
                       <SelectTrigger className="w-full h-11 bg-white border-slate-200 rounded-xl focus:ring-blue-500 font-bold text-slate-600 shadow-sm">
                          <SelectValue placeholder="Pilih Ujian Aktif..." />
                       </SelectTrigger>
                       <SelectContent rounded-2xl>
                          {ujianList.length === 0 ? (
                            <SelectItem value="none" disabled>Tidak ada ujian aktif</SelectItem>
                          ) : (
                            ujianList.map(u => (
                              <SelectItem key={u.id} value={u.id} className="cursor-pointer font-bold">{u.title || u.id}</SelectItem>
                            ))
                          )}
                       </SelectContent>
                    </Select>
                 </div>
               </div>
             ) : (
               <div className="p-0">
                 {/* Current Participants View remains the same but with refined styling */}
                 <div className="block md:hidden px-5 py-5 space-y-3.5">
                    {filteredPeserta.length === 0 ? (
                      <div className="py-20 text-center flex flex-col items-center">
                         <Activity className="w-10 h-10 text-slate-200 mb-2" />
                         <p className="text-xs text-slate-400 font-bold tracking-tight">Belum ada peserta...</p>
                      </div>
                    ) : (
                      filteredPeserta.map(p => (
                         <div key={p.id} className="bg-white border-0 text-sm rounded-[16px] p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col gap-3">
                            <div className="flex justify-between items-start gap-2">
                               <div className="flex-1 min-w-0">
                                 <h4 className="font-bold text-[#1E293B] truncate mb-0.5">{p.siswaName || 'Anonim'}</h4>
                                 <p className="text-[10px] text-slate-400 font-bold tracking-wider">{p.siswaKelas || '-'} / {p.siswaId}</p>
                               </div>
                               <div className="shrink-0">
                                  {p.isSubmitted ? (
                                    <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider">Selesai</span>
                                  ) : (
                                    <span className="text-blue-700 bg-blue-50 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider">Aktif</span>
                                  )}
                               </div>
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-1">
                               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{Object.keys(p.answers || {}).length} Dijawab</span>
                               <Button 
                                  variant="outline" 
                                  size="sm" 
                                  disabled={p.isSubmitted}
                                  onClick={() => handleResetTimer(p.id, p.siswaName || 'Anonim')}
                                  className="h-8 px-3 border-orange-100 text-orange-500 hover:bg-orange-50 font-bold text-[10px] rounded-lg transition-all"
                                >
                                  <Clock className="w-3 h-3 mr-1.5" /> Reset Waktu
                               </Button>
                            </div>
                         </div>
                      ))
                    )}
                 </div>
               </div>
             )}
           </div>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
           <button 
             onClick={() => navigate('/guru/paket-soal')}
             className="w-full flex flex-col md:flex-row items-center gap-3.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white p-5 rounded-[20px] shadow-[0_12px_24px_rgba(37,99,235,0.2)] transition-all active:scale-[0.97]"
           >
              <div className="w-12 h-12 bg-white/10 rounded-[14px] flex items-center justify-center shrink-0">
                 <FileText className="w-6 h-6" />
              </div>
              <span className="text-sm font-extrabold tracking-tight leading-tight md:text-left">Manajemen<br className="md:hidden"/> Paket Soal</span>
           </button>

           <button 
             onClick={() => navigate('/guru/hasil')}
             className="w-full flex flex-col md:flex-row items-center gap-3.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white p-5 rounded-[20px] shadow-[0_12px_24px_rgba(37,99,235,0.2)] transition-all active:scale-[0.97]"
           >
              <div className="w-12 h-12 bg-white/10 rounded-[14px] flex items-center justify-center shrink-0">
                 <ScrollText className="w-6 h-6" />
              </div>
              <span className="text-sm font-extrabold tracking-tight leading-tight md:text-left">Laporan<br className="md:hidden"/> Hasil Ujian</span>
           </button>
        </div>
      </main>
    </div>

  );
}
