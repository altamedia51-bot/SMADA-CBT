import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Clock, ChevronLeft, ChevronRight, Flag, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
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
              siswaKelas: (profile as any).kelasId || 'Unknown',
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

  const activeSoalData = soalList[currentIndex];

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
              <div className="mb-8 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: activeSoalData?.question || '' }} />

              {/* Opsi / Field Jawaban */}
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

              {/* Soal Essay */}
              {activeSoalData?.type === 'essay' && (
                <div className="space-y-3">
                   <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Uraian / Essay:</p>
                   <textarea 
                     rows={6}
                     className="w-full p-4 border-2 border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all resize-none"
                     placeholder="Ketik uraian jawaban terperinci Anda disini..."
                     value={answers[activeSoalData.id] || ''}
                     onChange={(e) => handleAnswer(activeSoalData.id, e.target.value)}
                   />
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
                const hasAnswer = answers[soal.id] !== undefined && answers[soal.id] !== '';

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
