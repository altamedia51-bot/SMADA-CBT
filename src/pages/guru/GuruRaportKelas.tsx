import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/auth.store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function GuruRaportKelas() {
  const profile = useAuthStore(state => state.profile);
  
  const [mapelList, setMapelList] = useState<any[]>([]);
  const [siswaList, setSiswaList] = useState<any[]>([]);
  
  const [tahunAjaran, setTahunAjaran] = useState('2024/2025');
  const [semester, setSemester] = useState('Ganjil');
  const [raportData, setRaportData] = useState<Record<string, Record<string, any>>>({}); // siswaId -> mapelId -> nilaiInfo
  const [pembinaanData, setPembinaanData] = useState<Record<string, string>>({}); // siswaId -> catatan

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubMapel = onSnapshot(collection(db, 'mapel'), snap => {
      setMapelList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubMapel(); };
  }, []);

  useEffect(() => {
    if (profile?.waliKelas) {
      loadData();
    }
  }, [profile?.waliKelas, tahunAjaran, semester]);

  const loadData = async () => {
    if (!profile?.waliKelas) return;
    setLoading(true);

    try {
      // Load Siswa for this class
      const usersSnap = await getDocs(query(collection(db, 'users')));
      const siswas = usersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((u: any) => u.role === 'siswa' && u.kelas === profile.waliKelas)
        .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));
      
      setSiswaList(siswas);

      // Load Nilai for each mapped subject
      const allNilai: Record<string, Record<string, any>> = {}; // [siswaId][mapelId]
      const docsSnap = await getDocs(collection(db, 'nilai_raport'));
      
      // Filter by class, TA, and Semester
      const suffix = `_${tahunAjaran.replace(/\//g, '-')}_${semester}`;
      const prefix = `${profile.waliKelas}_`;
      
      const relatedDocs = docsSnap.docs.filter(d => 
        d.id.startsWith(prefix) && d.id.endsWith(suffix)
      );

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
          if (stData.katrol_psas) {
            nilaiAkhir = Number(stData.katrol_psas);
          } else if (stData.psas) {
            nilaiAkhir = Number(stData.psas);
          } else if (stData.katrol_pts) {
             nilaiAkhir = Number(stData.katrol_pts);
          } else {
             // avergae form/sumatif
             const forN = Array.isArray(stData.formatif) ? stData.formatif.map(Number).filter(Boolean) : [];
             const sumN = Array.isArray(stData.sumatif) ? stData.sumatif.map(Number).filter(Boolean) : [];
             const allM = [...forN, ...sumN];
             if (allM.length > 0) {
                nilaiAkhir = allM.reduce((a, b) => a + b, 0) / allM.length;
             }
          }

          allNilai[siswaId][m.id] = {
            nilai: Math.round(nilaiAkhir),
            deskripsi: stData.deskripsi || ''
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
      toast.success('Catatan pembinaan berhasil disimpan');
    } catch (err: any) {
      toast.error('Gagal menyimpan: ' + err.message);
    }
  };

  if (!profile?.waliKelas) {
    return (
      <div className="p-8 text-center text-slate-500">
        Anda bukan wali kelas.
      </div>
    );
  }

  // Calculate Average and Rank
  const rataRataSiswa: Record<string, number> = {};
  siswaList.forEach(s => {
    const nilai = raportData[s.id] || {};
    const scores = Object.values(nilai).map((v: any) => v.nilai);
    if (scores.length > 0) {
      rataRataSiswa[s.id] = scores.reduce((a, b) => a + b, 0) / scores.length;
    } else {
      rataRataSiswa[s.id] = 0;
    }
  });

  const rankedSiswa = [...siswaList].sort((a, b) => rataRataSiswa[b.id] - rataRataSiswa[a.id]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h1 className="text-2xl font-bold text-slate-800">Raport Kelas {profile.waliKelas}</h1>
            <p className="text-sm text-slate-500">Rekapitulasi Nilai Akhir dari semua mapel, Ranking, dan Catatan Wali Kelas.</p>
         </div>
      </div>

      <Card>
         <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 mb-4 items-end">
               <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700">Tahun Ajaran</label>
                  <Select value={tahunAjaran} onValueChange={setTahunAjaran}>
                     <SelectTrigger className="w-[200px]">
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
                     <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Pilih Semester" />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value="Ganjil">Ganjil</SelectItem>
                        <SelectItem value="Genap">Genap</SelectItem>
                     </SelectContent>
                  </Select>
               </div>
               <Button onClick={savePembinaan} className="bg-blue-600 hover:bg-blue-700 text-white ml-auto">
                  Simpan Catatan Wali Kelas
               </Button>
            </div>
          </CardContent>
      </Card>

      {loading ? (
        <div className="p-10 text-center animate-pulse text-slate-400">Memuat data...</div>
      ) : (
        <div className="space-y-8">
           {rankedSiswa.length > 0 && (
              <Card className="overflow-hidden border border-slate-200">
                 <CardHeader className="bg-slate-50 border-b">
                    <CardTitle className="text-lg">Ledger Nilai Kelas</CardTitle>
                    <CardDescription>Daftar nilai seluruh mapel yang ditempuh dan rata-ratanya</CardDescription>
                 </CardHeader>
                 <CardContent className="p-0 overflow-x-auto">
                    <Table>
                       <TableHeader className="bg-slate-50">
                          <TableRow>
                             <TableHead className="w-[50px] text-center border-r">Rnk</TableHead>
                             <TableHead className="w-[250px] border-r">Nama Siswa</TableHead>
                             {mapelList.filter(m => rankedSiswa.some(s => raportData[s.id]?.[m.id])).map(m => (
                                <TableHead key={m.id} className="text-center min-w-[100px] border-r">{m.name}</TableHead>
                             ))}
                             <TableHead className="text-center w-[100px] border-r">Rata-rata</TableHead>
                          </TableRow>
                       </TableHeader>
                       <TableBody>
                          {rankedSiswa.map((siswa, index) => (
                             <TableRow key={siswa.id} className="hover:bg-slate-50/50">
                                <TableCell className="text-center font-bold border-r">{index + 1}</TableCell>
                                <TableCell className="font-semibold border-r">{siswa.displayName}</TableCell>
                                {mapelList.filter(m => rankedSiswa.some(s => raportData[s.id]?.[m.id])).map(m => {
                                   const nilaiMapel = raportData[siswa.id]?.[m.id]?.nilai;
                                   return (
                                      <TableCell key={m.id} className="text-center border-r">
                                         {nilaiMapel ? <span className="font-medium text-slate-700">{nilaiMapel}</span> : <span className="text-slate-300">-</span>}
                                      </TableCell>
                                   );
                                })}
                                <TableCell className="text-center font-bold text-blue-600 border-r">{rataRataSiswa[siswa.id]?.toFixed(2)}</TableCell>
                             </TableRow>
                          ))}
                       </TableBody>
                    </Table>
                 </CardContent>
              </Card>
           )}

           {rankedSiswa.map((siswa, index) => (
             <Card key={siswa.id} className="overflow-hidden border-slate-200">
               <CardHeader className="bg-slate-50 py-3 border-b flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-800">{siswa.displayName}</CardTitle>
                    <CardDescription className="text-sm">NIS/NISN: {siswa.nisn || '-'} • Rata-rata: {rataRataSiswa[siswa.id]?.toFixed(2) || '0.00'}</CardDescription>
                  </div>
                  <div className="bg-blue-100 text-blue-800 font-bold px-4 py-2 rounded-lg text-lg border border-blue-200 shadow-sm">
                    Ranking {index + 1}
                  </div>
               </CardHeader>
               <CardContent className="p-0">
                 <div className="overflow-x-auto">
                   <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="w-[200px]">Mata Pelajaran</TableHead>
                          <TableHead className="w-[100px] text-center">Nilai Akhir</TableHead>
                          <TableHead>Deskripsi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                         {mapelList.map(m => {
                            const nilaiMapel = raportData[siswa.id]?.[m.id];
                            if (!nilaiMapel) return null;
                            return (
                               <TableRow key={m.id}>
                                  <TableCell className="font-semibold">{m.name}</TableCell>
                                  <TableCell className="text-center font-bold text-lg">{nilaiMapel.nilai || '-'}</TableCell>
                                  <TableCell className="text-sm text-slate-600 italic whitespace-pre-wrap">{nilaiMapel.deskripsi || '-'}</TableCell>
                               </TableRow>
                            );
                         })}
                         {Object.keys(raportData[siswa.id] || {}).length === 0 && (
                            <TableRow>
                               <TableCell colSpan={3} className="text-center text-slate-400 py-4">Belum ada nilai yang diinputkan</TableCell>
                            </TableRow>
                         )}
                      </TableBody>
                   </Table>
                 </div>
                 <div className="p-4 bg-amber-50/50 border-t">
                    <label className="text-xs font-bold text-slate-700 block mb-2">Catatan/Pembinaan Wali Kelas</label>
                    <Input 
                       value={pembinaanData[siswa.id] || ''} 
                       onChange={(e) => setPembinaanData({ ...pembinaanData, [siswa.id]: e.target.value })}
                       placeholder="Masukkan catatan pengembangan karakter/pembinaan..."
                       className="bg-white"
                    />
                 </div>
               </CardContent>
             </Card>
           ))}

           {rankedSiswa.length === 0 && (
             <div className="text-center text-slate-500 py-10">Tidak ada data siswa untuk kelas ini.</div>
           )}
        </div>
      )}
    </div>
  );
}
