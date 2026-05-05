import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/auth.store';
import { Save, Loader2 } from 'lucide-react';
import { useAppSettings } from '../../hooks/useAppSettings';

export default function InputNilaiEkstrakurikuler({ isAdmin = false }: { isAdmin?: boolean }) {
  const { profile, activeTahunAjaran: authTahunAjaran } = useAuthStore();
  const { settings } = useAppSettings();
  const [kelas, setKelas] = useState<any[]>([]);
  const [ekstraList, setEkstraList] = useState<any[]>([]);
  
  const [selectedKelas, setSelectedKelas] = useState('');
  const [tahunAjaran, setTahunAjaran] = useState(authTahunAjaran || settings.activeTahunAjaran || '2025/2026');
  const [semester, setSemester] = useState('Ganjil');

  useEffect(() => {
     if (authTahunAjaran) setTahunAjaran(authTahunAjaran);
     else if (settings.activeTahunAjaran) setTahunAjaran(settings.activeTahunAjaran);
  }, [authTahunAjaran, settings.activeTahunAjaran]);

  useEffect(() => {
    if (!isAdmin && profile?.waliKelas) {
      setSelectedKelas(profile.waliKelas);
    }
  }, [isAdmin, profile?.waliKelas]);

  useEffect(() => {
    const unsubKelas = onSnapshot(collection(db, 'kelas'), snap => {
      setKelas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubEkstra = onSnapshot(collection(db, 'ekstra'), snap => {
      setEkstraList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubKelas(); unsubEkstra(); }
  }, []);

  const [siswaConfig, setSiswaConfig] = useState<any[]>([]);
  const [nilaiData, setNilaiData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedKelas) loadData();
    else { setSiswaConfig([]); setNilaiData({}); }
  }, [selectedKelas, tahunAjaran, semester]);

  const getDocId = () => `${selectedKelas}_${tahunAjaran.replace(/\//g, '-')}_${semester}`;

  const loadData = async () => {
     setLoading(true);
     try {
       const qSiswa = query(collection(db, 'users'));
       const snapSiswa = await getDocs(qSiswa);
       const allUsers = snapSiswa.docs.map(d => ({ id: d.id, ...d.data() }));

       const nilaiRef = doc(db, 'nilai_ekstra', getDocId());
       onSnapshot(nilaiRef, (snap) => {
          let currentNilai = {};
          if (snap.exists() && snap.data().nilai) currentNilai = snap.data().nilai;
          setNilaiData(currentNilai);

          const filteredSiswa = allUsers
             .filter((u: any) => u.role === 'siswa' && u.kelas === selectedKelas)
             .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));
          setSiswaConfig(filteredSiswa);
       });
     } catch (error) {
        toast.error("Gagal memuat data siswa");
     }
     setLoading(false);
  };

  const handleChange = (siswaId: string, itemIndex: number, field: string, value: string) => {
     setNilaiData(prev => {
        const p = prev[siswaId] || [];
        const newArr = [...p];
        if (!newArr[itemIndex]) newArr[itemIndex] = { nama: '', predikat: '', deskripsi: '' };
        newArr[itemIndex] = { ...newArr[itemIndex], [field]: value };
        return { ...prev, [siswaId]: newArr };
     });
  };

  const saveAll = async () => {
     if (!selectedKelas) return;
     setLoading(true);
     try {
        await setDoc(doc(db, 'nilai_ekstra', getDocId()), { nilai: nilaiData, updatedBy: profile?.uid, updatedAt: new Date() }, { merge: true });
        toast.success("Berhasil menyimpan data nilai ekstrakurikuler.");
     } catch (e: any) {
        toast.error("Gagal menyimpan: " + e.message);
     }
     setLoading(false);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Input Nilai Ekstrakurikuler</h1>
        <p className="text-sm text-slate-500 font-medium">{isAdmin ? 'Pilih kelas untuk menginput nilai ekstrakurikuler.' : 'Input nilai ekstrakurikuler untuk kelas perwalian Anda.'}</p>
      </div>

      <Card className="border-0 shadow-lg bg-white overflow-visible">
         <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-50">
               <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Tahun Ajaran</label>
                  <Select value={tahunAjaran} onValueChange={setTahunAjaran}>
                     <SelectTrigger className="h-11 font-bold"><SelectValue placeholder="Pilih TA" /></SelectTrigger>
                     <SelectContent>
                        {(settings.historyTahunAjaran || ['2023/2024', '2024/2025', '2025/2026']).map((val: string) => <SelectItem key={val} value={val}>{val}</SelectItem>)}
                     </SelectContent>
                  </Select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Semester</label>
                  <Select value={semester} onValueChange={setSemester}>
                     <SelectTrigger className="h-11 font-bold"><SelectValue placeholder="Pilih Semester" /></SelectTrigger>
                     <SelectContent>
                        <SelectItem value="Ganjil">Ganjil</SelectItem><SelectItem value="Genap">Genap</SelectItem>
                     </SelectContent>
                  </Select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Kelas</label>
                  <Select value={selectedKelas} onValueChange={setSelectedKelas} disabled={!isAdmin}>
                     <SelectTrigger className="h-11 font-bold"><SelectValue placeholder={!isAdmin && profile?.waliKelas ? profile.waliKelas : "Pilih Kelas"} /></SelectTrigger>
                     <SelectContent>
                        {kelas.sort((a,b)=>a.name.localeCompare(b.name)).map(k => <SelectItem key={k.id} value={k.name}>{k.name}</SelectItem>)}
                     </SelectContent>
                  </Select>
               </div>
            </div>

            {selectedKelas && (
               <div className="space-y-6 relative z-0">
                 <div className="flex justify-end mb-4">
                    <Button onClick={saveAll} disabled={loading} className="h-10 px-8 bg-indigo-600 hover:bg-indigo-700 font-bold shadow-md shadow-indigo-600/20">
                       {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                       SIMPAN PERUBAHAN
                    </Button>
                 </div>
                 <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <Table className="min-w-max">
                       <TableHeader className="bg-slate-100 border-b-2">
                          <TableRow>
                             <TableHead className="w-12 text-center" rowSpan={2}>NO</TableHead>
                             <TableHead className="w-48" rowSpan={2}>NAMA SISWA</TableHead>
                             <TableHead className="text-center border-x bg-blue-50 text-blue-800" colSpan={3}>EKSTRAKURIKULER 1</TableHead>
                             <TableHead className="text-center border-x bg-fuchsia-50 text-fuchsia-800" colSpan={3}>EKSTRAKURIKULER 2</TableHead>
                             <TableHead className="text-center border-x bg-emerald-50 text-emerald-800" colSpan={3}>EKSTRAKURIKULER 3</TableHead>
                          </TableRow>
                          <TableRow>
                             {[0,1,2].map(i => (
                                <React.Fragment key={`hdr-${i}`}>
                                   <TableHead className="text-center text-xs p-2">Nama Ekstra</TableHead>
                                   <TableHead className="text-center text-xs p-2 w-28">Predikat</TableHead>
                                   <TableHead className="text-center text-xs p-2 w-48">Keterangan</TableHead>
                                </React.Fragment>
                             ))}
                          </TableRow>
                       </TableHeader>
                       <TableBody>
                         {siswaConfig.map((siswa, idx) => {
                            const scores = nilaiData[siswa.id] || [];
                            return (
                               <TableRow key={siswa.id} className="hover:bg-slate-50">
                                  <TableCell className="text-center font-bold text-slate-400">{idx + 1}</TableCell>
                                  <TableCell className="font-bold text-slate-700">
                                     <div className="flex flex-col"><span className="text-sm">{siswa.displayName}</span></div>
                                  </TableCell>
                                  {[0,1,2].map(i => (
                                     <React.Fragment key={`input-${siswa.id}-${i}`}>
                                        <TableCell className="p-1 border-x">
                                           <Select value={scores[i]?.nama || 'none'} onValueChange={v => handleChange(siswa.id, i, 'nama', v === 'none' ? '' : v)}>
                                             <SelectTrigger className="h-8 text-[10px] border-slate-200 uppercase bg-white">
                                                <SelectValue placeholder="-" />
                                             </SelectTrigger>
                                             <SelectContent>
                                                <SelectItem value="none">- Kosong -</SelectItem>
                                                {ekstraList.map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
                                             </SelectContent>
                                           </Select>
                                        </TableCell>
                                        <TableCell className="p-1 border-x">
                                           <Select value={scores[i]?.predikat || 'none'} onValueChange={v => handleChange(siswa.id, i, 'predikat', v === 'none' ? '' : v)}>
                                             <SelectTrigger className="h-8 text-[10px] border-slate-200 uppercase bg-white">
                                                <SelectValue placeholder="-" />
                                             </SelectTrigger>
                                             <SelectContent>
                                                <SelectItem value="none">- Kosong -</SelectItem>
                                                <SelectItem value="Sangat Baik">Sangat Baik</SelectItem>
                                                <SelectItem value="Baik">Baik</SelectItem>
                                                <SelectItem value="Cukup">Cukup</SelectItem>
                                                <SelectItem value="Kurang">Kurang</SelectItem>
                                             </SelectContent>
                                           </Select>
                                        </TableCell>
                                        <TableCell className="p-1 border-x">
                                           <Input className="h-8 text-[11px]" value={scores[i]?.deskripsi || ''} placeholder="Keterangan..." onChange={e => handleChange(siswa.id, i, 'deskripsi', e.target.value)} />
                                        </TableCell>
                                     </React.Fragment>
                                  ))}
                               </TableRow>
                            );
                         })}
                       </TableBody>
                    </Table>
                 </div>
               </div>
            )}
         </CardContent>
      </Card>
    </div>
  );
}
