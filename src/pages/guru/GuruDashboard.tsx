import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '../../store/auth.store';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { RefreshCcw, Search, Clock, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function GuruDashboard() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  
  const [ujianList, setUjianList] = useState<any[]>([]);
  const [selectedUjian, setSelectedUjian] = useState<string>('');
  const [pesertaList, setPesertaList] = useState<any[]>([]);
  const [searchPeserta, setSearchPeserta] = useState('');
  
  const [paketSoalCount, setPaketSoalCount] = useState(0);

  // 1. Fetch Ujian List
  useEffect(() => {
    const qUjian = query(collection(db, 'ujian'));
    const unsub = onSnapshot(qUjian, (snap) => {
      setUjianList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // 2. Fetch Paket Soal Count
  useEffect(() => {
    if (!profile?.uid) return;
    // Assuming we want all paket soal for now, but usually they'd be filtered by author if we stored guru ID
    const qPaket = query(collection(db, 'paket_soal'));
    const unsub = onSnapshot(qPaket, (snap) => {
      setPaketSoalCount(snap.docs.length);
    });
    return () => unsub();
  }, [profile?.uid]);

  // 3. Fetch Peserta for Selected Ujian
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
    <div className="font-sans">
      {/* Dashboard Grid Layout */}
      <main className="p-4 sm:p-6 md:p-8 grid grid-cols-2 md:grid-cols-4 md:grid-rows-[100px_minmax(400px,1fr)] gap-4 sm:gap-5">
        
        {/* Stats Row */}
        <Card className="p-4 sm:p-5 flex flex-col justify-center">
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">Paket Soal Anda</p>
          <p className="text-xl sm:text-2xl font-bold">{paketSoalCount}</p>
        </Card>
        <Card className="p-4 sm:p-5 flex flex-col justify-center">
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">Ujian Aktif</p>
          <p className="text-xl sm:text-2xl font-bold text-primary">{ujianList.length}</p>
        </Card>
        <Card className="p-4 sm:p-5 flex flex-col justify-center">
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">Peserta Aktif</p>
          <p className="text-xl sm:text-2xl font-bold">{pesertaList.length > 0 ? pesertaList.length : '--'}</p>
        </Card>
        <Card className="p-4 sm:p-5 flex flex-col justify-center">
          <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1">Status Server</p>
          <p className="text-xl sm:text-2xl font-bold text-[var(--success)]">Normal</p>
        </Card>

        {/* Real-time Monitoring Widget */}
        <Card className="p-0 col-span-2 md:col-span-3 flex flex-col overflow-hidden">
          {/* Header Monitoring */}
          <div className="px-4 sm:px-5 py-4 border-b bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2 text-slate-800 text-sm sm:text-base">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                Monitoring Real-time
              </h3>
              <span className="text-[11px] sm:text-xs text-muted-foreground mt-1 block">Pantau aktivitas siswa & kendalikan sesi ujian.</span>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              {ujianList.length === 0 ? (
                <span className="text-[11px] sm:text-xs text-muted-foreground bg-white px-3 py-1.5 border rounded-md w-full text-center md:w-auto">Belum ada ujian</span>
              ) : (
                <Select value={selectedUjian} onValueChange={setSelectedUjian}>
                  <SelectTrigger className="w-full md:w-[220px] bg-white rounded-lg">
                    <SelectValue placeholder="Pilih Ujian Aktif..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ujianList.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.title || u.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* List Peserta */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            {!selectedUjian ? (
              <div className="flex-1 py-12 flex flex-col items-center justify-center text-center px-4">
                <div className="h-12 w-12 sm:h-16 sm:w-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <p className="font-medium text-slate-800 text-sm sm:text-base">Pilih Ujian Aktif</p>
                <p className="text-[11px] sm:text-sm text-slate-500 mt-1 max-w-sm">Pilih ujian dari menu di atas untuk mulai melihat peserta.</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="p-3 border-b flex flex-row gap-2">
                   <div className="relative flex-1">
                      <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5"/>
                      <Input 
                        placeholder="Cari peserta..." 
                        className="pl-9 h-9 text-sm rounded-lg" 
                        value={searchPeserta}
                        onChange={(e)=>setSearchPeserta(e.target.value)}
                      />
                   </div>
                   <Button variant="outline" className="h-9 px-3 shrink-0 rounded-lg text-xs sm:text-sm" onClick={()=>setSearchPeserta('')}>
                     <RefreshCcw className="w-3.5 h-3.5 sm:hidden" />
                     <span className="hidden sm:inline">Refresh</span>
                   </Button>
                </div>
                
                <div className="flex-1 overflow-auto p-0">
                  {filteredPeserta.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm border-t">
                      <p>Tidak ada peserta aktif.</p>
                    </div>
                  ) : (
                    <div className="w-full">
                      <table className="w-full text-[13px] sm:text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b sticky top-0 z-10 whitespace-nowrap">
                          <tr>
                            <th className="px-4 py-3">Nama Peserta</th>
                            <th className="px-4 py-3 hidden sm:table-cell">Kelas / NIS</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y relative">
                          {filteredPeserta.map(p => {
                            const isFinished = p.isSubmitted;
                            return (
                              <tr key={p.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-2 sm:py-3 font-medium text-slate-800 whitespace-nowrap">
                                  {p.siswaName || 'Anonim'}
                                  <div className="sm:hidden text-xs text-slate-500 font-normal mt-0.5">{p.siswaKelas || '-'} / {p.siswaId}</div>
                                </td>
                                <td className="px-4 py-2 sm:py-3 text-muted-foreground hidden sm:table-cell whitespace-nowrap">{p.siswaKelas || '-'} / {p.siswaId}</td>
                                <td className="px-4 py-2 sm:py-3 whitespace-nowrap">
                                  {isFinished ? (
                                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold inline-block">Selesai</span>
                                  ) : (
                                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[10px] sm:text-xs font-bold inline-block">Mengerjakan</span>
                                  )}
                                  <div className="mt-1 flex items-center gap-1">
                                    {!isFinished && <span className="text-[10px] sm:text-xs text-muted-foreground">{Object.keys(p.answers || {}).length} dijawab</span>}
                                    {p.violations > 0 && <span className="bg-rose-100 text-rose-700 px-1 py-0.5 rounded text-[10px] font-bold shrink-0">{p.violations} v</span>}
                                  </div>
                                </td>
                                <td className="px-4 py-2 sm:py-3 text-right">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    disabled={isFinished}
                                    onClick={() => handleResetTimer(p.id, p.siswaName || 'Anonim')}
                                    className="h-7 px-2 border-orange-200 hover:border-orange-300 text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-medium text-[10px] sm:text-xs whitespace-nowrap rounded-md"
                                  >
                                    <RefreshCcw className="w-3 h-3 sm:mr-1.5" /> <span className="hidden sm:inline">Reset Timer</span>
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Existing Small Widget Card */}
        <Card className="p-0 border-none bg-primary text-primary-foreground flex flex-col overflow-hidden relative">
          <div className="p-5 z-10 flex flex-col h-full">
            <h3 className="font-semibold mb-2 text-lg">Menu Cepat Guru</h3>
            <div className="flex-1 space-y-2 mt-4 text-sm">
                <div className="flex items-center gap-2 opacity-90 cursor-pointer hover:underline" onClick={() => navigate('/guru/paket-soal')}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white"/> Manajemen Paket Soal
                </div>
                <div className="flex items-center gap-2 opacity-90 cursor-pointer hover:underline" onClick={() => navigate('/guru/hasil')}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white"/> Laporan Hasil Ujian
                </div>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        </Card>

      </main>
    </div>
  );
}

