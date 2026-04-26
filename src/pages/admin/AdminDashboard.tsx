import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '../../store/auth.store';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, orderBy, increment } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { RefreshCcw, Search, Clock, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function AdminDashboard() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  
  const [ujianList, setUjianList] = useState<any[]>([]);
  const [selectedUjian, setSelectedUjian] = useState<string>('');
  const [pesertaList, setPesertaList] = useState<any[]>([]);
  const [searchPeserta, setSearchPeserta] = useState('');

  // 1. Fetch Ujian List
  useEffect(() => {
    const qUjian = query(collection(db, 'ujian'));
    const unsub = onSnapshot(qUjian, (snap) => {
      // In real scenario, filter by status == 'aktif'
      setUjianList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // 2. Fetch Peserta for Selected Ujian
  useEffect(() => {
    if (!selectedUjian) {
      setPesertaList([]);
      return;
    }
    // Assume collection `jawaban_siswa` tracks active sessions
    const qPeserta = query(collection(db, 'jawaban_siswa'));
    const unsub = onSnapshot(qPeserta, (snap) => {
      const allPeserta = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      // Filter manually here if we don't have composite indexes setup yet
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
        resetCounter: increment(1)
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
      <main className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-4 md:grid-rows-[100px_minmax(400px,1fr)] gap-5">
        
        {/* Stats Row */}
        <Card className="p-5 flex flex-col justify-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Siswa</p>
          <p className="text-2xl font-bold">1,248</p>
        </Card>
        <Card className="p-5 flex flex-col justify-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Ujian Aktif</p>
          <p className="text-2xl font-bold text-primary">{ujianList.length}</p>
        </Card>
        <Card className="p-5 flex flex-col justify-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Peserta Berlangsung</p>
          <p className="text-2xl font-bold">{pesertaList.length > 0 ? pesertaList.length : '--'}</p>
        </Card>
        <Card className="p-5 flex flex-col justify-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Server Latency</p>
          <p className="text-2xl font-bold text-[var(--success)]">24ms</p>
        </Card>

        {/* Real-time Monitoring Widget */}
        <Card className="p-0 md:col-span-3 flex flex-col overflow-hidden">
          {/* Header Monitoring */}
          <div className="px-5 py-4 border-b bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2 text-slate-800">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                Monitoring Real-time Peserta
              </h3>
              <span className="text-xs text-muted-foreground mt-1 block">Pantau aktivitas siswa dan kendalikan sesi ujian.</span>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              {ujianList.length === 0 ? (
                <span className="text-xs text-muted-foreground bg-white px-3 py-1.5 border rounded-md">Belum ada ujian di database</span>
              ) : (
                <Select value={selectedUjian} onValueChange={setSelectedUjian}>
                  <SelectTrigger className="w-full sm:w-[220px] bg-white">
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
              <div className="flex-1 py-12 flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-8 h-8" />
                </div>
                <p className="font-medium text-slate-800">Pilih Ujian Aktif</p>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">Silakan pilih ujian dari menu dropdown di atas untuk mulai melihat peserta yang sedang mengerjakannya.</p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="p-3 border-b flex gap-3 block">
                   <div className="relative flex-1 max-w-sm">
                      <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3"/>
                      <Input 
                        placeholder="Cari nama peserta..." 
                        className="pl-9" 
                        value={searchPeserta}
                        onChange={(e)=>setSearchPeserta(e.target.value)}
                      />
                   </div>
                   <Button variant="outline" className="flex items-center gap-2" onClick={()=>setSearchPeserta('')}>
                     Refresh
                   </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-0">
                  {filteredPeserta.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground border-t">
                      <p>Tidak ada peserta aktif pada ujian ini, atau belum dikerjakan.</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b sticky top-0 z-10">
                        <tr>
                          <th className="px-5 py-3">Nama Peserta</th>
                          <th className="px-5 py-3">Kelas / NIS</th>
                          <th className="px-5 py-3">Status / Jawaban</th>
                          <th className="px-5 py-3">Viols</th>
                          <th className="px-5 py-3 text-right">Aksi Darurat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredPeserta.map(p => {
                          const isFinished = p.isSubmitted;
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/50">
                              <td className="px-5 py-3 font-medium text-slate-800">{p.siswaName || 'Anonim'}</td>
                              <td className="px-5 py-3 text-muted-foreground">{p.siswaKelas || '-'} / {p.siswaId}</td>
                              <td className="px-5 py-3">
                                {isFinished ? (
                                  <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-bold">Selesai</span>
                                ) : (
                                  <span className="text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full text-xs font-bold">Mengerjakan</span>
                                )}
                                {!isFinished && <span className="ml-2 text-xs text-muted-foreground">({Object.keys(p.answers || {}).length} dijawab)</span>}
                              </td>
                              <td className="px-5 py-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${p.violations > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}`}>
                                  {p.violations || 0}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  disabled={isFinished}
                                  onClick={() => handleResetTimer(p.id, p.siswaName || 'Anonim')}
                                  className="h-8 border-orange-200 hover:border-orange-300 text-orange-600 hover:text-orange-700 hover:bg-orange-50 font-medium"
                                >
                                  <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Reset Timer
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Existing Small Widget Card */}
        <Card className="p-0 border-none bg-primary text-primary-foreground flex flex-col overflow-hidden relative">
          <div className="p-5 z-10 flex flex-col h-full">
            <h3 className="font-semibold mb-2 text-lg">Menu Cepat Administrasi</h3>
            <div className="flex-1 space-y-2 mt-4 text-sm">
                <div className="flex items-center gap-2 opacity-90 cursor-pointer hover:underline" onClick={() => navigate('/admin/ujian')}><span className="w-1.5 h-1.5 rounded-full bg-white"/> Manajemen Bank Soal / Ujian</div>
                <div className="flex items-center gap-2 opacity-90"><span className="w-1.5 h-1.5 rounded-full bg-white"/> Tambah Peserta Ujian</div>
                <div className="flex items-center gap-2 opacity-90 cursor-pointer hover:underline" onClick={() => navigate('/admin/hasil')}><span className="w-1.5 h-1.5 rounded-full bg-white"/> Laporan Hasil Akhir</div>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        </Card>

      </main>
    </div>
  );
}
