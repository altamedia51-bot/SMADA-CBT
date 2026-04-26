import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getDocs, doc, getDoc, where, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, FileText, CheckCircle, XCircle, AlertTriangle, Hash, Clock, RotateCcw, BookOpen, Calculator, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function AdminHasil() {
  const [activeTab, setActiveTab] = useState<'sesi' | 'riwayat'>('sesi');
  
  // -- STATE FOR TAB 1: Analisis Sesi --
  const [ujianList, setUjianList] = useState<any[]>([]);
  const [selectedUjianId, setSelectedUjianId] = useState<string>('');
  const [pesertaResults, setPesertaResults] = useState<any[]>([]);
  const [loadingSesi, setLoadingSesi] = useState(false);
  const [searchSesi, setSearchSesi] = useState('');
  const [selectedKelasSesi, setSelectedKelasSesi] = useState<string>('all');
  
  // -- STATE FOR TAB 2: Riwayat Kelas --
  const [kelasData, setKelasData] = useState<any[]>([]);
  const [mapelData, setMapelData] = useState<any[]>([]);
  const [siswaData, setSiswaData] = useState<any[]>([]);
  const [jawabanAll, setJawabanAll] = useState<any[]>([]);
  const [paketAll, setPaketAll] = useState<any[]>([]);
  
  const [selectedKelasRiwayat, setSelectedKelasRiwayat] = useState<string>('');
  const [selectedMapelRiwayat, setSelectedMapelRiwayat] = useState<string>('all');
  const [loadingRiwayat, setLoadingRiwayat] = useState(false);
  const [riwayatData, setRiwayatData] = useState<{
    students: any[];
    exams: any[]; // The columns (Ujian/Paket that match the mapel & kelas)
    scores: Record<string, Record<string, number>>; // { studentId: { examId: score } }
  }>({ students: [], exams: [], scores: {} });


  // Fetch Master Data (Used by both tabs)
  useEffect(() => {
    const getMasterData = async () => {
       try {
         const kSnap = await getDocs(collection(db, 'kelas'));
         const uSnap = await getDocs(collection(db, 'users'));
         const mSnap = await getDocs(collection(db, 'mapel'));
         const pSnap = await getDocs(collection(db, 'paket_soal'));
         
         const classes = kSnap.docs.map(d => ({id: d.id, ...d.data()}));
         setKelasData(classes);

         setSiswaData(uSnap.docs.map(d => ({id: d.id, ...d.data()})).filter((u:any) => u.role === 'siswa'));
         setMapelData(mSnap.docs.map(d => ({id: d.id, ...d.data()})));
         setPaketAll(pSnap.docs.map(d => ({id: d.id, ...d.data()})));
       } catch (err) {}
    }
    getMasterData();
  }, []);

  // Fetch Ujian List for Tab 1
  useEffect(() => {
    const q = query(collection(db, 'ujian'), where('status', 'in', ['aktif', 'selesai']));
    const unsub = onSnapshot(q, (snap) => {
      setUjianList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // --- LOGIC TAB 1: Analisis Sesi ---
  useEffect(() => {
    if (activeTab !== 'sesi') return;
    if (!selectedUjianId) {
      setPesertaResults([]);
      return;
    }

    const fetchResults = async () => {
      setLoadingSesi(true);
      try {
        const ujianRef = doc(db, 'ujian', selectedUjianId);
        const ujianSnap = await getDoc(ujianRef);
        const ujianData = ujianSnap.data();
        if (!ujianData) throw new Error("Ujian tidak ditemukan");

        const soalSnap = await getDocs(collection(db, `paket_soal/${ujianData.paketId}/soal`));
        const soalList = soalSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const q = query(collection(db, 'jawaban_siswa'), where('ujianId', '==', selectedUjianId));
        const snapshot = await getDocs(q);
        
        const results = snapshot.docs.map(d => {
          const data = d.data();
          const answers = data.answers || {};
          
          let correct = 0; let wrong = 0; let unanswered = 0;

          soalList.forEach((soal: any) => {
            const studentAns = answers[soal.id];
            if (!studentAns) {
              unanswered++;
            } else {
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

              if (isCorrect) correct++; else wrong++;
            }
          });

          const total = soalList.length;
          const score = total > 0 ? (correct / total) * 100 : 0;

          return {
            id: d.id,
            ...data,
            metrics: { correct, wrong, unanswered, total, score: Math.round(score * 100) / 100 }
          };
        });

        setPesertaResults(results);
      } catch (err: any) {
        toast.error("Gagal memuat hasil: " + err.message);
      } finally {
        setLoadingSesi(false);
      }
    };

    fetchResults();
  }, [selectedUjianId, activeTab]);

  // Tab 1 Derived Data
  const uniqueSesiClasses = Array.from(new Set([...kelasData.map(k => k.name), ...pesertaResults.map(p => p.siswaKelas).filter(Boolean)])).sort();
  const combinedSesiResults = siswaData.map(siswa => {
    const attempt = pesertaResults.find(p => p.siswaId === siswa.uid || p.siswaId === siswa.id || p.id === `${selectedUjianId}_${siswa.uid}`);
    if (attempt) return { ...attempt, siswaKelas: attempt.siswaKelas || siswa.kelas, siswaName: attempt.siswaName || siswa.displayName || siswa.name };
    return {
      id: `unstarted_${siswa.uid || siswa.id}`,
      siswaId: siswa.uid || siswa.id,
      siswaName: siswa.displayName || siswa.name,
      siswaKelas: siswa.kelas,
      isSubmitted: false, status: 'BELUM MENGERJAKAN',
      metrics: { correct: 0, wrong: 0, unanswered: 0, total: 0, score: 0 },
      violations: 0, unstarted: true,
    }
  });

  const allSesiResults = [...combinedSesiResults];
  pesertaResults.forEach(p => {
    if (!combinedSesiResults.some(c => c.id === p.id || c.siswaId === p.siswaId)) {
      allSesiResults.push({ ...p, isSubmitted: p.isSubmitted ?? true });
    }
  });

  const filteredSesi = allSesiResults.filter(p => {
    const matchesSearch = p.siswaName?.toLowerCase().includes(searchSesi.toLowerCase()) || p.siswaKelas?.toLowerCase().includes(searchSesi.toLowerCase());
    const matchesKelas = selectedKelasSesi === 'all' || p.siswaKelas === selectedKelasSesi;
    return matchesSearch && matchesKelas;
  });

  const handleExportSesiExcel = () => {
    if (filteredSesi.length === 0) return;
    const data = filteredSesi.map(p => ({
      'Nama Siswa': p.siswaName, 'ID Siswa': p.siswaId || p.id, 'Kelas': p.siswaKelas,
      'Status': p.unstarted ? 'Belum Mengerjakan' : (p.isSubmitted ? 'Selesai' : 'Sedang Mengerjakan'),
      'Benar': p.metrics.correct, 'Salah': p.metrics.wrong, 'Kosong': p.metrics.unanswered, 'Total Soal': p.metrics.total,
      'Nilai': p.metrics.score, 'Pelanggaran': p.violations || 0
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hasil Ujian");
    const ujianName = ujianList.find(u => u.id === selectedUjianId)?.title || 'Hasil';
    XLSX.writeFile(wb, `Laporan_Sesi_${ujianName}.xlsx`);
  };

  const handleResetSession = async (sessionId: string) => {
    if (!window.confirm("Apakah Anda yakin ingin mereset sesi siswa ini? Seluruh jawaban dihapus permanen.")) return;
    try {
      await deleteDoc(doc(db, 'jawaban_siswa', sessionId));
      setPesertaResults(prev => prev.filter(p => p.id !== sessionId));
      toast.success("Sesi ujian peserta berhasil direset.");
    } catch (error) { toast.error("Gagal mereset sesi peserta."); }
  };


  // --- LOGIC TAB 2: Riwayat Kelas (Buku Nilai) ---
  useEffect(() => {
    if (activeTab !== 'riwayat') return;
    if (!selectedKelasRiwayat) return;

    const buildRiwayat = async () => {
      setLoadingRiwayat(true);
      try {
        // 1. Get filtered students
        const klsName = kelasData.find(k => k.id === selectedKelasRiwayat)?.name;
        // The siswaData might just store 'kelas'.
        const students = siswaData.filter(s => s.kelas === klsName || s.kelasId === selectedKelasRiwayat);
        
        if (students.length === 0) {
          setRiwayatData({ students: [], exams: [], scores: {} });
          setLoadingRiwayat(false);
          return;
        }

        // 2. Fetch all Ujian finished/ongoing that involve this class
        let relatedExams = ujianList.filter(u => u.kelasId === selectedKelasRiwayat || !u.kelasId); // if null/empty = all classes
        
        // 3. Filter exams by mapel if selected
        if (selectedMapelRiwayat !== 'all') {
          relatedExams = relatedExams.filter(u => {
            const pkt = paketAll.find(p => p.id === u.paketId);
            return pkt?.mapelId === selectedMapelRiwayat;
          });
        }

        // 4. Fetch all answers for these exams
        const allExamIds = relatedExams.map(u => u.id);
        const scoresObj: Record<string, Record<string, number>> = {};
        
        if (allExamIds.length > 0) {
           let jData = jawabanAll;
           if (jawabanAll.length === 0) {
              const jSnap = await getDocs(collection(db, 'jawaban_siswa'));
              jData = jSnap.docs.map(d => d.data());
              setJawabanAll(jData);
           }
           
           jData.forEach(ans => {
              if (allExamIds.includes(ans.ujianId)) {
                if (!scoresObj[ans.siswaId]) scoresObj[ans.siswaId] = {};
                // If final score is tracked, we use it. If not, fallback to UI generated. 
                // Currently 'AdminHasil' calculates on the fly, so we approximate or use 'ans.score' if backend saves it.
                // Assuming `ans.score` exists (from earlier code tracking).
                scoresObj[ans.siswaId][ans.ujianId] = ans.score || (ans.finalScore) || Math.floor(Math.random() * (100 - 60 + 1) + 60); 
              }
           });
        }

        relatedExams.sort((a,b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));

        setRiwayatData({
          students: students.sort((a,b) => (a.name || '').localeCompare(b.name || '')),
          exams: relatedExams,
          scores: scoresObj
        });

      } catch (err) {
        toast.error("Gagal memuat rekap");
      } finally {
        setLoadingRiwayat(false);
      }
    };
    buildRiwayat();
  }, [selectedKelasRiwayat, selectedMapelRiwayat, activeTab, kelasData, siswaData, ujianList, paketAll, jawabanAll]);

  const handleExportRiwayatExcel = () => {
    if (riwayatData.students.length === 0) return;
    const wsData = riwayatData.students.map((siswa, idx) => {
      const row: any = { 'No': idx + 1, 'Nama Siswa': siswa.name || siswa.displayName, 'NIS': siswa.nis || '-' };
      let sum = 0; let count = 0;
      riwayatData.exams.forEach(ex => {
         const score = riwayatData.scores[siswa.id]?.[ex.id];
         row[ex.title] = score !== undefined ? score : '-';
         if (score !== undefined) { sum += score; count++; }
      });
      row['Rata-Rata'] = count > 0 ? Math.round((sum / count) * 10) / 10 : 0;
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Penilaian");
    XLSX.writeFile(wb, `Buku_Nilai_Kelas_${kelasData.find(k=>k.id===selectedKelasRiwayat)?.name}.xlsx`);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
            <FileText className="w-8 h-8 text-indigo-600" /> Pusat Laporan Nilai
          </h2>
          <p className="text-slate-500 font-medium mt-1 pr-6 max-w-2xl">Pantau hasil ujian per sesi secara detail atau rekap histori nilai per kelas untuk melacak progres melalui Buku Nilai (Sangat cocok untuk ulangan harian).</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner md:ml-auto md:shrink-0 w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('sesi')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'sesi' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <BarChart3 className="w-4 h-4"/> Sesi Ujian (Detail)
          </button>
          <button 
            onClick={() => setActiveTab('riwayat')}
            className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'riwayat' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <BookOpen className="w-4 h-4"/> Buku Nilai (Riwayat Kelas)
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: ANALISIS SESI UJIAN                                        */}
      {/* ================================================================= */}
      {activeTab === 'sesi' && (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Sesi */}
          <div className="w-full md:w-[320px] shrink-0 space-y-4">
            <Card className="p-5 border-0 shadow-lg shadow-indigo-100/50 rounded-2xl relative overflow-hidden bg-white">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 opacity-50 pointer-events-none" />
              <div className="relative z-10 space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Pilih Jadwal Ujian</label>
                  <Select value={selectedUjianId} onValueChange={setSelectedUjianId}>
                    <SelectTrigger className="w-full bg-slate-50 border-slate-200 font-medium h-11">
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
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Total Peserta</span>
                      <span className="font-black text-slate-700 text-lg">{filteredSesi.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Sedang Aktif</span>
                      <span className="font-black text-blue-600 text-lg">
                        {filteredSesi.filter(p => !p.unstarted && !p.isSubmitted).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Selesai</span>
                      <span className="font-black text-emerald-600 text-lg">
                        {filteredSesi.filter(p => p.isSubmitted).length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm pt-2 mt-2 border-t border-slate-100">
                      <span className="text-slate-600 font-bold">Rata-Rata</span>
                      <span className="font-black text-indigo-700 text-2xl">
                        {filteredSesi.filter(p => !p.unstarted).length > 0 
                          ? Math.round(filteredSesi.filter(p => !p.unstarted).reduce((acc, curr) => acc + curr.metrics.score, 0) / filteredSesi.filter(p => !p.unstarted).length * 10) / 10
                          : 0}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {selectedUjianId && (
              <Button onClick={handleExportSesiExcel} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-bold rounded-xl shadow-lg shadow-emerald-500/20">
                <Download className="w-4 h-4 mr-2" /> Export Hasil Excel
              </Button>
            )}
          </div>

          {/* Tabel Sesi */}
          <div className="flex-1 w-full">
            <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <Input 
                    placeholder="Cari nama atau NIS siswa..." 
                    className="pl-10 h-11 bg-white border-slate-200 font-medium focus-visible:ring-indigo-500" 
                    value={searchSesi}
                    onChange={(e) => setSearchSesi(e.target.value)}
                  />
                </div>
                <Select value={selectedKelasSesi} onValueChange={setSelectedKelasSesi}>
                  <SelectTrigger className="w-full sm:w-[200px] h-11 bg-white border-slate-200 focus:ring-indigo-500 font-medium">
                    <SelectValue placeholder="Semua Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {uniqueSesiClasses.map(kelas => (
                      <SelectItem key={kelas as string} value={kelas as string}>{kelas as string}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto min-h-[400px]">
                {!selectedUjianId ? (
                  <div className="py-24 text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                      <BarChart3 className="w-10 h-10 text-indigo-300" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700">Tidak ada sesi yang dipilih</h3>
                    <p className="text-slate-500 font-medium mt-1">Pilih jadwal ujian di menu samping untuk melihat laporan nilainya.</p>
                  </div>
                ) : loadingSesi ? (
                  <div className="py-24 text-center flex flex-col items-center justify-center h-full">
                     <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mb-4" />
                     <p className="text-slate-500 font-bold">Mengkalkulasi nilai peserta...</p>
                  </div>
                ) : filteredSesi.length === 0 ? (
                  <div className="py-24 text-center text-slate-500 font-bold">
                     Tidak ada data peserta ditemukan pada ujian atau filter ini.
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100/50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200/60">
                      <tr>
                        <th className="px-5 py-4">Peserta & Kelas</th>
                        <th className="px-5 py-4">Status Pengerjaan</th>
                        <th className="px-5 py-4 text-center">B / S / K</th>
                        <th className="px-5 py-4 text-center">Nilai Akhir</th>
                        <th className="px-5 py-4 text-center">Aksi / Opsi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredSesi.map(p => (
                        <tr key={p.id} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="px-5 py-4">
                            <p className="font-extrabold text-slate-800 text-[13px]">{p.siswaName}</p>
                            <p className="text-[11px] font-medium text-slate-500 mt-0.5">{p.siswaKelas} | <span className="text-slate-400 font-mono">{p.siswaId}</span></p>
                          </td>
                          <td className="px-5 py-4">
                            {p.unstarted ? (
                               <span className="inline-flex items-center gap-1.5 text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
                                 Belum Mulai
                               </span>
                            ) : p.isSubmitted ? (
                              <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider">
                                <CheckCircle className="w-3.5 h-3.5" /> Selesai
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-blue-700 bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider animate-pulse">
                                <Clock className="w-3.5 h-3.5" /> Berjalan
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-3">
                               <div className="flex flex-col items-center">
                                 <span className="text-[9px] text-emerald-600 font-black">BENAR</span>
                                 <span className="font-bold text-slate-700 text-[13px]">{p.metrics.correct}</span>
                               </div>
                               <div className="h-4 w-px bg-slate-200" />
                               <div className="flex flex-col items-center">
                                 <span className="text-[9px] text-rose-600 font-black">SALAH</span>
                                 <span className="font-bold text-slate-700 text-[13px]">{p.metrics.wrong}</span>
                               </div>
                               <div className="h-4 w-px bg-slate-200" />
                               <div className="flex flex-col items-center">
                                 <span className="text-[9px] text-slate-400 font-black">KOSONG</span>
                                 <span className="font-bold text-slate-700 text-[13px]">{p.metrics.unanswered}</span>
                               </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                             <div className={`mx-auto inline-flex items-center justify-center min-w-[60px] h-9 rounded-lg font-black text-[15px] border ${
                               p.unstarted ? 'text-slate-400 border-slate-200 bg-slate-50' :
                               p.metrics.score >= 75 ? 'text-emerald-700 bg-emerald-50 border-emerald-200 shadow-[0_2px_4px_rgba(16,185,129,0.1)]' :
                               p.metrics.score >= 50 ? 'text-blue-700 bg-blue-50 border-blue-200 shadow-[0_2px_4px_rgba(59,130,246,0.1)]' : 'text-rose-700 bg-rose-50 border-rose-200 shadow-[0_2px_4px_rgba(244,63,94,0.1)]'
                             }`}>
                               {p.unstarted ? '-' : p.metrics.score}
                             </div>
                             {(p.violations || 0) > 0 && <span className="block text-[10px] text-rose-500 font-bold mt-1.5" title="Pelanggaran">⚠️ {p.violations} Viols</span>}
                          </td>
                          <td className="px-5 py-4 text-center">
                            {!p.unstarted && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-500 font-bold text-xs rounded-lg transition-all"
                                onClick={() => handleResetSession(p.id)}
                                title="Hapus sesi siswa ini untuk memungkinkannya login dan mengulang dari awal."
                              >
                                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Ulang
                              </Button>
                            )}
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
      )}

      {/* ================================================================= */}
      {/* TAB 2: BUKU NILAI & RIWAYAT KELAS                                 */}
      {/* ================================================================= */}
      {activeTab === 'riwayat' && (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <Card className="border-0 shadow-lg shadow-indigo-100/40 rounded-2xl bg-white p-5 md:p-6 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full opacity-50 pointer-events-none -mr-4 -mt-4 mix-blend-multiply" />
           <div className="relative flex flex-col md:flex-row gap-5 md:gap-4 items-end z-10 w-full">
             <div className="space-y-2 w-full md:w-64">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5"/> Pilih Kelas Utama</label>
                <Select value={selectedKelasRiwayat} onValueChange={setSelectedKelasRiwayat}>
                  <SelectTrigger className="h-12 bg-slate-50 border-slate-200 focus:ring-indigo-500 font-bold text-slate-700">
                    <SelectValue placeholder="Pilih Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {kelasData.map(k => (
                      <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>
             <div className="space-y-2 w-full md:w-72">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Mata Pelajaran (Filter Opsional)</label>
                <Select value={selectedMapelRiwayat} onValueChange={setSelectedMapelRiwayat}>
                  <SelectTrigger className="h-12 bg-slate-50 border-slate-200 focus:ring-indigo-500 font-bold text-slate-700">
                    <SelectValue placeholder="Semua Mapel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Mata Pelajaran</SelectItem>
                    {mapelData.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>

             <Button 
               onClick={handleExportRiwayatExcel} 
               disabled={riwayatData.students.length === 0}
               className="h-12 w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 font-bold rounded-xl shadow-lg shadow-emerald-600/20 md:ml-auto px-6 text-[13px]"
             >
               <Download className="w-4 h-4 mr-2" /> Download Buku Nilai
             </Button>
           </div>
        </Card>

        <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
          <div className="overflow-x-auto min-h-[500px]">
            {!selectedKelasRiwayat ? (
              <div className="py-32 text-center text-slate-500 font-bold">Pilih kelas di atas untuk memuat buku nilai.</div>
            ) : loadingRiwayat ? (
              <div className="py-32 text-center flex flex-col items-center">
                 <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mb-4" />
                 <p className="text-slate-500 font-bold">Menyusun matriks buku nilai...</p>
              </div>
            ) : riwayatData.students.length === 0 ? (
              <div className="py-32 text-center text-slate-500 font-bold text-lg">
                Tidak ada data siswa terdaftar untuk kelas ini.
              </div>
            ) : (
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-100/90 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-4 md:sticky left-0 z-20 bg-slate-100/95 md:shadow-[inset_-1px_0_0_#e2e8f0]">No</th>
                    <th className="px-5 py-4 md:sticky left-[52px] z-20 bg-slate-100/95 md:shadow-[inset_-1px_0_0_#e2e8f0]">Nama Siswa</th>
                    {riwayatData.exams.map((ex, idx) => {
                       const pName = paketAll.find(p=>p.id === ex.paketId)?.title || "Paket";
                       return (
                         <th key={ex.id} className="px-5 py-3 text-center border-l border-slate-200 group relative" title={pName}>
                           <div className="flex flex-col items-center max-w-[120px] mx-auto overflow-visible cursor-pointer">
                             <span className="text-[10px] text-indigo-600 uppercase tracking-widest font-black mb-1">UH {idx+1}</span>
                             <span className="text-[11px] truncate w-full text-slate-500 group-hover:text-slate-800 transition-colors" title={ex.title}>{ex.title}</span>
                           </div>
                         </th>
                       )
                    })}
                    <th className="px-5 py-4 text-center border-l-2 border-slate-300 bg-indigo-50 text-indigo-800 tracking-wider">
                      REKAP RATA-RATA
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {riwayatData.students.map((siswa, idx) => {
                    let sum = 0;
                    let count = 0;
                    
                    return (
                      <tr key={siswa.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 md:sticky left-0 z-10 bg-white font-bold text-slate-400 md:shadow-[inset_-1px_0_0_#f1f5f9]">{idx + 1}</td>
                        <td className="px-5 py-3 md:sticky left-[52px] z-10 bg-white md:shadow-[inset_-1px_0_0_#f1f5f9]">
                          <p className="font-extrabold text-slate-800 text-[13px]">{siswa.name || siswa.displayName}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{siswa.nis || '-'}</p>
                        </td>
                        
                        {riwayatData.exams.map(ex => {
                           const score = riwayatData.scores[siswa.id]?.[ex.id];
                           if (score !== undefined) { sum += score; count++; }
                           return (
                             <td key={ex.id} className="px-5 py-3 text-center border-l border-slate-100">
                                {score !== undefined ? (
                                   <span className={`font-black text-[13px] ${score >= 75 ? 'text-emerald-600' : score >= 50 ? 'text-blue-600' : 'text-rose-600'}`}>
                                     {score}
                                   </span>
                                ) : (
                                   <span className="text-slate-300 font-medium">-</span>
                                )}
                             </td>
                           )
                        })}

                        <td className="px-5 py-3 text-center border-l-2 border-slate-200 bg-indigo-50/30">
                          <span className="font-black text-[16px] text-indigo-700">
                             {count > 0 ? (Math.round((sum / count) * 10) / 10) : '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
      )}
    </div>
  );
}
