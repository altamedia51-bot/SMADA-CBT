import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/auth.store';
import { Save, Loader2, Wand2, FileDown, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAppSettings } from '../../hooks/useAppSettings';

interface NilaiSiswa {
  formatif: (number | '')[];
  sumatif: (number | '')[];
  pts: number | '';
  katrol_pts: number | '';
  psas: number | '';
  katrol_psas: number | '';
  deskripsi: string;
}

export default function AdminInputNilai() {
  const { profile, activeTahunAjaran: authTahunAjaran } = useAuthStore();
  const { settings } = useAppSettings();
  const [kelas, setKelas] = useState<any[]>([]);
  const [mapel, setMapel] = useState<any[]>([]);
  
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  const [tahunAjaran, setTahunAjaran] = useState(authTahunAjaran || settings.activeTahunAjaran || '2025/2026');
  const [semester, setSemester] = useState('Ganjil');

  useEffect(() => {
     if (authTahunAjaran) {
        setTahunAjaran(authTahunAjaran);
     } else if (settings.activeTahunAjaran) {
        setTahunAjaran(settings.activeTahunAjaran);
     }
  }, [authTahunAjaran, settings.activeTahunAjaran]);
  
  const [siswaConfig, setSiswaConfig] = useState<any[]>([]);
  const [kkm, setKkm] = useState<number>(75);
  const [deskripsiFormatif, setDeskripsiFormatif] = useState<string[]>(Array(8).fill(''));
  const [deskripsiSumatif, setDeskripsiSumatif] = useState<string[]>(Array(8).fill(''));
  
  const [nilaiData, setNilaiData] = useState<Record<string, NilaiSiswa>>({});
  const [loading, setLoading] = useState(false);

  const [katrolPtsMin, setKatrolPtsMin] = useState(70);
  const [katrolPtsMax, setKatrolPtsMax] = useState(92);
  const [katrolPsasMin, setKatrolPsasMin] = useState(70);
  const [katrolPsasMax, setKatrolPsasMax] = useState(92);

  useEffect(() => {
    const unsubKelas = onSnapshot(collection(db, 'kelas'), snap => {
      setKelas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubMapel = onSnapshot(collection(db, 'mapel'), snap => {
      setMapel(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubKelas(); unsubMapel(); }
  }, []);

  useEffect(() => {
    if (selectedKelas && selectedMapel) {
       loadData();
    } else {
       setSiswaConfig([]);
       setNilaiData({});
    }
  }, [selectedKelas, selectedMapel, tahunAjaran, semester]);

  const getDocId = () => `${selectedKelas}_${selectedMapel}_${tahunAjaran.replace(/\//g, '-')}_${semester}`;

  const loadData = async () => {
     setLoading(true);
     try {
       const settingsRef = doc(db, 'settings_nilai', getDocId());
       
       onSnapshot(settingsRef, (snap) => {
          if (snap.exists()) {
             setKkm(snap.data().kkm || 75);
             setDeskripsiFormatif(snap.data().deskripsiFormatif || Array(8).fill(''));
             setDeskripsiSumatif(snap.data().deskripsiSumatif || Array(8).fill(''));
          } else {
             setKkm(75);
             setDeskripsiFormatif(Array(8).fill(''));
             setDeskripsiSumatif(Array(8).fill(''));
          }
       });

       const qSiswa = query(collection(db, 'users'));
       const snapSiswa = await getDocs(qSiswa);
       const allUsers = snapSiswa.docs.map(d => ({ id: d.id, ...d.data() }));

       const nilaiRef = doc(db, 'nilai_raport', getDocId());
       onSnapshot(nilaiRef, (snap) => {
          let currentNilai: Record<string, NilaiSiswa> = {};
          if (snap.exists() && snap.data().nilai) {
             currentNilai = snap.data().nilai;
             setNilaiData(currentNilai);
          } else {
             setNilaiData({});
          }

          const filteredSiswa = allUsers
             .filter((u: any) => u.role === 'siswa' && (u.kelas === selectedKelas || currentNilai[u.id]))
             .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));
          
          setSiswaConfig(filteredSiswa);
       });
     } catch (error) {
        console.error(error);
        toast.error("Gagal memuat data siswa");
     }
     setLoading(false);
  };

  const handleArrayNilaiChange = (siswaId: string, type: 'formatif' | 'sumatif', index: number, value: string) => {
     let parsed: number | '' = value === '' ? '' : parseFloat(value);
     if (typeof parsed === 'number') {
        if (parsed < 0) parsed = 0;
        if (parsed > 100) parsed = 100;
     }

     setNilaiData(prev => {
        const studentData = prev[siswaId] || { formatif: Array(8).fill(''), sumatif: Array(8).fill(''), pts: '', katrol_pts: '', psas: '', katrol_psas: '', deskripsi: '' };
        const newArray = [...studentData[type]];
        newArray[index] = parsed;
        return { ...prev, [siswaId]: { ...studentData, [type]: newArray } };
     });
  };

  const handleSingleNilaiChange = (siswaId: string, field: 'pts' | 'katrol_pts' | 'psas' | 'katrol_psas' | 'deskripsi', value: string) => {
     let parsed: number | string = value;
     if (field !== 'deskripsi') {
        parsed = value === '' ? '' : parseFloat(value);
        if (typeof parsed === 'number') {
            if (parsed < 0) parsed = 0;
            if (parsed > 100) parsed = 100;
        }
     }

     setNilaiData(prev => {
        const studentData = prev[siswaId] || { formatif: Array(8).fill(''), sumatif: Array(8).fill(''), pts: '', katrol_pts: '', psas: '', katrol_psas: '', deskripsi: '' };
        return { ...prev, [siswaId]: { ...studentData, [field]: parsed } };
     });
  };

  const excelInputRef = useRef<HTMLInputElement>(null);

  const calculateNilaiAkhir = (data: NilaiSiswa | undefined) => {
     if (!data) return 0;
     const fValid = data.formatif.filter(v => typeof v === 'number') as number[];
     const avgF = fValid.length > 0 ? fValid.reduce((a,b) => a+b, 0) / fValid.length : 0;
     const sValid = data.sumatif.filter(v => typeof v === 'number') as number[];
     const avgS = sValid.length > 0 ? sValid.reduce((a,b) => a+b, 0) / sValid.length : 0;
     const finalPts = typeof data.katrol_pts === 'number' && data.katrol_pts > 0 ? data.katrol_pts : (typeof data.pts === 'number' ? data.pts : 0);
     const finalPsas = typeof data.katrol_psas === 'number' && data.katrol_psas > 0 ? data.katrol_psas : (typeof data.psas === 'number' ? data.psas : 0);
     const components = [];
     if (avgF > 0) components.push(avgF);
     if (avgS > 0) components.push(avgS);
     if (finalPts > 0) components.push(finalPts);
     if (finalPsas > 0) components.push(finalPsas);
     if (components.length === 0) return 0;
     return Math.round(components.reduce((a,b) => a+b, 0) / components.length);
  };

  const handleProsesKatrol = (type: 'pts' | 'psas') => {
       const validStudentIds = siswaConfig.map(s => s.id).filter(id => {
          const data = nilaiData[id];
          return data && typeof data[type] === 'number';
       });
       if (validStudentIds.length === 0) {
          toast.error(`Tidak ada nilai awal ${type.toUpperCase()} yang bisa dikatrol.`);
          return;
       }
       const values = validStudentIds.map(id => nilaiData[id][type] as number);
       const minVal = Math.min(...values);
       const maxVal = Math.max(...values);
       const targetMin = type === 'pts' ? katrolPtsMin : katrolPsasMin;
       const targetMax = type === 'pts' ? katrolPtsMax : katrolPsasMax;
       const newData = { ...nilaiData };
       validStudentIds.forEach(id => {
          const val = newData[id][type] as number;
          let newVal = targetMax;
          if (maxVal > minVal) {
              newVal = targetMin + ((val - minVal) / (maxVal - minVal)) * (targetMax - targetMin);
          } else {
              newVal = targetMax;
          }
          const fieldKatrol = type === 'pts' ? 'katrol_pts' : 'katrol_psas';
          newData[id] = { ...newData[id], [fieldKatrol]: Math.round(newVal) };
       });
       setNilaiData(newData);
       toast.success(`Berhasil mengkatrol nilai ${type.toUpperCase()}.`);
  };

  const handleGenerateDeskripsi = () => {
        const newData = { ...nilaiData };
        let count = 0;
        const thresholdSangatBaik = kkm + ((100 - kkm) / 2);
        siswaConfig.forEach(s => {
            const data = newData[s.id];
            if (data) {
                let tinggi: string[] = [];
                let sangatTinggi: string[] = [];
                let rendah: string[] = [];
                data.formatif.forEach((v, i) => {
                    if (typeof v === 'number' && deskripsiFormatif[i]) {
                        if (v >= thresholdSangatBaik) sangatTinggi.push(deskripsiFormatif[i]);
                        else if (v >= kkm) tinggi.push(deskripsiFormatif[i]);
                        else rendah.push(deskripsiFormatif[i]);
                    }
                });
                data.sumatif.forEach((v, i) => {
                    if (typeof v === 'number' && deskripsiSumatif[i]) {
                        if (v >= thresholdSangatBaik) sangatTinggi.push(deskripsiSumatif[i]);
                        else if (v >= kkm) tinggi.push(deskripsiSumatif[i]);
                        else rendah.push(deskripsiSumatif[i]);
                    }
                });
                let deskTexts = [];
                if (sangatTinggi.length > 0) deskTexts.push(`sangat baik dalam ${[...new Set(sangatTinggi)].join(', ')}`);
                if (tinggi.length > 0) deskTexts.push(`baik dalam ${[...new Set(tinggi)].join(', ')}`);
                let finalDesk = '';
                if (deskTexts.length > 0) finalDesk += `Menunjukkan penguasaan yang ${deskTexts.join(', dan ')}. `;
                if (rendah.length > 0) finalDesk += `Perlu bimbingan dalam ${[...new Set(rendah)].join(', ')}.`;
                if (!finalDesk && calculateNilaiAkhir(data) > 0) {
                    const val = calculateNilaiAkhir(data);
                    if (val >= thresholdSangatBaik) finalDesk = "Menunjukkan penguasaan materi yang sangat baik.";
                    else if (val >= kkm) finalDesk = "Menunjukkan penguasaan materi yang baik.";
                    else finalDesk = "Perlu peningkatan pemahaman materi.";
                }
                newData[s.id] = { ...data, deskripsi: finalDesk.trim() };
                count++;
            }
        });
        if (count > 0) {
           setNilaiData(newData);
           toast.success(`Deskripsi otomatis berhasil dibuat untuk ${count} siswa.`);
        } else {
           toast.error("Belum ada data nilai untuk di-generate deskripsinya.");
        }
  };

  const saveAll = async () => {
     if (!selectedKelas || !selectedMapel) return;
     setLoading(true);
     try {
        await setDoc(doc(db, 'settings_nilai', getDocId()), { kkm: kkm, deskripsiFormatif, deskripsiSumatif }, { merge: true });
        const toSave: Record<string, any> = {};
        siswaConfig.forEach(s => {
           const d = nilaiData[s.id];
           toSave[s.id] = {
              formatif: d?.formatif || Array(8).fill(''),
              sumatif: d?.sumatif || Array(8).fill(''),
              pts: d?.pts ?? '',
              katrol_pts: d?.katrol_pts ?? '',
              psas: d?.psas ?? '',
              katrol_psas: d?.katrol_psas ?? '',
              deskripsi: d?.deskripsi || ''
           };
        });
        await setDoc(doc(db, 'nilai_raport', getDocId()), { nilai: toSave, updatedBy: profile?.uid, updatedAt: new Date() }, { merge: true });
        toast.success("Berhasil menyimpan data nilai.");
     } catch (e: any) {
        toast.error("Gagal menyimpan: " + e.message);
     }
     setLoading(false);
  };

  const handleDownloadTemplate = () => {
      if (!selectedKelas || !selectedMapel || siswaConfig.length === 0) return;
      const wsData: any[][] = [
          ["No", "ID", "NIS", "Nama Siswa", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "PTS", "PSAS"]
      ];
      siswaConfig.forEach((siswa, idx) => {
          const sData = nilaiData[siswa.id] || { formatif: Array(8).fill(''), sumatif: Array(8).fill(''), pts: '', katrol_pts: '', psas: '', katrol_psas: '', deskripsi: '' };
          wsData.push([idx + 1, siswa.id, siswa.nis || '', siswa.displayName, ...sData.formatif, ...sData.sumatif, sData.pts, sData.psas]);
      });
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Nilai");
      XLSX.writeFile(wb, `Template_Nilai_Admin_${selectedKelas.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const ws = wb.Sheets[wb.SheetNames[0]];
              const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
              if (data.length < 2) return toast.error("File kosong.");
              const newData = { ...nilaiData };
              let count = 0;
              for (let i = 1; i < data.length; i++) {
                  const row = data[i];
                  if (!row || !row[1]) continue;
                  const siswaId = row[1];
                  if (!siswaConfig.find(s => s.id === siswaId)) continue;
                  const form = row.slice(4, 12).map((v: any) => v !== undefined && v !== '' ? parseFloat(v) : '');
                  const sum = row.slice(12, 20).map((v: any) => v !== undefined && v !== '' ? parseFloat(v) : '');
                  newData[siswaId] = {
                      ...newData[siswaId],
                      formatif: form, sumatif: sum,
                      pts: row[20] !== undefined && row[20] !== '' ? parseFloat(row[20]) : '',
                      psas: row[21] !== undefined && row[21] !== '' ? parseFloat(row[21]) : ''
                  };
                  count++;
              }
              setNilaiData(newData);
              toast.success(`Berhasil mengimpor ${count} siswa.`);
          } catch(err) { toast.error("Gagal impor."); }
          if (excelInputRef.current) excelInputRef.current.value = '';
      };
      reader.readAsBinaryString(file);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Input Nilai Keseluruhan (Admin)</h1>
            <p className="text-sm text-slate-500 font-medium">Panel Admin untuk mengontrol seluruh nilai akademik siswa lintas kelas dan mapel.</p>
         </div>
      </div>

      <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden">
         <CardHeader className="bg-slate-800 text-white p-6">
            <CardTitle className="text-lg font-bold">Filter & Parameter Akademik</CardTitle>
         </CardHeader>
         <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
               <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Tahun Ajaran</label>
                  <Select value={tahunAjaran} onValueChange={setTahunAjaran}>
                     <SelectTrigger className="h-12 border-slate-200 font-bold">
                        <SelectValue placeholder="Pilih TA" />
                     </SelectTrigger>
                     <SelectContent>
                        {(settings.historyTahunAjaran || ['2023/2024', '2024/2025', '2025/2026']).map((val) => (
                           <SelectItem key={val} value={val}>{val}</SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Semester</label>
                  <Select value={semester} onValueChange={setSemester}>
                     <SelectTrigger className="h-12 border-slate-200 font-bold">
                        <SelectValue placeholder="Pilih Semester" />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="Ganjil">Ganjil</SelectItem>
                        <SelectItem value="Genap">Genap</SelectItem>
                     </SelectContent>
                  </Select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Mata Pelajaran</label>
                  <Select value={selectedMapel} onValueChange={setSelectedMapel}>
                     <SelectTrigger className="h-12 border-slate-200 font-bold">
                        <SelectValue placeholder="Pilih Mata Pelajaran" />
                     </SelectTrigger>
                     <SelectContent>
                        {mapel.map(m => (
                           <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Kelas</label>
                  <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                     <SelectTrigger className="h-12 border-slate-200 font-bold">
                        <SelectValue placeholder="Pilih Kelas" />
                     </SelectTrigger>
                     <SelectContent>
                        {kelas.sort((a,b)=>a.name.localeCompare(b.name)).map(k => (
                           <SelectItem key={k.id} value={k.name}>{k.name}</SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
               </div>
            </div>

            {selectedKelas && selectedMapel && (
               <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="bg-amber-50 border-amber-200">
                        <CardContent className="p-4 pt-4 space-y-3">
                            <h3 className="font-black text-xs text-amber-800 uppercase tracking-widest">Katrol Nilai PTS</h3>
                            <div className="flex items-center gap-2">
                                <Input type="number" value={katrolPtsMin} onChange={e => setKatrolPtsMin(Number(e.target.value))} className="w-20 bg-white" />
                                <span className="font-bold text-slate-400">-</span>
                                <Input type="number" value={katrolPtsMax} onChange={e => setKatrolPtsMax(Number(e.target.value))} className="w-20 bg-white" />
                                <Button onClick={() => handleProsesKatrol('pts')} size="sm" className="bg-amber-600 hover:bg-amber-700 font-bold">Proses</Button>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-50 border-emerald-200">
                        <CardContent className="p-4 pt-4 space-y-3">
                            <h3 className="font-black text-xs text-emerald-800 uppercase tracking-widest">Katrol Nilai PSAS</h3>
                            <div className="flex items-center gap-2">
                                <Input type="number" value={katrolPsasMin} onChange={e => setKatrolPsasMin(Number(e.target.value))} className="w-20 bg-white" />
                                <span className="font-bold text-slate-400">-</span>
                                <Input type="number" value={katrolPsasMax} onChange={e => setKatrolPsasMax(Number(e.target.value))} className="w-20 bg-white" />
                                <Button onClick={() => handleProsesKatrol('psas')} size="sm" className="bg-emerald-600 hover:bg-emerald-700 font-bold">Proses</Button>
                            </div>
                        </CardContent>
                    </Card>
                 </div>

                 <div className="flex flex-wrap justify-between items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                       <Button onClick={handleGenerateDeskripsi} variant="outline" className="h-10 text-xs font-bold border-blue-200 text-blue-600 hover:bg-blue-50">
                          <Wand2 className="w-3.5 h-3.5 mr-2" /> GENERATE DESKRIPSI
                       </Button>
                       <Button onClick={handleDownloadTemplate} variant="outline" className="h-10 text-xs font-bold border-green-200 text-green-600 hover:bg-green-50">
                          <FileDown className="w-3.5 h-3.5 mr-2" /> TEMPLATE EXCEL
                       </Button>
                       <Button onClick={() => excelInputRef.current?.click()} variant="outline" className="h-10 text-xs font-bold border-orange-200 text-orange-600 hover:bg-orange-50">
                          <Upload className="w-3.5 h-3.5 mr-2" /> IMPORT EXCEL
                       </Button>
                       <input type="file" ref={excelInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
                    </div>
                    <Button onClick={saveAll} disabled={loading} className="h-10 px-8 bg-indigo-600 hover:bg-indigo-700 font-bold shadow-md shadow-indigo-600/20">
                       {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                       SIMPAN PERUBAHAN
                    </Button>
                 </div>

                 <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <Table className="min-w-[max-content]">
                       <TableHeader className="bg-slate-100 border-b-2">
                          <TableRow>
                             <TableHead className="w-12 text-center" rowSpan={2}>NO</TableHead>
                             <TableHead className="w-64" rowSpan={2}>NAMA SISWA</TableHead>
                             <TableHead className="text-center border-x bg-blue-50 text-blue-800" colSpan={8}>FORMATIF (F1-F8)</TableHead>
                             <TableHead className="text-center border-x bg-fuchsia-50 text-fuchsia-800" colSpan={8}>SUMATIF (S1-S8)</TableHead>
                             <TableHead className="text-center border-x bg-yellow-50 text-yellow-800 text-[10px]" colSpan={2}>PTS</TableHead>
                             <TableHead className="text-center border-x bg-emerald-50 text-emerald-800 text-[10px]" colSpan={2}>PSAS</TableHead>
                             <TableHead className="w-20 text-center" rowSpan={2}>AKHIR</TableHead>
                             <TableHead className="w-72" rowSpan={2}>DESKRIPSI CAPAIAN</TableHead>
                          </TableRow>
                          <TableRow>
                             {Array.from({length: 8}).map((_,i) => <TableHead key={`hf${i}`} className="p-1 text-center w-12 text-[10px] bg-blue-50/50">F{i+1}</TableHead>)}
                             {Array.from({length: 8}).map((_,i) => <TableHead key={`hs${i}`} className="p-1 text-center w-12 text-[10px] bg-fuchsia-50/50">S{i+1}</TableHead>)}
                             <TableHead className="p-1 text-center text-[9px] bg-yellow-50/50">AWAL</TableHead>
                             <TableHead className="p-1 text-center text-[9px] bg-yellow-50 text-blue-600">KATROL</TableHead>
                             <TableHead className="p-1 text-center text-[9px] bg-emerald-50/50">AWAL</TableHead>
                             <TableHead className="p-1 text-center text-[9px] bg-emerald-50 text-blue-600">KATROL</TableHead>
                          </TableRow>
                       </TableHeader>
                       <TableBody>
                         {siswaConfig.map((siswa, idx) => {
                            const sData = nilaiData[siswa.id] || { formatif: Array(8).fill(''), sumatif: Array(8).fill(''), pts: '', katrol_pts: '', psas: '', katrol_psas: '', deskripsi: '' };
                            const nilaiAkhir = calculateNilaiAkhir(sData);
                            return (
                               <TableRow key={siswa.id} className="hover:bg-slate-50">
                                  <TableCell className="text-center font-bold text-slate-400">{idx + 1}</TableCell>
                                  <TableCell className="font-bold text-slate-700 min-w-[240px]">
                                     <div className="flex flex-col">
                                        <span className="text-sm">{siswa.displayName}</span>
                                        <span className="text-[10px] font-mono text-slate-400">{siswa.nis || '-'}</span>
                                     </div>
                                  </TableCell>
                                  {Array.from({length: 8}).map((_, i) => (
                                     <TableCell key={`f${i}`} className="p-1 border-x">
                                        <Input type="number" className="w-12 h-8 text-center text-xs p-0 border-blue-100 focus:ring-blue-500" value={sData.formatif[i] ?? ''} onChange={e => handleArrayNilaiChange(siswa.id, 'formatif', i, e.target.value)} />
                                     </TableCell>
                                  ))}
                                  {Array.from({length: 8}).map((_, i) => (
                                     <TableCell key={`s${i}`} className="p-1 border-x">
                                        <Input type="number" className="w-12 h-8 text-center text-xs p-0 border-fuchsia-100 focus:ring-fuchsia-500" value={sData.sumatif[i] ?? ''} onChange={e => handleArrayNilaiChange(siswa.id, 'sumatif', i, e.target.value)} />
                                     </TableCell>
                                  ))}
                                  <TableCell className="p-1 border-x bg-yellow-50/20">
                                     <Input type="number" className="w-12 h-8 text-center text-xs p-0 border-amber-200" value={sData.pts ?? ''} onChange={e => handleSingleNilaiChange(siswa.id, 'pts', e.target.value)} />
                                  </TableCell>
                                  <TableCell className="p-1 border-x bg-yellow-50">
                                     <Input type="number" className="w-12 h-8 text-center text-xs p-0 border-blue-200 text-blue-600 font-bold" value={sData.katrol_pts ?? ''} onChange={e => handleSingleNilaiChange(siswa.id, 'katrol_pts', e.target.value)} />
                                  </TableCell>
                                  <TableCell className="p-1 border-x bg-emerald-50/20">
                                     <Input type="number" className="w-12 h-8 text-center text-xs p-0 border-emerald-200" value={sData.psas ?? ''} onChange={e => handleSingleNilaiChange(siswa.id, 'psas', e.target.value)} />
                                  </TableCell>
                                  <TableCell className="p-1 border-x bg-emerald-50">
                                     <Input type="number" className="w-12 h-8 text-center text-xs p-0 border-blue-200 text-blue-600 font-bold" value={sData.katrol_psas ?? ''} onChange={e => handleSingleNilaiChange(siswa.id, 'katrol_psas', e.target.value)} />
                                  </TableCell>
                                  <TableCell className="text-center font-black">
                                     <span className={nilaiAkhir >= kkm ? 'text-emerald-600' : 'text-rose-500'}>{nilaiAkhir || '-'}</span>
                                  </TableCell>
                                  <TableCell className="p-1.5 min-w-[300px]">
                                     <textarea className="w-full min-h-[60px] p-2 text-[10px] leading-tight border border-slate-200 rounded-lg focus:ring-blue-500 outline-none resize-none bg-slate-50 italic" value={sData.deskripsi || ''} onChange={e => handleSingleNilaiChange(siswa.id, 'deskripsi', e.target.value)} />
                                  </TableCell>
                               </TableRow>
                            );
                         })}
                       </TableBody>
                    </Table>
                 </div>
               </div>
            )}

            {!selectedKelas && (
               <div className="py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                     <Loader2 className="w-10 h-10 text-slate-300" />
                  </div>
                  <div className="max-w-xs mx-auto">
                     <p className="font-bold text-slate-400">Pilih Kelas & Mapel untuk memulai penginputan nilai secara masal.</p>
                  </div>
               </div>
            )}
         </CardContent>
      </Card>
    </div>
  );
}
