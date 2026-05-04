import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/auth.store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Printer, FileText, Loader2, AlertCircle, LayoutGrid, FileStack, BookOpen } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import domtoimage from 'dom-to-image';
import { jsPDF } from 'jspdf';

export default function AdminCetakAkademik() {
  const { profile } = useAuthStore();
  const location = useLocation();
  const isDknView = location.pathname.includes('/dkn');
  const isRaportView = location.pathname.includes('/raport');
  const isLegerView = location.pathname.includes('/leger');

  const [kelas, setKelas] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<any[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  
  const [selectedKelas, setSelectedKelas] = useState('');
  const [tahunAjaran, setTahunAjaran] = useState('2024/2025');
  const [semester, setSemester] = useState('Ganjil');
  const [raportData, setRaportData] = useState<Record<string, Record<string, any>>>({}); 
  const [pembinaanData, setPembinaanData] = useState<Record<string, string>>({}); 

  const [loading, setLoading] = useState(false);
  const [printMode, setPrintMode] = useState<'raport' | 'ledger' | 'raport_pts' | 'ledger_pts' | 'dkn' | 'halaman_1_2' | 'halaman_12_13' | 'cover' | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const [kepalaSekolah, setKepalaSekolah] = useState('');
  const [nipKepalaSekolah, setNipKepalaSekolah] = useState('');
  const [tanggalRaportInput, setTanggalRaportInput] = useState(new Date().toISOString().split('T')[0]);
  const [printConfig, setPrintConfig] = useState<any>(null);

  // Subject code mapping for DKN
  const getSubjectCode = (name: string) => {
     const n = name.toUpperCase();
     if (n.includes('AGAMA') || n.includes('PAD')) return 'PAD';
     if (n.includes('PANCASILA') || n.includes('PP')) return 'PP';
     if (n.includes('INDONESIA') || n.includes('BI')) return 'BI';
     if (n.includes('MATEMATIKA') || n.includes('MATE')) return 'Mate';
     if (n.includes('IPA') || n.includes('IPI')) return 'IPI';
     if (n.includes('IPS')) return 'IPS';
     if (n.includes('BAHASA INGGRIS') || n.includes('IPB')) return 'IPB';
     if (n.includes('JASMANI') || n.includes('PJO')) return 'PJO';
     if (n.includes('INFORMATIKA') || n.includes('INFO')) return 'Info';
     if (n.includes('SENI') || n.includes('ST')) return 'ST';
     if (n.includes('PROYEK') || n.includes('PR')) return 'PR';
     if (n.includes('DAERAH') || n.includes('BJ')) return 'BJ';
     if (n.includes('ASWAJA') || n.includes('ASWA')) return 'Aswa';
     return n.substring(0, 4);
  };

  useEffect(() => {
    const unsubKelas = onSnapshot(collection(db, 'kelas'), snap => {
       setKelas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubMapel = onSnapshot(collection(db, 'mapel'), snap => {
      setMapelList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const savedConfig = localStorage.getItem('printConfig');
    if (savedConfig) setPrintConfig(JSON.parse(savedConfig));
    
    return () => { unsubKelas(); unsubMapel(); };
  }, []);

  useEffect(() => {
    if (selectedKelas) {
      loadData();
    }
  }, [selectedKelas, tahunAjaran, semester]);

  const loadData = async () => {
    if (!selectedKelas) return;
    setLoading(true);
    try {
      const usersSnap = await getDocs(query(collection(db, 'users')));
      const siswas = usersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((u: any) => u.role === 'siswa' && u.kelas === selectedKelas)
        .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));
      setSiswaList(siswas);

      const allNilai: Record<string, Record<string, any>> = {}; 
      const docsSnap = await getDocs(collection(db, 'nilai_raport'));
      const suffix = `_${tahunAjaran.replace(/\//g, '-')}_${semester}`;
      const prefix = `${selectedKelas}_`;
      
      const relatedDocs = docsSnap.docs.filter(d => d.id.startsWith(prefix) && d.id.endsWith(suffix));

      for (const d of relatedDocs) {
        const withoutPrefix = d.id.replace(prefix, '');
        const withoutSuffix = withoutPrefix.substring(0, withoutPrefix.lastIndexOf(`_${tahunAjaran.replace(/\//g, '-')}`));
        const mapelName = withoutSuffix;
        const m = mapelList.find(x => x.name === mapelName);
        if (!m) continue;

        const data = d.data().nilai || {};
        for (const [siswaId, stData] of Object.entries<any>(data)) {
          if (!allNilai[siswaId]) allNilai[siswaId] = {};
          let nilaiAkhir = 0;
          if (stData) {
             const fValid = Array.isArray(stData.formatif) ? stData.formatif.filter((v:any) => typeof v === 'number') as number[] : [];
             const avgF = fValid.length > 0 ? fValid.reduce((a,b) => a+b, 0) / fValid.length : 0;
             const sValid = Array.isArray(stData.sumatif) ? stData.sumatif.filter((v:any) => typeof v === 'number') as number[] : [];
             const avgS = sValid.length > 0 ? sValid.reduce((a,b) => a+b, 0) / sValid.length : 0;
             const finalPts = typeof stData.katrol_pts === 'number' && stData.katrol_pts > 0 ? stData.katrol_pts : (typeof stData.pts === 'number' ? stData.pts : 0);
             const finalPsas = typeof stData.katrol_psas === 'number' && stData.katrol_psas > 0 ? stData.katrol_psas : (typeof stData.psas === 'number' ? stData.psas : 0);
             const components = [];
             if (avgF > 0) components.push(avgF);
             if (avgS > 0) components.push(avgS);
             if (finalPts > 0) components.push(finalPts);
             if (finalPsas > 0) components.push(finalPsas);
             if (components.length > 0) nilaiAkhir = Math.round(components.reduce((a,b) => a+b, 0) / components.length);
          }
          allNilai[siswaId][m.id] = {
            nilai: Math.round(nilaiAkhir),
            nilai_pts: typeof stData?.pts === 'number' ? Math.round(stData.pts) : null,
            deskripsi: stData?.deskripsi || ''
          };
        }
      }
      setRaportData(allNilai);

      const pembinaanRef = doc(db, 'pembinaan_wali', `${selectedKelas}_${tahunAjaran.replace(/\//g, '-')}_${semester}`);
      const pembinaanSnap = await getDoc(pembinaanRef);
      setPembinaanData(pembinaanSnap.exists() ? pembinaanSnap.data().catatan || {} : {});

    } catch (err: any) {
      toast.error('Gagal memuat data: ' + err.message);
    }
    setLoading(false);
  };

  const handlePrint = (mode: 'raport' | 'ledger' | 'raport_pts' | 'ledger_pts' | 'dkn' | 'halaman_1_2' | 'halaman_12_13' | 'cover') => setPrintMode(mode);

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('print-container');
      if (!element) return;
      const pdf = new jsPDF({ orientation: printMode?.startsWith('ledger') ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pages = element.querySelectorAll('.pdf-page');
      if (pages.length > 0) {
        for (let i = 0; i < pages.length; i++) {
          const pageEl = pages[i] as HTMLElement;
          const dataUrl = await domtoimage.toJpeg(pageEl, { quality: 0.95, bgcolor: '#ffffff' });
          if (i > 0) pdf.addPage();
          pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, (pageEl.offsetHeight * pdfWidth) / pageEl.offsetWidth);
        }
      }
      pdf.save(`Export_Akademik_${selectedKelas}_${new Date().getTime()}.pdf`);
    } catch (err) { toast.error('Gagal ekspor.'); }
    setIsExporting(false);
  };

  const getSortedSiswa = () => {
    const withStats = siswaList.map(siswa => {
      const data = raportData[siswa.id] || {};
      const grades = Object.values(data).map((v: any) => (printMode || '').includes('pts') ? v.nilai_pts : v.nilai).filter(v => typeof v === 'number' && v > 0) as number[];
      const total = grades.reduce((a, b) => a + b, 0);
      const rerata = grades.length > 0 ? total / grades.length : 0;
      return { ...siswa, total, rerata };
    });
    return [...withStats].sort((a, b) => b.total - a.total).map((s, i, arr) => {
       let rank = i + 1;
       if (i > 0 && s.total === arr[i-1].total) {
          const prevRank = (arr[i-1] as any).rank;
          rank = prevRank;
       }
       return { ...s, rank };
    });
  };

  const sortedSiswa = getSortedSiswa();
  const relevantMapels = mapelList.filter(m => siswaList.some(s => {
     const val = raportData[s.id]?.[m.id]?.[(printMode || '').includes('pts') ? 'nilai_pts' : 'nilai'];
     return typeof val === 'number' && val > 0;
  }));

  const calculateColumnStats = (mapelId: string) => {
     const utils = { min: 0, max: 0, avg: 0, sd: 0 };
     const vals = siswaList.map(s => raportData[s.id]?.[mapelId]?.[(printMode || '').includes('pts') ? 'nilai_pts' : 'nilai']).filter(v => typeof v === 'number' && v > 0) as number[];
     if (vals.length === 0) return utils;
     utils.min = Math.min(...vals);
     utils.max = Math.max(...vals);
     utils.avg = vals.reduce((a,b) => a+b, 0) / vals.length;
     const variance = vals.reduce((a,b) => a + Math.pow(b - utils.avg, 2), 0) / vals.length;
     utils.sd = Math.sqrt(variance);
     return utils;
  };

  if (printMode !== null) {
      if (printMode.startsWith('ledger')) {
         return (
            <div className="fixed inset-0 z-[9999] bg-slate-100 overflow-y-auto w-full h-full text-black">
                 <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10 px-8 no-print">
                    <h2 className="text-xl font-bold">Preview DKN - {selectedKelas}</h2>
                    <div className="flex gap-3">
                       <Button variant="outline" onClick={() => setPrintMode(null)}>Kembali</Button>
                       <Button onClick={() => window.print()} variant="outline"><Printer className="mr-2 h-4 w-4" /> Cetak</Button>
                       <Button onClick={handleExportPDF} disabled={isExporting} className="bg-blue-600 font-bold">{isExporting ? 'Proses...' : 'PDF'}</Button>
                    </div>
                 </div>
                 <div id="print-container" className="mx-auto bg-white p-0">
                     <div className="pdf-page p-10 font-sans" style={{ width: '420mm', minHeight: '297mm' }}>
                        <div className="text-center font-bold mb-8 uppercase tracking-widest leading-tight">
                           <h1 className="text-2xl underline decoration-2 underline-offset-4">DAFTAR KUMPULAN NILAI RAPOR</h1>
                        </div>
                        
                        <div className="grid grid-cols-4 text-[12px] font-bold mb-6 italic">
                           <div className="col-span-2 space-y-1">
                              <div>Sekolah : SMA DARUSSALAM</div>
                              <div>Alamat : Jln. Pon-Pes Darussalam Blokagung Karangdoro Tegalsari</div>
                           </div>
                           <div className="space-y-1">
                              <div>Kelas : {selectedKelas}</div>
                              <div>Fase : E</div>
                           </div>
                           <div className="space-y-1">
                              <div>Semester : {semester === 'Ganjil' ? '1' : '2'}</div>
                              <div>Tahun Pelj. : {tahunAjaran}</div>
                           </div>
                        </div>

                        <table className="w-full border-collapse border-[1.5px] border-black text-[10px]">
                           <thead>
                              <tr className="bg-slate-50">
                                 <th className="border border-black p-1 w-8" rowSpan={2}>NO</th>
                                 <th className="border border-black p-1 w-32" rowSpan={2}>NIS/ NISN</th>
                                 <th className="border border-black p-1" rowSpan={2}>NAMA</th>
                                 <th className="border border-black p-1 w-8" rowSpan={2}>LP</th>
                                 <th className="border border-black p-1" colSpan={relevantMapels.length}>MATA PELAJARAN</th>
                                 <th className="border border-black p-1 rotate-[-90deg] h-24 w-8" rowSpan={2}><div className="flex items-center justify-center">Jumlah</div></th>
                                 <th className="border border-black p-1 rotate-[-90deg] h-24 w-8" rowSpan={2}><div className="flex items-center justify-center">Rerata</div></th>
                                 <th className="border border-black p-1 rotate-[-90deg] h-24 w-8" rowSpan={2}><div className="flex items-center justify-center">Ranking</div></th>
                              </tr>
                              <tr>
                                 {relevantMapels.map(m => (
                                    <th key={m.id} className="border border-black p-1 rotate-[-90deg] h-24 w-8 font-bold">
                                       <div className="flex items-center justify-center whitespace-nowrap overflow-visible">
                                          {m.name.length > 15 ? m.name.substring(0, 15) + '...' : m.name}
                                       </div>
                                    </th>
                                 ))}
                              </tr>
                           </thead>
                           <tbody className="font-medium">
                              {sortedSiswa.sort((a, b) => a.displayName.localeCompare(b.displayName)).map((siswa, idx) => (
                                 <tr key={siswa.id} className="hover:bg-slate-50">
                                    <td className="border border-black p-1 text-center">{idx + 1}</td>
                                    <td className="border border-black p-1 text-center font-mono">{siswa.nis || '-'}</td>
                                    <td className="border border-black p-1 px-2 uppercase text-[9px]">{siswa.displayName}</td>
                                    <td className="border border-black p-1 text-center">{siswa.jenisKelamin?.substring(0,1) || 'L'}</td>
                                    {relevantMapels.map(m => {
                                       const val = raportData[siswa.id]?.[m.id]?.[printMode.includes('pts') ? 'nilai_pts' : 'nilai'];
                                       return <td key={m.id} className="border border-black p-1 text-center">{val || '-'}</td>;
                                    })}
                                    <td className="border border-black p-1 text-center font-bold">{siswa.total}</td>
                                    <td className="border border-black p-1 text-center font-bold bg-slate-50">{siswa.rerata.toFixed(1).replace('.', ',')}</td>
                                    <td className="border border-black p-1 text-center font-bold">{siswa.rank}</td>
                                 </tr>
                              ))}
                              {/* Bottom Stats Part */}
                              <tr className="bg-slate-50 font-bold border-t-2 border-black">
                                 <td className="border border-black p-1 text-center" colSpan={4}>Nilai Terendah</td>
                                 {relevantMapels.map(m => <td key={`min-${m.id}`} className="border border-black p-1 text-center">{calculateColumnStats(m.id).min || '-'}</td>)}
                                 <td className="border border-black p-1 text-center" colSpan={3}>{Math.min(...sortedSiswa.map(s => s.total))} / {Math.min(...sortedSiswa.map(s => s.rerata)).toFixed(1).replace('.', ',')}</td>
                              </tr>
                              <tr className="bg-slate-50 font-bold">
                                 <td className="border border-black p-1 text-center" colSpan={4}>Nilai Tertinggi</td>
                                 {relevantMapels.map(m => <td key={`max-${m.id}`} className="border border-black p-1 text-center">{calculateColumnStats(m.id).max || '-'}</td>)}
                                 <td className="border border-black p-1 text-center" colSpan={3}>{Math.max(...sortedSiswa.map(s => s.total))} / {Math.max(...sortedSiswa.map(s => s.rerata)).toFixed(1).replace('.', ',')}</td>
                              </tr>
                              <tr className="bg-slate-100 font-bold">
                                 <td className="border border-black p-1 text-center uppercase" colSpan={4}>Rata-rata Nilai</td>
                                 {relevantMapels.map(m => <td key={`avg-${m.id}`} className="border border-black p-1 text-center">{Math.round(calculateColumnStats(m.id).avg) || '-'}</td>)}
                                 <td className="border border-black p-1 text-center" colSpan={3}>-</td>
                              </tr>
                              <tr className="bg-slate-50 font-bold text-[9px]">
                                 <td className="border border-black p-1 text-center" colSpan={4}>Standar Deviasi</td>
                                 {relevantMapels.map(m => <td key={`sd-${m.id}`} className="border border-black p-1 text-center">{calculateColumnStats(m.id).sd.toFixed(1).replace('.', ',')}</td>)}
                                 <td className="border border-black p-1 text-center" colSpan={3}>-</td>
                              </tr>
                           </tbody>
                        </table>

                        <div className="mt-12 grid grid-cols-3 text-xs font-bold text-center">
                           <div></div>
                           <div></div>
                           <div className="space-y-20">
                              <div>Banyuwangi, {tanggalRaportInput}<br/>Kepala Sekolah,</div>
                              <div>( {kepalaSekolah || '__________________'} )<br/>NIP. {nipKepalaSekolah || '__________________'}</div>
                           </div>
                        </div>
                     </div>
                 </div>
            </div>
         );
      }

      return (
        <div className="fixed inset-0 z-[9999] bg-slate-100 overflow-y-auto w-full h-full text-black">
             <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10 px-8 no-print">
                <h2 className="text-xl font-bold">Preview {printMode.toUpperCase()} - {selectedKelas}</h2>
                <div className="flex gap-3">
                   <Button variant="outline" onClick={() => setPrintMode(null)}>Kembali</Button>
                   <Button onClick={() => window.print()} variant="outline"><Printer className="mr-2 h-4 w-4" /> Cetak</Button>
                   <Button onClick={handleExportPDF} disabled={isExporting} className="bg-blue-600 font-bold">{isExporting ? 'Proses...' : 'PDF'}</Button>
                </div>
             </div>
             <div id="print-container" className="mx-auto bg-white p-0">
                 {/* LEDGER LAYOUT (More Comprehensive/Detailed) */}
                 {printMode === 'ledger' && (
                    <div className="pdf-page p-8 font-sans" style={{ width: '420mm', minHeight: '297mm' }}>
                        <div className="border-[2px] border-black p-4">
                           <div className="text-center font-bold mb-4 uppercase tracking-tighter">
                              <h1 className="text-xl">LEGER NILAI AKADEMIK PESERTA DIDIK</h1>
                              <p className="text-sm">TAHUN PELAJARAN {tahunAjaran} - SEMESTER {semester.toUpperCase()}</p>
                           </div>
                           
                           <div className="flex justify-between text-[11px] font-bold mb-4">
                              <span>SEKOLAH: SMA DARUSSALAM</span>
                              <span>KELAS: {selectedKelas}</span>
                              <span>WALI KELAS: {profile?.displayName || '-'}</span>
                           </div>

                           <table className="w-full border-collapse border-2 border-black text-[9px]">
                              <thead>
                                 <tr className="bg-slate-50">
                                    <th className="border border-black p-1 w-6" rowSpan={2}>NO</th>
                                    <th className="border border-black p-1 w-24" rowSpan={2}>NIS/NISN</th>
                                    <th className="border border-black p-1" rowSpan={2}>NAMA LENGKAP</th>
                                    <th className="border border-black p-1" colSpan={relevantMapels.length}>NILAI MAPEL (AKHIR)</th>
                                    <th className="border border-black p-1 w-12" rowSpan={2}>JML</th>
                                    <th className="border border-black p-1 w-12" rowSpan={2}>RRT</th>
                                    <th className="border border-black p-1 w-12" rowSpan={2}>RANK</th>
                                    <th className="border border-black p-1 w-24" rowSpan={2}>KET</th>
                                 </tr>
                                 <tr>
                                    {relevantMapels.map(m => (
                                       <th key={m.id} className="border border-black p-1 h-32 w-8 font-bold">
                                          <div className="rotate-[-90deg] flex items-center justify-center whitespace-nowrap">
                                             {m.name}
                                          </div>
                                       </th>
                                    ))}
                                 </tr>
                              </thead>
                              <tbody>
                                 {sortedSiswa.sort((a,b)=>a.displayName.localeCompare(b.displayName)).map((s, idx) => (
                                    <tr key={s.id}>
                                       <td className="border border-black p-1 text-center font-bold">{idx+1}</td>
                                       <td className="border border-black p-1 text-center">{s.nis || '-'}</td>
                                       <td className="border border-black p-1 px-2 uppercase font-bold text-[8px] whitespace-nowrap">{s.displayName}</td>
                                       {relevantMapels.map(m => (
                                          <td key={m.id} className="border border-black p-1 text-center font-bold">{raportData[s.id]?.[m.id]?.nilai || '-'}</td>
                                       ))}
                                       <td className="border border-black p-1 text-center font-black bg-slate-50">{s.total}</td>
                                       <td className="border border-black p-1 text-center font-black bg-slate-100">{s.rerata.toFixed(1)}</td>
                                       <td className="border border-black p-1 text-center font-black">{s.rank}</td>
                                       <td className="border border-black p-1 text-center text-[7px] italic font-bold">Terlampaui</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                           <div className="mt-8 flex justify-end">
                              <div className="w-64 text-center text-xs font-bold space-y-16">
                                 <div>Banyuwangi, {tanggalRaportInput}<br/>Wali Kelas,</div>
                                 <div>( {profile?.displayName || '__________________'} )</div>
                              </div>
                           </div>
                        </div>
                    </div>
                 )}

                 {/* DKN LAYOUT (Summary Style like PDF) */}
                 {(printMode === 'dkn' || printMode === 'ledger_pts') && (
                    <div className="pdf-page p-10 font-sans" style={{ width: '420mm', minHeight: '297mm' }}>
                        <div className="text-center font-bold mb-8 uppercase tracking-widest leading-tight">
                           <h1 className="text-2xl underline decoration-2 underline-offset-4">
                              {printMode === 'dkn' ? 'DAFTAR KUMPULAN NILAI RAPOR' : 'LEDGER NILAI TENGAH SEMESTER'}
                           </h1>
                        </div>
                        
                        <div className="grid grid-cols-4 text-[12px] font-bold mb-6 italic">
                           <div className="col-span-2 space-y-1">
                              <div>Sekolah : SMA DARUSSALAM</div>
                              <div>Alamat : Jln. Pon-Pes Darussalam Blokagung Karangdoro Tegalsari</div>
                           </div>
                           <div className="space-y-1">
                              <div>Kelas : {selectedKelas}</div>
                              <div>Fase : E</div>
                           </div>
                           <div className="space-y-1">
                              <div>Semester : {semester === 'Ganjil' ? '1' : '2'}</div>
                              <div>Tahun Pelj. : {tahunAjaran}</div>
                           </div>
                        </div>

                        <table className="w-full border-collapse border-[1.5px] border-black text-[10px]">
                           <thead>
                              <tr className="bg-slate-50">
                                 <th className="border border-black p-1 w-8" rowSpan={2}>NO</th>
                                 <th className="border border-black p-1 w-32" rowSpan={2}>NIS/ NISN</th>
                                 <th className="border border-black p-1" rowSpan={2}>NAMA</th>
                                 <th className="border border-black p-1 w-8" rowSpan={2}>LP</th>
                                 <th className="border border-black p-1" colSpan={relevantMapels.length}>MATA PELAJARAN</th>
                                 <th className="border border-black p-1 h-24 w-8" rowSpan={2}><div className="rotate-[-90deg] flex items-center justify-center">Jumlah</div></th>
                                 <th className="border border-black p-1 h-24 w-8" rowSpan={2}><div className="rotate-[-90deg] flex items-center justify-center">Rerata</div></th>
                                 <th className="border border-black p-1 h-24 w-8" rowSpan={2}><div className="rotate-[-90deg] flex items-center justify-center">Ranking</div></th>
                              </tr>
                              <tr>
                                 {relevantMapels.map(m => (
                                    <th key={m.id} className="border border-black p-1 h-24 w-8 font-bold">
                                       <div className="rotate-[-90deg] flex items-center justify-center whitespace-nowrap overflow-visible">
                                          {getSubjectCode(m.name)}
                                       </div>
                                    </th>
                                 ))}
                              </tr>
                           </thead>
                           <tbody className="font-medium">
                              {sortedSiswa.sort((a, b) => a.displayName.localeCompare(b.displayName)).map((siswa, idx) => (
                                 <tr key={siswa.id} className="hover:bg-slate-50">
                                    <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                                    <td className="border border-black p-1 text-center font-mono">{siswa.nis || '-'}</td>
                                    <td className="border border-black p-1 px-2 uppercase text-[9px] truncate max-w-[200px] font-bold">{siswa.displayName}</td>
                                    <td className="border border-black p-1 text-center">{siswa.jenisKelamin?.substring(0,1).toUpperCase() || 'L'}</td>
                                    {relevantMapels.map(m => {
                                       const val = raportData[siswa.id]?.[m.id]?.[printMode.includes('pts') ? 'nilai_pts' : 'nilai'];
                                       return <td key={m.id} className="border border-black p-1 text-center font-bold">{val || '-'}</td>;
                                    })}
                                    <td className="border border-black p-1 text-center font-black">{siswa.total}</td>
                                    <td className="border border-black p-1 text-center font-black bg-slate-50">{siswa.rerata.toFixed(1).replace('.', ',')}</td>
                                    <td className="border border-black p-1 text-center font-black">{siswa.rank}</td>
                                 </tr>
                              ))}
                              
                              <tr className="bg-slate-50 font-bold border-t-2 border-black">
                                 <td className="border border-black p-1 text-center" colSpan={4}>Nilai Terendah</td>
                                 {relevantMapels.map(m => <td key={`min-${m.id}`} className="border border-black p-1 text-center">{calculateColumnStats(m.id).min || '-'}</td>)}
                                 <td className="border border-black p-1 text-center" colSpan={3}>{Math.min(...sortedSiswa.map(s => s.total))} / {Math.min(...sortedSiswa.map(s => s.rerata)).toFixed(1).replace('.', ',')}</td>
                              </tr>
                              <tr className="bg-slate-50 font-bold">
                                 <td className="border border-black p-1 text-center" colSpan={4}>Nilai Tertinggi</td>
                                 {relevantMapels.map(m => <td key={`max-${m.id}`} className="border border-black p-1 text-center">{calculateColumnStats(m.id).max || '-'}</td>)}
                                 <td className="border border-black p-1 text-center" colSpan={3}>{Math.max(...sortedSiswa.map(s => s.total))} / {Math.max(...sortedSiswa.map(s => s.rerata)).toFixed(1).replace('.', ',')}</td>
                              </tr>
                              <tr className="bg-slate-100 font-bold">
                                 <td className="border border-black p-1 text-center uppercase" colSpan={4}>Rata-rata Nilai</td>
                                 {relevantMapels.map(m => <td key={`avg-${m.id}`} className="border border-black p-1 text-center">{Math.round(calculateColumnStats(m.id).avg) || '-'}</td>)}
                                 <td className="border border-black p-1 text-center" colSpan={3}>-</td>
                              </tr>
                           </tbody>
                        </table>

                        <div className="mt-12 grid grid-cols-3 text-xs font-bold text-center">
                           <div className="space-y-20 flex flex-col justify-between h-40">
                              <div>Mengetahui,<br/>Waka Kurikulum</div>
                              <div>( _________________ )<br/>NIP. _________________</div>
                           </div>
                           <div></div>
                           <div className="space-y-20 flex flex-col justify-between h-40">
                              <div>Banyuwangi, {tanggalRaportInput}<br/>Kepala Sekolah,</div>
                              <div>( {kepalaSekolah || '__________________'} )<br/>NIP. {nipKepalaSekolah || '__________________'}</div>
                           </div>
                        </div>
                    </div>
                 )}

                 {/* HALAMAN 12-13 (Extras: Health, Attendance, Achievements) */}
                 {printMode === 'halaman_12_13' && siswaList.map((siswa) => (
                    <div key={`extra-${siswa.id}`} className="pdf-page p-12 font-sans border-b-8 border-slate-100 print:border-none space-y-10" style={{ minHeight: '297mm', width: '210mm' }}>
                        <div className="grid grid-cols-2 text-[10px] font-bold mb-6">
                           <div className="grid grid-cols-[80px_10px_1fr]"><span>Nama Siswa</span><span>:</span><span>{siswa.displayName}</span></div>
                           <div className="grid grid-cols-[80px_10px_1fr]"><span>Kelas</span><span>:</span><span>{selectedKelas}</span></div>
                           <div className="grid grid-cols-[80px_10px_1fr]"><span>NISN</span><span>:</span><span>{siswa.nisn || '-'}</span></div>
                           <div className="grid grid-cols-[80px_10px_1fr]"><span>Semester</span><span>:</span><span>{semester}</span></div>
                        </div>

                        <div className="space-y-6">
                           <div className="space-y-2">
                              <h3 className="text-xs font-bold uppercase">C. Ekstrakurikuler</h3>
                              <table className="w-full border-collapse border border-black text-xs">
                                 <thead>
                                    <tr className="bg-slate-50">
                                       <th className="border border-black p-2 w-10">No</th>
                                       <th className="border border-black p-2 text-left">Kegiatan Ekstrakurikuler</th>
                                       <th className="border border-black p-2 text-left">Keterangan</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    <tr className="h-10"><td className="border border-black p-2 text-center">1</td><td className="border border-black p-2">-</td><td className="border border-black p-2">-</td></tr>
                                    <tr className="h-10"><td className="border border-black p-2 text-center">2</td><td className="border border-black p-2">-</td><td className="border border-black p-2">-</td></tr>
                                 </tbody>
                              </table>
                           </div>

                           <div className="space-y-2">
                              <h3 className="text-xs font-bold uppercase">D. Ketidakhadiran</h3>
                              <table className="w-[300px] border-collapse border border-black text-xs">
                                 <tbody>
                                    <tr><td className="border border-black p-2 w-32">Sakit</td><td className="border border-black p-2">: .... Hari</td></tr>
                                    <tr><td className="border border-black p-2">Izin</td><td className="border border-black p-2">: .... Hari</td></tr>
                                    <tr><td className="border border-black p-2">Tanpa Keterangan</td><td className="border border-black p-2">: .... Hari</td></tr>
                                 </tbody>
                              </table>
                           </div>

                           <div className="space-y-4 pt-10">
                              <div className="border border-black p-4 min-h-[100px]">
                                 <h3 className="text-xs font-bold mb-2">KEPUTUSAN:</h3>
                                 <p className="text-xs">
                                    Berdasarkan hasil yang dicapai pada semester 1 dan 2, peserta didik ditetapkan:<br/>
                                    <b>NAIK / TIDAK NAIK</b> ke Kelas: .........<br/>
                                    <b>LULUS / TIDAK LULUS</b>
                                 </p>
                              </div>
                           </div>
                        </div>

                        <div className="flex justify-between mt-20 text-xs font-bold text-center">
                            <div className="w-48 space-y-20">
                               <div>Mengetahui,<br/>Orang Tua/Wali,</div>
                               <div>( _________________ )</div>
                            </div>
                            <div className="w-64 space-y-20">
                               <div>Banyuwangi, {tanggalRaportInput}<br/>Wali Kelas,</div>
                               <div>( {profile?.displayName || '__________________'} )</div>
                            </div>
                        </div>
                    </div>
                 ))}

                 {/* COVER RAPORT LAYOUT */}
                 {printMode === 'cover' && siswaList.map((siswa) => (
                    <div key={`cover-${siswa.id}`} className="pdf-page p-20 font-sans border-b-8 border-slate-100 print:border-none flex flex-col items-center justify-between text-center" style={{ minHeight: '297mm', width: '210mm' }}>
                        <div className="space-y-4">
                           <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">LAPORAN HASIL BELAJAR</h1>
                           <h2 className="text-2xl font-bold uppercase">(RAPORT)</h2>
                           <h3 className="text-xl font-bold uppercase">SEKOLAH MENENGAH ATAS</h3>
                           <h3 className="text-xl font-bold uppercase">(SMA)</h3>
                        </div>

                        <div className="w-48 h-48 bg-slate-100 rounded-2xl flex items-center justify-center border-4 border-slate-200">
                           <span className="text-slate-300 font-bold italic">Logo Sekolah</span>
                        </div>

                        <div className="space-y-8 w-full">
                           <div className="space-y-2">
                              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nama Peserta Didik</p>
                              <div className="border-b-2 border-black p-2 text-2xl font-black uppercase tracking-tight">{siswa.displayName}</div>
                           </div>
                           <div className="space-y-2">
                              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">NIS / NISN</p>
                              <div className="border-b-2 border-black p-2 text-xl font-bold font-mono tracking-tight">{siswa.nis || '-'} / {siswa.nisn || '-'}</div>
                           </div>
                        </div>

                        <div className="space-y-4 pt-20">
                           <h2 className="text-2xl font-black uppercase">SMA DARUSSALAM</h2>
                           <p className="text-xs font-bold text-slate-500 uppercase leading-relaxed max-w-sm">
                              Jl. Pon-Pes Darussalam Blokagung Karangdoro Tegalsari<br/>
                              Kabupaten Banyuwangi - Jawa Timur
                           </p>
                        </div>
                    </div>
                 ))}

                 {/* HALAMAN IDENTITAS (1-2) */}
                 {printMode === 'halaman_1_2' && siswaList.map((siswa) => (
                    <div key={`id-${siswa.id}`} className="pdf-page p-16 font-sans border-b-8 border-slate-100 print:border-none space-y-10" style={{ minHeight: '297mm', width: '210mm' }}>
                        <div className="text-center font-bold mb-10 uppercase">
                           <h1 className="text-xl">IDENTITAS PESERTA DIDIK</h1>
                        </div>
                        <div className="space-y-4 text-sm font-medium">
                           {[
                              { l: '1. Nama Lengkap', v: siswa.displayName },
                              { l: '2. Nomor Induk Siswa (NIS)', v: siswa.nis },
                              { l: '3. NISN', v: siswa.nisn },
                              { l: '4. Tempat, Tanggal Lahir', v: siswa.tempatLahir + ', ' + (siswa.tanggalLahir || '-') },
                              { l: '5. Jenis Kelamin', v: siswa.jenisKelamin === 'laki-laki' ? 'Laki-laki' : 'Perempuan' },
                              { l: '6. Agama', v: 'Islam' },
                              { l: '7. Alamat Peserta Didik', v: siswa.alamat || '-' },
                              { l: '8. Nama Orang Tua/Wali', v: siswa.namaAyah || siswa.namaIbu || '-' },
                              { l: '9. Pekerjaan Orang Tua/Wali', v: '-' },
                              { l: '10. Wali Peserta Didik', v: '-' },
                           ].map((row, i) => (
                              <div key={i} className="grid grid-cols-[200px_20px_1fr] border-b border-slate-100 pb-2">
                                 <span>{row.l}</span>
                                 <span>:</span>
                                 <span className="uppercase font-bold">{row.v || '-'}</span>
                              </div>
                           ))}
                        </div>
                        <div className="flex justify-end pt-20">
                           <div className="w-64 text-center text-xs font-bold space-y-24">
                              <div>Banyuwangi, {tanggalRaportInput}<br/>Kepala Sekolah,</div>
                              <div>( {kepalaSekolah || '__________________'} )<br/>NIP. {nipKepalaSekolah || '__________________'}</div>
                           </div>
                        </div>
                    </div>
                 ))}

                 {/* STANDARD RAPORT PAGES */}
                 {(printMode === 'raport' || printMode === 'raport_pts' || printMode === 'halaman_12_13') && (
                    siswaList.map((siswa, idx) => (
                       <div key={siswa.id} className="pdf-page p-12 font-sans border-b-8 border-slate-100 print:border-none" style={{ minHeight: '297mm', width: '210mm' }}>
                           <div className="text-center font-bold mb-6 border-b-2 border-black pb-4 uppercase tracking-widest leading-tight">
                               <h2 className="text-sm">LAPORAN HASIL BELAJAR {printMode.includes('pts') ? 'TENGAH SEMESTER' : ''}</h2>
                               <h1 className="text-xl">SMA DARUSSALAM</h1>
                               <p className="text-[10px] font-normal lowercase italic">Jl. Raya Darussalam No. 1, Banyuwangi</p>
                           </div>
                           <div className="grid grid-cols-2 text-xs font-bold mb-6 space-y-1">
                              <div className="grid grid-cols-[100px_10px_1fr]"><span>NAMA SISWA</span><span>:</span><span>{siswa.displayName}</span></div>
                              <div className="grid grid-cols-[100px_10px_1fr]"><span>KELAS</span><span>:</span><span>{selectedKelas}</span></div>
                              <div className="grid grid-cols-[100px_10px_1fr]"><span>NISN / NIS</span><span>:</span><span>{siswa.nisn || '-'} / {siswa.nis || '-'}</span></div>
                              <div className="grid grid-cols-[100px_10px_1fr]"><span>SEMESTER</span><span>:</span><span>{semester}</span></div>
                              <div className="grid grid-cols-[100px_10px_1fr]"><span>TAHUN PELAJARAN</span><span>:</span><span>{tahunAjaran}</span></div>
                           </div>
                           <table className="w-full border-collapse border-[1.5px] border-black text-xs">
                              <thead>
                                 <tr className="bg-slate-100">
                                    <th className="border border-black p-2 w-8">NO</th>
                                    <th className="border border-black p-2 text-left">MATA PELAJARAN</th>
                                    <th className="border border-black p-2 w-16">NILAI</th>
                                    <th className="border border-black p-2 text-left">CAPAIAN KOMPETENSI / DESKRIPSI</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-black">
                                 {mapelList.filter(m => raportData[siswa.id]?.[m.id]).map((m, i) => (
                                    <tr key={m.id}>
                                       <td className="border border-black p-2 text-center align-top font-bold">{i+1}</td>
                                       <td className="border border-black p-2 align-top font-bold">{m.name}</td>
                                       <td className="border border-black p-2 text-center font-black text-sm align-top">{(printMode || '').includes('pts') ? raportData[siswa.id][m.id].nilai_pts : raportData[siswa.id][m.id].nilai}</td>
                                       <td className="border border-black p-3 text-[11px] align-top italic leading-relaxed text-slate-800">{raportData[siswa.id][m.id].deskripsi || '-'}</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                           <div className="mt-8 border-[1.5px] border-black p-4 italic text-xs min-h-[60px]">
                               <b className="not-italic">CATATAN WALI KELAS:</b><br/> {pembinaanData[siswa.id] || '-'}
                           </div>
                           <div className="flex justify-between mt-12 text-xs font-bold text-center">
                               <div className="w-48 space-y-20">
                                  <div>Mengetahui,<br/>Orang Tua/Wali,</div>
                                  <div>( _________________ )</div>
                               </div>
                               <div className="w-64 space-y-20">
                                  <div>Banyuwangi, {tanggalRaportInput}<br/>Wali Kelas,</div>
                                  <div>( {profile?.displayName || '__________________'} )</div>
                               </div>
                           </div>
                       </div>
                    ))
                 )}
             </div>
        </div>
      );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
               {isDknView ? 'Daftar Kumpulan Nilai (DKN)' : isRaportView ? 'Pusat Cetak Raport' : 'Cetak Dokumentasi Akademik'}
            </h1>
            <p className="text-sm text-slate-500 font-medium">Otorisasi administratif penuh untuk dokumentasi akademik siswa.</p>
         </div>
      </div>

      <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden">
         <CardHeader className="bg-slate-800 text-white p-6">
            <CardTitle className="text-lg flex items-center gap-2">
               <Settings className="w-5 h-5" /> Filter Akademik
            </CardTitle>
         </CardHeader>
         <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Tahun Ajaran</label>
                  <Select value={tahunAjaran} onValueChange={setTahunAjaran}>
                     <SelectTrigger className="h-12 border-slate-200 font-bold"><SelectValue placeholder="Pilih TA" /></SelectTrigger>
                     <SelectContent>
                        {Array.from({length: 5}).map((_, i) => {
                           const startYear = new Date().getFullYear() - 2 + i;
                           const ta = `${startYear}/${startYear+1}`;
                           return <SelectItem key={ta} value={ta}>{ta}</SelectItem>;
                        })}
                     </SelectContent>
                  </Select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Semester</label>
                  <Select value={semester} onValueChange={setSemester}>
                     <SelectTrigger className="h-12 border-slate-200 font-bold"><SelectValue placeholder="Pilih Semester" /></SelectTrigger>
                     <SelectContent><SelectItem value="Ganjil">Ganjil</SelectItem><SelectItem value="Genap">Genap</SelectItem></SelectContent>
                  </Select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Kelas Target</label>
                  <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                     <SelectTrigger className="h-12 border-slate-200 font-bold"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                     <SelectContent>{kelas.sort((a,b)=>a.name.localeCompare(b.name)).map(k => <SelectItem key={k.id} value={k.name}>{k.name}</SelectItem>)}</SelectContent>
                  </Select>
               </div>
            </div>
         </CardContent>
      </Card>

            {selectedKelas && (
         <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {[
                  { id: 'dkn', label: 'Cetak DKN (PDF)', icon: LayoutGrid, color: 'text-blue-600 bg-blue-50 border-blue-100' },
                  { id: 'ledger', label: 'Cetak Ledger (Besar)', icon: FileStack, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
                  { id: 'raport', label: 'Cetak Raport Akhir', icon: Printer, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                  { id: 'raport_pts', label: 'Cetak Raport PTS', icon: FileStack, color: 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-100' },
                  { id: 'halaman_1_2', label: 'Cetak Halaman 1-2', icon: FileText, color: 'text-amber-600 bg-amber-50 border-amber-100' },
                  { id: 'halaman_12_13', label: 'Cetak Halaman 12-13', icon: FileText, color: 'text-rose-600 bg-rose-50 border-rose-100' },
                  { id: 'cover', label: 'Cetak Cover Raport', icon: BookOpen, color: 'text-slate-600 bg-slate-50 border-slate-100' },
               ].map(opt => (
                  <Button 
                     key={opt.id} 
                     variant="outline" 
                     onClick={() => handlePrint(opt.id as any)}
                     className={`h-24 flex flex-col gap-2 rounded-2xl border-2 transition-all hover:scale-[1.02] shadow-sm ${opt.color}`}
                  >
                     <opt.icon className="w-6 h-6" />
                     <span className="font-bold text-xs uppercase tracking-tighter text-center leading-tight">{opt.label}</span>
                  </Button>
               ))}
            </div>

            <Card className="border-0 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden bg-white">
               <div className="bg-slate-50 p-6 border-b flex justify-between items-center">
                  <h3 className="font-black text-slate-800 uppercase tracking-tighter">Preview DKN (Daftar Kumpulan Nilai) - {selectedKelas}</h3>
                  <div className="flex gap-2">
                     <Dialog>
                        <DialogTrigger asChild><Button variant="outline" size="sm" className="font-bold border-slate-200 h-10 px-4"><Settings className="w-4 h-4 mr-2" /> TTD</Button></DialogTrigger>
                        <DialogContent>
                           <DialogHeader><DialogTitle>Konfigurasi Tanda Tangan</DialogTitle></DialogHeader>
                           <div className="p-4 space-y-4">
                              <div className="space-y-1">
                                 <label className="text-[10px] font-bold text-slate-400 uppercase">Kepala Sekolah</label>
                                 <Input value={kepalaSekolah} onChange={e => setKepalaSekolah(e.target.value)} placeholder="Nama Kepala Sekolah" />
                              </div>
                              <div className="space-y-1">
                                 <label className="text-[10px] font-bold text-slate-400 uppercase">NIP</label>
                                 <Input value={nipKepalaSekolah} onChange={e => setNipKepalaSekolah(e.target.value)} placeholder="NIP Kepala Sekolah" />
                              </div>
                              <div className="space-y-1">
                                 <label className="text-[10px] font-bold text-slate-400 uppercase">Tanggal Cetak</label>
                                 <Input type="date" value={tanggalRaportInput} onChange={e => setTanggalRaportInput(e.target.value)} />
                              </div>
                           </div>
                        </DialogContent>
                     </Dialog>
                     <Button onClick={() => handlePrint('dkn')} className="bg-blue-600 hover:bg-blue-700 font-bold h-10 px-6 rounded-full shadow-md shadow-blue-600/20">
                        <Printer className="w-4 h-4 mr-2" /> CETAK DKN
                     </Button>
                  </div>
               </div>
               <CardContent className="p-0">
                  <div className="overflow-x-auto">
                     <table className="w-full border-collapse text-[10px]">
                        <thead className="bg-slate-800 text-white font-bold">
                           <tr>
                              <th className="border border-slate-700 p-3 w-10" rowSpan={2}>NO</th>
                              <th className="border border-slate-700 p-3" rowSpan={2}>NAMA SISWA</th>
                              <th className="border border-slate-700 p-3" colSpan={relevantMapels.length}>SUBJECTS</th>
                              <th className="border border-slate-700 p-3 w-16" rowSpan={2}>TOTAL</th>
                              <th className="border border-slate-700 p-3 w-16" rowSpan={2}>AVG</th>
                              <th className="border border-slate-700 p-3 w-16" rowSpan={2}>RANK</th>
                           </tr>
                           <tr>
                              {relevantMapels.map(m => (
                                 <th key={m.id} className="border border-slate-700 p-1 text-[8px] max-w-[40px] truncate" title={m.name}>{getSubjectCode(m.name)}</th>
                              ))}
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {sortedSiswa.sort((a,b)=>a.displayName.localeCompare(b.displayName)).map((siswa, idx) => (
                              <tr key={siswa.id} className="hover:bg-slate-50 font-medium">
                                 <td className="p-3 text-center border-x border-slate-100 text-slate-400">{idx+1}</td>
                                 <td className="p-3 border-x border-slate-100 font-bold text-slate-700 truncate max-w-[200px] uppercase text-[9px]">{siswa.displayName}</td>
                                 {relevantMapels.map(m => {
                                    const val = raportData[siswa.id]?.[m.id]?.nilai;
                                    return <td key={m.id} className="p-2 text-center border-x border-slate-100 font-bold">{val || '-'}</td>;
                                 })}
                                 <td className="p-3 text-center border-x border-slate-100 bg-slate-50 font-black">{siswa.total}</td>
                                 <td className="p-3 text-center border-x border-slate-100 bg-blue-50/30 text-blue-600 font-black">{siswa.rerata.toFixed(1).replace('.', ',')}</td>
                                 <td className="p-3 text-center border-x border-slate-100 font-black text-rose-500">{siswa.rank}</td>
                              </tr>
                           ))}
                           <tr className="bg-slate-50 font-black text-slate-800 border-t-2 border-slate-200">
                              <td colSpan={2} className="p-3 text-center uppercase tracking-tighter">Rata-rata Nilai</td>
                              {relevantMapels.map(m => <td key={`avg-${m.id}`} className="p-3 text-center border-x border-slate-100">{Math.round(calculateColumnStats(m.id).avg)}</td>)}
                              <td colSpan={3} className="bg-slate-200/50"></td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
               </CardContent>
            </Card>
         </div>
      )}

      {!selectedKelas && (
         <div className="py-32 text-center flex flex-col items-center justify-center space-y-4 bg-white rounded-3xl border-2 border-dashed border-slate-100 shadow-inner">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
               <BookOpen className="w-10 h-10" />
            </div>
            <div className="max-w-xs mx-auto">
               <h4 className="font-black text-slate-400 uppercase tracking-widest text-xs">Pilih Kelas untuk Mengakses Data</h4>
               <p className="text-xs text-slate-300 mt-2 font-medium">Data akan tampil secara otomatis setelah parameter dipilih.</p>
            </div>
         </div>
      )}
    </div>
  );
}
