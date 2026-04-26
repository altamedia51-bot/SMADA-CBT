import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '../../store/auth.store';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { RefreshCcw, Clock, Users, FileText, Activity, ScrollText, LogOut, User } from 'lucide-react';

export default function GuruDashboard() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  
  const [ujianList, setUjianList] = useState<any[]>([]);
  const [selectedUjian, setSelectedUjian] = useState<string>('');
  const [pesertaList, setPesertaList] = useState<any[]>([]);
  const [userMap, setUserMap] = useState<Record<string, any>>({});
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
    const qUsers = query(collection(db, 'users'));
    const unsub = onSnapshot(qUsers, (snap) => {
      const users: Record<string, any> = {};
      snap.docs.forEach(d => {
        users[d.id] = d.data();
      });
      setUserMap(users);
    });
    return () => unsub();
  }, []);

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
        resetCounter: (pesertaId as any).resetCounter ? (pesertaId as any).resetCounter + 1 : 1
      });
      toast.success(`Timer ${siswaName} berhasil di-reset.`);
    } catch (err: any) {
      toast.error('Gagal reset timer: ' + err.message);
    }
  };

  const filteredPeserta = pesertaList.map(p => {
    const uProfile = userMap[p.siswaId] || {};
    return {
      ...p,
      siswaName: p.siswaName && p.siswaName !== 'Unknown' ? p.siswaName : (uProfile.displayName || p.siswaName || 'Anonim'),
      siswaKelas: p.siswaKelas && p.siswaKelas !== 'Unknown' ? p.siswaKelas : (uProfile.kelas || uProfile.tingkat || p.siswaKelas || '-')
    };
  }).filter(p => {
    const name = p.siswaName || p.id;
    return name.toLowerCase().includes(searchPeserta.toLowerCase());
  });

  return (
    <div className="font-sans pb-24 relative bg-[#F8FAFC] min-h-screen">
      {/* HEADER */}
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
           <div className="px-6 py-5 flex flex-col gap-1.5 border-b border-slate-50">
              <h3 className="font-bold flex items-center gap-2.5 text-[#1E293B] text-base md:text-lg">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Monitoring Real-time
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs font-medium">
                Pantau aktivitas peserta ujian secara langsung.
              </p>
           </div>

           <div className="flex-1 bg-white flex flex-col">
             {!selectedUjian ? (
               <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
                 <div className="w-16 h-16 bg-[#EFF6FF] text-[#2563EB] rounded-full flex items-center justify-center mb-4 shadow-inner">
                   <Users className="w-7 h-7" />
                 </div>
                 <h3 className="text-sm font-extrabold text-[#1E293B] mb-2 tracking-tight">Pilih Ujian Aktif</h3>
                 <p className="text-slate-400 text-[11px] font-medium leading-relaxed max-w-[180px] mx-auto">Pilih ujian dari menu di bawah ini untuk mulai memantau peserta.</p>
                 
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
               <div className="p-0 flex-1 flex flex-col">
                 <div className="p-4 border-b border-slate-50 bg-slate-50/30">
                    <Select value={selectedUjian} onValueChange={setSelectedUjian}>
                       <SelectTrigger className="w-full h-10 bg-white border-slate-200 rounded-lg focus:ring-blue-500 font-bold text-xs text-slate-600 shadow-sm">
                          <SelectValue placeholder="Ganti Ujian..." />
                       </SelectTrigger>
                       <SelectContent rounded-xl>
                          {ujianList.map(u => (
                            <SelectItem key={u.id} value={u.id} className="cursor-pointer font-bold text-xs">{u.title || u.id}</SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                 </div>

                 {/* Mobile View */}
                 <div className="block md:hidden p-4 space-y-3">
                    {filteredPeserta.length === 0 ? (
                      <div className="py-20 text-center flex flex-col items-center">
                        <Activity className="w-10 h-10 text-slate-200 mb-2" />
                        <p className="text-xs text-slate-400 font-bold tracking-tight">Belum ada peserta...</p>
                      </div>
                    ) : (
                      filteredPeserta.map(p => (
                        <div key={p.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div>
                               <h4 className="font-bold text-slate-800 text-sm">{p.siswaName}</h4>
                               <p className="text-[10px] text-slate-400 font-bold tracking-wider">{p.siswaKelas} | {p.siswaId}</p>
                            </div>
                            {p.isSubmitted ? (
                              <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Selesai</span>
                            ) : (
                              <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded animate-pulse">Aktif</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                             <span className="text-[10px] font-bold text-slate-400">{Object.keys(p.answers || {}).length} Dijawab</span>
                             <Button size="sm" variant="ghost" className="h-7 text-[10px] text-orange-500 font-bold" onClick={() => handleResetTimer(p.id, p.siswaName)}>
                                Reset Waktu
                             </Button>
                          </div>
                        </div>
                      ))
                    )}
                 </div>

                 {/* Desktop View */}
                 <div className="hidden md:block flex-1 overflow-auto">
                    <table className="w-full text-sm text-left border-collapse">
                       <thead className="sticky top-0 bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100">
                          <tr>
                             <th className="px-6 py-4">Peserta & Kelas</th>
                             <th className="px-6 py-4 text-center">Progress</th>
                             <th className="px-6 py-4 text-center">Status</th>
                             <th className="px-8 py-4 text-right">Aksi</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                          {filteredPeserta.length === 0 ? (
                            <tr>
                               <td colSpan={4} className="py-20 text-center text-slate-300 italic">Tidak ada peserta ditemukan</td>
                            </tr>
                          ) : (
                            filteredPeserta.map(p => (
                              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                 <td className="px-6 py-4">
                                    <div className="font-bold text-slate-700">{p.siswaName}</div>
                                    <div className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">{p.siswaKelas} | <span className="font-mono">{p.siswaId}</span></div>
                                 </td>
                                 <td className="px-6 py-4">
                                    <div className="flex flex-col items-center gap-1">
                                       <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                          <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (Object.keys(p.answers || {}).length / 40) * 100)}%` }} />
                                       </div>
                                       <span className="text-[9px] font-bold text-slate-400">{Object.keys(p.answers || {}).length} Dijawab</span>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                    {p.isSubmitted ? (
                                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md uppercase">Selesai</span>
                                    ) : (
                                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase border border-blue-100 animate-pulse">Menjawab</span>
                                    )}
                                 </td>
                                 <td className="px-8 py-4 text-right">
                                    <Button variant="outline" size="sm" className="h-8 border-orange-100 text-orange-500 rounded-lg text-[10px] font-bold hover:bg-orange-50" onClick={() => handleResetTimer(p.id, p.siswaName)}>
                                       <Clock className="w-3 h-3 mr-1.5" /> Reset Timer
                                    </Button>
                                 </td>
                              </tr>
                            ))
                          )}
                       </tbody>
                    </table>
                 </div>
               </div>
             )}
           </div>
        </Card>

        {/* Quick Menu Buttons */}
        <div className="grid grid-cols-2 gap-4">
           <button 
             onClick={() => navigate('/guru/paket-soal')}
             className="flex flex-col md:flex-row items-center gap-4 bg-white hover:bg-slate-50 p-6 rounded-[24px] shadow-sm border border-slate-100 transition-all active:scale-95 text-left group"
           >
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                 <FileText className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-sm font-black text-slate-800 tracking-tight leading-tight uppercase">Paket Soal</p>
                 <p className="text-[10px] text-slate-400 font-bold mt-0.5 hidden md:block">Kelola materi ujian</p>
              </div>
           </button>

           <button 
             onClick={() => navigate('/guru/hasil')}
             className="flex flex-col md:flex-row items-center gap-4 bg-white hover:bg-slate-50 p-6 rounded-[24px] shadow-sm border border-slate-100 transition-all active:scale-95 text-left group"
           >
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                 <ScrollText className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-sm font-black text-slate-800 tracking-tight leading-tight uppercase">Hasil Ujian</p>
                 <p className="text-[10px] text-slate-400 font-bold mt-0.5 hidden md:block">Lihat nilai siswa</p>
              </div>
           </button>
        </div>
      </main>
    </div>
  );
}
