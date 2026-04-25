import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getDocs, doc, getDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, FileText, CheckCircle, XCircle, AlertTriangle, Hash, Clock } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function AdminHasil() {
  const [ujianList, setUjianList] = useState<any[]>([]);
  const [selectedUjianId, setSelectedUjianId] = useState<string>('');
  const [pesertaResults, setPesertaResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedKelas, setSelectedKelas] = useState<string>('all');

  // Fetch Ujian List
  useEffect(() => {
    const q = query(collection(db, 'ujian'), where('status', 'in', ['aktif', 'selesai']));
    const unsub = onSnapshot(q, (snap) => {
      setUjianList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Fetch results when ujian is selected
  useEffect(() => {
    if (!selectedUjianId) {
      setPesertaResults([]);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        // 1. Get Ujian info
        const ujianRef = doc(db, 'ujian', selectedUjianId);
        const ujianSnap = await getDoc(ujianRef);
        const ujianData = ujianSnap.data();
        if (!ujianData) throw new Error("Ujian tidak ditemukan");

        // 2. Get Soal for scoring
        const soalSnap = await getDocs(collection(db, `paket_soal/${ujianData.paketId}/soal`));
        const soalList = soalSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 3. Get Student Answers
        const q = query(collection(db, 'jawaban_siswa'), where('ujianId', '==', selectedUjianId));
        const snapshot = await getDocs(q);
        
        const results = snapshot.docs.map(d => {
          const data = d.data();
          const answers = data.answers || {};
          
          let correct = 0;
          let wrong = 0;
          let unanswered = 0;

          soalList.forEach((soal: any) => {
            const studentAns = answers[soal.id];
            if (!studentAns) {
              unanswered++;
            } else if (studentAns === soal.answer) {
              correct++;
            } else {
              wrong++;
            }
          });

          const total = soalList.length;
          const score = total > 0 ? (correct / total) * 100 : 0;

          return {
            id: d.id,
            ...data,
            metrics: {
              correct,
              wrong,
              unanswered,
              total,
              score: Math.round(score * 100) / 100
            }
          };
        });

        setPesertaResults(results);
      } catch (err: any) {
        toast.error("Gagal memuat hasil: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [selectedUjianId]);

  const handleExportExcel = () => {
    if (pesertaResults.length === 0) return;
    
    const data = pesertaResults.map(p => ({
      'Nama Siswa': p.siswaName,
      'ID Siswa': p.siswaId,
      'Kelas': p.siswaKelas,
      'Status': p.isSubmitted ? 'Selesai' : 'Belum Selesai',
      'Benar': p.metrics.correct,
      'Salah': p.metrics.wrong,
      'Kosong': p.metrics.unanswered,
      'Total Soal': p.metrics.total,
      'Nilai': p.metrics.score,
      'Pelanggaran': p.violations || 0
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hasil Ujian");
    const ujianName = ujianList.find(u => u.id === selectedUjianId)?.title || 'Hasil';
    XLSX.writeFile(wb, `Laporan_${ujianName}.xlsx`);
  };

  const uniqueClasses = Array.from(new Set(pesertaResults.map(p => p.siswaKelas).filter(Boolean))).sort();

  const filtered = pesertaResults.filter(p => {
    const matchesSearch = p.siswaName?.toLowerCase().includes(search.toLowerCase()) ||
                          p.siswaKelas?.toLowerCase().includes(search.toLowerCase());
    const matchesKelas = selectedKelas === 'all' || p.siswaKelas === selectedKelas;
    return matchesSearch && matchesKelas;
  });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" /> Laporan Hasil Akhir Ujian
          </h2>
          <p className="text-muted-foreground">Analisis nilai dan rekapitulasi jawaban siswa secara mendalam.</p>
        </div>

        {selectedUjianId && pesertaResults.length > 0 && (
          <Button onClick={handleExportExcel} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Download className="w-4 h-4" /> Export Excel
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar: Filter & Stats */}
        <div className="md:col-span-1 space-y-4">
          <Card className="p-4 space-y-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">Pilih Sesi Ujian</label>
              <Select value={selectedUjianId} onValueChange={setSelectedUjianId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Ujian..." />
                </SelectTrigger>
                <SelectContent>
                  {ujianList.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedUjianId && (
              <div className="pt-4 border-t space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Peserta</span>
                  <span className="font-bold">{pesertaResults.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Sudah Submit</span>
                  <span className="font-bold text-emerald-600">
                    {pesertaResults.filter(p => p.isSubmitted).length}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Rata-rata Nilai</span>
                  <span className="font-bold">
                    {pesertaResults.length > 0 
                      ? Math.round(pesertaResults.reduce((acc, curr) => acc + curr.metrics.score, 0) / pesertaResults.length * 10) / 10
                      : 0}
                  </span>
                </div>
              </div>
            )}
          </Card>

          {selectedUjianId && (
            <Card className="p-4 bg-blue-50 border-blue-100">
              <h4 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Informasi Penting
              </h4>
              <p className="text-xs text-blue-700 leading-relaxed">
                Nilai dikalkulasi secara otomatis berdasarkan kunci jawaban pada paket soal. Untuk soal Isian/Essay, penilaian manual mungkin diperlukan jika format berbeda.
              </p>
            </Card>
          )}
        </div>

        {/* Main: Table */}
        <div className="md:col-span-3">
          <Card className="overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                <Input 
                  placeholder="Cari nama siswa..." 
                  className="pl-9 bg-white" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                <SelectTrigger className="w-full md:w-[200px] bg-white">
                  <SelectValue placeholder="Semua Kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kelas</SelectItem>
                  {uniqueClasses.map(kelas => (
                    <SelectItem key={kelas as string} value={kelas as string}>{kelas as string}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              {!selectedUjianId ? (
                <div className="py-20 text-center flex flex-col items-center">
                  <FileText className="w-12 h-12 text-slate-200 mb-4" />
                  <p className="text-slate-500 font-medium">Silakan pilih ujian untuk melihat laporan</p>
                </div>
              ) : loading ? (
                <div className="py-20 text-center">
                   <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                   <p className="text-slate-500">Menghitung skor peserta...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-20 text-center text-slate-500">
                   Tidak ada data peserta yang ditemukan.
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                    <tr>
                      <th className="px-5 py-3">Peserta</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-center">Detail (B/S/K)</th>
                      <th className="px-5 py-3 text-center">Nilai</th>
                      <th className="px-5 py-3 text-center">Viols</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <p className="font-bold text-slate-800">{p.siswaName}</p>
                          <p className="text-xs text-muted-foreground">{p.siswaKelas} | {p.siswaId}</p>
                        </td>
                        <td className="px-5 py-3">
                          {p.isSubmitted ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-[11px] font-bold">
                              <CheckCircle className="w-3 h-3" /> SUBMITTED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-[11px] font-bold">
                              <Clock className="w-3 h-3" /> ONGOING
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-center gap-2">
                             <div className="flex flex-col items-center">
                               <span className="text-[10px] text-emerald-600 font-bold">BENAR</span>
                               <span className="font-bold">{p.metrics.correct}</span>
                             </div>
                             <div className="h-4 w-px bg-slate-200" />
                             <div className="flex flex-col items-center">
                               <span className="text-[10px] text-rose-600 font-bold">SALAH</span>
                               <span className="font-bold">{p.metrics.wrong}</span>
                             </div>
                             <div className="h-4 w-px bg-slate-200" />
                             <div className="flex flex-col items-center">
                               <span className="text-[10px] text-slate-400 font-bold">KOSONG</span>
                               <span className="font-bold">{p.metrics.unanswered}</span>
                             </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-center">
                           <div className={`inline-block px-3 py-1 rounded-lg font-black text-lg ${
                             p.metrics.score >= 75 ? 'text-emerald-700 bg-emerald-100' :
                             p.metrics.score >= 50 ? 'text-blue-700 bg-blue-100' : 'text-rose-700 bg-rose-100'
                           }`}>
                             {p.metrics.score}
                           </div>
                        </td>
                        <td className="px-5 py-3 text-center">
                           <span className={`font-medium ${p.violations > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                             {p.violations || 0}
                           </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
