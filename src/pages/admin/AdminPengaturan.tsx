import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, query, collection, where, getDocs, writeBatch, arrayUnion } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Settings, Upload, Image as ImageIcon, CalendarClock, ArrowUpCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

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
         
         const batch = writeBatch(db);
         let promoteCount = 0;
         
         snapSiswa.docs.forEach(d => {
            const s = d.data();
            if (!s.kelas || s.kelas === 'ALUMNI') return;
            const nextClass = getNextClassString(s.kelas, allKelas);
            if (nextClass === 'ALUMNI') {
               batch.update(d.ref, { kelas: 'ALUMNI', isActive: false });
            } else {
               batch.update(d.ref, { kelas: nextClass });
            }
            promoteCount++;
         });
         
         batch.set(doc(db, 'settings', 'general'), {
            activeTahunAjaran: newTahunInput,
            historyTahunAjaran: arrayUnion(newTahunInput)
         }, { merge: true });
         
         await batch.commit();
         toast.success(`Tahun Ajaran baru berhasil dibuat. ${promoteCount} siswa berhasil diproses.`);
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
              <div>
                 <p className="text-sm text-slate-500 font-bold mb-1">Tahun Ajaran Aktif Saat Ini</p>
                 <p className="text-3xl font-black text-indigo-700">{activeTahunAjaran}</p>
              </div>
              <Button onClick={() => setShowTahunModal(true)} className="bg-indigo-600 hover:bg-indigo-700 font-bold">
                 <ArrowUpCircle className="w-4 h-4 mr-2" />
                 Ganti Ke Tahun Ajaran Baru
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
