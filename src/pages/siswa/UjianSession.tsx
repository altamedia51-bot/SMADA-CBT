import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Clock, ChevronLeft, ChevronRight, Flag, Loader2, RotateCcw, Check } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp, setDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/auth.store';
import { toast } from 'sonner';

export default function UjianSession() {
  const { ujianId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [ujianData, setUjianData] = useState<any>(null);
  const [soalList, setSoalList] = useState<any[]>([]);
  const [jawabanDocId, setJawabanDocId] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [marked, setMarked] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [violations, setViolations] = useState(0);
  const [lastResetCounter, setLastResetCounter] = useState(0);
  const [matchingPendingLeft, setMatchingPendingLeft] = useState<number | null>(null);
  const [shuffledLeft, setShuffledLeft] = useState<{idx: number, text: string}[]>([]);
  const [shuffledRight, setShuffledRight] = useState<{idx: number, text: string}[]>([]);
  const activeSoalData = soalList[currentIndex];

  const matchingContainerRef = useRef<HTMLDivElement>(null);
  const leftItemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const rightItemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [, setUpdateTrigger] = useState(0);

  const colors = [
    'bg-blue-500', 'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 
    'bg-indigo-500', 'bg-cyan-500', 'bg-purple-500', 'bg-orange-500',
    'bg-teal-500', 'bg-pink-500'
  ];

  const colorMap: Record<string, string> = {
    'bg-blue-500': '#3b82f6',
    'bg-rose-500': '#f43f5e',
    'bg-amber-500': '#f59e0b',
    'bg-emerald-500': '#10b981',
    'bg-indigo-500': '#6366f1',
    'bg-cyan-500': '#06b6d4',
    'bg-purple-500': '#a855f7',
    'bg-orange-500': '#f97316',
    'bg-teal-500': '#14b8a6',
    'bg-pink-500': '#ec4899'
  };

  // Initialize
  useEffect(() => {
    if (!ujianId || !profile) return;

    const initExam = async () => {
      try {
        setLoading(true);
        // 1. Fetch Ujian
        const ujianSnap = await getDoc(doc(db, 'ujian', ujianId));
        if (!ujianSnap.exists()) {
          toast.error('Ujian tidak ditemukan!');
          return navigate('/siswa');
        }
        
        const dataUjian = ujianSnap.data();
        if (dataUjian.status !== 'aktif') {
          toast.error('Ujian belum dimulai atau sudah ditutup!');
          return navigate('/siswa');
        }
        setUjianData(dataUjian);

        // 2. Fetch Soal
        const soalQuery = collection(db, `paket_soal/${dataUjian.paketId}/soal`);
        const soalSnap = await getDocs(soalQuery);
        const loadedSoal = soalSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (loadedSoal.length === 0) {
           console.warn("Paket soal kosong");
        }
        setSoalList(loadedSoal);

        // 3. Initiate Jawaban Siswa Document if not exists
        const docId = `${ujianId}_${profile.uid}`;
        const jawabanRef = doc(db, 'jawaban_siswa', docId);
        const jawabanSnap = await getDoc(jawabanRef);

        if (!jawabanSnap.exists()) {
          try {
            await setDoc(jawabanRef, {
              ujianId,
              paketId: dataUjian.paketId,
              siswaId: profile.uid,
              siswaName: profile.displayName,
              siswaKelas: (profile as any).kelas || (profile as any).tingkat || 'Unknown',
              answers: {},
              marked: [],
              violations: 0,
              isSubmitted: false,
              startTime: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
            setJawabanDocId(docId);
            setTimeLeft(dataUjian.duration * 60); 
          } catch(err: any) {
            console.error("FIREBASE SETDOC ERROR:", err);
            // This usually happens because of Security Rules
            if (err.message?.includes('permission')) {
               toast.error("Izin Ditolak: Gagal membuat lembar jawaban. Pastikan status Guru/Siswa benar.");
            } else {
               toast.error("Gagal menyiapkan lembar ujian: " + err.message);
            }
            return navigate('/siswa');
          }
        } else {
          const jData = jawabanSnap.data();
          if (jData.isSubmitted) {
            toast.error('Kamu sudah mengumpulkan ujian ini!');
            return navigate('/siswa');
          }
          setJawabanDocId(docId);
          setAnswers(jData.answers || {});
          setMarked(jData.marked || []);
          setViolations(jData.violations || 0);
          setLastResetCounter(jData.resetCounter || 0);

          if (jData.startTime) {
            const startSec = jData.startTime.seconds;
            const nowSec = Math.floor(Date.now() / 1000);
            const passed = nowSec - startSec;
            const tLeft = (dataUjian.duration * 60) - passed;
            setTimeLeft(tLeft > 0 ? tLeft : 0);
          } else {
            setTimeLeft(dataUjian.duration * 60);
          }
        }
        setLoading(false);
      } catch (err: any) {
        console.error("INIT EXAM ERROR:", err);
        toast.error('Gagal memuat ujian', { description: err.message });
        navigate('/siswa');
      }
    };

    initExam();
  }, [ujianId, profile, navigate]);

  // Listen for reset timer by guru
  useEffect(() => {
    if (!jawabanDocId || !ujianData) return;
    const unsub = onSnapshot(doc(db, 'jawaban_siswa', jawabanDocId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.resetCounter && data.resetCounter > lastResetCounter) {
          setLastResetCounter(data.resetCounter);
          setTimeLeft(ujianData.duration * 60);
          toast.info("Waktu ujian Anda telah di-reset oleh guru.");
        }
      }
    });
    return () => unsub();
  }, [jawabanDocId, ujianData, lastResetCounter]);

  // Handle timer & auto-submit
  useEffect(() => {
    if (loading || timeLeft <= 0) {
      if (!loading && timeLeft <= 0) {
        handleFinish(true); // auto submit
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, timeLeft]);

  // Anti-cheat mechanisms
  useEffect(() => {
    if (loading || !jawabanDocId) return;
    let localViolations = violations;

    const logViolation = async (type: string) => {
      localViolations++;
      setViolations(localViolations);
      toast.error(`Pelanggaran Terdeteksi!`, {
        description: `Upaya ${type} terekam. Peringatan ke-${localViolations}/5`,
      });

      try {
        await addDoc(collection(db, `hasil_ujian/${jawabanDocId}/pelanggaran`), {
          type,
          timestamp: serverTimestamp()
        });
        
        await updateDoc(doc(db, 'jawaban_siswa', jawabanDocId), {
          violations: localViolations,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.warn("Log violation write failed:", err);
      }

      if (localViolations >= 5) {
        alert("Batas maksimal pelanggaran (5) tercapai. Ujian otomatis diakhiri.");
        handleFinish(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) logViolation('pindah_tab');
    };
    
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
      logViolation('copy_paste_right_click');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent PrintScreen, F12, Ctrl+C, Ctrl+V, etc.
      if (e.key === 'PrintScreen' || e.key === 'F12' || (e.ctrlKey && ['c', 'v', 'p'].includes(e.key.toLowerCase()))) {
        e.preventDefault();
        logViolation(`keyboard_shortcut_${e.key}`);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [loading, jawabanDocId, violations]);

  // Reset pending selection when changing question
  useEffect(() => {
    setMatchingPendingLeft(null);

    if (activeSoalData?.type === 'menjodohkan' && activeSoalData.pairs) {
      const left = activeSoalData.pairs.map((p: any, i: number) => ({ idx: i, text: p.left }));
      const right = activeSoalData.pairs.map((p: any, i: number) => ({ idx: i, text: p.right }));
      
      const shuffle = (array: any[]) => {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      };
      
      setShuffledLeft(shuffle(left));
      setShuffledRight(shuffle(right));
    } else {
      setShuffledLeft([]);
      setShuffledRight([]);
    }

    // Trigger line redraw
    setTimeout(() => setUpdateTrigger(p => p + 1), 100);
  }, [currentIndex, activeSoalData?.id]);

  useEffect(() => {
    const handleResize = () => setUpdateTrigger(p => p + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderMatchingLines = () => {
    if (!activeSoalData || activeSoalData.type !== 'menjodohkan' || !matchingContainerRef.current) return null;
    
    const currentMatches = answers[activeSoalData.id] || {};
    const lines: React.ReactNode[] = [];
    const containerRect = matchingContainerRef.current.getBoundingClientRect();

    Object.entries(currentMatches).forEach(([lIdx, rIdx]) => {
      const leftBtn = leftItemsRef.current[Number(lIdx)];
      const rightBtn = rightItemsRef.current[Number(rIdx)];

      if (leftBtn && rightBtn) {
        const lRect = leftBtn.getBoundingClientRect();
        const rRect = rightBtn.getBoundingClientRect();

        const x1 = lRect.left + lRect.width / 2 - containerRect.left;
        const y1 = lRect.top + lRect.height / 2 - containerRect.top;
        const x2 = rRect.left + rRect.width / 2 - containerRect.left;
        const y2 = rRect.top + rRect.height / 2 - containerRect.top;

        // Use a Bezier curve for a smoother, professional look
        // Control points are halfway between X1 and X2 to create an "S" shape
        const controlOffset = Math.abs(x2 - x1) * 0.4;
        const pathData = `M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`;

        const colorClass = colors[Number(lIdx) % colors.length];
        const color = colorMap[colorClass] || '#cbd5e1';

        lines.push(
          <motion.path 
            key={`${lIdx}-${rIdx}`}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            d={pathData}
            fill="transparent"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.1)]"
          />
        );
      }
    });

    return (
      <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible z-30">
        {lines}
      </svg>
    );
  };
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAnswer = async (soalId: string, answer: any) => {
    const newAnswers = { ...answers, [soalId]: answer };
    setAnswers(newAnswers);
    if (!jawabanDocId) return;

    // Supaya tidak spam firebase tiap keystroke di essay, debounce harusnya ada (di skip agar sederhana)
    // Tulis ke DB (Real-time sync answers)
    try {
      await updateDoc(doc(db, 'jawaban_siswa', jawabanDocId), {
        answers: newAnswers,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Failed saving answer sync", e);
    }
  };

  const toggleMark = async () => {
    if (!jawabanDocId) return;
    const isMarked = marked.includes(currentIndex);
    const newMarked = isMarked
      ? marked.filter(n => n !== currentIndex)
      : [...marked, currentIndex];
    
    setMarked(newMarked);
    try {
      await updateDoc(doc(db, 'jawaban_siswa', jawabanDocId), { marked: newMarked });
    } catch (e) {}
  };

  const handleFinish = async (isForced = false) => {
    if (!jawabanDocId) return;
    if (!isForced) {
      if (!confirm("Apakah Anda yakin ingin menyelesaikan ujian? Sisa waktu Anda akan hangus.")) return;
    }

    try {
      await updateDoc(doc(db, 'jawaban_siswa', jawabanDocId), {
        isSubmitted: true,
        submittedAt: serverTimestamp(),
      });
      toast.success(isForced ? 'Waktu / Pelanggaran Habis!' : 'Ujian Berhasil Disubmit');
      navigate('/siswa');
    } catch (err) {
      toast.error('Gagal mengsubmit ujian.');
    }
  };

  if (loading) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center flex-col text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
        <p className="font-medium animate-pulse">Menyiapkan Lembar Ujian...</p>
      </div>
    );
  }

  if (soalList.length === 0) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center flex-col">
        <p className="text-xl font-bold mb-4">Paket Soal Kosong</p>
        <Button onClick={() => navigate('/siswa')}>Kembali ke Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-100 flex flex-col select-none">
      {/* Header */}
      <header className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between shrink-0 shadow-md z-10">
        <div>
          <h1 className="font-bold">{ujianData?.title || 'Ujian CBT'}</h1>
          <p className="text-xs text-slate-400">{profile?.displayName} | Pelanggaran: {violations}/5</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-mono text-xl font-bold tracking-wider ${timeLeft < 300 ? 'bg-red-500/20 text-red-100' : 'bg-slate-800'}`}>
          <Clock className="w-5 h-5" />
          {formatTime(timeLeft)}
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Konten Soal */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Card className="max-w-4xl mx-auto shadow-sm">
            <div className="flex justify-between items-center border-b px-6 py-4 bg-slate-50 rounded-t-xl">
              <h2 className="font-bold text-lg text-slate-800">Soal No. {currentIndex + 1}</h2>
              <Button 
                variant="outline" 
                size="sm" 
                className={`gap-2 ${marked.includes(currentIndex) ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200' : 'hover:bg-slate-100'}`}
                onClick={toggleMark}
              >
                <Flag className="w-4 h-4" />
                {marked.includes(currentIndex) ? 'Ditandai Ragu-ragu' : 'Tandai Ragu-ragu'}
              </Button>
            </div>
            
            <CardContent className="p-6 md:p-8 text-lg text-slate-800">
              {/* Stimulus / Wacana */}
              {activeSoalData?.stimulus && (
                <div className="mb-6 p-5 bg-blue-50/50 border border-blue-100 rounded-lg text-sm leading-relaxed">
                  <div dangerouslySetInnerHTML={{ __html: activeSoalData.stimulus }} />
                </div>
              )}

              {/* Teks Soal */}
              <div className="mb-8 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: activeSoalData?.content || activeSoalData?.question || '' }} />

              {/* Lampiran Gambar (Jika ada) */}
              {(activeSoalData?.imageUrl || activeSoalData?.image) && (
                <div className="mb-8 rounded-xl overflow-hidden border-2 border-slate-100 bg-white">
                  <img src={activeSoalData.imageUrl || activeSoalData.image} alt="Lampiran Soal" className="max-h-[400px] w-full object-contain mx-auto" />
                </div>
              )}

              {/* Opsi / Field Jawaban */}
              {activeSoalData?.type === 'menjodohkan' && (
                <div className="mt-4 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                       <AlertCircle className="w-4 h-4 text-blue-500" />
                       Pilih item di kiri lalu pasangkan ke kanan
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-rose-600 hover:bg-rose-50 font-bold gap-2 h-8 px-3 rounded-lg"
                      onClick={() => handleAnswer(activeSoalData.id, {})}
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset
                    </Button>
                  </div>

                  <div className="overflow-x-auto relative" ref={matchingContainerRef}>
                    {renderMatchingLines()}
                    <table className="w-full border-separate border-spacing-y-2 relative z-10">
                       <thead>
                        <tr className="bg-slate-50">
                          <th className="p-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400 border-b">{activeSoalData.leftTitle || 'Pernyataan (Kiri)'}</th>
                          <th className="p-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 border-b w-16">Pilih</th>
                          <th className="p-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 border-b w-12 italic">Cek</th>
                          <th className="p-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 border-b w-16">Pilih</th>
                          <th className="p-3 text-right text-[10px] font-black uppercase tracking-wider text-slate-400 border-b">{activeSoalData.rightTitle || 'Jawaban (Kanan)'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(shuffledLeft.length > 0 ? shuffledLeft : []).map((leftItem, idx) => {
                          const rightItem = shuffledRight[idx];
                          if (!rightItem) return null;

                          const currentMatches = answers[activeSoalData.id] || {};
                          
                          // Find if this left index is matched
                          const matchedRightIdx = currentMatches[leftItem.idx] !== undefined ? currentMatches[leftItem.idx] : null;

                          // Find if this right index (original) is matched by ANY left index
                          let matchedLeftIdxForRight: number | null = null;
                          Object.entries(currentMatches).forEach(([l, r]) => {
                            if (Number(r) === rightItem.idx) matchedLeftIdxForRight = Number(l);
                          });

                          return (
                            <tr key={idx} className="group">
                              {/* Left Text */}
                              <td className="p-4 border border-r-0 rounded-l-2xl text-sm font-bold text-slate-700 leading-tight bg-white group-hover:bg-slate-50 transition-colors">
                                {leftItem.text}
                              </td>

                              {/* Left Selection Point */}
                              <td className="p-2 border border-l-0 border-r-0 text-center bg-white group-hover:bg-slate-50 transition-colors">
                                <button
                                  type="button"
                                  ref={el => leftItemsRef.current[leftItem.idx] = el}
                                  onClick={() => setMatchingPendingLeft(leftItem.idx)}
                                  className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center transition-all duration-300 relative z-20 ${
                                    matchedRightIdx !== null 
                                      ? colors[leftItem.idx % colors.length] + ' text-white shadow-md ring-2 ring-white ring-offset-2'
                                      : matchingPendingLeft === leftItem.idx
                                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                                  }`}
                                >
                                  {matchedRightIdx !== null ? <Check className="w-5 h-5" /> : <span className="text-[10px] font-black">{idx + 1}</span>}
                                </button>
                              </td>

                              {/* Indicator */}
                              <td className="p-2 border border-l-0 border-r-0 text-center bg-slate-50/50">
                                {matchedRightIdx !== null && (
                                   <div className={`h-1.5 w-1.5 mx-auto rounded-full ${colors[leftItem.idx % colors.length]} animate-in zoom-in duration-300`}></div>
                                )}
                              </td>

                              {/* Right Selection Point */}
                              <td className="p-2 border border-l-0 border-r-0 text-center bg-white group-hover:bg-slate-50 transition-colors">
                                <button
                                  type="button"
                                  ref={el => rightItemsRef.current[rightItem.idx] = el}
                                  disabled={matchingPendingLeft === null}
                                  onClick={() => {
                                    if (matchingPendingLeft !== null) {
                                      const newMatches = { ...currentMatches };
                                      
                                      // Remove any existing match for this right index (ensure 1-to-1)
                                      Object.keys(newMatches).forEach(key => {
                                        if (newMatches[key] === rightItem.idx) delete newMatches[key];
                                      });
                                      
                                      newMatches[matchingPendingLeft] = rightItem.idx;
                                      handleAnswer(activeSoalData.id, newMatches);
                                      setMatchingPendingLeft(null);
                                      // Trigger update for line calculation
                                      setUpdateTrigger(p => p + 1);
                                    }
                                  }}
                                  className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center transition-all duration-300 relative z-20 ${
                                    matchedLeftIdxForRight !== null
                                      ? colors[matchedLeftIdxForRight % colors.length] + ' text-white shadow-md ring-2 ring-white ring-offset-2'
                                      : matchingPendingLeft !== null
                                        ? 'bg-white border-2 border-dashed border-blue-400 text-blue-500 hover:border-solid hover:bg-blue-50 animate-bounce'
                                        : 'bg-slate-50 text-slate-300 cursor-not-allowed'
                                  }`}
                                >
                                  {matchedLeftIdxForRight !== null ? <Check className="w-5 h-5" /> : null}
                                </button>
                              </td>

                              {/* Right Text */}
                              <td className="p-4 border border-l-0 rounded-r-2xl text-sm font-bold text-slate-700 leading-tight text-right bg-white group-hover:bg-slate-50 transition-colors">
                                {rightItem.text}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeSoalData?.type === 'pg' && activeSoalData.options && (
                <div className="space-y-3">
                  {activeSoalData.options.map((opt: string, i: number) => {
                    const alphabet = String.fromCharCode(65 + i); // A, B, C, D...
                    const isSelected = answers[activeSoalData.id] === alphabet;
                    return (
                      <div 
                        key={i} 
                        className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50 shadow-[0_0_0_2px_rgba(59,130,246,0.1)]' 
                            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                        onClick={() => handleAnswer(activeSoalData.id, alphabet)}
                      >
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold shrink-0 mr-4 ${
                          isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 text-slate-500'
                        }`}>
                          {alphabet}
                        </div>
                        <div className="mt-1 flex-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: opt }} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Soal PG Kompleks (PGK) */}
              {activeSoalData?.type === 'pgk' && activeSoalData.options && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-blue-600 mb-4 bg-blue-50 px-3 py-1 rounded-full w-fit">Pilih satu atau lebih jawaban benar:</p>
                  {activeSoalData.options.map((opt: string, i: number) => {
                    const alphabet = String.fromCharCode(65 + i);
                    const currentAnswers = Array.isArray(answers[activeSoalData.id]) ? answers[activeSoalData.id] : [];
                    const isSelected = currentAnswers.includes(alphabet);
                    
                    return (
                      <div 
                        key={i} 
                        className={`flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'border-purple-500 bg-purple-50 shadow-[0_0_0_2px_rgba(168,85,247,0.1)]' 
                            : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                        }`}
                        onClick={() => {
                          let next: string[];
                          if (isSelected) {
                            next = currentAnswers.filter((a: string) => a !== alphabet);
                          } else {
                            next = [...currentAnswers, alphabet];
                          }
                          handleAnswer(activeSoalData.id, next);
                        }}
                      >
                        <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center font-bold shrink-0 mr-4 transition-colors ${
                          isSelected ? 'bg-purple-500 border-purple-500 text-white' : 'border-slate-300 text-slate-500'
                        }`}>
                          {isSelected ? <Check className="w-5 h-5" /> : alphabet}
                        </div>
                        <div className="mt-1 flex-1 leading-relaxed" dangerouslySetInnerHTML={{ __html: opt }} />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Soal Isian Singkat */}
              {activeSoalData?.type === 'isian' && (
                <div className="space-y-3">
                   <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Jawaban Singkat:</p>
                   <input 
                     type="text" 
                     className="w-full p-4 border-2 border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all font-medium text-lg"
                     placeholder="Ketik jawaban Anda disini..."
                     value={answers[activeSoalData.id] || ''}
                     onChange={(e) => handleAnswer(activeSoalData.id, e.target.value)}
                   />
                </div>
              )}

              {/* Benar Salah */}
              {activeSoalData?.type === 'benarSalah' && (
                <div className="space-y-4 max-w-lg mx-auto py-4">
                   <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider text-center mb-6">Pilih Pernyataan:</p>
                   <div className="flex gap-4">
                      <button 
                        type="button"
                        className={`flex-1 flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 group ${
                          answers[activeSoalData.id] === 'Benar'
                            ? 'bg-emerald-50 border-emerald-500 shadow-lg scale-[1.05]'
                            : 'bg-white border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30'
                        }`}
                        onClick={() => handleAnswer(activeSoalData.id, 'Benar')}
                      >
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-colors ${
                          answers[activeSoalData.id] === 'Benar' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-500'
                        }`}>
                          <Check className="w-8 h-8" />
                        </div>
                        <span className={`text-xl font-black ${answers[activeSoalData.id] === 'Benar' ? 'text-emerald-700' : 'text-slate-600'}`}>BENAR</span>
                      </button>

                      <button 
                        type="button"
                        className={`flex-1 flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 group ${
                          answers[activeSoalData.id] === 'Salah'
                            ? 'bg-rose-50 border-rose-500 shadow-lg scale-[1.05]'
                            : 'bg-white border-slate-200 hover:border-rose-200 hover:bg-rose-50/30'
                        }`}
                        onClick={() => handleAnswer(activeSoalData.id, 'Salah')}
                      >
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-colors ${
                          answers[activeSoalData.id] === 'Salah' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-rose-100 group-hover:text-rose-500'
                        }`}>
                          <RotateCcw className="w-8 h-8 rotate-45" />
                        </div>
                        <span className={`text-xl font-black ${answers[activeSoalData.id] === 'Salah' ? 'text-rose-700' : 'text-slate-600'}`}>SALAH</span>
                      </button>
                   </div>
                </div>
              )}
            </CardContent>
            
            {/* Navigasi Bawah */}
            <div className="border-t p-4 px-6 bg-slate-50 rounded-b-xl flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="font-medium"
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Soal Sebelumnya
              </Button>
              <Button 
                onClick={() => setCurrentIndex(prev => Math.min(soalList.length - 1, prev + 1))}
                disabled={currentIndex === soalList.length - 1}
                className="font-medium bg-blue-600 hover:bg-blue-700"
              >
                Selanjutnya <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Sidebar Navigasi Soal */}
        <div className="w-80 bg-white border-l flex flex-col shrink-0 shadow-[-4px_0_15px_rgba(0,0,0,0.02)]">
          <div className="p-4 border-b bg-slate-50">
            <h3 className="font-bold text-slate-800">Navigasi Soal</h3>
            <p className="text-sm text-slate-500 mt-1">
              Terjawab: <span className="font-bold text-emerald-600">{Object.keys(answers).length}</span> / {soalList.length}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 content-start">
            <div className="grid grid-cols-5 gap-2">
              {soalList.map((soal, index) => {
                const isActive = currentIndex === index;
                const isMarked = marked.includes(index);
                const rawAnswer = answers[soal.id];
                const hasAnswer = (soal.type === 'menjodohkan' || soal.type === 'pgk')
                  ? (rawAnswer && Object.keys(rawAnswer).length > 0)
                  : (rawAnswer !== undefined && rawAnswer !== '');

                let btnClass = "h-11 w-full font-semibold border-2 transition-all p-0 ";
                
                if (isActive) btnClass += "ring-2 ring-blue-400 ring-offset-2 border-blue-600 bg-blue-50 text-blue-800 ";
                else if (isMarked) btnClass += "border-amber-400 bg-amber-100 text-amber-800 hover:bg-amber-200 ";
                else if (hasAnswer) btnClass += "border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 ";
                else btnClass += "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50";

                return (
                  <Button 
                    key={soal.id} 
                    variant="outline" 
                    className={btnClass}
                    onClick={() => setCurrentIndex(index)}
                  >
                    {index + 1}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="p-4 border-t bg-slate-50">
            <Button 
              className="w-full font-bold text-base h-12 bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
              onClick={() => handleFinish(false)}
            >
              Kumpulkan Ujian
            </Button>
          </div>
        </div>

      </main>
    </div>
  );
}
