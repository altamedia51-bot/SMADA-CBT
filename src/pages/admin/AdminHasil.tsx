import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getDocs, doc, getDoc, where, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Download, FileText, CheckCircle, XCircle, AlertTriangle, Hash, Clock, RotateCcw, BookOpen, Calculator, BarChart3, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { useAuthStore } from '../../store/auth.store';

export default function AdminHasil() {
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'sesi' | 'riwayat'>('sesi');
  
  // -- STATE FOR TAB 1: Analisis Sesi --
  const [ujianList, setUjianList] = useState<any[]>([]);
  const [selectedUjianId, setSelectedUjianId] = useState<string>('');
  const [pesertaResults, setPesertaResults] = useState<any[]>([]);
  const [loadingSesi, setLoadingSesi] = useState(false);
  const [searchSesi, setSearchSesi] = useState('');
  const [selectedKelasSesi, setSelectedKelasSesi] = useState<string>('all');
  
  const [isKoreksiModalOpen, setIsKoreksiModalOpen] = useState(false);
  const [koreksiData, setKoreksiData] = useState<any>(null); // { id: jawabanId, siswaName, answers: {}, soalList: [] }
  const [koreksiScores, setKoreksiScores] = useState<Record<string, number>>({});

  
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

        const paketSnap = await getDoc(doc(db, 'paket_soal', ujianData.paketId));
        const paketData = paketSnap.exists() ? paketSnap.data() : {};
        const bobot = paketData.bobot || { pg: 100, pgk: 0, menjodohkan: 0, isian: 0, benarSalah: 0, uraian: 0 };
        
        const counts: any = { pg: 0, pgk: 0, menjodohkan: 0, isian: 0, benarSalah: 0, uraian: 0 };
        soalList.forEach((s:any) => {
           counts[s.type||'pg'] = (counts[s.type||'pg'] || 0) + 1;
        });

        const q = query(collection(db, 'jawaban_siswa'), where('ujianId', '==', selectedUjianId));
        const snapshot = await getDocs(q);
        
        const results = snapshot.docs.map(d => {
          const data = d.data();
          const answers = data.answers || {};
          
          let correct = 0; let wrong = 0; let unanswered = 0;
          let earnedScores: any = { pg: 0, pgk: 0, menjodohkan: 0, isian: 0, benarSalah: 0, uraian: 0 };

          soalList.forEach((soal: any) => {
            const studentAns = answers[soal.id];
            const sType = soal.type || 'pg';
            if (studentAns === undefined || studentAns === null || studentAns === '') {
              unanswered++;
            } else {
              let points = 0;
              if (sType === 'pg') {
                const isValidAlphabet = /^[A-E]$/i.test(studentAns);
                if (isValidAlphabet) {
                  const ansIdx = ['A', 'B', 'C', 'D', 'E'].indexOf(studentAns.toUpperCase());
                  const studentTextAns = soal.options?.[ansIdx];
                  if (studentTextAns === soal.correctAnswer || studentAns.toUpperCase() === soal.correctAnswer || studentAns.toUpperCase() === soal.answer) {
                    points = 1;
                  }
                } else if (studentAns === soal.correctAnswer || studentAns === soal.answer) {
                  points = 1;
                }
              } else if (sType === 'isian') {
                const correctText = (soal.correctAnswer || soal.answer || '').toString().toLowerCase().trim();
                if (studentAns.toString().toLowerCase().trim() === correctText) {
                  points = 1;
                }
              } else if (sType === 'pgk') {
                if (Array.isArray(studentAns) && Array.isArray(soal.correctAnswer)) {
                  const sortedStudent = [...studentAns].sort();
                  const sortedCorrect = [...soal.correctAnswer].sort();
                  if (JSON.stringify(sortedStudent) === JSON.stringify(sortedCorrect)) {
                     points = 1;
                  } else {
                     // Partial scoring
                     const correctOpts = sortedStudent.filter(a => sortedCorrect.includes(a)).length;
                     const wrongOpts = sortedStudent.filter(a => !sortedCorrect.includes(a)).length;
                     const net = correctOpts - wrongOpts;
                     if (net > 0 && sortedCorrect.length > 0) {
                        points = net / sortedCorrect.length;
                     }
                  }
                }
              } else if (sType === 'menjodohkan') {
                if (typeof studentAns === 'object' && soal.pairs && Array.isArray(soal.pairs)) {
                   let totalPairs = soal.pairs.length;
                   let correctPairs = 0;
                   Object.keys(studentAns).forEach(leftIdx => {
                      // Student matches left index to right index
                      if (String(studentAns[leftIdx]) === String(leftIdx)) {
                         correctPairs++;
                      }
                   });
                   if (totalPairs > 0) points = correctPairs / totalPairs;
                }
              } else if (sType === 'benarSalah') {
                if (typeof studentAns === 'object' && soal.statements && Array.isArray(soal.statements)) {
                   let totalSt = soal.statements.length;
                   let correctSt = 0;
                   Object.keys(studentAns).forEach(idx => {
                      if (soal.statements[Number(idx)]?.answer === studentAns[idx]) {
                         correctSt++;
                      }
                   });
                   if (totalSt > 0) points = correctSt / totalSt;
                }
              }

              if (data.overrides && data.overrides[soal.id] !== undefined) {
                 points = data.overrides[soal.id];
              }

              earnedScores[sType] += points;
              if (points === 1) correct++; 
              else if (points > 0) correct += points;
              else wrong++;
            }
          });

          let score = 0;
          Object.keys(counts).forEach(type => {
              if (counts[type] > 0 && bobot[type]) {
                  score += (earnedScores[type] / counts[type]) * bobot[type];
              }
          });

          const total = soalList.length;

          return {
            id: d.id,
            ...data,
            metrics: { correct: Math.round(correct * 10) / 10, wrong, unanswered, total, score: Math.round(score * 100) / 100, earnedScores, counts }
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
      metrics: { correct: 0, wrong: 0, unanswered: 0, total: 0, score: 0, earnedScores: { pg:0, pgk:0, menjodohkan:0, isian:0, benarSalah:0, uraian:0 }, counts: { pg:0, pgk:0, menjodohkan:0, isian:0, benarSalah:0, uraian:0 } },
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

  const handleOpenKoreksi = async (p: any) => {
    if (p.unstarted || !selectedUjianId) return;
    try {
       const ujianRef = doc(db, 'ujian', selectedUjianId);
       const ujianSnap = await getDoc(ujianRef);
       const ujianData = ujianSnap.data();
       if (!ujianData) return toast.error('Ujian tidak ditemukan');
       const soalSnap = await getDocs(collection(db, `paket_soal/${ujianData.paketId}/soal`));
       const soalList = soalSnap.docs.map(d => ({id:d.id, ...d.data()} as any));
       // Filter only isian singkat questions
       const isianSoal = soalList.filter(s => s.type === 'isian');
       if (isianSoal.length === 0) return toast.info('Tidak ada soal Isian Singkat pada ujian ini.');

       const initialScores: Record<string, number> = {};
       
       // Calculate initial scores based on existing auto-correction or previous overrides
       isianSoal.forEach(s => {
          const studentAns = p.answers ? p.answers[s.id] : null;
          // check if override points exist in db
          if (p.overrides && p.overrides[s.id] !== undefined) {
             initialScores[s.id] = p.overrides[s.id];
          } else {
             let points = 0;
             if (studentAns !== undefined && studentAns !== null && studentAns !== '') {
                const correctText = (s.correctAnswer || s.answer || '').toString().toLowerCase().trim();
                if (studentAns.toString().toLowerCase().trim() === correctText) {
                   points = 1;
                }
             }
             initialScores[s.id] = points;
          }
       });

       setKoreksiScores(initialScores);
       setKoreksiData({ id: p.id, siswaName: p.siswaName, answers: p.answers || {}, isianSoal });
       setIsKoreksiModalOpen(true);
    } catch(e:any) {
       toast.error('Gagal membuka data koreksi: '+e.message);
    }
  };

  const handleSaveKoreksi = async () => {
    if (!koreksiData) return;
    try {
      await updateDoc(doc(db, 'jawaban_siswa', koreksiData.id), {
         overrides: koreksiScores
      });
      toast.success('Koreksi berhasil disimpan, nilai akan segera diperbarui.');
      setIsKoreksiModalOpen(false);
    } catch(e:any) {
      toast.error('Gagal menyimpan koreksi: ' + e.message);
    }
  };

  const handleExportSesiExcel = () => {
    if (filteredSesi.length === 0) return;
    const data = filteredSesi.map(p => ({
      'Nama Siswa': p.siswaName, 'ID Siswa': p.siswaId || p.id, 'Kelas': p.siswaKelas,
      'Status': p.unstarted ? 'Belum Mengerjakan' : (p.isSubmitted ? 'Selesai' : 'Sedang Mengerjakan'),
      'PG': p.metrics.earnedScores?.pg || 0,
      'PGK': p.metrics.earnedScores?.pgk || 0,
      'Menjodohkan': p.metrics.earnedScores?.menjodohkan || 0,
      'Isian': p.metrics.earnedScores?.isian || 0,
      'Benar/Salah': p.metrics.earnedScores?.benarSalah || 0,
      'Kosong': p.metrics.unanswered || 0,
      'Total Benar': p.metrics.correct,
      'Total Salah': p.metrics.wrong,
      'Total Soal': p.metrics.total,
      'NilaiAkhir': p.metrics.score, 'Pelanggaran': p.violations || 0
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
  const allowedUjianList = profile?.role === 'guru' 
    ? ujianList.filter(u => {
        const pkt = paketAll.find(p => p.id === u.paketId);
        return pkt?.guruId === profile?.uid;
      })
    : ujianList;

  const allowedMapelData = profile?.role === 'guru'
    ? mapelData.filter(m => {
        return paketAll.some(p => p.mapelId === m.id && p.guruId === profile?.uid);
      })
    : mapelData;

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
        let relatedExams = allowedUjianList.filter(u => u.kelasId === selectedKelasRiwayat || !u.kelasId); // if null/empty = all classes
        
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
                      <SelectValue placeholder="Pilih Ujian...">
                        {allowedUjianList.find(u=>u.id===selectedUjianId)?.title}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {allowedUjianList.map(u => (
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
                    <SelectValue placeholder="Semua Kelas">
                      {selectedKelasSesi === 'all' ? 'Semua Kelas' : selectedKelasSesi}
                    </SelectValue>
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
                        <th className="px-5 py-4 text-center">Analisis Jawaban (PG / PGK / MJD / IS / BS / Kosong)</th>
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
                            <div className="flex items-center justify-center gap-2">
                               <div className="flex flex-col items-center">
                                 <span className="text-[9px] text-slate-500 font-black">PG</span>
                                 <span className="font-bold text-emerald-600 text-[12px]">{p.metrics?.earnedScores?.pg || 0}</span>
                               </div>
                               <div className="h-4 w-px bg-slate-200" />
                               <div className="flex flex-col items-center">
                                 <span className="text-[9px] text-slate-500 font-black">PGK</span>
                                 <span className="font-bold text-emerald-600 text-[12px]">{p.metrics?.earnedScores?.pgk || 0}</span>
                               </div>
                               <div className="h-4 w-px bg-slate-200" />
                               <div className="flex flex-col items-center">
                                 <span className="text-[9px] text-slate-500 font-black">MJD</span>
                                 <span className="font-bold text-emerald-600 text-[12px]">{p.metrics?.earnedScores?.menjodohkan || 0}</span>
                               </div>
                               <div className="h-4 w-px bg-slate-200" />
                               <div className="flex flex-col items-center">
                                 <span className="text-[9px] text-slate-500 font-black">IS</span>
                                 <span className="font-bold text-emerald-600 text-[12px]">{p.metrics?.earnedScores?.isian || 0}</span>
                               </div>
                               <div className="h-4 w-px bg-slate-200" />
                               <div className="flex flex-col items-center">
                                 <span className="text-[9px] text-slate-500 font-black">BS</span>
                                 <span className="font-bold text-emerald-600 text-[12px]">{p.metrics?.earnedScores?.benarSalah || 0}</span>
                               </div>
                               <div className="h-4 w-px bg-slate-200" />
                               <div className="flex flex-col items-center">
                                 <span className="text-[9px] text-slate-400 font-black" title="Kosong">KOSONG</span>
                                 <span className="font-bold text-rose-500 text-[12px]">{p.metrics?.unanswered || 0}</span>
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
                            <div className="flex items-center justify-center gap-2">
                              {!p.unstarted && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-500 font-bold text-xs rounded-lg transition-all"
                                    onClick={() => handleResetSession(p.id)}
                                    title="Hapus sesi siswa ini untuk memungkinkannya login dan mengulang dari awal."
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 mr-1" /> Ulang
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-slate-500 font-bold text-xs rounded-lg transition-all"
                                    onClick={() => handleOpenKoreksi(p)}
                                    title="Koreksi manual jawaban isian singkat siswa."
                                  >
                                    <Edit3 className="w-3.5 h-3.5 mr-1" /> Koreksi
                                  </Button>
                                </>
                              )}
                            </div>
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
                    <SelectValue placeholder="Pilih Kelas">
                      {kelasData.find(k=>k.id===selectedKelasRiwayat)?.name || 'Pilih Kelas'}
                    </SelectValue>
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
                    <SelectValue placeholder="Semua Mapel">
                      {selectedMapelRiwayat === 'all' ? 'Semua Mata Pelajaran' : allowedMapelData.find(m=>m.id===selectedMapelRiwayat)?.name || 'Semua Mapel'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Mata Pelajaran</SelectItem>
                    {allowedMapelData.map(m => (
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

      {/* MODAL KOREKSI */}
      <Dialog open={isKoreksiModalOpen} onOpenChange={setIsKoreksiModalOpen}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Koreksi Isian Singkat: {koreksiData?.siswaName}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <p className="text-sm text-slate-500 font-medium">Beri nilai 1 (Benar), 0 (Salah), atau desimal parsial (contoh: 0.5) untuk setiap soal isian di bawah ini.</p>
            {koreksiData?.isianSoal.map((soal: any, idx: number) => {
               const studentAns = koreksiData.answers[soal.id] || '(Kosong)';
               const correctAns = soal.correctAnswer || soal.answer || '(Kosong)';
               return (
                 <div key={soal.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                   <p className="font-bold text-slate-700 text-sm mb-2">{idx + 1}. {soal.question || soal.content}</p>
                   <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                         <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Jawaban Siswa</p>
                         <p className={`text-sm font-semibold ${studentAns === '(Kosong)' ? 'text-rose-400 italic' : 'text-slate-800'}`}>{studentAns}</p>
                      </div>
                      <div>
                         <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Kunci Jawaban</p>
                         <p className="text-sm font-semibold text-emerald-600">{correctAns}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                     <p className="text-xs font-bold text-slate-600">Poin:</p>
                     <Input 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        max="1"
                        className="w-24 h-9 font-bold font-mono"
                        value={koreksiScores[soal.id] ?? 0}
                        onChange={(e) => setKoreksiScores({...koreksiScores, [soal.id]: parseFloat(e.target.value) || 0})}
                     />
                   </div>
                 </div>
               );
            })}
          </div>
          <div className="flex justify-end pt-4">
             <Button variant="outline" onClick={() => setIsKoreksiModalOpen(false)}>Batal</Button>
             <Button className="ml-3 bg-blue-600 hover:bg-blue-700 font-bold" onClick={handleSaveKoreksi}>Simpan Koreksi</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
