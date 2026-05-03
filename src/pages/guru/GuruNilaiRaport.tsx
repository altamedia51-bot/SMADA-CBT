import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, doc, getDocs, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/auth.store';
import { Save, Loader2, Wand2, FileDown, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

interface NilaiSiswa {
  formatif: (number | '')[];
  sumatif: (number | '')[];
  pts: number | '';
  katrol_pts: number | '';
  psas: number | '';
  katrol_psas: number | '';
  deskripsi: string;
}

export default function GuruNilaiRaport() {
  const { profile } = useAuthStore();
  const [kelas, setKelas] = useState<any[]>([]);
  const [mapel, setMapel] = useState<any[]>([]);
  
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  const [tahunAjaran, setTahunAjaran] = useState('2024/2025');
  const [semester, setSemester] = useState('Ganjil');
  
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

  // Check authorization
  const selectedMapelId = mapel.find(m => m.name === selectedMapel)?.id;
  const isWaliKelasOfSelected = profile?.waliKelas === selectedKelas;
  const isPengampuOfSelected = profile?.mengampu?.some(m => m.mapelId === selectedMapelId && m.kelas.includes(selectedKelas));
  const isAdmin = profile?.role === 'admin';
  const isAuthorized = isAdmin || isWaliKelasOfSelected || isPengampuOfSelected;

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
       // load settings for this mapel & kelas
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
       const filteredSiswa = snapSiswa.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((u: any) => u.role === 'siswa' && u.kelas === selectedKelas)
          .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));
       
       setSiswaConfig(filteredSiswa);

       const nilaiRef = doc(db, 'nilai_raport', getDocId());
       onSnapshot(nilaiRef, (snap) => {
          if (snap.exists() && snap.data().nilai) {
             setNilaiData(snap.data().nilai);
          } else {
             setNilaiData({});
          }
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
        return {
           ...prev,
           [siswaId]: {
              ...studentData,
              [type]: newArray
           }
        };
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
        return {
           ...prev,
           [siswaId]: {
              ...studentData,
              [field]: parsed
           }
        };
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
             newVal = targetMax; // If all have the same score
         }
         
         const fieldKatrol = type === 'pts' ? 'katrol_pts' : 'katrol_psas';
         const studentData = newData[id];
         newData[id] = {
             ...studentData,
             [fieldKatrol]: Math.round(newVal)
         };
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
               
               if (sangatTinggi.length > 0) {
                   deskTexts.push(`sangat baik dalam ${[...new Set(sangatTinggi)].join(', ')}`);
               }
               if (tinggi.length > 0) {
                   deskTexts.push(`baik dalam ${[...new Set(tinggi)].join(', ')}`);
               }
               
               let finalDesk = '';
               if (deskTexts.length > 0) {
                   finalDesk += `Menunjukkan penguasaan yang ${deskTexts.join(', dan ')}. `;
               }
               
               if (rendah.length > 0) {
                   finalDesk += `Perlu bimbingan dalam ${[...new Set(rendah)].join(', ')}.`;
               }

               if (!finalDesk && calculateNilaiAkhir(data) > 0) {
                   const val = calculateNilaiAkhir(data);
                   if (val >= thresholdSangatBaik) finalDesk = "Menunjukkan penguasaan materi yang sangat baik.";
                   else if (val >= kkm) finalDesk = "Menunjukkan penguasaan materi yang baik.";
                   else finalDesk = "Perlu peningkatan pemahaman materi.";
               }

               newData[s.id] = {
                   ...data,
                   deskripsi: finalDesk.trim()
               };
               count++;
           }
       });
       if (count > 0) {
          setNilaiData(newData);
          toast.success("Deskripsi otomatis berhasil dibuat untuk " + count + " siswa berdasarkan materi kolom F dan S.");
       } else {
          toast.error("Belum ada data nilai untuk di-generate deskripsinya.");
       }
  };

  const saveAll = async () => {
     if (!selectedKelas || !selectedMapel) return;
     setLoading(true);
     try {
        await setDoc(doc(db, 'settings_nilai', getDocId()), {
           kkm: kkm,
           deskripsiFormatif,
           deskripsiSumatif
        }, { merge: true });

        // Build data
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

        await setDoc(doc(db, 'nilai_raport', getDocId()), {
           nilai: toSave,
           updatedBy: profile?.uid,
           updatedAt: new Date()
        }, { merge: true });

        toast.success("Berhasil menyimpan data nilai.");
     } catch (e: any) {
        toast.error("Gagal menyimpan: " + e.message);
     }
     setLoading(false);
  };

  const handleDownloadTemplate = () => {
      if (!selectedKelas || !selectedMapel || siswaConfig.length === 0) return;
      
      const wsData: any[][] = [];
      // Headers
      wsData.push([
          "No", "ID", "NIS", "Nama Siswa", 
          "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8",
          "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8",
          "PTS", "PSAS"
      ]);

      siswaConfig.forEach((siswa, idx) => {
          const sData = nilaiData[siswa.id] || { formatif: Array(8).fill(''), sumatif: Array(8).fill(''), pts: '', katrol_pts: '', psas: '', katrol_psas: '', deskripsi: '' };
          wsData.push([
              idx + 1,
              siswa.id,
              siswa.nis || '',
              siswa.displayName,
              ...sData.formatif,
              ...sData.sumatif,
              sData.pts,
              sData.psas
          ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Auto-fit columns
      const colWidths = [
          { wch: 5 }, { wch: 20 }, { wch: 15 }, { wch: 30 },
          ...Array(16).fill({ wch: 6 }),
          { wch: 10 }, { wch: 10 }
      ];
      ws['!cols'] = colWidths;
      
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Nilai");
      XLSX.writeFile(wb, `Template_Nilai_${selectedKelas.replace(/\s+/g, '_')}_${selectedMapel.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          try {
              const bstr = evt.target?.result;
              const wb = XLSX.read(bstr, { type: 'binary' });
              const wsname = wb.SheetNames[0];
              const ws = wb.Sheets[wsname];
              const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
              
              if (data.length < 2) {
                  toast.error("File excel kosong atau format tidak sesuai.");
                  return;
              }

              const newData = { ...nilaiData };
              let count = 0;

              for (let i = 1; i < data.length; i++) {
                  const row = data[i];
                  if (!row || row.length < 4) continue;
                  
                  const siswaId = row[1]; // ID
                  if (!siswaId || !siswaConfig.find(s => s.id === siswaId)) continue;
                  
                  const form = Array(8).fill('');
                  const sum = Array(8).fill('');
                  for(let j=0; j<8; j++) {
                      let fv = row[4+j];
                      if (fv !== undefined && fv !== null && fv !== '') form[j] = parseFloat(fv) || '';
                      
                      let sv = row[12+j];
                      if (sv !== undefined && sv !== null && sv !== '') sum[j] = parseFloat(sv) || '';
                  }
                  
                  let pts = row[20] !== undefined && row[20] !== null && row[20] !== '' ? parseFloat(row[20]) : '';
                  let psas = row[21] !== undefined && row[21] !== null && row[21] !== '' ? parseFloat(row[21]) : '';

                  const existingData = newData[siswaId] || { katrol_pts: '', katrol_psas: '', deskripsi: '' };

                  newData[siswaId] = {
                      formatif: form,
                      sumatif: sum,
                      pts: pts,
                      katrol_pts: existingData.katrol_pts,
                      psas: psas,
                      katrol_psas: existingData.katrol_psas,
                      deskripsi: existingData.deskripsi
                  };
                  count++;
              }
              
              setNilaiData(newData);
              toast.success(`Berhasil mengimpor nilai untuk ${count} siswa.`);
          } catch(err) {
              toast.error("Gagal memproses file excel.");
              console.error(err);
          } finally {
              if (excelInputRef.current) excelInputRef.current.value = '';
          }
      };
      reader.readAsBinaryString(file);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h1 className="text-2xl font-bold text-slate-800">Input Nilai Mapel (Kurikulum Merdeka)</h1>
            <p className="text-sm text-slate-500">Kelola nilai Formatif, Sumatif, PTS, dan PSAS dengan batasan nilai 0-100 dan fitur katrol nilai otomatis.</p>
         </div>
      </div>

      <Card>
         <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
               <div className="space-y-4 lg:col-span-1">
                  <div className="space-y-1">
                     <label className="text-sm font-bold text-slate-700">Tahun Ajaran</label>
                     <Select value={tahunAjaran} onValueChange={setTahunAjaran}>
                        <SelectTrigger>
                           <SelectValue placeholder="Pilih TA" />
                        </SelectTrigger>
                        <SelectContent>
                           {Array.from({length: 5}).map((_, i) => {
                              const startYear = new Date().getFullYear() - 2 + i;
                              const ta = `${startYear}/${startYear + 1}`;
                              return <SelectItem key={ta} value={ta}>{ta}</SelectItem>;
                           })}
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="space-y-1">
                     <label className="text-sm font-bold text-slate-700">Semester</label>
                     <Select value={semester} onValueChange={setSemester}>
                        <SelectTrigger>
                           <SelectValue placeholder="Pilih Semester" />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="Ganjil">Ganjil</SelectItem>
                           <SelectItem value="Genap">Genap</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
               </div>

               <div className="space-y-4 lg:col-span-2">
                  <div className="space-y-1">
                     <label className="text-sm font-bold text-slate-700">Mata Pelajaran</label>
                     <Select value={selectedMapel} onValueChange={setSelectedMapel}>
                        <SelectTrigger>
                           <SelectValue placeholder="Pilih Mata Pelajaran" />
                        </SelectTrigger>
                        <SelectContent>
                           {mapel.filter(m => {
                              return profile?.role === 'admin' 
                                 || profile?.waliKelas 
                                 || profile?.mengampu?.some(mengampu => mengampu.mapelId === m.id);
                           }).map(m => (
                              <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="space-y-1">
                     <label className="text-sm font-bold text-slate-700">Kelas</label>
                     <Select value={selectedKelas} onValueChange={setSelectedKelas}>
                        <SelectTrigger>
                           <SelectValue placeholder="Pilih Kelas" />
                        </SelectTrigger>
                        <SelectContent>
                           {kelas.sort((a,b)=>a.name.localeCompare(b.name)).filter(k => {
                              return profile?.role === 'admin' 
                                 || (profile?.mengampu && profile.mengampu.some(m => (!selectedMapelId || m.mapelId === selectedMapelId) && m.kelas.includes(k.name)))
                                 || profile?.waliKelas === k.name;
                           }).map(k => (
                              <SelectItem key={k.id} value={k.name}>{k.name}</SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="space-y-1">
                     <label className="text-sm font-bold text-slate-700">Nilai KKM</label>
                     <Input 
                        type="number" 
                        value={kkm} 
                        onChange={e => setKkm(parseInt(e.target.value) || 0)} 
                        disabled={!selectedKelas || !selectedMapel}
                        className="max-w-[200px]"
                     />
                  </div>
               </div>
            </div>

            {selectedKelas && selectedMapel && isAuthorized && (
               <Card className="mb-6 border-slate-200">
                  <CardHeader className="py-3 px-4 bg-slate-50 border-b">
                     <CardTitle className="text-sm font-bold text-slate-800">Capaian Pembelajaran (Untuk Deskripsi Otomatis Tiap Kolom)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                             <h4 className="text-sm font-bold text-blue-800 mb-3">Materi / TP Formatif</h4>
                             <div className="space-y-2">
                                 {Array.from({length: 8}).map((_, i) => (
                                     <div key={`df${i}`} className="flex items-center gap-2">
                                         <span className="w-8 text-xs font-bold text-slate-500">F{i+1}</span>
                                         <Input 
                                             className="h-8 text-xs bg-white border-blue-200 focus-visible:ring-blue-400" 
                                             placeholder={`Deskripsi Materi Formatif ${i+1}`} 
                                             value={deskripsiFormatif[i]} 
                                             onChange={e => {
                                                 const newArr = [...deskripsiFormatif];
                                                 newArr[i] = e.target.value;
                                                 setDeskripsiFormatif(newArr);
                                             }} 
                                         />
                                     </div>
                                 ))}
                             </div>
                         </div>
                         <div>
                             <h4 className="text-sm font-bold text-fuchsia-800 mb-3">Materi / TP Sumatif</h4>
                             <div className="space-y-2">
                                 {Array.from({length: 8}).map((_, i) => (
                                     <div key={`ds${i}`} className="flex items-center gap-2">
                                         <span className="w-8 text-xs font-bold text-slate-500">S{i+1}</span>
                                         <Input 
                                             className="h-8 text-xs bg-white border-fuchsia-200 focus-visible:ring-fuchsia-400" 
                                             placeholder={`Deskripsi Materi Sumatif ${i+1}`} 
                                             value={deskripsiSumatif[i]} 
                                             onChange={e => {
                                                 const newArr = [...deskripsiSumatif];
                                                 newArr[i] = e.target.value;
                                                 setDeskripsiSumatif(newArr);
                                             }} 
                                         />
                                     </div>
                                 ))}
                             </div>
                         </div>
                     </div>
                  </CardContent>
               </Card>
            )}

            {selectedKelas && selectedMapel && isAuthorized && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                   <Card className="bg-yellow-50/50 border-yellow-200">
                       <CardContent className="p-4 flex flex-col items-start gap-3">
                           <h3 className="font-bold text-sm text-yellow-800">Skalakan / Katrol Nilai PTS</h3>
                           <div className="flex items-center gap-2">
                               <Input type="number" value={katrolPtsMin} onChange={e => setKatrolPtsMin(Number(e.target.value))} className="w-20 bg-white" placeholder="Min" />
                               <span className="text-slate-500 font-bold">-</span>
                               <Input type="number" value={katrolPtsMax} onChange={e => setKatrolPtsMax(Number(e.target.value))} className="w-20 bg-white" placeholder="Max" />
                               <Button onClick={() => handleProsesKatrol('pts')} size="sm" variant="outline" className="border-yellow-300 text-yellow-700 hover:bg-yellow-100">Proses</Button>
                           </div>
                           <p className="text-[11px] text-yellow-700">Nilai PTS akan diskalakan otomatis ke dalam rentang {katrolPtsMin} hingga {katrolPtsMax}.</p>
                       </CardContent>
                   </Card>
                   <Card className="bg-emerald-50/50 border-emerald-200">
                       <CardContent className="p-4 flex flex-col items-start gap-3">
                           <h3 className="font-bold text-sm text-emerald-800">Skalakan / Katrol Nilai PSAS</h3>
                           <div className="flex items-center gap-2">
                               <Input type="number" value={katrolPsasMin} onChange={e => setKatrolPsasMin(Number(e.target.value))} className="w-20 bg-white" placeholder="Min" />
                               <span className="text-slate-500 font-bold">-</span>
                               <Input type="number" value={katrolPsasMax} onChange={e => setKatrolPsasMax(Number(e.target.value))} className="w-20 bg-white" placeholder="Max" />
                               <Button onClick={() => handleProsesKatrol('psas')} size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100">Proses</Button>
                           </div>
                           <p className="text-[11px] text-emerald-700">Nilai PSAS akan diskalakan otomatis ke dalam rentang {katrolPsasMin} hingga {katrolPsasMax}.</p>
                       </CardContent>
                   </Card>
               </div>
            )}

            {selectedKelas && selectedMapel && !isAuthorized && (
               <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-3 border border-red-200">
                  <div className="flex-1">
                     <p className="font-bold">Akses Ditolak</p>
                     <p className="text-sm">Anda tidak diizinkan untuk mengisi nilai pada Mata Pelajaran dan Kelas ini. Hanya Guru Pengampu mapel ini dan Wali Kelas yang dapat mengubah data.</p>
                  </div>
               </div>
            )}

            {selectedKelas && selectedMapel && isAuthorized && (
               <div className="flex flex-col md:flex-row justify-between mb-4 gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                     <Button onClick={handleGenerateDeskripsi} disabled={loading} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50 flex items-center gap-2">
                        <Wand2 className="w-4 h-4" />
                        Generate Deskripsi Otomatis
                     </Button>
                     <Button onClick={handleDownloadTemplate} disabled={loading} variant="outline" className="border-green-300 text-green-700 hover:bg-green-50 flex items-center gap-2">
                        <FileDown className="w-4 h-4" />
                        Template Excel
                     </Button>
                     <Button onClick={() => excelInputRef.current?.click()} disabled={loading} variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50 flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Import Excel
                     </Button>
                     <input type="file" ref={excelInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
                  </div>
                  <Button onClick={saveAll} disabled={loading} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                     {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                     Simpan Semua Data
                  </Button>
               </div>
            )}

            {selectedKelas && selectedMapel && siswaConfig.length > 0 && (
               <div className="overflow-x-auto border rounded-xl relative max-w-full">
                  <Table className="min-w-[max-content]">
                     <TableHeader className="bg-slate-50">
                        <TableRow>
                           <TableHead className="w-10 text-center sticky left-0 z-20 bg-slate-100 shadow-[1px_0_0_0_#e2e8f0]" rowSpan={2}>No</TableHead>
                           <TableHead className="w-48 sticky left-[40px] z-20 bg-slate-100 shadow-[1px_0_0_0_#e2e8f0]" rowSpan={2}>Nama Siswa</TableHead>
                           <TableHead className="text-center border-x bg-blue-50/50 text-blue-800" colSpan={8}>Nilai Formatif</TableHead>
                           <TableHead className="text-center border-x bg-fuchsia-50/50 text-fuchsia-800" colSpan={8}>Nilai Sumatif</TableHead>
                           <TableHead className="text-center border-x bg-yellow-50/50 text-yellow-800" colSpan={2}>PTS</TableHead>
                           <TableHead className="text-center border-x bg-emerald-50/50 text-emerald-800" colSpan={2}>PSAS</TableHead>
                           <TableHead className="w-16 text-center sticky right-[250px] z-20 bg-slate-100 shadow-[-1px_0_0_0_#e2e8f0]" rowSpan={2}>Akhir</TableHead>
                           <TableHead className="w-[250px] sticky right-0 z-20 bg-slate-100 shadow-[-1px_0_0_0_#e2e8f0]" rowSpan={2}>Atur Deskripsi <span className="font-normal text-xs text-slate-400 block mt-0.5">(Bisa diedit)</span></TableHead>
                        </TableRow>
                        <TableRow>
                           {/* Formatif columns */}
                           {Array.from({length: 8}).map((_,i) => (
                              <TableHead key={`hf${i}`} className="text-center w-[60px] p-1 border-x bg-blue-50/20 text-blue-700 font-mono text-xs">F{i+1}</TableHead>
                           ))}
                           {/* Sumatif columns */}
                           {Array.from({length: 8}).map((_,i) => (
                              <TableHead key={`hs${i}`} className="text-center w-[60px] p-1 border-x bg-fuchsia-50/20 text-fuchsia-700 font-mono text-xs">S{i+1}</TableHead>
                           ))}
                           
                           {/* PTS */}
                           <TableHead className="text-center w-[65px] p-1 border-l bg-yellow-50/20 text-[11px] font-bold">Awal</TableHead>
                           <TableHead className="text-center w-[65px] p-1 border-r text-blue-600 bg-yellow-50/20 text-[11px] font-bold">Katrol</TableHead>
                           
                           {/* PSAS */}
                           <TableHead className="text-center w-[65px] p-1 border-l bg-emerald-50/20 text-[11px] font-bold">Awal</TableHead>
                           <TableHead className="text-center w-[65px] p-1 border-r text-blue-600 bg-emerald-50/20 text-[11px] font-bold">Katrol</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {siswaConfig.map((siswa, idx) => {
                           const sData = nilaiData[siswa.id] || { formatif: Array(8).fill(''), sumatif: Array(8).fill(''), pts: '', katrol_pts: '', psas: '', katrol_psas: '', deskripsi: '' };
                           const nilaiAkhir = calculateNilaiAkhir(sData);

                           return (
                              <TableRow key={siswa.id} className="hover:bg-slate-50/50">
                                 <TableCell className="text-center text-slate-500 sticky left-0 z-10 bg-white shadow-[1px_0_0_0_#e2e8f0] group-hover:bg-slate-50/50">{idx + 1}</TableCell>
                                 <TableCell className="sticky left-[40px] z-10 bg-white shadow-[1px_0_0_0_#e2e8f0] group-hover:bg-slate-50/50 min-w-[200px]">
                                    <p className="font-bold text-slate-700 text-xs md:text-sm">{siswa.displayName}</p>
                                    <p className="text-[10px] text-slate-500 font-mono">{siswa.nis || '-'}</p>
                                 </TableCell>
                                 
                                 {/* Formatif Inputs */}
                                 {Array.from({length: 8}).map((_, i) => (
                                    <TableCell key={`f${i}`} className="p-1 border-x relative">
                                       <Input 
                                          type="number" 
                                          className="w-[50px] text-center h-8 text-xs mx-auto px-1 border-blue-200 bg-blue-50/10 focus-visible:ring-blue-400" 
                                          placeholder="-"
                                          value={sData.formatif[i] ?? ''} 
                                          onChange={e => handleArrayNilaiChange(siswa.id, 'formatif', i, e.target.value)}
                                          disabled={!isAuthorized} 
                                       />
                                    </TableCell>
                                 ))}

                                 {/* Sumatif Inputs */}
                                 {Array.from({length: 8}).map((_, i) => (
                                    <TableCell key={`s${i}`} className="p-1 border-x relative">
                                       <Input 
                                          type="number" 
                                          className="w-[50px] text-center h-8 text-xs mx-auto px-1 border-fuchsia-200 bg-fuchsia-50/10 focus-visible:ring-fuchsia-400" 
                                          placeholder="-"
                                          value={sData.sumatif[i] ?? ''} 
                                          onChange={e => handleArrayNilaiChange(siswa.id, 'sumatif', i, e.target.value)}
                                          disabled={!isAuthorized} 
                                       />
                                    </TableCell>
                                 ))}

                                  {/* PTS */}
                                 <TableCell className="p-1 border-l bg-yellow-50/10">
                                    <Input 
                                       type="number" 
                                       className="w-[55px] text-center h-8 text-xs mx-auto px-1 border-yellow-300 focus-visible:ring-yellow-500 bg-white" 
                                       placeholder="-"
                                       value={sData.pts ?? ''} 
                                       onChange={e => handleSingleNilaiChange(siswa.id, 'pts', e.target.value)} 
                                       disabled={!isAuthorized}
                                    />
                                 </TableCell>
                                 <TableCell className="p-1 border-r bg-yellow-50/10">
                                    <Input 
                                       type="number" 
                                       className="w-[55px] text-center h-8 text-xs mx-auto px-1 border-blue-300 text-blue-700 bg-blue-50/30 focus-visible:ring-blue-500 font-bold" 
                                       placeholder="-"
                                       value={sData.katrol_pts ?? ''} 
                                       onChange={e => handleSingleNilaiChange(siswa.id, 'katrol_pts', e.target.value)} 
                                       disabled={!isAuthorized}
                                    />
                                 </TableCell>

                                 {/* PSAS */}
                                 <TableCell className="p-1 border-l bg-emerald-50/10">
                                    <Input 
                                       type="number" 
                                       className="w-[55px] text-center h-8 text-xs mx-auto px-1 border-emerald-300 focus-visible:ring-emerald-500 bg-white" 
                                       placeholder="-"
                                       value={sData.psas ?? ''} 
                                       onChange={e => handleSingleNilaiChange(siswa.id, 'psas', e.target.value)} 
                                       disabled={!isAuthorized}
                                    />
                                 </TableCell>
                                 <TableCell className="p-1 border-r bg-emerald-50/10">
                                    <Input 
                                       type="number" 
                                       className="w-[55px] text-center h-8 text-xs mx-auto px-1 border-blue-300 text-blue-700 bg-blue-50/30 focus-visible:ring-blue-500 font-bold" 
                                       placeholder="-"
                                       value={sData.katrol_psas ?? ''} 
                                       onChange={e => handleSingleNilaiChange(siswa.id, 'katrol_psas', e.target.value)} 
                                       disabled={!isAuthorized}
                                    />
                                 </TableCell>

                                 <TableCell className="text-center font-bold sticky right-[250px] z-10 bg-white shadow-[-1px_0_0_0_#e2e8f0] group-hover:bg-slate-50/50">
                                    <span className={nilaiAkhir >= kkm ? 'text-emerald-600' : 'text-rose-500'}>
                                       {nilaiAkhir > 0 ? nilaiAkhir : '-'}
                                    </span>
                                 </TableCell>
                                 <TableCell className="p-1.5 border-l sticky right-0 z-10 bg-white shadow-[-1px_0_0_0_#e2e8f0] group-hover:bg-slate-50/50 min-w-[250px]">
                                    <textarea 
                                       className="w-full h-full min-h-[60px] p-2 text-[11px] leading-tight text-slate-700 italic border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 outline-none resize-none bg-slate-50/50"
                                       value={sData.deskripsi || ''}
                                       onChange={e => handleSingleNilaiChange(siswa.id, 'deskripsi', e.target.value)}
                                       placeholder="-"
                                       spellCheck="false"
                                       disabled={!isAuthorized}
                                    />
                                 </TableCell>
                              </TableRow>
                           );
                        })}
                     </TableBody>
                  </Table>
               </div>
            )}
            
            {selectedKelas && selectedMapel && siswaConfig.length === 0 && !loading && (
               <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-xl mt-6">
                  Tidak ada siswa di kelas ini.
               </div>
            )}
         </CardContent>
      </Card>
    </div>
  );
}
