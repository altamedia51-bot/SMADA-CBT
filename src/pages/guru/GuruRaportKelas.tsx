import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/auth.store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Settings, Printer, FileText, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAppSettings } from '../../hooks/useAppSettings';
import domtoimage from 'dom-to-image';
import { jsPDF } from 'jspdf';

export default function GuruRaportKelas() {
  const { profile, activeTahunAjaran: authTahunAjaran } = useAuthStore();
  
  const [mapelList, setMapelList] = useState<any[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  
  const { settings } = useAppSettings();
  const [tahunAjaran, setTahunAjaran] = useState(authTahunAjaran || settings.activeTahunAjaran || '2025/2026');
  const [semester, setSemester] = useState('Ganjil');
  const [raportData, setRaportData] = useState<Record<string, Record<string, any>>>({}); // siswaId -> mapelId -> nilaiInfo
  const [pembinaanData, setPembinaanData] = useState<Record<string, string>>({}); // siswaId -> catatan
  const [absensiData, setAbsensiData] = useState<Record<string, { sakit: string; izin: string; alpa: string }>>({}); // siswaId -> data

  useEffect(() => {
     if (authTahunAjaran) {
        setTahunAjaran(authTahunAjaran);
     } else if (settings.activeTahunAjaran) {
        setTahunAjaran(settings.activeTahunAjaran);
     }
  }, [authTahunAjaran, settings.activeTahunAjaran]);

  const [loading, setLoading] = useState(false);
  const [printMode, setPrintMode] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Settings Raport
  const [kepalaSekolah, setKepalaSekolah] = useState('');
  const [nipKepalaSekolah, setNipKepalaSekolah] = useState('');
  const [dataGuru, setDataGuru] = useState<any[]>([]);
  // format YYYY-MM-DD for input date type
  const [tanggalRaportInput, setTanggalRaportInput] = useState(new Date().toISOString().split('T')[0]);
  const [printConfig, setPrintConfig] = useState<any>(null);

  useEffect(() => {
    const fetchGuru = async () => {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      const guruArr = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any).filter((user: any) => user.role === 'guru' || user.role === 'admin');
      setDataGuru(guruArr);
    };
    fetchGuru();
  }, []);

  useEffect(() => {
    const savedConfig = localStorage.getItem('printConfig');
    if (savedConfig) setPrintConfig(JSON.parse(savedConfig));
  }, []);

  const handlePrint = (mode: string) => {
      setPrintMode(mode);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('print-container');
      if (!element) return;
      
      const originalCssText = element.style.cssText;
      element.style.width = '210mm'; 
      element.style.maxWidth = 'none';
      element.style.margin = '0';
      if (!element.querySelector('.pdf-page')) {
          element.style.padding = '10mm';
      } else {
          element.style.padding = '0';
      }
      
      element.classList.remove('my-8', 'shadow-2xl', 'mx-auto');
      await new Promise(resolve => setTimeout(resolve, 500));

      const isLandscape = printMode.startsWith('ledger') || printMode === 'dkn';
      const pdf = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const pages = element.querySelectorAll('.pdf-page');

      if (pages.length > 0) {
        for (let i = 0; i < pages.length; i++) {
          const pageEl = pages[i] as HTMLElement;
          const dataUrl = await domtoimage.toJpeg(pageEl, { quality: 1, bgcolor: '#ffffff' });
          if (i > 0) pdf.addPage();
          const imgHeight = (pageEl.offsetHeight * pdfWidth) / pageEl.offsetWidth;
          pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, imgHeight);
        }
      } else {
        const dataUrl = await domtoimage.toJpeg(element, { quality: 1, bgcolor: '#ffffff' });
        const imgHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(dataUrl, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(dataUrl, 'JPEG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      pdf.save(`Export_${printMode}_${profile?.waliKelas}_${new Date().getTime()}.pdf`);

      element.style.cssText = originalCssText;
      element.classList.add('my-8', 'shadow-2xl', 'mx-auto');
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mengekspor PDF: ' + (err?.message || 'Error tidak diketahui'));
    } finally {
      setIsExporting(false);
    }
  };


  useEffect(() => {
    const unsubMapel = onSnapshot(collection(db, 'mapel'), snap => {
      setMapelList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubMapel(); };
  }, []);

  useEffect(() => {
    if (profile?.waliKelas && mapelList.length > 0) {
      loadData();
    }
  }, [profile?.waliKelas, tahunAjaran, semester, mapelList.length]);

  const loadData = async () => {
    if (!profile?.waliKelas) return;
    setLoading(true);

    try {
      const allNilai: Record<string, Record<string, any>> = {}; // [siswaId][mapelId]
      const docsSnap = await getDocs(collection(db, 'nilai_raport'));
      
      // Filter by class, TA, and Semester
      const suffix = `_${tahunAjaran.replace(/\//g, '-')}_${semester}`;
      const prefix = `${profile.waliKelas}_`;
      
      const relatedDocs = docsSnap.docs.filter(d => 
        d.id.startsWith(prefix) && d.id.endsWith(suffix)
      );

      // Load Siswa for this class
      const usersSnap = await getDocs(query(collection(db, 'users')));
      const siswas = usersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((u: any) => u.role === 'siswa' && u.kelas === profile.waliKelas)
        .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));
      
      setSiswaList(siswas);

      // doc id format: Kelas_MapelName_TA_Semester
      for (const d of relatedDocs) {
        // extract mapel name
        const withoutPrefix = d.id.replace(prefix, ''); // "Matematika_2024-2025_Ganjil"
        const withoutSuffix = withoutPrefix.substring(0, withoutPrefix.lastIndexOf(`_${tahunAjaran.replace(/\//g, '-')}`));
        const mapelName = withoutSuffix; // e.g., Matematika
        
        // Find mapelId
        const m = mapelList.find(x => x.name === mapelName);
        if (!m) continue;

        const data = d.data().nilai || {};
        for (const [siswaId, stData] of Object.entries<any>(data)) {
          if (!allNilai[siswaId]) allNilai[siswaId] = {};
          
          let nilaiAkhir = 0;
          let avgF = 0;
          let avgS = 0;
          let finalPts = 0;
          let finalPsas = 0;

          if (stData) {
             const fValid = Array.isArray(stData.formatif) ? stData.formatif.filter((v:any) => typeof v === 'number') as number[] : [];
             avgF = fValid.length > 0 ? fValid.reduce((a,b) => a+b, 0) / fValid.length : 0;
             
             const sValid = Array.isArray(stData.sumatif) ? stData.sumatif.filter((v:any) => typeof v === 'number') as number[] : [];
             avgS = sValid.length > 0 ? sValid.reduce((a,b) => a+b, 0) / sValid.length : 0;
             
             finalPts = typeof stData.katrol_pts === 'number' && stData.katrol_pts > 0 ? stData.katrol_pts : (typeof stData.pts === 'number' ? stData.pts : 0);
             finalPsas = typeof stData.katrol_psas === 'number' && stData.katrol_psas > 0 ? stData.katrol_psas : (typeof stData.psas === 'number' ? stData.psas : 0);
             
             const components = [];
             if (avgF > 0) components.push(avgF);
             if (avgS > 0) components.push(avgS);
             if (finalPts > 0) components.push(finalPts);
             if (finalPsas > 0) components.push(finalPsas);
             
             if (components.length > 0) {
                 nilaiAkhir = Math.round(components.reduce((a,b) => a+b, 0) / components.length);
             }
          }

          allNilai[siswaId][m.id] = {
            nilai: Math.round(nilaiAkhir),
            nilai_pts: typeof stData?.pts === 'number' ? Math.round(stData.pts) : null,
            deskripsi: stData?.deskripsi || '',
            avgF: Math.round(avgF),
            avgS: Math.round(avgS),
            ptsVal: Math.round(finalPts),
            psasVal: Math.round(finalPsas)
          };
        }
      }

      setRaportData(allNilai);

      // Load Pembinaan
      const pembinaanRef = doc(db, 'pembinaan_wali', `${profile.waliKelas}_${tahunAjaran.replace(/\//g, '-')}_${semester}`);
      const pembinaanSnap = await getDoc(pembinaanRef);
      if (pembinaanSnap.exists()) {
         setPembinaanData(pembinaanSnap.data().catatan || {});
      } else {
         setPembinaanData({});
      }

      // Load Absensi
      const absensiRef = doc(db, 'absensi_wali', `${profile.waliKelas}_${tahunAjaran.replace(/\//g, '-')}_${semester}`);
      const absensiSnap = await getDoc(absensiRef);
      if (absensiSnap.exists()) {
         setAbsensiData(absensiSnap.data().data || {});
      } else {
         setAbsensiData({});
      }

    } catch (err: any) {
      toast.error('Gagal memuat data raport: ' + err.message);
    }
    setLoading(false);
  };

  const savePembinaan = async () => {
    if (!profile?.waliKelas) return;
    try {
      await setDoc(doc(db, 'pembinaan_wali', `${profile.waliKelas}_${tahunAjaran.replace(/\//g, '-')}_${semester}`), {
        catatan: pembinaanData,
        updatedAt: new Date(),
        updatedBy: profile.uid
      });
      // Save Absensi
      await setDoc(doc(db, 'absensi_wali', `${profile.waliKelas}_${tahunAjaran.replace(/\//g, '-')}_${semester}`), {
        data: absensiData,
        updatedAt: new Date(),
        updatedBy: profile.uid
      });
      toast.success('Data pembinaan dan absensi berhasil disimpan');
    } catch (err: any) {
      toast.error('Gagal menyimpan: ' + err.message);
    }
  };

  const generateCatatanOtomatis = () => {
      const baru = { ...pembinaanData };
      siswaList.forEach(s => {
          const rank = rankSiswa[s.id];
          if (!rank) return;
          if (rank === 1) baru[s.id] = "Sangat baik, tetap pertahankan prestasimu dan jadikan motivasi untuk terus maju!";
          else if (rank === 2) baru[s.id] = "Prestasi yang sangat membanggakan, pertahankan dan terus tingkatkan belajarmu!";
          else if (rank === 3) baru[s.id] = "Hasil yang luar biasa, terus semangat belajar dan tingkatkan terus prestasimu.";
          else if (rank <= 5) baru[s.id] = "Sangat bagus, kamu masuk peringkat 5 besar! Tetap semangat belajar.";
          else if (rank <= 10) baru[s.id] = "Prestasi yang baik. Tingkatkan lagi belajarmu agar bisa masuk 5 besar.";
          else baru[s.id] = "Terus semangat belajar, tingkatkan kedisiplinan dan jangan mudah menyerah.";
      });
      setPembinaanData(baru);
      toast.success("Catatan otomatis diisi berdasarkan ranking awal.");
  };

  if (!profile?.waliKelas) {
    return (
      <div className="p-8 text-center text-slate-500">
        Anda bukan wali kelas.
      </div>
    );
  }

  // Calculate Average and Rank
  const isPtsMode = printMode === 'raport_pts' || printMode === 'ledger_pts';
  const rataRataSiswa: Record<string, number> = {};
  const jumlahNilaiSiswa: Record<string, number> = {};

  siswaList.forEach(s => {
    const nilai = raportData[s.id] || {};
    const scores = Object.values(nilai).map((v: any) => isPtsMode ? v.nilai_pts : v.nilai).filter(n => typeof n === 'number' && !isNaN(n));
    if (scores.length > 0) {
      jumlahNilaiSiswa[s.id] = scores.reduce((a, b) => a + b, 0);
      rataRataSiswa[s.id] = jumlahNilaiSiswa[s.id] / scores.length;
    } else {
      jumlahNilaiSiswa[s.id] = 0;
      rataRataSiswa[s.id] = 0;
    }
  });

  const sortedByRataRata = [...siswaList].sort((a, b) => rataRataSiswa[b.id] - rataRataSiswa[a.id]);
  const rankSiswa: Record<string, number> = {};
  sortedByRataRata.forEach((s, i) => {
      rankSiswa[s.id] = i + 1;
  });

  // usedMapel: mapped ones that have scores
  const usedMapel = mapelList.filter(m => siswaList.some(s => {
      const data = raportData[s.id]?.[m.id];
      return !!data;
  }));

  // stats calculation
  const mapelStats: Record<string, { min: number, max: number, avg: number, stdDev: number }> = {};
  usedMapel.forEach(m => {
     const scores = siswaList.map(s => {
         const data = raportData[s.id]?.[m.id];
         return isPtsMode ? data?.nilai_pts : data?.nilai;
     }).filter(n => typeof n === 'number' && !isNaN(n));
     if (scores.length > 0) {
        const min = Math.min(...scores);
        const max = Math.max(...scores);
        const avg = scores.reduce((a,b) => a+b, 0) / scores.length;
        const variance = scores.reduce((a,b) => a + Math.pow(b - avg, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);
        mapelStats[m.id] = { min, max, avg, stdDev };
     } else {
        mapelStats[m.id] = { min: 0, max: 0, avg: 0, stdDev: 0 };
     }
  });

  const allTotals = Object.values(jumlahNilaiSiswa).filter(t => t > 0);
  const totalStats = {
     min: allTotals.length ? Math.min(...allTotals) : 0,
     max: allTotals.length ? Math.max(...allTotals) : 0,
     avg: allTotals.length ? allTotals.reduce((a,b)=>a+b,0)/allTotals.length : 0,
     stdDev: allTotals.length ? Math.sqrt(allTotals.reduce((a,b) => a + Math.pow(b - (allTotals.reduce((x,y)=>x+y,0)/allTotals.length), 2), 0) / allTotals.length) : 0,
  };

  const allAvgs = Object.values(rataRataSiswa).filter(a => a > 0);
  const avgStats = {
     min: allAvgs.length ? Math.min(...allAvgs) : 0,
     max: allAvgs.length ? Math.max(...allAvgs) : 0,
     avg: allAvgs.length ? allAvgs.reduce((a,b)=>a+b,0)/allAvgs.length : 0,
     stdDev: allAvgs.length ? Math.sqrt(allAvgs.reduce((a,b) => a + Math.pow(b - (allAvgs.reduce((x,y)=>x+y,0)/allAvgs.length), 2), 0) / allAvgs.length) : 0,
  };

   if (printMode !== null) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-200 overflow-y-auto w-full h-full print:static print:h-auto print:w-auto print:overflow-visible print:bg-white text-black">
          <style>{`
              .page-break { page-break-after: always; break-after: page; }
              @media print {
              html, body {
                height: auto !important;
                min-height: auto !important;
                overflow: visible !important;
                background-color: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body > :not(#root) { display: none !important; }
              #print-container {
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 0 !important;
                background-color: white !important;
              }
              .no-print, .no-print * { display: none !important; visibility: hidden !important; }
              aside, header, nav { display: none !important; }
              @page { margin: 1cm; size: A4 portrait; }
            }
         `}</style>
         <div className="no-print sticky top-0 bg-white border-b shadow-sm w-full p-4 flex justify-between items-center z-10 px-8">
            <div>
               <h2 className="text-xl font-bold text-slate-800">Preview {printMode.startsWith('raport') ? `Raport${printMode.includes('pts') ? ' PTS' : ''}` : `Ledger Nilai${printMode.includes('pts') ? ' PTS' : ''}`}</h2>
            </div>
            <div className="flex gap-3">
               <Button variant="outline" onClick={() => setPrintMode(null)} className="h-11">Kembali</Button>
               <Button onClick={() => window.print()} variant="outline" className="h-11 border-green-600 text-green-600 hover:bg-green-50">
                   <Printer className="w-4 h-4 mr-2" /> Cetak (Browser)
               </Button>
               <Button onClick={handleExportPDF} disabled={isExporting} className="h-11 bg-blue-600 hover:bg-blue-700 px-6 font-bold shadow-lg shadow-blue-500/20">
                 <FileText className="w-4 h-4 mr-2" /> {isExporting ? 'Memproses...' : 'Ekspor PDF'}
               </Button>
            </div>
         </div>

         <div id="print-container" 
              className="mx-auto bg-white shadow-2xl my-8 print:my-0 print:shadow-none font-sans text-slate-900"
              style={{ width: (printMode.startsWith('ledger') || printMode === 'dkn') ? '100%' : '210mm', minHeight: '297mm', padding: '0mm' }}>
            
            {(printMode.startsWith('ledger') || printMode === 'dkn') && (
              <div className="bg-white p-4">
                 {printMode === 'dkn' ? (
                     <>
                        <div className="text-center font-bold mb-8 uppercase tracking-widest leading-tight">
                           <h1 className="text-2xl underline decoration-2 underline-offset-4 mt-4">
                              DAFTAR KUMPULAN NILAI RAPOR
                           </h1>
                        </div>
                        <div className="grid grid-cols-4 text-[12px] font-bold mb-6 mt-4 italic text-left">
                           <div className="col-span-2 space-y-1">
                              <div>Sekolah : {printConfig?.sekolah || 'SMA NEGERI'}</div>
                              <div>Alamat : {printConfig?.alamat || '-'}</div>
                           </div>
                           <div className="space-y-1">
                              <div>Kelas : {profile.waliKelas}</div>
                              <div>Fase : E</div>
                           </div>
                           <div className="space-y-1">
                              <div>Semester : {semester === 'Ganjil' ? '1 (Satu)' : '2 (Dua)'}</div>
                              <div>Tahun Pelj. : {tahunAjaran}</div>
                           </div>
                        </div>
                     </>
                 ) : (
                    <>
                     {printConfig ? (
                        <div className="text-center border-b-[3px] border-black pb-4 mb-6 mt-4 mx-4 relative">
                            {printConfig.kopKiri && <img src={printConfig.kopKiri} className="absolute left-0 top-0 h-[80px] object-contain" alt="Logo Kiri" />}
                            {printConfig.kopKanan && <img src={printConfig.kopKanan} className="absolute right-0 top-0 h-[80px] object-contain" alt="Logo Kanan" />}
                            <h2 className="font-bold text-base">{printConfig.kop1}</h2>
                            <h2 className="font-bold text-base">{printConfig.kop2}</h2>
                            <h1 className="text-xl font-black uppercase tracking-wider">{printConfig.sekolah}</h1>
                            <p className="text-xs">{printConfig.alamat}</p>
                            <p className="text-[10px] mt-0.5">
                               {printConfig.notelp && <span className="mr-3">Telp. {printConfig.notelp}</span>}
                            </p>
                        </div>
                     ) : (
                        <div className="text-center mb-8 border-b-[3px] border-black pb-4 mt-4 mx-4 relative">
                           <h2 className="font-bold">PEMERINTAH PROVINSI</h2>
                           <h2 className="font-bold">DINAS PENDIDIKAN</h2>
                           <h1 className="text-2xl font-black uppercase">SEKOLAH MENENGAH ATAS</h1>
                        </div>
                     )}
                     <div className="text-center mb-6">
                        <h3 className="text-xl font-bold uppercase tracking-widest underline">
                           {`LEDGER NILAI ${printMode.includes('pts') ? 'PTS ' : ''}KELAS ${profile.waliKelas}`}
                        </h3>
                     </div>
                    </>
                 )}
                 <div className="overflow-x-auto">
                    <div className="min-w-max">
                       <table className="w-full text-[10px] border-collapse border border-slate-400">
                           <thead>
                              <tr>
                                 <th rowSpan={2} className="border border-slate-400 bg-slate-100 px-2 py-1 text-center w-8">NO</th>
                                 <th rowSpan={2} className="border border-slate-400 bg-slate-100 px-2 py-1 text-center w-20">NIS/NISN</th>
                                 <th rowSpan={2} className="border border-slate-400 bg-slate-100 px-2 py-1 text-center min-w-[200px]">NAMA</th>
                                 <th rowSpan={2} className="border border-slate-400 bg-slate-100 px-2 py-1 text-center w-8">L/P</th>
                                 <th colSpan={printMode === 'dkn' ? usedMapel.length : usedMapel.length * 5} className="border border-slate-400 bg-slate-100 px-2 py-1 text-center font-bold">MATA PELAJARAN</th>
                                 {printMode !== 'dkn' && (
                                    <th colSpan={3} className="border border-slate-400 bg-slate-100 px-2 py-1 text-center font-bold">ABSENSI</th>
                                 )}
                                 <th rowSpan={2} className="border border-slate-400 bg-slate-100 px-2 py-1 text-center w-12"><div className="[writing-mode:vertical-rl] rotate-180 m-auto">Jumlah</div></th>
                                 <th rowSpan={2} className="border border-slate-400 bg-slate-100 px-2 py-1 text-center w-12"><div className="[writing-mode:vertical-rl] rotate-180 m-auto">Rerata</div></th>
                                 <th rowSpan={2} className="border border-slate-400 bg-slate-100 px-2 py-1 text-center w-12"><div className="[writing-mode:vertical-rl] rotate-180 m-auto">Ranking</div></th>
                                 {printMode !== 'dkn' && (
                                    <th rowSpan={2} className="border border-slate-400 bg-slate-100 px-4 py-1 text-center">Catatan / Pembinaan</th>
                                 )}
                              </tr>
                              <tr>
                                 {usedMapel.map(m => (
                                    <th key={m.id} colSpan={printMode === 'dkn' ? 1 : 5} className="border border-slate-400 bg-slate-100 px-1 py-1 text-center h-[90px] w-8">
                                       <div className="[writing-mode:vertical-rl] rotate-180 m-auto whitespace-nowrap text-[9px]">{m.name}</div>
                                    </th>
                                 ))}
                                 {printMode !== 'dkn' && ( <> <th className="border border-slate-400 bg-slate-100 px-1 py-1 text-center h-[90px] w-8">
                                    <div className="[writing-mode:vertical-rl] rotate-180 m-auto whitespace-nowrap text-[9px]">Sakit</div>
                                 </th>
                                 <th className="border border-slate-400 bg-slate-100 px-1 py-1 text-center h-[90px] w-8">
                                    <div className="[writing-mode:vertical-rl] rotate-180 m-auto whitespace-nowrap text-[9px]">Izin</div>
                                 </th>
                                 <th className="border border-slate-400 bg-slate-100 px-1 py-1 text-center h-[90px] w-8">
                                    <div className="[writing-mode:vertical-rl] rotate-180 m-auto whitespace-nowrap text-[9px]">Alpa</div>
                                 </th> </> )}
                              </tr>
                           </thead>
                           <tbody>
                              {siswaList.map((siswa, index) => (
                                 <tr key={siswa.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                    <td className="border border-slate-400 px-2 py-1 text-center font-medium">{index + 1}</td>
                                    <td className="border border-slate-400 px-2 py-1 text-center">{siswa.nisn || '-'}</td>
                                    <td className="border border-slate-400 px-2 py-1 font-semibold">{siswa.displayName}</td>
                                    <td className="border border-slate-400 px-2 py-1 text-center">{siswa.jenisKelamin === 'Perempuan' ? 'P' : (siswa.jenisKelamin === 'Laki-laki' ? 'L' : '-')}</td>
                                    {usedMapel.map(m => {
                                       const dataMapel = raportData[siswa.id]?.[m.id];
                                       if (printMode === 'dkn') {
                                          const nilaiMapel = isPtsMode ? dataMapel?.nilai_pts : dataMapel?.nilai;
                                          return (
                                             <td key={m.id} className="border border-slate-400 px-1 py-1 text-center font-semibold">
                                                {nilaiMapel !== undefined && nilaiMapel !== null ? nilaiMapel : ''}
                                             </td>
                                          );
                                       } else {
                                          return (
                                             <React.Fragment key={m.id}>
                                                <td className="border border-slate-400 px-1 py-1 text-center text-[7px]">{dataMapel?.avgF || ''}</td>
                                                <td className="border border-slate-400 px-1 py-1 text-center text-[7px]">{dataMapel?.avgS || ''}</td>
                                                <td className="border border-slate-400 px-1 py-1 text-center text-[7px]">{dataMapel?.ptsVal || ''}</td>
                                                <td className="border border-slate-400 px-1 py-1 text-center text-[7px]">{dataMapel?.psasVal || ''}</td>
                                                <td className="border border-slate-400 px-1 py-1 text-center text-[7px] bg-slate-50 font-bold">{dataMapel?.nilai || ''}</td>
                                             </React.Fragment>
                                          );
                                       }
                                    })}
                                    {printMode !== 'dkn' && ( <td className="border border-slate-400 px-1 py-1 text-center">{absensiData[siswa.id]?.sakit || '0'}</td> )}
                                    {printMode !== 'dkn' && ( <td className="border border-slate-400 px-1 py-1 text-center">{absensiData[siswa.id]?.izin || '0'}</td> )}
                                    {printMode !== 'dkn' && ( <td className="border border-slate-400 px-1 py-1 text-center">{absensiData[siswa.id]?.alpa || '0'}</td> )}
                                    <td className="border border-slate-400 px-2 py-1 text-center font-bold text-slate-700">{jumlahNilaiSiswa[siswa.id] || ''}</td>
                                    <td className="border border-slate-400 px-2 py-1 text-center font-bold text-blue-700">{rataRataSiswa[siswa.id]?.toFixed(1) || ''}</td>
                                    <td className="border border-slate-400 px-2 py-1 text-center font-bold text-amber-700">{rankSiswa[siswa.id] || ''}</td>
                                    {printMode !== 'dkn' && (
                                       <td className="border border-slate-400 px-2 py-1 text-[10px]">{pembinaanData[siswa.id] || '-'}</td>
                                    )}
                                 </tr>
                              ))}
                              
                              <tr className="bg-slate-100 font-bold">
                                 <td colSpan={4} className="border border-slate-400 px-2 py-1 text-right">Nilai Terendah</td>
                                 {usedMapel.map(m => <td key={m.id} className="border border-slate-400 px-1 py-1 text-center">{mapelStats[m.id]?.min || ''}</td>)}
                                 <td className="border border-slate-400 px-2 py-1 text-center">{totalStats.min || ''}</td>
                                 <td className="border border-slate-400 px-2 py-1 text-center">{avgStats.min ? avgStats.min.toFixed(1) : ''}</td>
                                 <td className="border border-slate-400 bg-slate-200"></td>
                                 {printMode !== 'dkn' && <td className="border border-slate-400 bg-slate-200"></td>}
                              </tr>
                              <tr className="bg-slate-100 font-bold">
                                 <td colSpan={4} className="border border-slate-400 px-2 py-1 text-right">Nilai Tertinggi</td>
                                 {usedMapel.map(m => <td key={m.id} className="border border-slate-400 px-1 py-1 text-center">{mapelStats[m.id]?.max || ''}</td>)}
                                 <td className="border border-slate-400 px-2 py-1 text-center">{totalStats.max || ''}</td>
                                 <td className="border border-slate-400 px-2 py-1 text-center">{avgStats.max ? avgStats.max.toFixed(1) : ''}</td>
                                 <td className="border border-slate-400 bg-slate-200"></td>
                                 {printMode !== 'dkn' && <td className="border border-slate-400 bg-slate-200"></td>}
                              </tr>
                              <tr className="bg-slate-100 font-bold">
                                 <td colSpan={4} className="border border-slate-400 px-2 py-1 text-right">Rata-rata Nilai</td>
                                 {usedMapel.map(m => <td key={m.id} className="border border-slate-400 px-1 py-1 text-center">{mapelStats[m.id]?.avg ? Math.round(mapelStats[m.id].avg) : ''}</td>)}
                                 <td className="border border-slate-400 px-2 py-1 text-center">{totalStats.avg ? Math.round(totalStats.avg) : ''}</td>
                                 <td className="border border-slate-400 px-2 py-1 text-center">{avgStats.avg ? avgStats.avg.toFixed(1) : ''}</td>
                                 <td className="border border-slate-400 bg-slate-200"></td>
                                 {printMode !== 'dkn' && <td className="border border-slate-400 bg-slate-200"></td>}
                              </tr>
                           </tbody>
                       </table>

                       <div className="flex justify-between px-10 mt-12 font-semibold pb-10 text-sm relative z-0">
                           <div className="text-center invisible">
                               {/* Placeholder for alignment if needed, not actually rendering */}
                           </div>
                           <div className="text-center">
                              <p>Banyuwangi, {tanggalRaportInput ? new Date(tanggalRaportInput).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '_________________'}</p>
                              <p>Wali Kelas {profile.waliKelas}</p>
                              <br /><br /><br /><br />
                              <p className="underline font-bold capitalize">{profile.displayName}</p>
                              <p>NIP. {profile.nip || '_________________________'}</p>
                           </div>
                       </div>
                       <div className="flex justify-center -mt-16 font-semibold pb-10 text-sm relative z-10 w-full text-center">
                           <div className="text-center mx-auto">
                              <p>Mengetahui,</p>
                              <p>Kepala Sekolah</p>
                              <br /><br /><br /><br />
                              <p className="underline font-bold">{kepalaSekolah || '_________________________'}</p>
                              <p>NIP. {nipKepalaSekolah || '_________________________'}</p>
                           </div>
                       </div>
                    </div>
                 </div>
              </div>
            )}

            {printMode.startsWith('raport') && siswaList.map((siswa, i) => (
               <div key={siswa.id} className={`pdf-page w-full print:relative bg-white font-sans text-sm pb-10 ${i > 0 ? "mt-8 print:mt-0 print:break-before-page page-break" : ""}`} style={{ minHeight: '297mm', padding: '10mm' }}>
                  <div className={(printMode === 'raport' || printMode === 'raport_pts') ? 'block' : 'hidden'}>
                  {printConfig ? (
                    <div className="text-center border-b-[3px] border-black pb-4 mb-6 mt-2 relative">
                        {printConfig.kopKiri && <img src={printConfig.kopKiri} className="absolute left-0 top-0 h-[80px] object-contain" alt="Logo Kiri" />}
                        {printConfig.kopKanan && <img src={printConfig.kopKanan} className="absolute right-0 top-0 h-[80px] object-contain" alt="Logo Kanan" />}
                        <h2 className="font-bold text-base">{printConfig.kop1}</h2>
                        <h2 className="font-bold text-base">{printConfig.kop2}</h2>
                        <h1 className="text-xl font-black uppercase tracking-wider">{printConfig.sekolah}</h1>
                        <p className="text-xs">{printConfig.alamat}</p>
                        <p className="text-[10px] mt-0.5">
                           {printConfig.notelp && <span className="mr-3">Telp. {printConfig.notelp}</span>}
                        </p>
                    </div>
                 ) : (
                    <div className="text-center mb-8 border-b-[3px] border-black pb-4 mt-2">
                       <h1 className="text-2xl font-bold uppercase tracking-widest">RAPOR PELAJAR</h1>
                       <h2 className="text-xl font-bold uppercase">SEKOLAH MENENGAH ATAS</h2>
                    </div>
                 )}
                 <div className="text-center mb-6 mt-2">
                    <h3 className="text-lg font-bold uppercase tracking-widest underline">RAPOR PELAJAR {printMode.includes('pts') ? 'TENGAH SEMESTER' : ''}</h3>
                 </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6 text-sm font-semibold">
                     <div className="space-y-1">
                        <div className="grid grid-cols-[150px_10px_1fr]"><span>Nama Peserta Didik</span><span>:</span><span>{siswa.displayName}</span></div>
                        <div className="grid grid-cols-[150px_10px_1fr]"><span>NISN</span><span>:</span><span>{siswa.nisn || '-'}</span></div>
                        <div className="grid grid-cols-[150px_10px_1fr]"><span>Sekolah</span><span>:</span><span>SMA DARUSSALAM</span></div>
                     </div>
                     <div className="space-y-1">
                        <div className="grid grid-cols-[120px_10px_1fr]"><span>Kelas</span><span>:</span><span>{profile.waliKelas}</span></div>
                        <div className="grid grid-cols-[120px_10px_1fr]"><span>Semester</span><span>:</span><span>{semester}</span></div>
                        <div className="grid grid-cols-[120px_10px_1fr]"><span>Tahun Pelajaran</span><span>:</span><span>{tahunAjaran}</span></div>
                     </div>
                  </div>

                  <table className="w-full border-collapse border border-black text-sm mb-6">
                     <thead>
                        <tr className="bg-gray-100">
                           <th className="border border-black p-2 w-[5%] text-center">No</th>
                           <th className="border border-black p-2 w-[35%]">Mata Pelajaran</th>
                           <th className="border border-black p-2 w-[15%] text-center">Nilai Akhir</th>
                           <th className="border border-black p-2 w-[45%]">Capaian Kompetensi</th>
                        </tr>
                     </thead>
                     <tbody>
                        {usedMapel.map((m, index) => {
                           const nilaiData = raportData[siswa.id]?.[m.id];
                           return (
                              <tr key={m.id}>
                                 <td className="border border-black p-2 text-center align-top">{index + 1}</td>
                                 <td className="border border-black p-2 align-top">{m.name}</td>
                                 <td className="border border-black p-2 text-center align-top font-bold text-lg">{isPtsMode ? (nilaiData?.nilai_pts || '') : (nilaiData?.nilai || '')}</td>
                                 <td className="border border-black p-2 align-top italic text-[11px] leading-relaxed whitespace-pre-wrap">{nilaiData?.deskripsi || '-'}</td>
                              </tr>
                           )
                        })}
                     </tbody>
                  </table>

                  {pembinaanData[siswa.id] && (
                     <div className="border border-black p-4 mb-8">
                        <h3 className="font-bold mb-2">Catatan Wali Kelas:</h3>
                        <p className="italic text-sm">{pembinaanData[siswa.id]}</p>
                     </div>
                  )}

                  <div className="flex justify-between px-10 mt-16 font-semibold relative z-0">
                     <div className="text-center">
                        <p>Mengetahui,</p>
                        <p>Orang Tua/Wali</p>
                        <br /><br /><br /><br />
                        <p className="border-b border-black inline-block min-w-[200px]"></p>
                     </div>
                     <div className="text-center">
                        <p>Banyuwangi, {tanggalRaportInput ? new Date(tanggalRaportInput).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '_________________'}</p>
                        <p>Wali Kelas {profile.waliKelas}</p>
                        <br /><br /><br /><br />
                        <p className="underline font-bold capitalize">{profile.displayName}</p>
                        <p>NIP. {profile.nip || '_________________________'}</p>
                     </div>
                  </div>
                  <div className="flex justify-center -mt-10 font-semibold pb-10 relative z-10 w-full text-center">
                      <div className="text-center mx-auto">
                        <p>Mengetahui,</p>
                        <p>Kepala Sekolah</p>
                        <br /><br /><br /><br />
                        <p className="underline font-bold">{kepalaSekolah || '_________________________'}</p>
                        <p>NIP. {nipKepalaSekolah || '_________________________'}</p>
                      </div>
                  </div>
                  </div>

                  {printMode === 'raport_halaman_1' && (
                     <div className="py-10 px-8 text-center min-h-screen flex items-center justify-center border-4 border-double border-black m-8">
                       <div>
                         <h1 className="text-4xl font-extrabold uppercase mb-8">RAPOR PELAJAR</h1>
                         <h2 className="text-2xl font-bold uppercase mb-2">SEKOLAH MENENGAH ATAS</h2>
                         <h2 className="text-2xl uppercase mb-16">(SMA)</h2>

                         <div className="mx-auto border-2 border-black w-[400px] p-6 mb-24">
                           <div className="grid grid-cols-[120px_10px_1fr] text-left text-lg font-bold gap-4 mb-4">
                              <span>NAMA PENDIDIK</span><span>:</span><span>{siswa.displayName}</span>
                           </div>
                           <div className="grid grid-cols-[120px_10px_1fr] text-left text-lg font-bold gap-4 mb-4">
                              <span>NISN</span><span>:</span><span>{siswa.nisn || '_________________'}</span>
                           </div>
                           <div className="grid grid-cols-[120px_10px_1fr] text-left text-lg font-bold gap-4 mb-4">
                              <span>KELAS</span><span>:</span><span>{profile.waliKelas}</span>
                           </div>
                         </div>
                       </div>
                     </div>
                  )}

                  {printMode === 'raport_halaman_prestasi' && (
                     <div className="py-10 px-8">
                        <h3 className="font-bold text-lg mb-6 uppercase">C. PRESTASI</h3>
                        <table className="w-full border-collapse border border-black mb-10">
                           <thead>
                              <tr className="bg-gray-100">
                                 <th className="border border-black p-2 w-12 text-center">No</th>
                                 <th className="border border-black p-2">Jenis Prestasi</th>
                                 <th className="border border-black p-2">Keterangan</th>
                              </tr>
                           </thead>
                           <tbody>
                              {[1, 2, 3].map(n => (
                                 <tr key={n}>
                                    <td className="border border-black p-2 text-center h-10">{n}</td>
                                    <td className="border border-black p-2"></td>
                                    <td className="border border-black p-2"></td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>

                        <h3 className="font-bold text-lg mb-6 uppercase">D. KETIDAKHADIRAN</h3>
                        <div className="w-[300px] border border-black mb-16">
                           <div className="grid grid-cols-[1fr_80px_40px] px-4 py-2 border-b border-black">
                              <span>Sakit</span><span className="text-right">.....</span><span>hari</span>
                           </div>
                           <div className="grid grid-cols-[1fr_80px_40px] px-4 py-2 border-b border-black">
                              <span>Izin</span><span className="text-right">.....</span><span>hari</span>
                           </div>
                           <div className="grid grid-cols-[1fr_80px_40px] px-4 py-2">
                              <span>Tanpa Keterangan</span><span className="text-right">.....</span><span>hari</span>
                           </div>
                        </div>

                        <h3 className="font-bold text-lg mb-6 uppercase">E. CATATAN WALIKELAS</h3>
                        <div className="border border-black p-4 min-h-[100px] mb-16">
                           <p className="italic">{pembinaanData[siswa.id] || ''}</p>
                        </div>
                     </div>
                  )}

               </div>
            ))}
         </div>
      </div>
    );
  }

   return (
    <>
    <div className={`p-4 md:p-8 space-y-6 ${printMode === 'ledger' ? 'print:block print:p-0 bg-white' : 'print:hidden'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
         <div>
            <h1 className="text-2xl font-bold text-slate-800">Administrasi Raport {profile.waliKelas}</h1>
            <p className="text-sm text-slate-500">Rekapitulasi Nilai Akhir dari semua mapel, Ranking, dan Catatan Wali Kelas.</p>
         </div>
      </div>

      <Card className="print:hidden">
         <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 mb-4 items-end">
               <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Tahun Ajaran</label>
                  <Select value={tahunAjaran} onValueChange={setTahunAjaran}>
                     <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Pilih TA" />
                     </SelectTrigger>
                     <SelectContent>
                        {(settings.historyTahunAjaran || ['2023/2024', '2024/2025', '2025/2026']).map((val) => (
                           <SelectItem key={val} value={val}>{val}</SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>
               <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Semester</label>
                  <Select value={semester} onValueChange={setSemester}>
                     <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Pilih Semester" />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="Ganjil">Ganjil</SelectItem>
                        <SelectItem value="Genap">Genap</SelectItem>
                     </SelectContent>
                  </Select>
               </div>
               <div className="ml-auto flex gap-2 flex-wrap items-end justify-end">
                 <Dialog>
                   <DialogTrigger render={<Button variant="outline" className="border-slate-300" />}>
                       <Settings className="w-4 h-4 mr-2" />
                       Pengaturan Raport
                   </DialogTrigger>
                   <DialogContent className="sm:max-w-[425px]">
                     <DialogHeader>
                       <DialogTitle>Pengaturan Cetak Raport</DialogTitle>
                     </DialogHeader>
                     <div className="grid gap-4 py-4">
                       <div className="space-y-2">
                         <label className="text-sm font-medium">Nama Kepala Sekolah</label>
                         <Select 
                           value={kepalaSekolah}
                           onValueChange={(val) => {
                              setKepalaSekolah(val);
                              const selectedGuru = dataGuru.find(g => g.displayName === val);
                              if (selectedGuru && selectedGuru.nip) {
                                 setNipKepalaSekolah(selectedGuru.nip);
                              }
                           }}
                         >
                           <SelectTrigger className="w-full bg-white">
                              <SelectValue placeholder="Pilih Kepala Sekolah..." />
                           </SelectTrigger>
                           <SelectContent>
                              {dataGuru.map(g => (
                                <SelectItem key={g.id} value={g.displayName || g.id}>{g.displayName || g.id}</SelectItem>
                              ))}
                           </SelectContent>
                         </Select>
                       </div>
                       <div className="space-y-2">
                         <label className="text-sm font-medium">NIP Kepala Sekolah</label>
                         <Input 
                           placeholder="Contoh: 19700101 199512 1 001" 
                           value={nipKepalaSekolah}
                           onChange={(e) => setNipKepalaSekolah(e.target.value)}
                         />
                       </div>
                       <div className="space-y-2">
                         <label className="text-sm font-medium">Tanggal Raport</label>
                         <Input 
                           type="date"
                           value={tanggalRaportInput}
                           onChange={(e) => setTanggalRaportInput(e.target.value)}
                         />
                       </div>
                     </div>
                   </DialogContent>
                 </Dialog>

                 <DropdownMenu>
                   <DropdownMenuTrigger render={<Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50" />}>
                        <Printer className="w-4 h-4 mr-2" />
                        Cetak Laporan <ChevronDown className="w-4 h-4 ml-2" />
                   </DropdownMenuTrigger>
                   <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuItem onClick={() => handlePrint('dkn')}><Printer className="w-4 h-4 mr-2" /> Cetak DKN (Daftar Kumpulan Nilai)</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePrint('ledger')}><Printer className="w-4 h-4 mr-2" /> Cetak Ledger Akhir</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePrint('ledger_pts')}><Printer className="w-4 h-4 mr-2" /> Cetak Ledger PTS</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePrint('raport_pts')}><Printer className="w-4 h-4 mr-2" /> Cetak PTS</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePrint('raport')}><Printer className="w-4 h-4 mr-2" /> Cetak Raport Semester</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePrint('raport_halaman_1')}><Printer className="w-4 h-4 mr-2" /> Halaman 1 2 Identitas Siswa</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePrint('raport_halaman_prestasi')}><Printer className="w-4 h-4 mr-2" /> Halaman 12 13 Prestasi / Mutasi</DropdownMenuItem>
                   </DropdownMenuContent>
                 </DropdownMenu>

                 <Button onClick={generateCatatanOtomatis} variant="secondary" className="border border-slate-300">
                    Isi Otomatis Catatan
                 </Button>
                 
                 <Button onClick={savePembinaan} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Simpan Catatan & Absensi
                 </Button>
               </div>
            </div>
          </CardContent>
      </Card>

      {loading ? (
        <div className="p-10 text-center animate-pulse text-slate-400">Memuat data...</div>
      ) : (
        <div className="space-y-8">
           {siswaList.length > 0 && (
              <Card className="overflow-hidden border border-slate-200 print:shadow-none print:border-none">
                 <CardHeader className="bg-slate-50 border-b print:bg-white print:border-none print:px-0">
                    <CardTitle className="text-lg">Daftar Kumpulan Nilai (DKN)</CardTitle>
                    <CardDescription className="print:hidden">Daftar nilai seluruh mapel yang ditempuh dan rata-ratanya.</CardDescription>
                 </CardHeader>
                 <CardContent className="p-0 overflow-x-auto print:overflow-visible">
                    <div className="min-w-max p-4 print:p-0">
                       <table className="w-full text-xs border-collapse border border-slate-400">
                          <thead>
                             <tr>
                                <th rowSpan={2} className="border border-slate-400 bg-slate-100 px-2 py-1 text-center w-8">NO</th>
                                <th rowSpan={2} className="border border-slate-400 bg-slate-100 px-2 py-1 text-center w-20">NIS/NISN</th>
                                <th rowSpan={2} className="border border-slate-400 bg-slate-100 px-2 py-1 text-center min-w-[200px]">NAMA</th>
                                <th rowSpan={2} className="border border-slate-400 bg-slate-100 px-2 py-1 text-center w-8">L/P</th>
                                <th colSpan={usedMapel.length} className="border border-slate-400 bg-slate-100 px-2 py-1 text-center font-bold">MATA PELAJARAN</th>
                                 <th colSpan={3} className="border border-slate-400 bg-slate-100 px-2 py-1 text-center font-bold">ABSENSI</th>
                                <th rowSpan={2} className="border border-slate-400 bg-slate-100 px-2 py-1 text-center w-12"><div className="[writing-mode:vertical-rl] rotate-180 m-auto">Jumlah</div></th>
                                <th rowSpan={2} className="border border-slate-400 bg-slate-100 px-2 py-1 text-center w-12"><div className="[writing-mode:vertical-rl] rotate-180 m-auto">Rerata</div></th>
                                <th rowSpan={2} className="border border-slate-400 bg-slate-100 px-2 py-1 text-center w-12"><div className="[writing-mode:vertical-rl] rotate-180 m-auto">Ranking</div></th>
                                <th rowSpan={2} className="border border-slate-400 bg-slate-100 px-4 py-1 text-center">Catatan / Pembinaan</th>
                             </tr>
                             <tr>
                                {usedMapel.map(m => (
                                   <th key={m.id} className="border border-slate-400 bg-slate-100 px-2 py-1 text-center h-[120px] w-8">
                                      <div className="[writing-mode:vertical-rl] rotate-180 m-auto whitespace-nowrap">{m.name}</div>
                                   </th>
                                ))}
                                <th className="border border-slate-400 bg-slate-100 px-1 py-1 text-center h-[120px] w-8">
                                   <div className="[writing-mode:vertical-rl] rotate-180 m-auto whitespace-nowrap text-[9px]">Sakit</div>
                                </th>
                                <th className="border border-slate-400 bg-slate-100 px-1 py-1 text-center h-[120px] w-8">
                                   <div className="[writing-mode:vertical-rl] rotate-180 m-auto whitespace-nowrap text-[9px]">Izin</div>
                                </th>
                                <th className="border border-slate-400 bg-slate-100 px-1 py-1 text-center h-[120px] w-8">
                                   <div className="[writing-mode:vertical-rl] rotate-180 m-auto whitespace-nowrap text-[9px]">Alpa</div>
                                </th>
                             </tr>
                          </thead>
                          <tbody>
                             {siswaList.map((siswa, index) => (
                                <tr key={siswa.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                   <td className="border border-slate-400 px-2 py-1 text-center font-medium">{index + 1}</td>
                                   <td className="border border-slate-400 px-2 py-1 text-center">{siswa.nisn || '-'}</td>
                                   <td className="border border-slate-400 px-2 py-1 font-semibold">{siswa.displayName}</td>
                                   <td className="border border-slate-400 px-2 py-1 text-center">{siswa.jenisKelamin === 'Perempuan' ? 'P' : (siswa.jenisKelamin === 'Laki-laki' ? 'L' : '-')}</td>
                                   {usedMapel.map(m => {
                                      const nilaiMapel = isPtsMode ? raportData[siswa.id]?.[m.id]?.nilai_pts : raportData[siswa.id]?.[m.id]?.nilai;
                                      return (
                                         <td key={m.id} className="border border-slate-400 px-1 py-1 text-center font-semibold text-blue-800">
                                            {nilaiMapel !== undefined && nilaiMapel !== null ? nilaiMapel : ''}
                                         </td>
                                      );
                                   })}
                                   <td className="border border-slate-400 p-0 overflow-hidden w-8">
                                      <input 
                                         type="text" 
                                         className="w-full h-full px-1 py-1 bg-transparent border-none focus:ring-1 focus:ring-blue-500 outline-none text-center text-[10px]" 
                                         value={absensiData[siswa.id]?.sakit || ''}
                                         placeholder="0"
                                         onChange={(e) => setAbsensiData({ ...absensiData, [siswa.id]: { ...(absensiData[siswa.id] || {sakit:'', izin:'', alpa:''}), sakit: e.target.value } })}
                                      />
                                   </td>
                                   <td className="border border-slate-400 p-0 overflow-hidden w-8">
                                      <input 
                                         type="text" 
                                         className="w-full h-full px-1 py-1 bg-transparent border-none focus:ring-1 focus:ring-blue-500 outline-none text-center text-[10px]" 
                                         value={absensiData[siswa.id]?.izin || ''}
                                         placeholder="0"
                                         onChange={(e) => setAbsensiData({ ...absensiData, [siswa.id]: { ...(absensiData[siswa.id] || {sakit:'', izin:'', alpa:''}), izin: e.target.value } })}
                                      />
                                   </td>
                                   <td className="border border-slate-400 p-0 overflow-hidden w-8">
                                      <input 
                                         type="text" 
                                         className="w-full h-full px-1 py-1 bg-transparent border-none focus:ring-1 focus:ring-blue-500 outline-none text-center text-[10px]" 
                                         value={absensiData[siswa.id]?.alpa || ''}
                                         placeholder="0"
                                         onChange={(e) => setAbsensiData({ ...absensiData, [siswa.id]: { ...(absensiData[siswa.id] || {sakit:'', izin:'', alpa:''}), alpa: e.target.value } })}
                                      />
                                   </td>
                                   <td className="border border-slate-400 px-2 py-1 text-center font-bold text-slate-700">{jumlahNilaiSiswa[siswa.id] || ''}</td>
                                   <td className="border border-slate-400 px-2 py-1 text-center font-bold text-blue-700">{rataRataSiswa[siswa.id]?.toFixed(1) || ''}</td>
                                   <td className="border border-slate-400 px-2 py-1 text-center font-bold text-amber-700">{rankSiswa[siswa.id] || ''}</td>
                                   <td className="border border-slate-400 p-0">
                                      <input 
                                         type="text" 
                                         className="w-full h-full px-2 py-1 bg-transparent border-none focus:ring-1 focus:ring-blue-500 outline-none text-xs" 
                                         placeholder="-"
                                         value={pembinaanData[siswa.id] || ''}
                                         onChange={(e) => setPembinaanData({ ...pembinaanData, [siswa.id]: e.target.value })}
                                      />
                                   </td>
                                </tr>
                             ))}
                             
                             {/* Bottom Stats Rows */}
                             <tr className="bg-slate-100 font-bold">
                                <td colSpan={4} className="border border-slate-400 px-2 py-1 text-right">Nilai Terendah</td>
                                {usedMapel.map(m => <td key={m.id} className="border border-slate-400 px-1 py-1 text-center">{mapelStats[m.id].min || ''}</td>)}
                                <td className="border border-slate-400 bg-slate-200"></td>
                                <td className="border border-slate-400 bg-slate-200"></td>
                                <td className="border border-slate-400 bg-slate-200"></td>
                                <td className="border border-slate-400 px-2 py-1 text-center">{totalStats.min || ''}</td>
                                <td className="border border-slate-400 px-2 py-1 text-center">{avgStats.min ? avgStats.min.toFixed(1) : ''}</td>
                                <td className="border border-slate-400 bg-slate-200"></td>
                                <td className="border border-slate-400 bg-slate-200"></td>
                             </tr>
                             <tr className="bg-slate-100 font-bold">
                                <td colSpan={4} className="border border-slate-400 px-2 py-1 text-right">Nilai Tertinggi</td>
                                {usedMapel.map(m => <td key={m.id} className="border border-slate-400 px-1 py-1 text-center">{mapelStats[m.id].max || ''}</td>)}
                                <td className="border border-slate-400 bg-slate-200"></td>
                                <td className="border border-slate-400 bg-slate-200"></td>
                                <td className="border border-slate-400 bg-slate-200"></td>
                                <td className="border border-slate-400 px-2 py-1 text-center">{totalStats.max || ''}</td>
                                <td className="border border-slate-400 px-2 py-1 text-center">{avgStats.max ? avgStats.max.toFixed(1) : ''}</td>
                                <td className="border border-slate-400 bg-slate-200"></td>
                                <td className="border border-slate-400 bg-slate-200"></td>
                             </tr>
                             <tr className="bg-slate-100 font-bold">
                                <td colSpan={4} className="border border-slate-400 px-2 py-1 text-right">Rata-rata Nilai</td>
                                {usedMapel.map(m => <td key={m.id} className="border border-slate-400 px-1 py-1 text-center">{mapelStats[m.id].avg ? Math.round(mapelStats[m.id].avg) : ''}</td>)}
                                <td className="border border-slate-400 bg-slate-200"></td>
                                <td className="border border-slate-400 bg-slate-200"></td>
                                <td className="border border-slate-400 bg-slate-200"></td>
                                <td className="border border-slate-400 px-2 py-1 text-center">{totalStats.avg ? Math.round(totalStats.avg) : ''}</td>
                                <td className="border border-slate-400 px-2 py-1 text-center">{avgStats.avg ? avgStats.avg.toFixed(1) : ''}</td>
                                <td className="border border-slate-400 bg-slate-200"></td>
                                <td className="border border-slate-400 bg-slate-200"></td>
                             </tr>
                             <tr className="bg-slate-100 font-bold text-xs text-slate-600">
                                <td colSpan={4} className="border border-slate-400 px-2 py-1 text-right">Standar Deviasi</td>
                                {usedMapel.map(m => <td key={m.id} className="border border-slate-400 px-1 py-1 text-center">{mapelStats[m.id].stdDev ? mapelStats[m.id].stdDev.toFixed(1) : ''}</td>)}
                                <td className="border border-slate-400 bg-slate-200"></td>
                                <td className="border border-slate-400 bg-slate-200"></td>
                                <td className="border border-slate-400 bg-slate-200"></td>
                                <td className="border border-slate-400 px-2 py-1 text-center">{totalStats.stdDev ? totalStats.stdDev.toFixed(1) : ''}</td>
                                <td className="border border-slate-400 px-2 py-1 text-center">{avgStats.stdDev ? avgStats.stdDev.toFixed(1) : ''}</td>
                                <td className="border border-slate-400 bg-slate-200"></td>
                                <td className="border border-slate-400 bg-slate-200"></td>
                             </tr>
                          </tbody>
                       </table>

                       <div className="hidden print:flex justify-between px-10 mt-16 font-semibold pb-10 text-sm">
                           <div className="text-center">
                              <p>Mengetahui,</p>
                              <p>Kepala Sekolah</p>
                              <br /><br /><br /><br />
                              <p className="underline font-bold">{kepalaSekolah || '_________________________'}</p>
                              <p>NIP. {nipKepalaSekolah || '_________________________'}</p>
                           </div>
                           <div className="text-center">
                              <p>Banyuwangi, {tanggalRaportInput ? new Date(tanggalRaportInput).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '_________________'}</p>
                              <p>Wali Kelas {profile.waliKelas}</p>
                              <br /><br /><br /><br />
                              <p className="underline font-bold capitalize">{profile.displayName}</p>
                              <p>NIP. {profile.nip || '_________________________'}</p>
                           </div>
                       </div>
                    </div>
                 </CardContent>
              </Card>
           )}

           {siswaList.length === 0 && (
             <div className="text-center text-slate-500 py-10">Tidak ada data siswa untuk kelas ini.</div>
           )}
        </div>
      )}
    </div>
    
    </>
  );
}
