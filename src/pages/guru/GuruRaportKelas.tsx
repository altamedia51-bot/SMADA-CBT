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
  const [ekstraData, setEkstraData] = useState<Record<string, any[]>>({}); 
  const [kokurikulerData, setKokurikulerData] = useState<Record<string, any[]>>({}); 

  useEffect(() => {
     if (authTahunAjaran) {
        setTahunAjaran(authTahunAjaran);
     } else if (settings.activeTahunAjaran) {
        setTahunAjaran(settings.activeTahunAjaran);
     }
  }, [authTahunAjaran, settings.activeTahunAjaran]);

  const [loading, setLoading] = useState(false);
  const [printMode, setPrintMode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'dkn' | 'leger'>('leger');
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
            nilai_pts: typeof finalPts === 'number' && finalPts > 0 ? Math.round(finalPts) : (typeof stData?.pts === 'number' ? Math.round(stData.pts) : null),
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

      const ekstraRef = doc(db, 'nilai_ekstra', `${profile.waliKelas}_${tahunAjaran.replace(/\//g, '-')}_${semester}`);
      const ekstraSnap = await getDoc(ekstraRef);
      setEkstraData(ekstraSnap.exists() && ekstraSnap.data()?.nilai ? ekstraSnap.data()?.nilai : {});

      const kokuRef = doc(db, 'nilai_kokurikuler', `${profile.waliKelas}_${tahunAjaran.replace(/\//g, '-')}_${semester}`);
      const kokuSnap = await getDoc(kokuRef);
      setKokurikulerData(kokuSnap.exists() && kokuSnap.data()?.nilai ? kokuSnap.data()?.nilai : {});

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
            
            {printMode === 'dkn' && (
              <div className="bg-white p-4">
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
                 <div className="overflow-x-auto">
                    <div className="min-w-max">
                       <table className="w-full border-collapse border-[1.5px] border-black text-[10px]">
  <thead>
     <tr className="bg-slate-50">
        <th className="border border-black p-1 w-8" rowSpan={2}>NO</th>
        <th className="border border-black p-1 w-32" rowSpan={2}>NIS/ NISN</th>
        <th className="border border-black p-1" rowSpan={2}>NAMA</th>
        <th className="border border-black p-1 w-8" rowSpan={2}>LP</th>
        <th className="border border-black p-1" colSpan={usedMapel.length}>MATA PELAJARAN</th>
        <th className="border border-black p-1 h-24 w-8" rowSpan={2}><div className="rotate-[-90deg] flex items-center justify-center">Jumlah</div></th>
        <th className="border border-black p-1 h-24 w-8" rowSpan={2}><div className="rotate-[-90deg] flex items-center justify-center">Rerata</div></th>
        <th className="border border-black p-1 h-24 w-8" rowSpan={2}><div className="rotate-[-90deg] flex items-center justify-center">Ranking</div></th>
     </tr>
     <tr>
        {usedMapel.map(m => (
           <th key={m.id} className="border border-black p-1 h-24 w-8 font-bold">
              <div className="rotate-[-90deg] flex items-center justify-center whitespace-nowrap overflow-visible uppercase">
                {m.name.length > 20 ? m.name.substring(0, 20) + '...' : m.name}
              </div>
           </th>
        ))}
     </tr>
  </thead>
  <tbody className="font-medium">
     {siswaList.map((siswa, idx) => (
        <tr key={siswa.id} className="hover:bg-slate-50">
           <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
           <td className="border border-black p-1 text-center font-mono">{siswa.nis || '-'}</td>
           <td className="border border-black p-1 px-2 uppercase text-[9px] truncate max-w-[200px] font-bold">{siswa.displayName}</td>
           <td className="border border-black p-1 text-center">{siswa.jenisKelamin?.substring(0,1).toUpperCase() || 'L'}</td>
           {usedMapel.map(m => {
              const data = raportData[siswa.id]?.[m.id] || {};
              const val = isPtsMode ? data.nilai_pts : data.nilai;
              return (
                 <td key={m.id} className="border border-black p-1 text-center font-mono font-bold text-blue-800">
                    {val !== undefined && val !== null ? val : ''}
                 </td>
              );
           })}
           <td className="border border-black p-1 text-center font-bold text-slate-800">{jumlahNilaiSiswa[siswa.id] || ''}</td>
           <td className="border border-black p-1 text-center font-bold text-blue-700">{rataRataSiswa[siswa.id]?.toFixed(1) || ''}</td>
           <td className="border border-black p-1 text-center font-bold text-amber-700">{rankSiswa[siswa.id] || ''}</td>
        </tr>
     ))}
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

            {printMode.startsWith('ledger') && (
                    <div className="pdf-page p-6 font-sans bg-white" style={{ width: '420mm', minHeight: '297mm' }}>
                        <div className="text-center font-bold mb-6 uppercase tracking-widest leading-tight">
                           <h1 className="text-xl">KUMPULAN NILAI KELAS {profile.waliKelas} SMT. {semester === 'Ganjil' ? '1' : '2'} TH. PEL. {tahunAjaran}</h1>
                        </div>
                        
                        <table className="w-full border-collapse border-[1px] border-black text-[9px]">
                           <thead>
                              <tr className="bg-slate-50">
                                 <th className="border border-black p-1 w-8" rowSpan={2}>No.</th>
                                 <th className="border border-black p-1 w-[250px]" rowSpan={2}>
                                    NAMA PESERTA DIDIK<br/>
                                    Nomor Induk/NISN<br/>
                                    Tempat dan Tanggal Lahir<br/>
                                    Nama Orang Tua<br/>
                                    Alamat
                                 </th>
                                 <th className="border border-black p-1" colSpan={usedMapel.length}>MATA PELAJARAN</th>
                                 <th className="border border-black p-1 w-6 whitespace-nowrap" rowSpan={2}><div className="rotate-[-90deg] h-28 flex items-center justify-center">Pend. Kepramukaan</div></th>
                                 <th className="border border-black p-1 w-6 whitespace-nowrap" rowSpan={2}><div className="rotate-[-90deg] h-28 flex items-center justify-center">Keg. Ekstrakurikuler 2</div></th>
                                 <th className="border border-black p-1 w-6 whitespace-nowrap" rowSpan={2}><div className="rotate-[-90deg] h-28 flex items-center justify-center font-bold">Keg. Ekstrakurikuler 3</div></th>
                                 <th className="border border-black p-1 w-6 whitespace-nowrap" rowSpan={2}><div className="rotate-[-90deg] h-28 flex items-center justify-center font-bold">Keg. Ekstrakurikuler 4</div></th>
                                 <th className="border border-black p-1 w-6 whitespace-nowrap" rowSpan={2}><div className="rotate-[-90deg] h-28 flex items-center justify-center font-bold">Sakit</div></th>
                                 <th className="border border-black p-1 w-6 whitespace-nowrap" rowSpan={2}><div className="rotate-[-90deg] h-28 flex items-center justify-center font-bold">Ijin</div></th>
                                 <th className="border border-black p-1 w-6 whitespace-nowrap" rowSpan={2}><div className="rotate-[-90deg] h-28 flex items-center justify-center font-bold">Tanpa Keterangan</div></th>
                                 <th className="border border-black p-1 w-20" rowSpan={2}>Catatan / Pembinaan</th>
                              </tr>
                              <tr>
                                 {usedMapel.map(m => (
                                    <th key={m.id} className="border border-black p-1 h-36 w-8 font-bold">
                                       <div className="rotate-[-90deg] flex items-center justify-center whitespace-nowrap overflow-visible uppercase text-[8px]">
                                          {m.name}
                                       </div>
                                    </th>
                                 ))}
                              </tr>
                           </thead>
                           <tbody>
                              {siswaList.map((s, idx) => (
                                 <tr key={s.id}>
                                    <td className="border border-black p-1 text-center font-bold align-top">{idx + 1}</td>
                                    <td className="border border-black p-1 leading-[1.3] align-top">
                                       <div className="flex h-full">
                                          <div className="flex-1 space-y-0.5">
                                             <div className="font-black uppercase text-[10px]">{s.displayName}</div>
                                             <div className="text-slate-600">{s.nis || '-'}{s.nisn ? ` / ${s.nisn}` : ''}</div>
                                             <div className="text-slate-500 italic">{s.tempatLahir || '-'}, {s.tanggalLahir || '-'}</div>
                                             <div className="text-slate-600">{s.namaAyah || s.namaIbu || '-'}</div>
                                             <div className="text-slate-500 truncate">{s.alamat || '-'}</div>
                                          </div>
                                          <div className="w-8 border-l border-black flex flex-col justify-between text-[7px] font-bold text-center bg-slate-50">
                                             <div className="flex-1 flex items-center justify-center border-b border-black/10">NF</div>
                                             <div className="flex-1 flex items-center justify-center border-b border-black/10">SLM</div>
                                             <div className="flex-1 flex items-center justify-center border-b border-black/10">SAS</div>
                                             <div className="flex-1 flex items-center justify-center font-black">NA</div>
                                          </div>
                                       </div>
                                    </td>
                                    {usedMapel.map(m => {
                                       const data = raportData[s.id]?.[m.id] || {};
                                       return (
                                          <td key={m.id} className="border border-black p-0 text-center align-top">
                                             <div className="flex flex-col h-full text-[8px] min-h-[56px]">
                                                <div className="flex-1 flex items-center justify-center border-b border-black/10 bg-blue-50/10">{data.nf || '-'}</div>
                                                <div className="flex-1 flex items-center justify-center border-b border-black/10 bg-fuchsia-50/10">{data.slm || '-'}</div>
                                                <div className="flex-1 flex items-center justify-center border-b border-black/10 bg-amber-50/10">{data.sas || '-'}</div>
                                                <div className="flex-1 flex items-center justify-center font-black bg-slate-100">{data.nilai || '-'}</div>
                                             </div>
                                          </td>
                                       );
                                    })}
                                    <td className="border border-black p-0 text-center text-xs">
                                       <div className="h-full flex items-center justify-center min-h-[56px]">{ekstraData[s.id]?.[0]?.predikat || ''}</div>
                                    </td>
                                    <td className="border border-black p-0 text-center text-xs">
                                       <div className="h-full flex items-center justify-center min-h-[56px]">{ekstraData[s.id]?.[1]?.predikat || ''}</div>
                                    </td>
                                    <td className="border border-black p-0 text-center text-xs">
                                       <div className="h-full flex items-center justify-center min-h-[56px]">{ekstraData[s.id]?.[2]?.predikat || ''}</div>
                                    </td>
                                    <td className="border border-black p-0 text-center text-xs">
                                       <div className="h-full flex items-center justify-center min-h-[56px]">{ekstraData[s.id]?.[3]?.predikat || ''}</div>
                                    </td>
                                    <td className="border border-black p-0 text-center text-xs">
                                       <div className="h-full flex items-center justify-center min-h-[56px]">{absensiData[s.id]?.sakit || ''}</div>
                                    </td>
                                    <td className="border border-black p-0 text-center text-xs">
                                       <div className="h-full flex items-center justify-center min-h-[56px]">{absensiData[s.id]?.izin || ''}</div>
                                    </td>
                                    <td className="border border-black p-0 text-center text-xs">
                                       <div className="h-full flex items-center justify-center min-h-[56px]">{absensiData[s.id]?.alpa || ''}</div>
                                    </td>
                                    <td className="border border-black p-1 text-[9px] min-w-[120px] align-top">
                                       {pembinaanData[s.id] || '-'}
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>

                        <div className="mt-4 flex justify-between items-start">
                           <div className="text-[10px] font-bold border p-2 border-black/10 rounded">
                              <span className="block italic opacity-70">Keterangan:</span>
                              <div className="flex gap-4">
                                 <span>NF : Nilai Formatif</span>
                                 <span>SLM : Sumatif Lingkup Materi</span>
                                 <span>SAS : Sumatif Akhir Semester</span>
                                 <span>NA : Nilai Akhir</span>
                              </div>
                           </div>
                           <div className="grid grid-cols-2 gap-20 text-center text-[10px] font-bold">
                              <div className="space-y-16">
                                 <div>Mengetahui,<br/>Wali Kelas</div>
                                 <div className="uppercase">( {profile.displayName} )<br/><span className="font-normal">NIP. {profile.nip || '_________________'}</span></div>
                              </div>
                              <div className="space-y-16">
                                 <div>Banyuwangi, {tanggalRaportInput}<br/>Kepala Sekolah,</div>
                                 <div className="uppercase">( {kepalaSekolah || '__________________'} )<br/><span className="font-normal">NIP. {nipKepalaSekolah || '__________________'}</span></div>
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
                                 <td className="border border-black p-2 text-center align-top font-bold text-lg">{isPtsMode ? (nilaiData?.nilai_pts ?? '') : (nilaiData?.nilai ?? '')}</td>
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
                     <div className={`py-10 px-8 space-y-6 ${(printMode === 'raport' || printMode === 'raport_pts') ? 'page-break print:break-before-page mt-10 print:mt-0' : ''}`}>
                        <div className="space-y-4">
                           <h3 className="font-bold text-lg uppercase">C. EKSTRAKURIKULER</h3>
                           <table className="w-full border-collapse border border-black text-sm mb-6">
                              <thead>
                                 <tr className="bg-gray-100">
                                    <th className="border border-black p-2 w-12 text-center">No</th>
                                    <th className="border border-black p-2 text-left">Kegiatan Ekstrakurikuler</th>
                                    <th className="border border-black p-2 text-center w-32">Predikat</th>
                                    <th className="border border-black p-2 text-left">Keterangan</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {(ekstraData[siswa.id] || []).filter(e => e?.nama).length > 0 ? (
                                    (ekstraData[siswa.id] || []).filter(e => e?.nama).map((e, idx) => (
                                       <tr key={idx}>
                                          <td className="border border-black p-2 text-center h-10">{idx + 1}</td>
                                          <td className="border border-black p-2">{e.nama}</td>
                                          <td className="border border-black p-2 text-center font-bold">{e.predikat}</td>
                                          <td className="border border-black p-2 text-xs italic">{e.deskripsi || '-'}</td>
                                       </tr>
                                    ))
                                 ) : (
                                    <>
                                       <tr className="h-10"><td className="border border-black p-2 text-center">1</td><td className="border border-black p-2">-</td><td className="border border-black p-2">-</td><td className="border border-black p-2">-</td></tr>
                                       <tr className="h-10"><td className="border border-black p-2 text-center">2</td><td className="border border-black p-2">-</td><td className="border border-black p-2">-</td><td className="border border-black p-2">-</td></tr>
                                    </>
                                 )}
                              </tbody>
                           </table>
                        </div>

                        <div className="space-y-4">
                           <h3 className="font-bold text-lg uppercase">D. KOKURIKULER (Proyek P5 / Deep Learning)</h3>
                           <table className="w-full border-collapse border border-black text-sm mb-6">
                              <thead>
                                 <tr className="bg-gray-100">
                                    <th className="border border-black p-2 w-12 text-center">No</th>
                                    <th className="border border-black p-2 text-left">Nama Proyek / Kegiatan</th>
                                    <th className="border border-black p-2 text-center w-32">Predikat</th>
                                    <th className="border border-black p-2 text-left">Keterangan</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {(kokurikulerData[siswa.id] || []).filter(e => e?.nama).length > 0 ? (
                                    (kokurikulerData[siswa.id] || []).filter(e => e?.nama).map((e, idx) => (
                                       <tr key={idx}>
                                          <td className="border border-black p-2 text-center h-10">{idx + 1}</td>
                                          <td className="border border-black p-2">{e.nama}</td>
                                          <td className="border border-black p-2 text-center font-bold text-xs">{e.predikat}</td>
                                          <td className="border border-black p-2 text-xs italic">{e.deskripsi || '-'}</td>
                                       </tr>
                                    ))
                                 ) : (
                                    <>
                                       <tr className="h-10"><td className="border border-black p-2 text-center">1</td><td className="border border-black p-2">-</td><td className="border border-black p-2">-</td><td className="border border-black p-2">-</td></tr>
                                       <tr className="h-10"><td className="border border-black p-2 text-center">2</td><td className="border border-black p-2">-</td><td className="border border-black p-2">-</td><td className="border border-black p-2">-</td></tr>
                                    </>
                                 )}
                              </tbody>
                           </table>
                        </div>

                        <div className="space-y-4">
                           <h3 className="font-bold text-lg uppercase">E. PRESTASI</h3>
                           <table className="w-full border-collapse border border-black text-sm mb-6">
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
                        </div>

                        <h3 className="font-bold text-lg mb-6 uppercase">F. KETIDAKHADIRAN</h3>
                        <div className="w-[300px] border border-black mb-16 text-sm">
                           <div className="grid grid-cols-[1fr_80px_40px] px-4 py-2 border-b border-black">
                              <span>Sakit</span><span className="text-right">{absensiData[siswa.id]?.sakit || '0'}</span><span>hari</span>
                           </div>
                           <div className="grid grid-cols-[1fr_80px_40px] px-4 py-2 border-b border-black">
                              <span>Izin</span><span className="text-right">{absensiData[siswa.id]?.izin || '0'}</span><span>hari</span>
                           </div>
                           <div className="grid grid-cols-[1fr_80px_40px] px-4 py-2">
                              <span>Tanpa Keterangan</span><span className="text-right">{absensiData[siswa.id]?.alpa || '0'}</span><span>hari</span>
                           </div>
                        </div>

                        <h3 className="font-bold text-lg mb-6 uppercase">G. CATATAN WALIKELAS</h3>
                        <div className="border border-black p-4 min-h-[100px] mb-16 text-sm">
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
                    <CardTitle className="text-lg flex items-center justify-between overflow-visible">
                        <span>{viewMode === 'leger' ? 'Leger Kelas' : 'Daftar Kumpulan Nilai (DKN)'}</span>
                        <Select value={viewMode} onValueChange={(val: any) => setViewMode(val)}>
                           <SelectTrigger className="w-[180px] h-8 text-sm">
                              <SelectValue placeholder="Mode Tampilan" />
                           </SelectTrigger>
                           <SelectContent>
                              <SelectItem value="dkn">Tampilan DKN</SelectItem>
                              <SelectItem value="leger">Tampilan Leger</SelectItem>
                           </SelectContent>
                        </Select>
                     </CardTitle>
                    <CardDescription className="print:hidden">Daftar nilai seluruh mapel yang ditempuh dan rata-ratanya.</CardDescription>
                 </CardHeader>
                 <CardContent className="p-0 overflow-x-auto print:overflow-visible">
                    <div className="min-w-max p-4 print:p-0">
                       <table className="w-full text-[10px] border-collapse border border-slate-400">
  <thead className="bg-slate-50">
      <tr className="bg-slate-50">
         <th className="border border-slate-400 p-1 w-8" rowSpan={2}>No.</th>
         <th className="border border-slate-400 p-1 w-[250px]" rowSpan={2}>
            NAMA PESERTA DIDIK<br/>
            Nomor Induk/NISN<br/>
            Tempat dan Tanggal Lahir<br/>
            Nama Orang Tua<br/>
            Alamat
         </th>
         <th className="border border-slate-400 p-1" colSpan={usedMapel.length}>MATA PELAJARAN</th>
         {viewMode === 'leger' && (
           <>
             <th className="border border-slate-400 p-1 w-6 whitespace-nowrap" rowSpan={2}><div className="rotate-[-90deg] h-28 flex items-center justify-center font-bold">Pend. Kepramukaan</div></th>
             <th className="border border-slate-400 p-1 w-6 whitespace-nowrap" rowSpan={2}><div className="rotate-[-90deg] h-28 flex items-center justify-center font-bold">Keg. Ekstrakurikuler 2</div></th>
             <th className="border border-slate-400 p-1 w-6 whitespace-nowrap" rowSpan={2}><div className="rotate-[-90deg] h-28 flex items-center justify-center font-bold">Keg. Ekstrakurikuler 3</div></th>
             <th className="border border-slate-400 p-1 w-6 whitespace-nowrap" rowSpan={2}><div className="rotate-[-90deg] h-28 flex items-center justify-center font-bold">Keg. Ekstrakurikuler 4</div></th>
             <th className="border border-slate-400 p-1 w-6 whitespace-nowrap" rowSpan={2}><div className="rotate-[-90deg] h-28 flex items-center justify-center font-bold">Sakit</div></th>
             <th className="border border-slate-400 p-1 w-6 whitespace-nowrap" rowSpan={2}><div className="rotate-[-90deg] h-28 flex items-center justify-center font-bold">Ijin</div></th>
             <th className="border border-slate-400 p-1 w-6 whitespace-nowrap" rowSpan={2}><div className="rotate-[-90deg] h-28 flex items-center justify-center font-bold">Tanpa Keterangan</div></th>
             <th className="border border-slate-400 p-1 w-20" rowSpan={2}>Catatan / Pembinaan</th>
           </>
         )}
         {viewMode === 'dkn' && (
             <>
                <th rowSpan={2} className="border border-slate-400 bg-slate-100 p-1 text-center w-12"><div className="rotate-[-90deg] flex items-center justify-center h-24">Jumlah</div></th>
                <th rowSpan={2} className="border border-slate-400 bg-slate-100 p-1 text-center w-12"><div className="rotate-[-90deg] flex items-center justify-center h-24">Rerata</div></th>
                <th rowSpan={2} className="border border-slate-400 bg-slate-100 p-1 text-center w-12"><div className="rotate-[-90deg] flex items-center justify-center h-24">Ranking</div></th>
             </>
         )}
      </tr>
      <tr>
         {usedMapel.map(m => (
            <th key={m.id} className="border border-slate-400 p-1 h-36 w-8 font-bold">
               <div className="rotate-[-90deg] flex items-center justify-center whitespace-nowrap overflow-visible uppercase text-[8px] mx-auto">
                  {m.name}
               </div>
            </th>
         ))}
      </tr>
  </thead>
  <tbody>
     {siswaList.map((siswa, index) => (
        <tr key={siswa.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50 hover:bg-slate-100'}>
           <td className="border border-slate-400 p-1 text-center font-bold align-top">{index + 1}</td>
           <td className="border border-slate-400 p-1 leading-[1.3] align-top">
              <div className="flex h-full">
                 <div className="flex-1 space-y-0.5 min-w-[200px]">
                    <div className="font-bold uppercase">{siswa.displayName}</div>
                    {viewMode === 'leger' && (
                      <>
                        <div className="text-slate-600 text-[10px]">{siswa.nis || '-'}{siswa.nisn ? ' / ' + siswa.nisn : ''}</div>
                        <div className="text-slate-500 text-[9px] italic">{siswa.tempatLahir || '-'}, {siswa.tanggalLahir || '-'}</div>
                      </>
                    )}
                    {viewMode === 'dkn' && (
                       <div className="text-slate-600 text-[10px]">{siswa.nisn || '-'}</div>
                    )}
                 </div>
              </div>
           </td>
           {usedMapel.map(m => {
              const data = raportData[siswa.id]?.[m.id] || {};
              const nilaiMapel = isPtsMode ? data.nilai_pts : data.nilai;
              return (
                 <td key={m.id} className="border border-slate-400 p-0 text-center align-top">
                    <div className="h-full flex items-center justify-center font-semibold text-blue-800 min-h-[48px] px-1 py-1">
                       {nilaiMapel !== undefined && nilaiMapel !== null ? nilaiMapel : ''}
                    </div>
                 </td>
              );
           })}
           
           {viewMode === 'leger' && (
              <>
                 <td className="border border-slate-400 p-0 text-center text-xs">
                    <div className="h-full flex items-center justify-center min-h-[56px]">{ekstraData[siswa.id]?.[0]?.predikat || ''}</div>
                 </td>
                 <td className="border border-slate-400 p-0 text-center text-xs">
                    <div className="h-full flex items-center justify-center min-h-[56px]">{ekstraData[siswa.id]?.[1]?.predikat || ''}</div>
                 </td>
                 <td className="border border-slate-400 p-0 text-center text-xs">
                    <div className="h-full flex items-center justify-center min-h-[56px]">{ekstraData[siswa.id]?.[2]?.predikat || ''}</div>
                 </td>
                 <td className="border border-slate-400 p-0 text-center text-xs">
                    <div className="h-full flex items-center justify-center min-h-[56px]">{ekstraData[siswa.id]?.[3]?.predikat || ''}</div>
                 </td>
                 <td className="border border-slate-400 p-0 overflow-hidden w-8">
                    <input 
                       type="text" 
                       className="w-full h-full px-1 py-1 bg-transparent border-none focus:ring-1 focus:ring-blue-500 outline-none text-center text-[10px] min-h-[56px]" 
                       value={absensiData[siswa.id]?.sakit || ''}
                       placeholder="-"
                       onChange={(e) => setAbsensiData({ ...absensiData, [siswa.id]: { ...(absensiData[siswa.id] || {sakit:'', izin:'', alpa:''}), sakit: e.target.value } })}
                    />
                 </td>
                 <td className="border border-slate-400 p-0 overflow-hidden w-8">
                    <input 
                       type="text" 
                       className="w-full h-full px-1 py-1 bg-transparent border-none focus:ring-1 focus:ring-blue-500 outline-none text-center text-[10px] min-h-[56px]" 
                       value={absensiData[siswa.id]?.izin || ''}
                       placeholder="-"
                       onChange={(e) => setAbsensiData({ ...absensiData, [siswa.id]: { ...(absensiData[siswa.id] || {sakit:'', izin:'', alpa:''}), izin: e.target.value } })}
                    />
                 </td>
                 <td className="border border-slate-400 p-0 overflow-hidden w-8">
                    <input 
                       type="text" 
                       className="w-full h-full px-1 py-1 bg-transparent border-none focus:ring-1 focus:ring-blue-500 outline-none text-center text-[10px] min-h-[56px]" 
                       value={absensiData[siswa.id]?.alpa || ''}
                       placeholder="-"
                       onChange={(e) => setAbsensiData({ ...absensiData, [siswa.id]: { ...(absensiData[siswa.id] || {sakit:'', izin:'', alpa:''}), alpa: e.target.value } })}
                    />
                 </td>
                 <td className="border border-slate-400 p-0">
                    <textarea 
                       className="w-[120px] h-full p-2 bg-transparent border-none focus:ring-1 focus:ring-blue-500 outline-none text-xs resize-none min-h-[56px]" 
                       placeholder="Catatan..."
                       value={pembinaanData[siswa.id] || ''}
                       onChange={(e) => setPembinaanData({ ...pembinaanData, [siswa.id]: e.target.value })}
                    />
                 </td>
              </>
           )}

           {viewMode === 'dkn' && (
              <>
                 <td className="border border-slate-400 px-2 py-1 text-center font-bold text-slate-700">{jumlahNilaiSiswa[siswa.id] || ''}</td>
                 <td className="border border-slate-400 px-2 py-1 text-center font-bold text-blue-700">{rataRataSiswa[siswa.id]?.toFixed(1) || ''}</td>
                 <td className="border border-slate-400 px-2 py-1 text-center font-bold text-amber-700">{rankSiswa[siswa.id] || ''}</td>
              </>
           )}
        </tr>
     ))}
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
