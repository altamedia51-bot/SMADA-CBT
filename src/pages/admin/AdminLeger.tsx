import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Download, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function AdminLeger() {
  const [loading, setLoading] = useState(true);
  const [siswaData, setSiswaData] = useState<any[]>([]);
  const [kelasData, setKelasData] = useState<any[]>([]);
  const [selectedKelas, setSelectedKelas] = useState<string>('all');
  const [legerData, setLegerData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Students & Classes
        const kSnap = await getDocs(collection(db, 'kelas'));
        setKelasData(kSnap.docs.map(d => ({id: d.id, ...d.data()})));
        
        const uSnap = await getDocs(collection(db, 'users'));
        const students = uSnap.docs.map(d => ({id: d.id, ...d.data()})).filter(u => u.role === 'siswa');
        setSiswaData(students);

        // 2. Fetch all Ujian
        const ujianSnap = await getDocs(collection(db, 'ujian'));
        const ujianList = ujianSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 3. To calculate scores, we need Soal for each Paket used in Ujian
        const paketIds = Array.from(new Set(ujianList.map(u => u.paketId).filter(Boolean)));
        const soalByPaket: Record<string, any[]> = {};
        
        for (const pid of paketIds) {
          const sSnap = await getDocs(collection(db, `paket_soal/${pid}/soal`));
          soalByPaket[pid as string] = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        // 4. Fetch all Jawaban Siswa
        const jawabSnap = await getDocs(collection(db, 'jawaban_siswa'));
        const jawabanList = jawabSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 5. Compute Ledger Data
        const computedLeger = students.map(siswa => {
          let totalScore = 0;
          let countUjian = 0;

          // Find all responses for this student
          const studentAnswers = jawabanList.filter(j => j.siswaId === siswa.uid || j.siswaId === siswa.id || j.id.endsWith(`_${siswa.uid}`) || j.id.endsWith(`_${siswa.id}`));
          
          studentAnswers.forEach(jawaban => {
             const u = ujianList.find(ux => ux.id === jawaban.ujianId);
             if (u && jawaban.isSubmitted) {
                const soalList = soalByPaket[u.paketId] || [];
                const ansObj = jawaban.answers || {};
                
                let correct = 0;
                soalList.forEach(soal => {
                  const studentAns = ansObj[soal.id];
                  if (studentAns) {
                    let isCorrect = false;
                    if (soal.type === 'pg') {
                      const isValidAlphabet = /^[A-E]$/i.test(studentAns);
                      if (isValidAlphabet) {
                        const ansIdx = ['A', 'B', 'C', 'D', 'E'].indexOf(studentAns.toUpperCase());
                        const studentTextAns = soal.options?.[ansIdx];
                        if (studentTextAns === soal.correctAnswer || studentAns.toUpperCase() === soal.correctAnswer || studentAns.toUpperCase() === soal.answer) {
                          isCorrect = true;
                        }
                      } else if (studentAns === soal.correctAnswer || studentAns === soal.answer) {
                        isCorrect = true;
                      }
                    } else if (soal.type === 'isian') {
                      const correctText = (soal.correctAnswer || soal.answer || '').toString().toLowerCase().trim();
                      if (studentAns.toString().toLowerCase().trim() === correctText) {
                        isCorrect = true;
                      }
                    }
                    if (isCorrect) correct++;
                  }
                });

                const maxScore = soalList.length;
                if (maxScore > 0) {
                   const score = (correct / maxScore) * 100;
                   totalScore += score;
                   countUjian++;
                }
             }
          });

          const avgPengetahuan = countUjian > 0 ? Math.round(totalScore / countUjian) : 0;

          return {
             id: siswa.id,
             uid: siswa.uid,
             nama: siswa.displayName || siswa.name,
             kelas: siswa.kelas,
             avgPengetahuan,
             avgKeterampilan: 0,
             countUjian,
             countTugas: 0,
          };
        });

        setLegerData(computedLeger);

      } catch (err: any) {
        toast.error("Gagal memuat leger nilai: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExportCSV = () => {
    if (legerData.length === 0) return;
    const wsData = filtered.map((l, i) => ({
      'No': i + 1,
      'Nama Siswa': l.nama,
      'Kelas': l.kelas,
      'Rata-rata Pengetahuan': l.avgPengetahuan,
      'Rata-rata Keterampilan': l.avgKeterampilan,
      'Total Aktivitas': `${l.countUjian} Ujian, ${l.countTugas} Tugas`
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leger Nilai");
    XLSX.writeFile(wb, `Leger_Nilai_${selectedKelas}.xlsx`); // Or CSV
  };

  const uniqueClasses = Array.from(new Set([...kelasData.map(k => k.name), ...siswaData.map(s => s.kelas).filter(Boolean)])).sort();

  const filtered = legerData.filter(l => selectedKelas === 'all' || l.kelas === selectedKelas);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-blue-900 flex items-center gap-2">
            <Calculator className="w-6 h-6" /> Leger Nilai Siswa
          </h2>
          <p className="text-muted-foreground">Ringkasan rata-rata nilai Pengetahuan (Ujian) dan Keterampilan (Tugas).</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Select value={selectedKelas} onValueChange={setSelectedKelas}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Pilih Kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {uniqueClasses.map((kls: any) => (
                <SelectItem key={kls} value={kls}>{kls}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleExportCSV} className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto gap-2">
            <Download className="w-4 h-4" /> Unduh CSV
          </Button>
        </div>
      </div>

      <Card className="bg-white border-0 shadow-sm overflow-hidden ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-blue-900 uppercase bg-blue-50/50 border-b">
              <tr>
                <th className="px-5 py-4 font-bold">No</th>
                <th className="px-5 py-4 font-bold min-w-[200px]">Nama Siswa</th>
                <th className="px-5 py-4 font-bold text-center">Rata-rata Pengetahuan<br/><span className="text-[10px] text-muted-foreground normal-case font-normal">(Dari Riwayat Ujian)</span></th>
                <th className="px-5 py-4 font-bold text-center">Rata-rata Keterampilan<br/><span className="text-[10px] text-muted-foreground normal-case font-normal">(Dari Tugas Portofolio)</span></th>
                <th className="px-5 py-4 font-bold text-center">Total Aktivitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                    Memuat data leger...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                    Tidak ada data siswa ditemukan.
                  </td>
                </tr>
              ) : (
                filtered.sort((a,b) => a.nama.localeCompare(b.nama)).map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 text-slate-500">{idx + 1}</td>
                    <td className="px-5 py-4 font-semibold text-slate-700">{item.nama}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[40px] px-2 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg text-sm">
                        {item.avgPengetahuan}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                       <span className="inline-flex items-center justify-center min-w-[40px] px-2 py-1 bg-rose-50 text-rose-700 font-bold rounded-lg text-sm">
                        {item.avgKeterampilan}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center text-slate-500 text-xs">
                      {item.countUjian} Ujian, {item.countTugas} Tugas
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
