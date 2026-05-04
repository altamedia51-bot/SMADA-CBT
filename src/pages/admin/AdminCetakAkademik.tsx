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
  const [printMode, setPrintMode] = useState<'raport' | 'ledger' | 'raport_pts' | 'ledger_pts' | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  const [kepalaSekolah, setKepalaSekolah] = useState('');
  const [nipKepalaSekolah, setNipKepalaSekolah] = useState('');
  const [tanggalRaportInput, setTanggalRaportInput] = useState(new Date().toISOString().split('T')[0]);
  const [printConfig, setPrintConfig] = useState<any>(null);

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

  const handlePrint = (mode: 'raport' | 'ledger' | 'raport_pts' | 'ledger_pts') => setPrintMode(mode);

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
                 {siswaList.map((siswa, idx) => (
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
                                    <td className="border border-black p-2 text-center font-black text-sm align-top">{printMode.includes('pts') ? raportData[siswa.id][m.id].nilai_pts : raportData[siswa.id][m.id].nilai}</td>
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
                               <div>( {profile.displayName} )</div>
                            </div>
                        </div>
                    </div>
                 ))}
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
            {isRaportView && (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[
                     { id: 'ledger', label: 'Cetak Ledger / DKN', icon: LayoutGrid, color: 'text-blue-600 bg-blue-50 border-blue-100' },
                     { id: 'raport', label: 'Cetak Raport Akhir', icon: Printer, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                     { id: 'raport_pts', label: 'Cetak Raport PTS', icon: FileStack, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
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
                        <span className="font-bold text-xs uppercase tracking-tighter">{opt.label}</span>
                     </Button>
                  ))}
               </div>
            )}

            {(isDknView || isLegerView) && (
               <Card className="border-0 shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden bg-white">
                  <div className="bg-slate-50 p-6 border-b flex justify-between items-center">
                     <h3 className="font-black text-slate-800 uppercase tracking-tighter">Preview Tabel DKN Kelas {selectedKelas}</h3>
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
                        <Button onClick={() => handlePrint('ledger')} className="bg-blue-600 hover:bg-blue-700 font-bold h-10 px-6 rounded-full shadow-md shadow-blue-600/20">
                           <Printer className="w-4 h-4 mr-2" /> CETAK / PDF
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
                                 <th className="border border-slate-700 p-3" colSpan={relevantMapels.length}>MATA PELAJARAN</th>
                                 <th className="border border-slate-700 p-3 w-16" rowSpan={2}>JML</th>
                                 <th className="border border-slate-700 p-3 w-16" rowSpan={2}>RRT</th>
                                 <th className="border border-slate-700 p-3 w-16" rowSpan={2}>RK</th>
                              </tr>
                              <tr>
                                 {relevantMapels.map(m => (
                                    <th key={m.id} className="border border-slate-700 p-1 text-[8px] max-w-[40px] truncate">{m.name}</th>
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
            )}
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
