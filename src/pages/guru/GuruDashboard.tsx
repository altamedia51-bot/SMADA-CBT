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
    <div className="font-sans pb-8 relative">
      {/* Top Header Mobile Style (Sticks inside its container) */}
      <div className="bg-white border-b px-4 py-4 md:px-6 md:py-6 shadow-sm sticky top-0 z-20 flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Dashboard Guru</h1>
          <p className="text-sm text-slate-500 mt-1">Selamat datang, <span className="font-semibold text-slate-700">{profile?.displayName || 'Guru User'}</span></p>
        </div>
        
        {/* Dropdown Ujian in Header */}
        <div className="w-full md:w-64 max-w-full">
          <Select value={selectedUjian} onValueChange={setSelectedUjian}>
             <SelectTrigger className="w-full h-12 bg-slate-50 border-slate-200 rounded-xl focus:ring-blue-500 font-medium text-left">
                <SelectValue placeholder="Pilih Ujian Aktif..." />
             </SelectTrigger>
             <SelectContent>
                {ujianList.length === 0 ? (
                  <SelectItem value="none" disabled>Tidak ada ujian aktif</SelectItem>
                ) : (
                  ujianList.map(u => (
                    <SelectItem key={u.id} value={u.id} className="cursor-pointer">{u.title || u.id}</SelectItem>
                  ))
                )}
             </SelectContent>
          </Select>
        </div>
      </div>

      <main className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto md:max-w-full">
        
        {/* Statistics Grid (2x2 on Mobile, 4x1 on Desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 md:p-5 rounded-2xl shadow-sm border-slate-100 bg-white flex flex-col md:flex-row md:items-center gap-3 md:gap-4 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs text-slate-500 font-medium uppercase tracking-wide">Paket Soal</p>
              <p className="text-xl md:text-2xl font-bold text-slate-800 leading-tight mt-0.5">{paketSoalCount}</p>
            </div>
          </Card>
          
          <Card className="p-4 md:p-5 rounded-2xl shadow-sm border-slate-100 bg-white flex flex-col md:flex-row md:items-center gap-3 md:gap-4 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs text-slate-500 font-medium uppercase tracking-wide">Ujian Aktif</p>
              <p className="text-xl md:text-2xl font-bold text-slate-800 leading-tight mt-0.5">{ujianList.length}</p>
            </div>
          </Card>
          
          <Card className="p-4 md:p-5 rounded-2xl shadow-sm border-slate-100 bg-white flex flex-col md:flex-row md:items-center gap-3 md:gap-4 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs text-slate-500 font-medium uppercase tracking-wide">Peserta Aktif</p>
              <p className="text-xl md:text-2xl font-bold text-slate-800 leading-tight mt-0.5">{pesertaList.length > 0 ? pesertaList.length : '--'}</p>
            </div>
          </Card>
          
          <Card className="p-4 md:p-5 rounded-2xl shadow-sm border-slate-100 bg-white flex flex-col md:flex-row md:items-center gap-3 md:gap-4 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center shrink-0">
              <Server className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs text-slate-500 font-medium uppercase tracking-wide">Status Server</p>
              <p className="text-sm md:text-lg font-bold text-teal-600 leading-tight mt-1">Normal</p>
            </div>
          </Card>
        </div>

        {/* Quick Menu Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <Card 
             onClick={() => navigate('/guru/paket-soal')}
             className="p-5 md:p-6 rounded-2xl border-2 border-transparent bg-gradient-to-br from-blue-600 to-blue-700 hover:shadow-lg hover:shadow-blue-500/20 text-white cursor-pointer transition-all active:scale-[0.98] group flex items-center justify-between overflow-hidden relative"
           >
              <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                <FileText className="w-24 h-24" />
              </div>
              <div className="relative z-10 flex-1 pr-4">
                 <h3 className="text-lg md:text-xl font-bold mb-1">Manajemen Paket Soal</h3>
                 <p className="text-blue-100 text-sm font-medium opacity-90 line-clamp-2">Buat, edit, dan atur soal ujian</p>
              </div>
              <div className="relative z-10 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                 <FileText className="w-6 h-6" />
              </div>
           </Card>

           <Card 
             onClick={() => navigate('/guru/hasil')}
             className="p-5 md:p-6 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xl hover:shadow-slate-200 cursor-pointer transition-all active:scale-[0.98] group flex items-center justify-between overflow-hidden relative"
           >
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                <ScrollText className="w-24 h-24 text-slate-900" />
              </div>
              <div className="relative z-10 flex-1 pr-4">
                 <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-1">Laporan Hasil</h3>
                 <p className="text-slate-500 text-sm font-medium line-clamp-2">Buka nilai ujian dan analisis soal</p>
              </div>
              <div className="relative z-10 w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center shrink-0 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors">
                 <ScrollText className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
              </div>
           </Card>
        </div>

        {/* Real-time Monitoring Widget */}
        <Card className="rounded-2xl shadow-sm border-slate-200 overflow-hidden bg-white flex flex-col h-[500px] md:h-[600px]">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <div className="flex flex-col">
                <h3 className="font-bold flex items-center gap-2 text-slate-800 text-base">
                  <div className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </div>
                  Monitoring Peserta
                </h3>
                <span className="text-[11px] md:text-xs text-slate-500 mt-1">Pantau & kendalikan sesi ujian.</span>
             </div>
             
             <div className="flex w-full md:w-64 relative group">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"/>
                <Input 
                  placeholder="Cari peserta..." 
                  className="pl-9 h-11 md:h-10 text-sm rounded-xl w-full border-slate-200 bg-white" 
                  value={searchPeserta}
                  onChange={(e)=>setSearchPeserta(e.target.value)}
                />
             </div>
          </div>

          <div className="flex-1 overflow-auto bg-slate-50/30">
            {!selectedUjian ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 border border-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-4">
                  <Activity className="w-8 h-8 md:w-10 md:h-10" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Pilih Ujian Aktif</h3>
                <p className="text-slate-500 text-sm max-w-sm">Pilih jadwal ujian di bagian atas untuk mulai memantau peserta yang sedang mengerjakan soal.</p>
              </div>
            ) : filteredPeserta.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <h3 className="text-base font-semibold text-slate-700 mb-1">Peserta Kosong</h3>
                <p className="text-slate-500 text-sm">Belum ada peserta yang mendaftar atau ditemukan.</p>
              </div>
            ) : (
              <div className="p-0">
                {/* Mobile View: Render as Cards */}
                <div className="block md:hidden px-4 py-4 space-y-3">
                   {filteredPeserta.map(p => {
                      const isFinished = p.isSubmitted;
                      return (
                         <div key={p.id} className="bg-white border text-sm border-slate-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                            <div className="flex justify-between items-start gap-2">
                               <div className="flex-1 min-w-0">
                                 <h4 className="font-bold text-slate-800 truncate mb-0.5">{p.siswaName || 'Anonim'}</h4>
                                 <p className="text-[11px] text-slate-500 truncate">{p.siswaKelas || '-'} / {p.siswaId}</p>
                               </div>
                               <div className="shrink-0">
                                  {isFinished ? (
                                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">Selesai</span>
                                  ) : (
                                    <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">Mengerjakan</span>
                                  )}
                               </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 gap-y-2 mt-1">
                               <div className="flex items-center gap-2">
                                  {!isFinished && <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">{Object.keys(p.answers || {}).length} Dijawab</span>}
                                  {p.violations > 0 && <span className="bg-rose-50 border border-rose-100 text-rose-600 px-2.5 py-1 rounded-md text-[11px] font-bold shrink-0">{p.violations} Plg.</span>}
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
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b sticky top-0 z-10">
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
                            <td className="px-6 py-4 font-semibold text-slate-800">
                              {p.siswaName || 'Anonim'}
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-medium">{p.siswaKelas || '-'} / {p.siswaId}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {isFinished ? (
                                  <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide">Selesai</span>
                                ) : (
                                  <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide">Mengerjakan</span>
                                )}
                                {!isFinished && <span className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-md px-2 py-1 bg-slate-50">{Object.keys(p.answers || {}).length} dijawab</span>}
                                {p.violations > 0 && <span className="bg-rose-50 border border-rose-100 text-rose-600 px-2.5 py-1 rounded-md text-xs font-bold">{p.violations} peringatan</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={isFinished}
                                onClick={() => handleResetTimer(p.id, p.siswaName || 'Anonim')}
                                className="h-9 px-4 border-orange-200 hover:border-orange-300 text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-semibold text-xs rounded-lg transition-colors"
                              >
                                <Clock className="w-3.5 h-3.5 mr-2" /> Reset Timer
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
      </main>
    </div>
  );
}
