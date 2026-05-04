import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, query, collection, where, getDocs, writeBatch, arrayUnion } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Settings, Upload, Image as ImageIcon, CalendarClock, ArrowUpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminPengaturan() {
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [appName, setAppName] = useState<string>('CBT System');
  const [activeTahunAjaran, setActiveTahunAjaran] = useState<string>('2025/2026');
  const [historyTahunAjaran, setHistoryTahunAjaran] = useState<string[]>(['2025/2026']);
  const [isLoading, setIsLoading] = useState(false);
  const [showTahunModal, setShowTahunModal] = useState(false);
  const [newTahunInput, setNewTahunInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.logo) setLogoBase64(data.logo);
          if (data.appName) setAppName(data.appName);
          if (data.activeTahunAjaran) setActiveTahunAjaran(data.activeTahunAjaran);
          if (data.historyTahunAjaran) setHistoryTahunAjaran(data.historyTahunAjaran);
        }
      } catch (error) {
        console.error("Gagal mengambil pengaturan:", error);
      }
    };
    fetchSettings();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast.error('Ukuran file maksimal 500KB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), {
        logo: logoBase64,
        appName: appName
      }, { merge: true });
      toast.success('Pengaturan berhasil disimpan!');
    } catch (error: any) {
      toast.error('Gagal menyimpan pengaturan: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getNextClassString = (currentName: string, allKelas: any[]) => {
     const k = allKelas.find((x:any) => x.name === currentName);
     if (k && (k.tingkat === 12 || currentName.startsWith('XII ') || currentName.startsWith('IX ') || currentName.startsWith('VI '))) {
        return 'ALUMNI';
     }
     
     // Kurikulum Merdeka
     if (currentName.startsWith('X E')) return currentName.replace('X E', 'XI F');
     if (currentName.startsWith('XI F')) return currentName.replace('XI F', 'XII F');
     
     if (currentName.startsWith('X ')) return currentName.replace('X ', 'XI ');
     if (currentName.startsWith('XI ')) return currentName.replace('XI ', 'XII ');
     if (currentName.startsWith('VII ')) return currentName.replace('VII ', 'VIII ');
     if (currentName.startsWith('VIII ')) return currentName.replace('VIII ', 'IX ');
     
     if (/^10\s/.test(currentName)) return currentName.replace(/^10/, '11');
     if (/^11\s/.test(currentName)) return currentName.replace(/^11/, '12');
     if (/^7\s/.test(currentName)) return currentName.replace(/^7/, '8');
     if (/^8\s/.test(currentName)) return currentName.replace(/^8/, '9');
     
     return 'ALUMNI'; // fallback if we can't parse it
  };

  const handleRestoreSiswa = async () => {
      if (!confirm("Apakah Anda yakin ingin mengembalikan kelas siswa dari tahun ajaran sebelumnya? Fitur ini akan mencari riwayat kelas siswa dan mengembalikannya.")) return;
      setIsLoading(true);
      try {
         const qSiswa = query(collection(db, 'users'), where('role', '==', 'siswa'));
         const snapSiswa = await getDocs(qSiswa);
         let currentBatch = writeBatch(db);
         let count = 0;
         let opCount = 0;
         let batchArray: any[] = [];
         
         for (const d of snapSiswa.docs) {
            const s = d.data();
            // Get any available class from history if exists
            const history = s.historyKelas || {};
            const keys = Object.keys(history);
            if (keys.length > 0) {
               // Restore to the first found class in history
               const prevClass = history[keys[keys.length - 1]];
               currentBatch.update(d.ref, { kelas: prevClass, isActive: true });
               count++;
               opCount++;
               if (opCount >= 400) {
                  batchArray.push(currentBatch.commit());
                  currentBatch = writeBatch(db);
                  opCount = 0;
               }
            }
         }
         batchArray.push(currentBatch.commit());
         await Promise.all(batchArray);
         toast.success(`Berhasil mengembalikan rincian kelas ${count} siswa seperti semula.`);
      } catch (err: any) {
         toast.error("Gagal mengembalikan data: " + err.message);
      } finally {
         setIsLoading(false);
      }
  };

  const handleSwitchTahunAjaran = async (ta: string) => {
      setIsLoading(true);
      try {
         await setDoc(doc(db, 'settings', 'general'), { activeTahunAjaran: ta }, { merge: true });
         setActiveTahunAjaran(ta);
         toast.success(`Tahun Ajaran aktif diubah ke ${ta}`);
      } catch (err: any) {
         toast.error("Gagal mengubah Tahun Ajaran: " + err.message);
      } finally {
         setIsLoading(false);
      }
  };

  const handleGantiTahunAjaran = async () => {
      if (!newTahunInput || newTahunInput.length < 9) {
         toast.error("Format Tahun Ajaran harus valid. Cth: 2026/2027");
         return;
      }
      setIsLoading(true);
      try {
         const qKelas = query(collection(db, 'kelas'));
         const snapKelas = await getDocs(qKelas);
         const allKelas = snapKelas.docs.map(d => d.data());
         
         const qSiswa = query(collection(db, 'users'), where('role', '==', 'siswa'));
         const snapSiswa = await getDocs(qSiswa);
         
         // We need to chunk the batches since Firestore limit is 500 writes per batch
         let currentBatch = writeBatch(db);
         let operationCount = 0;
         let batchArray: any[] = [];
         let promoteCount = 0;
         
         for (const d of snapSiswa.docs) {
            const s = d.data();
            if (!s.kelas || s.kelas === 'ALUMNI') continue;
            
            const historyObj = s.historyKelas || {};
            historyObj[activeTahunAjaran] = s.kelas;
            
            const nextClass = getNextClassString(s.kelas, allKelas);
            if (nextClass === 'ALUMNI') {
               currentBatch.update(d.ref, { kelas: 'ALUMNI', isActive: false, historyKelas: historyObj });
            } else {
               currentBatch.update(d.ref, { kelas: nextClass, historyKelas: historyObj });
            }
            promoteCount++;
            operationCount++;
            
            if (operationCount >= 400) {
               batchArray.push(currentBatch.commit());
               currentBatch = writeBatch(db);
               operationCount = 0;
            }
         }
         
         // Update settings after promoting
         currentBatch.set(doc(db, 'settings', 'general'), {
            activeTahunAjaran: newTahunInput,
            historyTahunAjaran: arrayUnion(newTahunInput)
         }, { merge: true });
         
         batchArray.push(currentBatch.commit());
         await Promise.all(batchArray);
         toast.success(`Tahun Ajaran baru berhasil dibuat. ${promoteCount} siswa berhasil dinaikkan kelas/lulus.`);
         setActiveTahunAjaran(newTahunInput);
         setShowTahunModal(false);
      } catch(err:any) {
         toast.error("Terjadi kesalahan: " + err.message);
      } finally {
         setIsLoading(false);
      }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
         <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 shadow-sm border border-slate-200">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Pengaturan Aplikasi</h1>
          <p className="text-slate-500 font-medium">Ubah identitas aplikasi seperti logo dan nama.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identitas Sekolah / Instansi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Nama Aplikasi</label>
            <Input 
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Contoh: CBT SMA Negeri 1"
              className="max-w-md"
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-700 block">Logo Aplikasi</label>
            <div className="flex items-start gap-6">
               <div className="w-24 h-24 shrink-0 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden relative">
                  {logoBase64 ? (
                     <img src={logoBase64} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                     <ImageIcon className="w-8 h-8 text-slate-300" />
                  )}
               </div>
               <div className="flex-1 space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Pilih Gambar
                  </Button>
                  <p className="text-xs text-slate-500 font-medium tracking-wide">Format: JPG, PNG. Rekomendasi rasio 1:1, max 500KB.</p>
                  
                  {logoBase64 && (
                     <Button variant="ghost" size="sm" onClick={() => setLogoBase64('')} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-8 px-3">
                        Hapus Logo
                     </Button>
                  )}
               </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
            <Button onClick={handleSave} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
              {isLoading ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarClock className="w-5 h-5" /> Manajemen Tahun Ajaran</CardTitle>
          <CardDescription>Atur tahun ajaran aktif dan kelola siklus akademik kelulusan otomatis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                 <p className="text-sm text-slate-500 font-bold mb-1">Tahun Ajaran Aktif Saat Ini</p>
                 <div className="flex items-center gap-2">
                   <Select value={activeTahunAjaran} onValueChange={handleSwitchTahunAjaran}>
                      <SelectTrigger className="w-full md:w-[250px] h-12 text-xl font-black text-indigo-700 bg-white border-slate-200 shadow-sm">
                         <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                         {(historyTahunAjaran || ['2023/2024', '2024/2025', '2025/2026']).map(ta => (
                            <SelectItem key={ta} value={ta} className="font-bold">{ta}</SelectItem>
                         ))}
                      </SelectContent>
                   </Select>
                 </div>
              </div>
              <Button onClick={() => setShowTahunModal(true)} className="bg-indigo-600 hover:bg-indigo-700 font-bold shrink-0 shadow-md">
                 <ArrowUpCircle className="w-4 h-4 mr-2" />
                 Ganti Ke Tahun Ajaran Baru
              </Button>
           </div>
           
           <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mt-4">
              <h3 className="font-bold text-orange-800 mb-2">Pemulihan Data Siswa</h3>
              <p className="text-sm text-orange-700 mb-4">Gunakan fitur ini jika data siswa sebelumnya kosong karena perubahan tahun ajaran. Ini akan merevert kelas semua siswa ke kelas aslinya.</p>
              <Button onClick={handleRestoreSiswa} variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100 font-bold">
                 Pulihkan Data Siswa (Undo)
              </Button>
           </div>
        </CardContent>
      </Card>

      <Dialog open={showTahunModal} onOpenChange={setShowTahunModal}>
         <DialogContent>
            <DialogHeader>
               <DialogTitle>Mulai Tahun Ajaran Baru?</DialogTitle>
               <DialogDescription>
                  Tindakan ini akan <b>Otomatis Menaikkan Kelas Semua Siswa</b> (Siswa tingkat tertinggi akan diluluskan).<br/><br/>
                  Nilai Raport Tahun Ajaran baru akan mulai dari kosong otomatis.
               </DialogDescription>
            </DialogHeader>
            <div className="py-4">
               <label className="text-sm font-bold text-slate-700 mb-2 block">Masukkan Nama Tahun Ajaran (Baru)</label>
               <Input 
                  autoFocus
                  placeholder="Contoh: 2026/2027" 
                  value={newTahunInput}
                  onChange={e => setNewTahunInput(e.target.value)}
                  className="h-12 text-lg font-bold"
               />
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setShowTahunModal(false)}>Batal</Button>
               <Button onClick={handleGantiTahunAjaran} disabled={isLoading || !newTahunInput} className="bg-indigo-600 hover:bg-indigo-700">
                  {isLoading ? 'Memproses...' : 'Proses & Simpan'}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}
