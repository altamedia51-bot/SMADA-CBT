import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '../../store/auth.store';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { RefreshCcw, Search, Clock, Users, FileText, Activity, Server, ScrollText } from 'lucide-react';
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
    <div className="font-sans pb-8 relative bg-slate-50 min-h-screen">
      {/* HEADER MOBILE & DESKTOP */}
      <div className="bg-white border-b px-4 py-4 md:px-6 shadow-sm sticky top-0 z-20 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Users className="w-5 h-5"/>
             </div>
             <div>
                <h1 className="text-lg md:text-2xl font-extrabold text-slate-800 tracking-tight">Dashboard</h1>
                <p className="text-xs text-slate-500 md:hidden">Mobile View</p>
             </div>
          </div>
          <div className="w-9 h-9 border border-slate-200 rounded-full flex items-center justify-center text-slate-400 bg-slate-50">
             <Server className="w-4 h-4" /> {/* Or Bell icon */}
          </div>
        </div>

        {/* Dropdown Ujian in Header */}
        <div className="w-full">
          <Select value={selectedUjian} onValueChange={setSelectedUjian}>
             <SelectTrigger className="w-full h-11 bg-white border-slate-200 rounded-xl focus:ring-blue-500 font-semibold text-slate-700 shadow-sm">
                <SelectValue placeholder="Pilih Ujian Aktif..." />
             </SelectTrigger>
             <SelectContent rounded-2xl>
                {ujianList.length === 0 ? (
                  <SelectItem value="none" disabled>Tidak ada ujian aktif</SelectItem>
                ) : (
                  ujianList.map(u => (
                    <SelectItem key={u.id} value={u.id} className="cursor-pointer font-medium">{u.title || u.id}</SelectItem>
                  ))
                )}
             </SelectContent>
          </Select>
        </div>
      </div>

      <main className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        
        {/* Statistics Grid (2x2 on Mobile, 4x1 on Desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card className="p-4 md:p-5 rounded-[16px] shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border-slate-100 bg-white hover:shadow-md transition-shadow">
            <div className="flex flex-col h-full justify-between gap-2">
              <p className="text-[11px] md:text-sm text-slate-500 font-medium tracking-wide">Paket Soal</p>
              <p className="text-2xl md:text-3xl font-extrabold text-slate-800 leading-none">{paketSoalCount}</p>
            </div>
          </Card>
          
          <Card className="p-4 md:p-5 rounded-[16px] shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border-slate-100 bg-white hover:shadow-md transition-shadow">
            <div className="flex flex-col h-full justify-between gap-2">
              <p className="text-[11px] md:text-sm text-slate-500 font-medium tracking-wide">Ujian Aktif</p>
              <p className="text-2xl md:text-3xl font-extrabold text-teal-600 leading-none">{ujianList.length}</p>
            </div>
          </Card>
          
          <Card className="p-4 md:p-5 rounded-[16px] shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border-slate-100 bg-white hover:shadow-md transition-shadow">
            <div className="flex flex-col h-full justify-between gap-2">
              <p className="text-[11px] md:text-sm text-slate-500 font-medium tracking-wide">Peserta Aktif</p>
              <p className="text-2xl md:text-3xl font-extrabold text-slate-800 leading-none">{pesertaList.length > 0 ? pesertaList.length : '--'}</p>
            </div>
          </Card>
          
          <Card className="p-4 md:p-5 rounded-[16px] shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border-slate-100 bg-white hover:shadow-md transition-shadow">
            <div className="flex flex-col h-full justify-between gap-2">
              <p className="text-[11px] md:text-sm text-slate-500 font-medium tracking-wide">Status Server</p>
              <p className="text-sm md:text-lg font-bold text-emerald-500 leading-none mt-1">Normal</p>
            </div>
          </Card>
        </div>

        {/* Monitoring Widget & Quick Menus Wrapper */}
        <div className="flex flex-col gap-6">
           
           {/* Real-time Monitoring Widget */}
           <Card className="rounded-[16px] shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] border-slate-100 bg-white flex flex-col h-[400px] md:h-[500px]">
             <div className="px-5 py-4 flex flex-col gap-1">
                <h3 className="font-bold flex items-center gap-2 text-slate-800 text-sm md:text-base">
                  <div className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </div>
                  Monitoring Real-time
                </h3>
                <p className="text-[11px] md:text-xs text-slate-400 leading-relaxed max-w-sm">
                  Pilih ujian dari menu di atas untuk mulai melihat peserta.
                </p>
             </div>

             <div className="flex-1 overflow-auto bg-slate-50/50 rounded-b-[16px]">
               {!selectedUjian ? (
                 <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                   <div className="w-16 h-16 bg-blue-50/50 text-blue-400 rounded-full flex items-center justify-center mb-3">
                     <Users className="w-8 h-8" />
                   </div>
                   <h3 className="text-sm font-bold text-slate-700 mb-1">Pilih Ujian Aktif</h3>
                   <p className="text-slate-400 text-[11px] max-w-[200px] mx-auto leading-relaxed">Pilih ujian dari menu di atas untuk lihat peserta.</p>
                 </div>
               ) : filteredPeserta.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                   <div className="w-14 h-14 bg-slate-100/50 text-slate-300 rounded-full flex items-center justify-center mb-3">
                     <Users className="w-6 h-6" />
                   </div>
                   <h3 className="text-sm font-semibold text-slate-600 mb-1">Peserta Kosong</h3>
                   <p className="text-slate-400 text-[11px]">Belum ada peserta yang mendaftar atau ditemukan.</p>
                 </div>
               ) : (
                 <div className="p-0">
                   {/* Mobile View: Render as Cards */}
                   <div className="block md:hidden px-4 py-4 space-y-3">
                      {filteredPeserta.map(p => {
                         const isFinished = p.isSubmitted;
                         return (
                            <div key={p.id} className="bg-white border text-sm border-slate-100 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                               <div className="flex justify-between items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-800 truncate mb-0.5">{p.siswaName || 'Anonim'}</h4>
                                    <p className="text-[11px] text-slate-500 truncate">{p.siswaKelas || '-'} / {p.siswaId}</p>
                                  </div>
                                  <div className="shrink-0">
                                     {isFinished ? (
                                       <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">Selesai</span>
                                     ) : (
                                       <span className="text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">Mengerjakan</span>
                                     )}
                                  </div>
                               </div>
                               
                               <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 gap-y-2 mt-1">
                                  <div className="flex items-center gap-2">
                                     {!isFinished && <span className="text-[11px] font-semibold text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-100">{Object.keys(p.answers || {}).length} Dijawab</span>}
                                     {p.violations > 0 && <span className="bg-rose-50 border border-rose-100 text-rose-600 px-2 py-1 rounded text-[11px] font-bold shrink-0">{p.violations} Plg.</span>}
                                  </div>
                                  <Button 
                                     variant="outline" 
                                     size="sm" 
                                     disabled={isFinished}
                                     onClick={() => handleResetTimer(p.id, p.siswaName || 'Anonim')}
                                     className="h-8 md:h-9 px-3 border-orange-200 text-orange-600 hover:text-orange-700 hover:bg-orange-50 hover:border-orange-300 font-semibold text-[11px] sm:text-xs rounded-lg active:scale-95 transition-all"
                                   >
                                     <Clock className="w-3.5 h-3.5 mr-1.5" /> <span className="">Reset Waktu</span>
                                  </Button>
                               </div>
                            </div>
                         )
                      })}
                   </div>

                   {/* Desktop View: Render as Table */}
                   <div className="hidden md:block w-full">
                     <table className="w-full text-sm text-left">
                       <thead className="bg-white text-slate-500 font-semibold border-b sticky top-0 z-10 text-xs uppercase tracking-wider">
                         <tr>
                           <th className="px-6 py-4">Nama Peserta</th>
                           <th className="px-6 py-4">Kelas / NIS</th>
                           <th className="px-6 py-4">Status & Progres</th>
                           <th className="px-6 py-4 text-right">Aksi Timer</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y relative">
                         {filteredPeserta.map(p => {
                           const isFinished = p.isSubmitted;
                           return (
                             <tr key={p.id} className="hover:bg-slate-50/80 transition-colors bg-white">
                               <td className="px-6 py-4 font-bold text-slate-800">
                                 {p.siswaName || 'Anonim'}
                               </td>
                               <td className="px-6 py-4 text-slate-500 font-medium text-xs">{p.siswaKelas || '-'} / {p.siswaId}</td>
                               <td className="px-6 py-4">
                                 <div className="flex items-center gap-2">
                                   {isFinished ? (
                                     <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Selesai</span>
                                   ) : (
                                     <span className="text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Mengerjakan</span>
                                   )}
                                   {!isFinished && <span className="text-[11px] font-semibold text-slate-600 border border-slate-100 rounded px-2 py-1 bg-slate-50">{Object.keys(p.answers || {}).length} dijawab</span>}
                                   {p.violations > 0 && <span className="bg-rose-50 border border-rose-100 text-rose-600 px-2 py-1 rounded text-[11px] font-bold">{p.violations} Plg</span>}
                                 </div>
                               </td>
                               <td className="px-6 py-4 text-right">
                                 <Button 
                                   variant="outline" 
                                   size="sm" 
                                   disabled={isFinished}
                                   onClick={() => handleResetTimer(p.id, p.siswaName || 'Anonim')}
                                   className="h-8 px-3 border-orange-200 hover:border-orange-300 text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-semibold text-[11px] rounded-lg transition-colors"
                                 >
                                   <Clock className="w-3.5 h-3.5 mr-1.5" /> Reset Timer
                                 </Button>
                               </td>
                             </tr>
                           );
                         })}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}
             </div>
           </Card>

           {/* Quick Menu Cards */}
           <div className="grid grid-cols-2 gap-3 md:gap-4">
              <button 
                onClick={() => navigate('/guru/paket-soal')}
                className="w-full text-left p-4 rounded-[16px] bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] transition-all active:scale-95 flex flex-col md:flex-row items-start md:items-center gap-3 overflow-hidden"
              >
                 <div className="w-10 h-10 bg-white/20 rounded-[10px] flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-white" />
                 </div>
                 <div className="flex-1">
                    <h3 className="text-xs md:text-sm font-bold leading-tight line-clamp-2 md:line-clamp-1">Manajemen<br className="md:hidden"/> Paket Soal</h3>
                 </div>
              </button>

              <button 
                onClick={() => navigate('/guru/hasil')}
                className="w-full text-left p-4 rounded-[16px] bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] transition-all active:scale-95 flex flex-col md:flex-row items-start md:items-center gap-3 overflow-hidden"
              >
                 <div className="w-10 h-10 bg-white/20 rounded-[10px] flex items-center justify-center shrink-0">
                    <ScrollText className="w-5 h-5 text-white" />
                 </div>
                 <div className="flex-1">
                    <h3 className="text-xs md:text-sm font-bold leading-tight line-clamp-2 md:line-clamp-1">Laporan<br className="md:hidden"/> Hasil Ujian</h3>
                 </div>
              </button>
           </div>

        </div>
      </main>
    </div>
  );
}
