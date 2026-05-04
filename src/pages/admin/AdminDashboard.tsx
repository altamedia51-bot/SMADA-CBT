import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '../../store/auth.store';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, orderBy, increment, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { RefreshCcw, Search, Clock, Users, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function AdminDashboard() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  
  const [ujianList, setUjianList] = useState<any[]>([]);
  const [selectedUjian, setSelectedUjian] = useState<string>('');
  const [pesertaList, setPesertaList] = useState<any[]>([]);
  const [searchPeserta, setSearchPeserta] = useState('');
  const [totalSiswa, setTotalSiswa] = useState(0);
  const [siswaPerTingkat, setSiswaPerTingkat] = useState({ 10: 0, 11: 0, 12: 0 });
  const [totalGuru, setTotalGuru] = useState(0);
  const [totalJurusan, setTotalJurusan] = useState(0);
  const [showPanduan, setShowPanduan] = useState(false);

  // 1. Fetch Ujian List
  useEffect(() => {
    const qUjian = query(collection(db, 'ujian'));
    const unsub = onSnapshot(qUjian, (snap) => {
      setUjianList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Fetch Kelas to map name -> tingkat
  const [kelasMap, setKelasMap] = useState<Record<string, number>>({});
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'kelas'), (snap) => {
      const map: Record<string, number> = {};
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.name && data.tingkat) {
           map[data.name] = data.tingkat;
        }
      });
      setKelasMap(map);
    });
    return () => unsub();
  }, []);

  // Fetch Total Siswa, Guru, Jurusan
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      let siswaCount = 0;
      let guruCount = 0;
      let tingkatCount = { 10: 0, 11: 0, 12: 0 };
      const jurusans = new Set<string>();

      snap.docs.forEach(doc => {
         const data = doc.data();
         if (data.role === 'siswa') {
            siswaCount++;
            if (data.jurusan && data.jurusan !== 'Semua') {
               jurusans.add(data.jurusan);
            }
            // Count by tingkat
            const tingkat = kelasMap[data.kelas] || 0;
            if (tingkat === 10) tingkatCount[10]++;
            else if (tingkat === 11) tingkatCount[11]++;
            else if (tingkat === 12) tingkatCount[12]++;
         } else if (data.role === 'guru' || data.role === 'karyawan' || data.role === 'admin') {
            // Count everyone else as staff for this metric, or just guru
            if (data.role !== 'siswa') guruCount++;
         }
      });

      setTotalSiswa(siswaCount);
      setSiswaPerTingkat(tingkatCount);
      setTotalGuru(guruCount);
      setTotalJurusan(jurusans.size);
    });
    return () => unsub();
  }, [kelasMap]);

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
      <main className="p-6 md:p-8 flex flex-col gap-5">
        
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           <Card className="p-5 flex flex-col justify-center border-l-4 border-l-blue-500 shadow-sm relative overflow-hidden">
             <div className="z-10">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">Total Siswa Aktif</p>
                <div className="flex items-baseline gap-2">
                   <p className="text-3xl font-black text-slate-800">{totalSiswa}</p>
                   <span className="text-xs font-semibold text-slate-400">Siswa</span>
                </div>
                <div className="mt-3 flex gap-2 text-[10px] sm:text-xs">
                   <div className="bg-slate-100 px-2 py-1 rounded font-semibold text-slate-600">X: {siswaPerTingkat[10]}</div>
                   <div className="bg-slate-100 px-2 py-1 rounded font-semibold text-slate-600">XI: {siswaPerTingkat[11]}</div>
                   <div className="bg-slate-100 px-2 py-1 rounded font-semibold text-slate-600">XII: {siswaPerTingkat[12]}</div>
                </div>
             </div>
             <Users className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-blue-50 opacity-50 pointer-events-none" />
           </Card>

           <Card className="p-5 flex flex-col justify-center border-l-4 border-l-emerald-500 shadow-sm relative overflow-hidden">
             <div className="z-10">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">Ujian Aktif & Berlangsung</p>
                <div className="flex items-baseline gap-2">
                   <p className="text-3xl font-black text-emerald-600">{ujianList.length}</p>
                   <span className="text-xs font-semibold text-slate-400">Ujian Berjalan</span>
                </div>
                <div className="mt-3 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded text-xs w-fit font-bold shadow-sm">
                   {pesertaList.length > 0 ? pesertaList.length : '0'} Peserta Mengerjakan
                </div>
             </div>
             <Clock className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-emerald-50 opacity-50 pointer-events-none" />
           </Card>

           <Card className="p-5 flex flex-col justify-center border-l-4 border-l-amber-500 shadow-sm relative overflow-hidden">
             <div className="z-10">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">Total Jurusan</p>
                <div className="flex items-baseline gap-2">
                   <p className="text-3xl font-black text-slate-800">{totalJurusan}</p>
                   <span className="text-xs font-semibold text-slate-400">Program Keahlian</span>
                </div>
                <p className="mt-3 text-xs text-slate-500 font-medium">Data jurusan diambil dari seluruh pengguna siswa aktif.</p>
             </div>
             <AlertTriangle className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-amber-50 opacity-50 pointer-events-none" />
           </Card>

           <Card className="p-5 flex flex-col justify-center border-l-4 border-l-indigo-500 shadow-sm relative overflow-hidden">
             <div className="z-10">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">Guru & Karyawan</p>
                <div className="flex items-baseline gap-2">
                   <p className="text-3xl font-black text-slate-800">{totalGuru}</p>
                   <span className="text-xs font-semibold text-slate-400">Pegawai Aktif</span>
                </div>
                <p className="mt-3 text-xs text-slate-500 font-medium">Termasuk Tenaga Pendidik dan Kependidikan.</p>
             </div>
             <Users className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-indigo-50 opacity-50 pointer-events-none" />
           </Card>
        </div>

        {/* Action Bar & Guide Toggle */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
           <div className="flex flex-wrap gap-2 text-sm text-slate-600 font-medium font-mono">
              <span className="bg-slate-100 px-3 py-1 rounded-md border border-slate-200">Server Status: <span className="text-emerald-500 font-bold ml-1">Normal</span></span>
              <span className="bg-slate-100 px-3 py-1 rounded-md border border-slate-200">Latency: <span className="text-emerald-500 font-bold ml-1">~24ms</span></span>
           </div>
           <Button onClick={() => setShowPanduan(!showPanduan)} variant={showPanduan ? "default" : "outline"} className="w-full sm:w-auto shadow-sm font-bold tracking-tight">
              {showPanduan ? 'Sembunyikan Panduan CBT' : 'Tampilkan Panduan CBT'}
           </Button>
        </div>

        {/* Panduan Sistem */}
        {showPanduan && (
           <Card className="p-6 bg-gradient-to-br from-indigo-900 to-blue-900 text-white shadow-xl shadow-indigo-900/20 border-0 rounded-2xl overflow-hidden relative">
             <div className="relative z-10">
                <h3 className="text-2xl font-black mb-2 tracking-tight">Panduan CBT</h3>
                <p className="text-indigo-100 mb-6 text-sm max-w-3xl">Berikut langkah-langkah dasar untuk mengelola sistem ujian CBT (Computer Based Test) secara efektif.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   <div className="bg-white/10 p-5 rounded-xl border border-white/10 backdrop-blur-sm">
                      <h4 className="font-bold text-amber-300 mb-2 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-300 text-xs text-center border border-amber-400/30">1</span> Siapkan Data Master</h4>
                      <p className="text-xs leading-relaxed text-indigo-50 opacity-90">
                         Pastikan Master Data (Mata Pelajaran, Kelas, dan Sesi) sudah disiapkan. Kemudian import data Siswa dan Guru melalui menu Master Data menggunakan file template CSV yang disediakan.
                      </p>
                   </div>
                   <div className="bg-white/10 p-5 rounded-xl border border-white/10 backdrop-blur-sm">
                      <h4 className="font-bold text-emerald-300 mb-2 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-300 text-xs text-center border border-emerald-400/30">2</span> Buat Bank Soal</h4>
                      <p className="text-xs leading-relaxed text-indigo-50 opacity-90">
                         Masuk ke menu Bank Soal. Buat Bank Soal baru dan tambahkan soal secara manual atau import dari Word/Excel. Anda juga bisa menautkan Audio jika itu soal Listening.
                      </p>
                   </div>
                   <div className="bg-white/10 p-5 rounded-xl border border-white/10 backdrop-blur-sm">
                      <h4 className="font-bold text-fuchsia-300 mb-2 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-fuchsia-400/20 flex items-center justify-center text-fuchsia-300 text-xs text-center border border-fuchsia-400/30">3</span> Aktifkan Ujian</h4>
                      <p className="text-xs leading-relaxed text-indigo-50 opacity-90">
                         Masuk ke menu Jadwal Ujian. Pilih Bank Soal yang sudah siap. Tentukan peserta Ujian (bisa berdasarkan Kelas, Sesi, Jurusan dsb) kemudian atur Waktu Tes di sisi guru dan aktifkan.
                      </p>
                   </div>
                </div>
                <div className="mt-6 flex gap-3 text-xs justify-end">
                   <div className="bg-white/10 rounded-full px-4 py-1.5 border border-white/20">Modul Administrasi CBT V1.0</div>
                </div>
             </div>
             
             {/* Decorative Elements */}
             <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50" />
             <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50" />
           </Card>
        )}

        {/* Grafik Container */}
        <Card className="p-5">
           <h3 className="font-semibold text-slate-800 mb-6">Grafik Jumlah Siswa per Tingkat</h3>
           <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={[
                    { name: 'Kelas X', Jumlah: siswaPerTingkat[10] },
                    { name: 'Kelas XI', Jumlah: siswaPerTingkat[11] },
                    { name: 'Kelas XII', Jumlah: siswaPerTingkat[12] },
                 ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} />
                    <Tooltip 
                       cursor={{fill: '#f1f5f9'}}
                       contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="Jumlah" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </Card>

        {/* Monitoring & Quick Menu */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
           {/* Real-time Monitoring Widget */}
           <Card className="p-0 md:col-span-3 flex flex-col overflow-hidden max-h-[600px]">
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
                    <SelectValue placeholder="Pilih Ujian Aktif...">
                      {ujianList.find(u=>u.id===selectedUjian)?.title}
                    </SelectValue>
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
                          <th className="px-5 py-3">Pelanggaran</th>
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
                                {p.violations > 0 ? (
                                   <div className="flex items-center gap-1.5 font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-200/50 w-fit">
                                      <AlertTriangle className="w-3.5 h-3.5" />
                                      <span>{p.violations} x</span>
                                   </div>
                                ) : (
                                   <span className="text-slate-400 text-xs px-2 py-1 bg-slate-100 rounded">0</span>
                                )}
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
        </div>

      </main>
    </div>
  );
}
