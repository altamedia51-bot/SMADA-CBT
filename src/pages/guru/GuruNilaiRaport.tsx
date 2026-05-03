import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, getDocs, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/auth.store';
import { Save, Loader2 } from 'lucide-react';

interface NilaiSiswa {
  formatif: number[];
  sumatif: number[];
  pts: number;
  katrol_pts: number;
  psas: number;
  katrol_psas: number;
}

export default function GuruNilaiRaport() {
  const { profile } = useAuthStore();
  const [kelas, setKelas] = useState<any[]>([]);
  const [mapel, setMapel] = useState<any[]>([]);
  
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  
  const [siswaConfig, setSiswaConfig] = useState<any[]>([]);
  const [kkm, setKkm] = useState<number>(75);
  const [namaBab, setNamaBab] = useState<string>('');
  
  const [nilaiData, setNilaiData] = useState<Record<string, NilaiSiswa>>({});
  const [loading, setLoading] = useState(false);

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
  }, [selectedKelas, selectedMapel]);

  const loadData = async () => {
     setLoading(true);
     try {
       // load settings for this mapel & kelas
       const settingsRef = doc(db, 'settings_nilai', `${selectedKelas}_${selectedMapel}`);
       
       onSnapshot(settingsRef, (snap) => {
          if (snap.exists()) {
             setKkm(snap.data().kkm || 75);
             setNamaBab(snap.data().namaBab || '');
          }
       });

       const qSiswa = query(collection(db, 'users'));
       const snapSiswa = await getDocs(qSiswa);
       const filteredSiswa = snapSiswa.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((u: any) => u.role === 'siswa' && u.kelas === selectedKelas)
          .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));
       
       setSiswaConfig(filteredSiswa);

       const nilaiRef = doc(db, 'nilai_raport', `${selectedKelas}_${selectedMapel}`);
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
     const numVal = parseFloat(value) || 0;
     setNilaiData(prev => {
        const studentData = prev[siswaId] || { formatif: Array(8).fill(0), sumatif: Array(8).fill(0), pts: 0, katrol_pts: 0, psas: 0, katrol_psas: 0 };
        const newArray = [...studentData[type]];
        newArray[index] = numVal;
        return {
           ...prev,
           [siswaId]: {
              ...studentData,
              [type]: newArray
           }
        };
     });
  };

  const handleSingleNilaiChange = (siswaId: string, field: 'pts' | 'katrol_pts' | 'psas' | 'katrol_psas', value: string) => {
     const numVal = parseFloat(value) || 0;
     setNilaiData(prev => {
        const studentData = prev[siswaId] || { formatif: Array(8).fill(0), sumatif: Array(8).fill(0), pts: 0, katrol_pts: 0, psas: 0, katrol_psas: 0 };
        return {
           ...prev,
           [siswaId]: {
              ...studentData,
              [field]: numVal
           }
        };
     });
  };

  const calculateNilaiAkhir = (data: NilaiSiswa | undefined) => {
     if (!data) return 0;
     
     const fValid = data.formatif.filter(v => v > 0);
     const avgF = fValid.length > 0 ? fValid.reduce((a,b) => a+b, 0) / fValid.length : 0;
     
     const sValid = data.sumatif.filter(v => v > 0);
     const avgS = sValid.length > 0 ? sValid.reduce((a,b) => a+b, 0) / sValid.length : 0;
     
     const finalPts = data.katrol_pts > 0 ? data.katrol_pts : data.pts;
     const finalPsas = data.katrol_psas > 0 ? data.katrol_psas : data.psas;
     
     const components = [];
     if (avgF > 0) components.push(avgF);
     if (avgS > 0) components.push(avgS);
     if (finalPts > 0) components.push(finalPts);
     if (finalPsas > 0) components.push(finalPsas);
     
     if (components.length === 0) return 0;
     return Math.round(components.reduce((a,b) => a+b, 0) / components.length);
  };

  const generateDeskripsi = (nilaiAkhir: number) => {
     if (!namaBab || nilaiAkhir === 0) return "-";
     const thresholdSangatBaik = kkm + ((100 - kkm) / 2);
     if (nilaiAkhir >= thresholdSangatBaik) {
        return `Sangat baik dalam memahami materi ${namaBab}.`;
     } else if (nilaiAkhir >= kkm) {
        return `Menunjukkan penguasaan yang baik dalam materi ${namaBab}.`;
     } else {
        return `Perlu peningkatan pemahaman pada materi ${namaBab}.`;
     }
  };

  const saveAll = async () => {
     if (!selectedKelas || !selectedMapel) return;
     setLoading(true);
     try {
        await setDoc(doc(db, 'settings_nilai', `${selectedKelas}_${selectedMapel}`), {
           kkm: kkm,
           namaBab: namaBab
        }, { merge: true });

        // Build data
        const toSave: Record<string, any> = {};
        siswaConfig.forEach(s => {
           toSave[s.id] = nilaiData[s.id] || { formatif: Array(8).fill(0), sumatif: Array(8).fill(0), pts: 0, katrol_pts: 0, psas: 0, katrol_psas: 0 };
        });

        await setDoc(doc(db, 'nilai_raport', `${selectedKelas}_${selectedMapel}`), {
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

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h1 className="text-2xl font-bold text-slate-800">Input Nilai Raport (Kurikulum Merdeka)</h1>
            <p className="text-sm text-slate-500">Kelola nilai Formatif, Sumatif, PTS, dan PSAS dengan fasilitas katrol nilai.</p>
         </div>
      </div>

      <Card>
         <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
               <div className="space-y-4">
                  <div className="space-y-1">
                     <label className="text-sm font-bold text-slate-700">Mata Pelajaran</label>
                     <Select value={selectedMapel} onValueChange={setSelectedMapel}>
                        <SelectTrigger>
                           <SelectValue placeholder="Pilih Mata Pelajaran" />
                        </SelectTrigger>
                        <SelectContent>
                           {mapel.map(m => (
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
                           {kelas.sort((a,b)=>a.name.localeCompare(b.name)).map(k => (
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
                     />
                  </div>
                  <div className="space-y-1">
                     <label className="text-sm font-bold text-slate-700">Nama Bab / Materi (Untuk Deskripsi)</label>
                     <Input 
                        placeholder="Contoh: Bilangan Bulat, Aljabar Dasar" 
                        value={namaBab} 
                        onChange={e => setNamaBab(e.target.value)} 
                        disabled={!selectedKelas || !selectedMapel}
                     />
                  </div>
               </div>
            </div>

            {selectedKelas && selectedMapel && (
               <div className="flex justify-end mb-4">
                  <Button onClick={saveAll} disabled={loading} className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
                     {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                     Simpan Semua Nilai
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
                           <TableHead className="text-center border-x bg-slate-50" colSpan={8}>Nilai Formatif</TableHead>
                           <TableHead className="text-center border-x bg-slate-50" colSpan={8}>Nilai Sumatif</TableHead>
                           <TableHead className="text-center border-x bg-yellow-50/50" colSpan={2}>PTS</TableHead>
                           <TableHead className="text-center border-x bg-emerald-50/50" colSpan={2}>PSAS</TableHead>
                           <TableHead className="w-20 text-center sticky right-[250px] z-20 bg-slate-100 shadow-[-1px_0_0_0_#e2e8f0]" rowSpan={2}>Akhir</TableHead>
                           <TableHead className="w-[250px] sticky right-0 z-20 bg-slate-100 shadow-[-1px_0_0_0_#e2e8f0]" rowSpan={2}>Deskripsi Otomatis</TableHead>
                        </TableRow>
                        <TableRow>
                           {/* Formatif columns */}
                           {Array.from({length: 8}).map((_,i) => (
                              <TableHead key={`hf${i}`} className="text-center w-[70px] p-1 border-x bg-slate-50 font-mono text-xs">F{i+1}</TableHead>
                           ))}
                           {/* Sumatif columns */}
                           {Array.from({length: 8}).map((_,i) => (
                              <TableHead key={`hs${i}`} className="text-center w-[70px] p-1 border-x bg-slate-50 font-mono text-xs">S{i+1}</TableHead>
                           ))}
                           
                           {/* PTS */}
                           <TableHead className="text-center w-[70px] p-1 border-l bg-yellow-50/50 text-xs">Awal</TableHead>
                           <TableHead className="text-center w-[70px] p-1 border-r text-blue-600 bg-yellow-50/50 text-xs">Katrol</TableHead>
                           
                           {/* PSAS */}
                           <TableHead className="text-center w-[70px] p-1 border-l bg-emerald-50/50 text-xs">Awal</TableHead>
                           <TableHead className="text-center w-[70px] p-1 border-r text-blue-600 bg-emerald-50/50 text-xs">Katrol</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {siswaConfig.map((siswa, idx) => {
                           const sData = nilaiData[siswa.id] || { formatif: Array(8).fill(0), sumatif: Array(8).fill(0), pts: 0, katrol_pts: 0, psas: 0, katrol_psas: 0 };
                           const nilaiAkhir = calculateNilaiAkhir(sData);
                           const deskripsi = generateDeskripsi(nilaiAkhir);

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
                                          className="w-[60px] text-center h-8 text-xs mx-auto px-1" 
                                          placeholder="-"
                                          value={sData.formatif[i] || ''} 
                                          onChange={e => handleArrayNilaiChange(siswa.id, 'formatif', i, e.target.value)} 
                                       />
                                    </TableCell>
                                 ))}

                                 {/* Sumatif Inputs */}
                                 {Array.from({length: 8}).map((_, i) => (
                                    <TableCell key={`s${i}`} className="p-1 border-x relative">
                                       <Input 
                                          type="number" 
                                          className="w-[60px] text-center h-8 text-xs mx-auto px-1" 
                                          placeholder="-"
                                          value={sData.sumatif[i] || ''} 
                                          onChange={e => handleArrayNilaiChange(siswa.id, 'sumatif', i, e.target.value)} 
                                       />
                                    </TableCell>
                                 ))}

                                 {/* PTS */}
                                 <TableCell className="p-1 border-l bg-yellow-50/20">
                                    <Input 
                                       type="number" 
                                       className="w-[60px] text-center h-8 text-xs mx-auto px-1 border-yellow-200 focus-visible:ring-yellow-400" 
                                       placeholder="-"
                                       value={sData.pts || ''} 
                                       onChange={e => handleSingleNilaiChange(siswa.id, 'pts', e.target.value)} 
                                    />
                                 </TableCell>
                                 <TableCell className="p-1 border-r bg-yellow-50/20">
                                    <Input 
                                       type="number" 
                                       className="w-[60px] text-center h-8 text-xs mx-auto px-1 border-blue-200 text-blue-600 focus-visible:ring-blue-400 font-bold" 
                                       placeholder="-"
                                       value={sData.katrol_pts || ''} 
                                       onChange={e => handleSingleNilaiChange(siswa.id, 'katrol_pts', e.target.value)} 
                                    />
                                 </TableCell>

                                 {/* PSAS */}
                                 <TableCell className="p-1 border-l bg-emerald-50/20">
                                    <Input 
                                       type="number" 
                                       className="w-[60px] text-center h-8 text-xs mx-auto px-1 border-emerald-200 focus-visible:ring-emerald-400" 
                                       placeholder="-"
                                       value={sData.psas || ''} 
                                       onChange={e => handleSingleNilaiChange(siswa.id, 'psas', e.target.value)} 
                                    />
                                 </TableCell>
                                 <TableCell className="p-1 border-r bg-emerald-50/20">
                                    <Input 
                                       type="number" 
                                       className="w-[60px] text-center h-8 text-xs mx-auto px-1 border-blue-200 text-blue-600 focus-visible:ring-blue-400 font-bold" 
                                       placeholder="-"
                                       value={sData.katrol_psas || ''} 
                                       onChange={e => handleSingleNilaiChange(siswa.id, 'katrol_psas', e.target.value)} 
                                    />
                                 </TableCell>

                                 <TableCell className="text-center font-bold sticky right-[250px] z-10 bg-white shadow-[-1px_0_0_0_#e2e8f0] group-hover:bg-slate-50/50">
                                    <span className={nilaiAkhir >= kkm ? 'text-emerald-600' : 'text-rose-500'}>
                                       {nilaiAkhir}
                                    </span>
                                 </TableCell>
                                 <TableCell className="text-[11px] leading-tight text-slate-600 italic sticky right-0 z-10 bg-white shadow-[-1px_0_0_0_#e2e8f0] group-hover:bg-slate-50/50 min-w-[250px]">
                                    {deskripsi}
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
