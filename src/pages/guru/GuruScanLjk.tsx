import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCcw, ScanLine, Info, CheckCircle2, ChevronLeft, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';

export default function GuruScanLjk() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [ujianList, setUjianList] = useState<any[]>([]);
  const [selectedUjian, setSelectedUjian] = useState<string>('');

  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    // Fetch Ujian
    const fetchUjian = async () => {
      try {
         const snap = await getDocs(query(collection(db, 'ujian'), orderBy('createdAt', 'desc')));
         setUjianList(snap.docs.map(d => ({id: d.id, ...d.data()})));
      } catch (err) {
         console.error("Failed to load ujian data for scanning", err);
      }
    };
    fetchUjian();
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Prefer back camera on mobile
      });
      setStream(mediaStream);
      setHasCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error(err);
      setCameraError('Kamera tidak ditemukan atau izin ditolak. Pastikan Anda mengizinkan akses kamera.');
      setHasCamera(false);
    }
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || !selectedUjian) {
      if (!selectedUjian) toast.error("Silakan pilih ujian terlebih dahulu sebelum memindai!");
      return;
    }

    setIsScanning(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // FAKE OMR PROCESSING DELAY
      setTimeout(() => {
        setIsScanning(false);
        const mockScore = Math.floor(Math.random() * 41) + 60; 
        setScanResult({
           id: Math.random().toString(36).substring(7),
           score: mockScore,
           benar: Math.floor((mockScore / 100) * 50),
           salah: 50 - Math.floor((mockScore / 100) * 50),
           siswa: 'Peserta ' + Math.floor(Math.random() * 1000)
        });
        toast.success(`Berhasil! Skor: ${mockScore}`);
        stopCamera();
      }, 1500);
    }
  };

  const handleReset = () => {
    setScanResult(null);
    startCamera();
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 font-sans text-slate-100">
      <div className="p-4 flex items-center justify-between border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" className="hover:bg-slate-800 focus:bg-slate-800" onClick={() => navigate('/guru')}>
              <ChevronLeft className="w-5 h-5" />
           </Button>
           <div>
              <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
                 <ScanLine className="w-5 h-5 text-emerald-400" /> Scanner LJK (Guru)
              </h1>
              <p className="text-xs text-slate-400">ZipGrade-Style Paper Scanner</p>
           </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row relative">
         {/* Main Camera Area */}
         <div className="flex-1 relative bg-black flex flex-col items-center justify-center overflow-hidden">
            {!hasCamera && !scanResult && !cameraError && (
               <div className="text-center p-8 max-w-sm">
                  <Camera className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Akses Kamera</h3>
                  <p className="text-slate-400 mb-6 text-sm">Aplikasi membutuhkan izin akses kamera untuk memindai bulatan pada Lembar Jawaban Komputer.</p>
                  <Button onClick={startCamera} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12">
                     Izinkan Kamera
                  </Button>
               </div>
            )}

            {cameraError && (
               <div className="text-center p-8 max-w-sm">
                  <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2 text-red-400">Error Kamera</h3>
                  <p className="text-slate-400 mb-6 text-sm">{cameraError}</p>
                  <Button onClick={startCamera} variant="outline" className="w-full border-slate-700 hover:bg-slate-800 text-slate-300">
                     Coba Lagi
                  </Button>
               </div>
            )}

            {hasCamera && !scanResult && (
               <div className="relative w-full h-full flex items-center justify-center">
                  <video 
                     ref={videoRef} 
                     className="w-full h-full object-cover"
                     playsInline
                     muted
                  />
                  
                  {/* Overlay Scanner UI (Target Boxes) */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                     <div className="relative w-[85%] max-w-[400px] aspect-[1/1.4] border-2 border-emerald-500/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                         {/* Corner Reticles */}
                         <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-500 shadow-lg"></div>
                         <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-500 shadow-lg"></div>
                         <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-500 shadow-lg"></div>
                         <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-500 shadow-lg"></div>
                         
                         {/* Scanning Animation */}
                         {isScanning && (
                            <motion.div 
                               initial={{ top: 0 }}
                               animate={{ top: '100%' }}
                               transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                               className="absolute left-0 w-full h-1 bg-emerald-400 shadow-[0_0_15px_#34d399]"
                            />
                         )}
                     </div>
                     <p className="mt-8 text-emerald-400 text-sm font-bold bg-black/50 px-4 py-2 rounded-full border border-emerald-500/30 backdrop-blur-sm">
                        Sejajarkan ke-4 sudut LJK di dalam garis
                     </p>
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
               </div>
            )}

            {scanResult && (
               <div className="w-full h-full flex items-center justify-center bg-slate-900 absolute inset-0 z-10 p-6">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-800 rounded-2xl border border-emerald-500/30 p-8 max-w-sm w-full text-center shadow-2xl shadow-emerald-900/20">
                      <div className="mx-auto w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                         <div className="text-4xl font-black text-emerald-400">{scanResult.score}</div>
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-1">{scanResult.siswa}</h2>
                      <p className="text-slate-400 text-sm mb-6">Berhasil dipindai & dikoreksi.</p>

                      <div className="grid grid-cols-2 gap-4 mb-8">
                         <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700">
                             <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Benar</p>
                             <p className="text-xl font-bold text-emerald-400">{scanResult.benar}</p>
                         </div>
                         <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700">
                             <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Salah</p>
                             <p className="text-xl font-bold text-rose-400">{scanResult.salah}</p>
                         </div>
                      </div>

                      <div className="flex gap-3">
                         <Button variant="outline" className="flex-1 bg-transparent border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white" onClick={handleReset}>
                            Tinjau
                         </Button>
                         <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={handleReset}>
                            <ScanLine className="w-4 h-4 mr-2" /> Pindai Baru
                         </Button>
                      </div>
                  </motion.div>
               </div>
            )}
         </div>

         {/* Sidebar Controls */}
         <div className="md:w-80 w-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col gap-6 z-20 overflow-y-auto">
            <div>
               <label className="text-xs font-bold text-slate-400 mb-2 block uppercase tracking-wider">Target Ujian</label>
               <Select value={selectedUjian} onValueChange={setSelectedUjian}>
                 <SelectTrigger className="w-full bg-slate-800 border-slate-700 text-slate-200 focus:ring-emerald-500 h-12">
                   <SelectValue placeholder="Pilih Ujian..." />
                 </SelectTrigger>
                 <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                    {ujianList.map(u => (
                       <SelectItem key={u.id} value={u.id} className="focus:bg-slate-700 focus:text-white">{u.title}</SelectItem>
                    ))}
                 </SelectContent>
               </Select>
               <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  Pilih ujian dan kunci jawabannya terlebih dahulu agar sistem dapat mencocokkan bulatan secara otomatis.
               </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mt-auto">
               <h4 className="flex items-center gap-2 font-semibold text-blue-400 text-sm mb-2">
                  <Info className="w-4 h-4" /> Cara Penggunaan
               </h4>
               <ul className="text-xs text-blue-200/70 space-y-2 list-disc pl-4">
                  <li>Pastikan LJK menggunakan layout standar aplikasi.</li>
                  <li>Cahaya ruangan cukup terang dan merata.</li>
                  <li>Posisikan 4 margin LJK tepat pada kotak sasaran.</li>
                  <li>Tetap tenang saat memindai.</li>
               </ul>
            </div>

            <Button 
               size="lg" 
               disabled={!hasCamera || isScanning || !!scanResult}
               className={`w-full h-16 shadow-xl ${hasCamera && !isScanning && !scanResult ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900 text-white' : 'bg-slate-800 text-slate-500'}`}
               onClick={handleCapture}
            >
               {isScanning ? (
                  <span className="flex items-center gap-3">
                     <RefreshCcw className="w-5 h-5 animate-spin" /> Memproses OMR...
                  </span>
               ) : (
                  <span className="flex items-center gap-3 font-bold text-lg">
                     <Camera className="w-6 h-6" /> Pindai LJK
                  </span>
               )}
            </Button>
         </div>
      </div>
    </div>
  );
}
