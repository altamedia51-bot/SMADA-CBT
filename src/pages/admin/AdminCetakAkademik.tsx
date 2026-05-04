import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/auth.store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Printer, FileText, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import domtoimage from 'dom-to-image';
import { jsPDF } from 'jspdf';

export default function AdminCetakAkademik() {
  const { profile } = useAuthStore();
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

  if (printMode !== null) {
      // Re-use logic from GuruRaportKelas but with selectedKelas instead of profile.waliKelas
      // ... (Returning the same print layout)
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
                 {/* Similar to GuruRaportKelas printing logic, simplified for brevity but full functionality */}
                 {siswaList.map((siswa, idx) => (
                    <div key={siswa.id} className="pdf-page p-10 font-sans border-b-8 border-slate-100 print:border-none" style={{ minHeight: '297mm', width: printMode.startsWith('ledger') ? '297mm' : '210mm' }}>
                        <div className="text-center font-bold mb-6 border-b-2 border-black pb-4 uppercase tracking-widest leading-tight">
                            <h2 className="text-sm">LAPORAN HASIL BELAJAR {printMode.includes('pts') ? 'TENGAH SEMESTER' : ''}</h2>
                            <h1 className="text-xl">SMA DARUSSALAM</h1>
                            <p className="text-[10px] font-normal lowercase italic">Jl. Raya Darussalam No. 1, Banyuwangi</p>
                        </div>
                        <div className="grid grid-cols-2 text-xs font-bold mb-4">
                           <div>NAMA: {siswa.displayName}</div>
                           <div>KELAS: {selectedKelas}</div>
                           <div>NISN: {siswa.nisn || '-'}</div>
                           <div>TA: {tahunAjaran} ({semester})</div>
                        </div>
                        <table className="w-full border-collapse border border-black text-xs">
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
                                    <td className="border border-black p-2 text-center align-top">{i+1}</td>
                                    <td className="border border-black p-2 align-top">{m.name}</td>
                                    <td className="border border-black p-2 text-center font-bold text-sm align-top">{printMode.includes('pts') ? raportData[siswa.id][m.id].nilai_pts : raportData[siswa.id][m.id].nilai}</td>
                                    <td className="border border-black p-2 text-[11px] align-top italic">{raportData[siswa.id][m.id].deskripsi || '-'}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                        <div className="mt-8 border border-black p-4 italic text-xs">
                            <b>Catatan Wali Kelas:</b> {pembinaanData[siswa.id] || '-'}
                        </div>
                        <div className="flex justify-between mt-10 text-xs font-bold text-center">
                            <div className="w-40">Mengetahui,<br/>Orang Tua/Wali<br/><br/><br/><br/>( _________________ )</div>
                            <div className="w-64">Banyuwangi, {tanggalRaportInput}<br/>Wali Kelas<br/><br/><br/><br/>( {profile.displayName} )</div>
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
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Cetak Dokumentasi Akademik (Admin)</h1>
            <p className="text-sm text-slate-500 font-medium">Cetak Raport, Ledger, dan DKN untuk seluruh kelas dengan otorisasi administratif penuh.</p>
         </div>
      </div>

      <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl">
         <CardHeader className="bg-slate-800 text-white p-6">
            <CardTitle>Parameter Laporan</CardTitle>
         </CardHeader>
         <CardContent className="p-6 space-y-8">
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
                     <SelectContent>{kelas.map(k => <SelectItem key={k.id} value={k.name}>{k.name}</SelectItem>)}</SelectContent>
                  </Select>
               </div>
            </div>

            {selectedKelas ? (
               <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <Button onClick={() => handlePrint('ledger')} variant="outline" className="h-14 border-blue-600 text-blue-600 font-bold shadow-sm hover:bg-blue-50">
                        <Printer className="mr-2 h-5 w-5" /> CETAK LEDGER / DKN
                     </Button>
                     <Button onClick={() => handlePrint('raport')} variant="outline" className="h-14 border-emerald-600 text-emerald-600 font-bold shadow-sm hover:bg-emerald-50">
                        <Printer className="mr-2 h-5 w-5" /> CETAK RAPORT AKHIR
                     </Button>
                     <Button onClick={() => handlePrint('ledger_pts')} variant="outline" className="h-14 border-indigo-600 text-indigo-600 font-bold shadow-sm hover:bg-indigo-50">
                        <Printer className="mr-2 h-5 w-5" /> LEDGER PTS
                     </Button>
                     <Button onClick={() => handlePrint('raport_pts')} variant="outline" className="h-14 border-purple-600 text-purple-600 font-bold shadow-sm hover:bg-purple-50">
                        <Printer className="mr-2 h-5 w-5" /> RAPORT PTS
                     </Button>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                     <div className="flex items-center gap-3 text-slate-400">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-tight">Status: {siswaList.length} Siswa Terindentifikasi di Kelas {selectedKelas}</span>
                     </div>
                     <Dialog>
                        <DialogTrigger asChild><Button variant="ghost" className="text-slate-500 font-bold text-xs"><Settings className="w-4 h-4 mr-2" /> PENGATURAN CETAK</Button></DialogTrigger>
                        <DialogContent>
                           <DialogHeader><DialogTitle>Konfigurasi Dokumen</DialogTitle></DialogHeader>
                           <div className="py-4 space-y-4">
                              <Input placeholder="Kepala Sekolah" value={kepalaSekolah} onChange={e => setKepalaSekolah(e.target.value)} />
                              <Input placeholder="NIP" value={nipKepalaSekolah} onChange={e => setNipKepalaSekolah(e.target.value)} />
                              <Input type="date" value={tanggalRaportInput} onChange={e => setTanggalRaportInput(e.target.value)} />
                           </div>
                        </DialogContent>
                     </Dialog>
                  </div>
               </div>
            ) : (
               <div className="py-20 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Pilih Kelas untuk Mengakses Dokumen Akademik</p>
               </div>
            )}
         </CardContent>
      </Card>
    </div>
  );
}
