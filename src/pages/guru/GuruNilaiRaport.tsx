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

export default function GuruNilaiRaport() {
  const { profile } = useAuthStore();
  const [kelas, setKelas] = useState<any[]>([]);
  const [mapel, setMapel] = useState<any[]>([]);
  
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  
  const [siswaConfig, setSiswaConfig] = useState<any[]>([]);
  const [kkm, setKkm] = useState<number>(75);
  const [namaBab, setNamaBab] = useState<string>('');
  
  const [nilaiData, setNilaiData] = useState<Record<string, { formatif: number, sumatif: number, katrol: number }>>({});
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

  const handleNilaiChange = (siswaId: string, field: 'formatif' | 'sumatif' | 'katrol', value: string) => {
     const numVal = parseFloat(value) || 0;
     setNilaiData(prev => ({
        ...prev,
        [siswaId]: {
           ...prev[siswaId],
           [field]: numVal
        }
     }));
  };

  const generateDeskripsi = (nilaiAkhir: number) => {
     if (!namaBab) return "-";
     const thresholdSangatBaik = kkm + ((100 - kkm) / 2);
     if (nilaiAkhir >= thresholdSangatBaik) {
        return `Sangat baik dalam memahami materi ${namaBab}.`;
     } else if (nilaiAkhir >= kkm) {
        return `Menunjukkan penguasaan yang baik dalam materi ${namaBab}.`;
     } else {
        return `Perlu bimbingan dan peningkatan pemahaman pada materi ${namaBab}.`;
     }
  };

  const calculateNilaiAkhir = (formatif: number, sumatif: number, katrol: number) => {
     if (katrol > 0) return katrol;
     // Contoh bobot: Formatif 60%, Sumatif 40% (Bisa disesuaikan institusi)
     return Math.round((formatif * 0.6) + (sumatif * 0.4));
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
           toSave[s.id] = nilaiData[s.id] || { formatif: 0, sumatif: 0, katrol: 0 };
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
            <p className="text-sm text-slate-500">Isi form di bawah untuk generate deskripsi otomatis berdasarkan KKM.</p>
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
                     <label className="text-sm font-bold text-slate-700">Nama Bab / Materi</label>
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
               <div className="overflow-x-auto border rounded-xl">
                  <Table>
                     <TableHeader className="bg-slate-50">
                        <TableRow>
                           <TableHead className="w-10 text-center">No</TableHead>
                           <TableHead>Nama Siswa</TableHead>
                           <TableHead className="w-24 text-center">Formatif</TableHead>
                           <TableHead className="w-24 text-center">Sumatif</TableHead>
                           <TableHead className="w-24 text-center">Katrol</TableHead>
                           <TableHead className="w-20 text-center">Akhir</TableHead>
                           <TableHead className="min-w-[250px]">Deskripsi Otomatis</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {siswaConfig.map((siswa, idx) => {
                           const formatif = nilaiData[siswa.id]?.formatif || 0;
                           const sumatif = nilaiData[siswa.id]?.sumatif || 0;
                           const katrol = nilaiData[siswa.id]?.katrol || 0;
                           const nilaiAkhir = calculateNilaiAkhir(formatif, sumatif, katrol);
                           const deskripsi = generateDeskripsi(nilaiAkhir);

                           return (
                              <TableRow key={siswa.id}>
                                 <TableCell className="text-center text-slate-500">{idx + 1}</TableCell>
                                 <TableCell>
                                    <p className="font-bold text-slate-700 text-xs md:text-sm">{siswa.displayName}</p>
                                    <p className="text-[10px] text-slate-500">{siswa.nis || '-'}</p>
                                 </TableCell>
                                 <TableCell className="p-2">
                                    <Input 
                                       type="number" 
                                       className="w-full text-center h-8 text-sm" 
                                       value={formatif || ''} 
                                       onChange={e => handleNilaiChange(siswa.id, 'formatif', e.target.value)} 
                                    />
                                 </TableCell>
                                 <TableCell className="p-2">
                                    <Input 
                                       type="number" 
                                       className="w-full text-center h-8 text-sm" 
                                       value={sumatif || ''} 
                                       onChange={e => handleNilaiChange(siswa.id, 'sumatif', e.target.value)} 
                                    />
                                 </TableCell>
                                 <TableCell className="p-2">
                                    <Input 
                                       type="number" 
                                       className="w-full text-center h-8 text-sm placeholder:text-slate-300" 
                                       placeholder="-"
                                       value={katrol || ''} 
                                       onChange={e => handleNilaiChange(siswa.id, 'katrol', e.target.value)} 
                                    />
                                 </TableCell>
                                 <TableCell className="text-center font-bold">
                                    <span className={nilaiAkhir >= kkm ? 'text-emerald-600' : 'text-rose-500'}>
                                       {nilaiAkhir}
                                    </span>
                                 </TableCell>
                                 <TableCell className="text-xs text-slate-600 italic">
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
               <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-xl">
                  Tidak ada siswa di kelas ini.
               </div>
            )}
         </CardContent>
      </Card>
    </div>
  );
}
