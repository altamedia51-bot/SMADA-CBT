import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, query, onSnapshot, updateDoc, deleteDoc, serverTimestamp, getDocs, writeBatch, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, UserPlus, Upload, Search, ArrowUpCircle, GraduationCap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/auth.store';
import firebaseConfig from '../../../firebase-applet-config.json';

export default function GuruDataSiswa() {
  const { profile } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [sesi, setSesi] = useState<any[]>([]);
  const [kelasData, setKelasData] = useState<any>(null);
  const [editingSiswa, setEditingSiswa] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [promoTargetName, setPromoTargetName] = useState('');
  const [isLulus, setIsLulus] = useState(false);
  
  const [siswaForm, setSiswaForm] = useState({
    nama: '',
    nis: '',
    jurusan: 'Semua',
    sesiId: '',
    fotoUrl: '',
    password: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile?.waliKelas) return;
    
    // Fetch sesi
    const unsubSesi = onSnapshot(collection(db, 'sesi'), (snap) => {
      setSesi(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const siswaKelasIni = allUsers.filter(u => u.role === 'siswa' && u.kelas === profile.waliKelas);
      setUsers(siswaKelasIni);
    });

    // Fetch kelas target for promotion
    const unsubKelas = onSnapshot(query(collection(db, 'kelas'), where('name', '==', profile.waliKelas)), (snap) => {
        if (!snap.empty) {
            setKelasData({ id: snap.docs[0].id, ...snap.docs[0].data() });
        }
    });

    return () => {
      unsubSesi();
      unsubUsers();
      unsubKelas();
    };
  }, [profile?.waliKelas]);

  const openPromoteDialog = () => {
      if (!kelasData) {
          toast.error('Data kelas tidak ditemukan di master data!');
          return;
      }
      const kelasAsli = profile?.waliKelas || '';
      let lulusStatus = kelasData.tingkat === 12 || kelasAsli.startsWith('XII');
      setIsLulus(lulusStatus);
      
      let initialTarget = kelasAsli;
      if (lulusStatus) {
         initialTarget = kelasAsli.replace('XII', 'X'); 
      } else {
         if (kelasAsli.startsWith('XI ')) {
             initialTarget = kelasAsli.replace('XI', 'XII');
         } else if (kelasAsli.startsWith('X ')) {
             initialTarget = kelasAsli.replace('X', 'XI');
         }
      }
      setPromoTargetName(initialTarget);
      setShowPromoteDialog(true);
  };

  const executePromotion = async () => {
      if (!promoTargetName) {
          toast.error('Nama tujuan tidak boleh kosong!');
          return;
      }
      try {
          // Validation: Check if destination class already exists
          if (promoTargetName !== 'ALUMNI' && promoTargetName !== profile?.waliKelas) {
              const qExistingClass = query(collection(db, 'kelas'), where('name', '==', promoTargetName));
              const snapExisting = await getDocs(qExistingClass);
              if (!snapExisting.empty) {
                  toast.error(`Kelas ${promoTargetName} masih ada! Alur harus berurutan. Harap naikkan/luluskan kelas ${promoTargetName} terlebih dahulu.`);
                  return;
              }
          }

          const batch = writeBatch(db);
          
          let oldKelasName = profile?.waliKelas;
          
          const qSiswa = query(collection(db, 'users'), where('role', '==', 'siswa'), where('kelas', '==', oldKelasName));
          const snapSiswa = await getDocs(qSiswa);
          
          const qGuru = query(collection(db, 'users'), where('role', '==', 'guru'), where('waliKelas', '==', oldKelasName));
          const snapGuru = await getDocs(qGuru);
          
          if (isLulus) {
             snapSiswa.docs.forEach(d => {
                 batch.update(d.ref, { kelas: 'ALUMNI', isActive: false });
             });
             snapGuru.docs.forEach(d => {
                 batch.update(d.ref, { waliKelas: promoTargetName });
             });
             if (kelasData?.id) {
                 batch.update(doc(db, 'kelas', kelasData.id), {
                     name: promoTargetName,
                     tingkat: 10
                 });
             }
          } else {
             let newTingkat = kelasData?.tingkat || 11;
             if (kelasData?.tingkat === 10) newTingkat = 11;
             if (kelasData?.tingkat === 11) newTingkat = 12;

             snapSiswa.docs.forEach(d => {
                 batch.update(d.ref, { kelas: promoTargetName });
             });
             snapGuru.docs.forEach(d => {
                 batch.update(d.ref, { waliKelas: promoTargetName });
             });
             if (kelasData?.id) {
                 batch.update(doc(db, 'kelas', kelasData.id), {
                     name: promoTargetName,
                     tingkat: newTingkat
                 });
             }
          }
          await batch.commit();
          toast.success(isLulus ? 'Kelas lulus dan Wali Kelas dirotasi!' : 'Kelas berhasil dinaikkan!');
          setShowPromoteDialog(false);
          // profile will auto-update if the auth.store fetches continuously, or user must relogin.
          // In most cases, a reload will force new profile state
          setTimeout(() => window.location.reload(), 1500);
      } catch(err:any) {
          toast.error('Gagal melakukan operasi kelas: ' + err.message);
      }
  };

  const saveSiswa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siswaForm.nama || !profile?.waliKelas) {
      toast.error('Mohon isi nama siswa.');
      return;
    }
    
    try {
      if (editingSiswa) {
        await updateDoc(doc(db, 'users', editingSiswa.id), {
          displayName: siswaForm.nama,
          kelas: profile.waliKelas,
          jurusan: siswaForm.jurusan,
          sesiId: siswaForm.sesiId,
          fotoUrl: siswaForm.fotoUrl,
          nis: siswaForm.nis || editingSiswa.nis,
          updatedAt: serverTimestamp()
        });
        toast.success(`Data ${siswaForm.nama} berhasil diperbarui.`);
      } else {
        const rawNis = siswaForm.nis || siswaForm.nama.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 8) + Math.floor(Math.random() * 1000);
        const email = `siswa_${rawNis}@edutest.local`;
        const pass = siswaForm.password || 'siswa123';
        
        const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pass, returnSecureToken: false })
        });
        
        const data = await res.json();
        const uid = res.ok ? data.localId : null;
        
        const docId = uid || `recovered_${siswaForm.nis}`;
        
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'users', docId), {
           uid: uid || docId,
           email,
           displayName: siswaForm.nama,
           role: 'siswa',
           kelas: profile.waliKelas,
           jurusan: siswaForm.jurusan,
           sesiId: siswaForm.sesiId,
           fotoUrl: siswaForm.fotoUrl,
           nis: siswaForm.nis,
           isActive: true,
           createdAt: serverTimestamp()
        }, { merge: true });
        
        toast.success(`Siswa ${siswaForm.nama} berhasil ditambahkan.`);
      }
      setEditingSiswa(null);
      setSiswaForm({ nama: '', nis: '', jurusan: 'Semua', sesiId: '', fotoUrl: '', password: '' });
    } catch (err: any) {
      toast.error('Gagal menyimpan: ' + err.message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) {
      toast.error('Maksimal ukuran foto adalah 200KB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setSiswaForm(prev => ({ ...prev, fotoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const hapusSiswa = async (id: string) => {
    if(confirm('Yakin ingin menghapus siswa ini?')) {
       await deleteDoc(doc(db, 'users', id));
       toast.success('Data siswa dihapus.');
    }
  };

  if (!profile?.waliKelas) {
     return (
        <div className="p-8 text-center text-slate-500 font-medium">
           Anda bukan wali kelas sehingga tidak dapat mengakses halaman ini.
        </div>
     );
  }

  const filteredUsers = users.filter(u => u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || u.nis?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
         <div>
            <h1 className="text-2xl font-bold text-slate-800">Data Siswa - Kelas {profile.waliKelas}</h1>
            <p className="text-sm text-slate-500">Kelola data siswa yang ada di kelas Anda.</p>
         </div>
         <Button onClick={openPromoteDialog} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 px-6 shadow-md shadow-indigo-600/20">
            {profile?.waliKelas?.startsWith('XII') ? <GraduationCap className="w-5 h-5 mr-2" /> : <ArrowUpCircle className="w-5 h-5 mr-2" />}
            {profile?.waliKelas?.startsWith('XII') ? 'Kelulusan Kelas' : 'Naik Kelas'}
         </Button>
      </div>

      <Dialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
         <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
               <DialogTitle className="text-xl font-bold flex items-center gap-2">
                   {isLulus ? <GraduationCap className="w-6 h-6 text-indigo-600" /> : <ArrowUpCircle className="w-6 h-6 text-indigo-600" />}
                   {isLulus ? 'Kelulusan Kelas & Rotasi' : 'Kenaikan Kelas'}
               </DialogTitle>
               <DialogDescription>
                   {isLulus ? (
                       <>Siswa di kelas <b>{profile?.waliKelas}</b> akan diluluskan (dipindah ke LULUS/ALUMNI). Wali Kelas (Anda) dan nama kelas akan berganti menjadi Kelas X baru.</>
                   ) : (
                       <>Siswa dan Wali Kelas <b>{profile?.waliKelas}</b> akan dinaikkan ke tingkat selanjutnya secara bersamaan.</>
                   )}
               </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
               <div className="space-y-2">
                   <label className="text-sm font-bold text-slate-700">
                      {isLulus ? 'Nama Kelas X Tujuan (Untuk Anda):' : 'Nama Kelas Tujuan:'}
                   </label>
                   <Input 
                      value={promoTargetName}
                      onChange={e => setPromoTargetName(e.target.value)}
                      placeholder={isLulus ? "Cth: X MIPA 1" : "Cth: XI MIPA 1"}
                      className="h-11 font-bold text-indigo-700"
                   />
                   <p className="text-xs text-slate-500">
                      {isLulus
                         ? 'Pastikan nama ini belum dipakai oleh kelas lain, atau hapus kelas lama jika konflik.'
                         : 'Nama ini akan diterapkan pada siswa dan data kelas.'
                      }
                   </p>
               </div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setShowPromoteDialog(false)}>Batal</Button>
               <Button onClick={executePromotion} className="bg-indigo-600 hover:bg-indigo-700">
                   Konfirmasi {isLulus ? 'Lulus' : 'Naik'}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="md:col-span-1">
            <Card className="p-5 border border-blue-100 shadow-sm sticky top-6">
               <div className="flex items-center gap-2 text-blue-700 font-bold mb-5 text-sm uppercase tracking-wider">
                  <UserPlus className="w-4 h-4" />
                  <span>{editingSiswa ? 'Edit Siswa' : 'Tambah Siswa'}</span>
               </div>
               
               <form onSubmit={saveSiswa} className="space-y-4">
                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-600">Nama Lengkap</label>
                     <Input 
                        placeholder="NAMA LENGKAP SISWA" 
                        value={siswaForm.nama}
                        onChange={e => setSiswaForm({...siswaForm, nama: e.target.value})}
                        className="uppercase"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">NIS (Opsional)</label>
                        <Input 
                           placeholder="NIS" 
                           value={siswaForm.nis}
                           onChange={e => setSiswaForm({...siswaForm, nis: e.target.value})}
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">Sesi Ujian</label>
                        <Select 
                           value={siswaForm.sesiId} 
                           onValueChange={val => setSiswaForm({...siswaForm, sesiId: val})}
                        >
                           <SelectTrigger>
                             <SelectValue placeholder="PILIH SESI" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="none">Tidak Ada</SelectItem>
                             {sesi.map(s => (
                               <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                             ))}
                           </SelectContent>
                        </Select>
                     </div>
                  </div>

                  <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-600">Foto (Opsional)</label>
                     <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                           {siswaForm.fotoUrl ? (
                              <img src={siswaForm.fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                           ) : (
                              <UserPlus className="w-5 h-5 text-slate-400" />
                           )}
                        </div>
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs h-8">
                           <Upload className="w-3 h-3 mr-1" /> Unggah
                        </Button>
                     </div>
                  </div>

                  {!editingSiswa ? (
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">Password (Opsional)</label>
                        <Input 
                           placeholder="Default: siswa123" 
                           type="password"
                           value={siswaForm.password}
                           onChange={e => setSiswaForm({...siswaForm, password: e.target.value})}
                        />
                     </div>
                  ) : (
                     <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-2">
                         <p className="text-xs text-amber-600 font-medium leading-tight">
                           Password keamanan tidak dapat diubah via admin. Jika terjadi kendala login, harap hapus data siswa dan buat ulang.
                         </p>
                     </div>
                  )}

                  <div className="pt-2 flex gap-2">
                     <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">Simpan</Button>
                     {editingSiswa && (
                        <Button type="button" variant="outline" onClick={() => {
                           setEditingSiswa(null);
                           setSiswaForm({ nama: '', nis: '', jurusan: 'Semua', sesiId: '', fotoUrl: '', password: '' });
                        }}>Batal</Button>
                     )}
                  </div>
               </form>
            </Card>
         </div>

         <div className="md:col-span-2">
            <Card className="overflow-hidden">
               <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                  <div className="relative flex-1 max-w-sm">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                     <Input 
                        placeholder="Cari nama atau NIS..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-9 h-9 text-sm"
                     />
                  </div>
                  <div className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-md border border-slate-200">
                     TOTAL: {users.length} SISWA
                  </div>
               </div>
               
               <Table>
                  <TableHeader>
                     <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead>Siswa</TableHead>
                        <TableHead>Sesi Ujian</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {filteredUsers.length === 0 ? (
                        <TableRow>
                           <TableCell colSpan={3} className="text-center py-8 text-slate-500 font-medium">
                              Tidak ada data siswa ditemukan.
                           </TableCell>
                        </TableRow>
                     ) : (
                        filteredUsers.map(u => {
                           const sesiNama = sesi.find(s => s.id === u.sesiId)?.name || 'Belum diatur';
                           return (
                              <TableRow key={u.id}>
                                 <TableCell>
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold overflow-hidden shrink-0 border border-blue-200">
                                          {u.fotoUrl ? (
                                             <img src={u.fotoUrl} alt="" className="w-full h-full object-cover" />
                                          ) : u.displayName.charAt(0).toUpperCase()}
                                       </div>
                                       <div>
                                          <p className="font-bold text-slate-700 leading-none">{u.displayName}</p>
                                          <p className="text-xs text-slate-500 mt-1 font-mono">{u.nis || 'TANPA NIS'}</p>
                                       </div>
                                    </div>
                                 </TableCell>
                                 <TableCell>
                                    <span className="inline-flex py-1 px-2.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 max-w-[150px] truncate">
                                       {sesiNama}
                                    </span>
                                 </TableCell>
                                 <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                       <Button variant="ghost" size="icon" onClick={() => {
                                          setEditingSiswa(u);
                                          setSiswaForm({
                                             nama: u.displayName,
                                             nis: u.nis || '',
                                             jurusan: u.jurusan || 'Semua',
                                             sesiId: u.sesiId || '',
                                             fotoUrl: u.fotoUrl || '',
                                             password: ''
                                          });
                                       }} className="text-blue-500 h-8 w-8 hover:bg-blue-50">
                                          <Pencil className="w-4 h-4" />
                                       </Button>
                                       <Button variant="ghost" size="icon" onClick={() => hapusSiswa(u.id)} className="text-rose-500 h-8 w-8 hover:bg-rose-50">
                                          <Trash2 className="w-4 h-4" />
                                       </Button>
                                    </div>
                                 </TableCell>
                              </TableRow>
                           )
                        })
                     )}
                  </TableBody>
               </Table>
            </Card>
         </div>
      </div>
    </div>
  );
}
