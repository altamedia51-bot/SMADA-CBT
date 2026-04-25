import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, AlertCircle, Upload, Loader2, Download, UserPlus, UserCircle, Pencil, Plus, FileSpreadsheet, CloudUpload, Hash } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import firebaseConfig from '../../../firebase-applet-config.json';

export default function AdminMasterData() {
  const [mapel, setMapel] = useState<any[]>([]);
  const [kelas, setKelas] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Student Form State
  const [editingSiswa, setEditingSiswa] = useState<any>(null);
  const [siswaForm, setSiswaForm] = useState({
    nama: '',
    kelas: '',
    nis: '',
    password: ''
  });
  
  // Guru Form State
  const [editingGuru, setEditingGuru] = useState<any>(null);
  const [guruForm, setGuruForm] = useState({
    nama: '',
    nip: '',
    password: ''
  });

  const [newMapelPrefix, setNewMapelPrefix] = useState('');
  const [jenjangMapel, setJenjangMapel] = useState('SMA');
  const [newKelasName, setNewKelasName] = useState('');
  const [jenjangKelas, setJenjangKelas] = useState('SMA');
  const [tingkatKelas, setTingkatKelas] = useState(10);
  
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Realtime Listeners
  useEffect(() => {
    const qMapel = query(collection(db, 'mapel'));
    const unMapel = onSnapshot(qMapel, (snap) => {
      setMapel(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qKelas = query(collection(db, 'kelas'));
    const unKelas = onSnapshot(qKelas, (snap) => {
      setKelas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qUsers = query(collection(db, 'users'));
    const unUsers = onSnapshot(qUsers, (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unMapel(); unKelas(); unUsers(); };
  }, []);

  const tanganiTambahMapel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMapelPrefix) return;
    try {
      await addDoc(collection(db, 'mapel'), {
        name: newMapelPrefix,
        jenjang: jenjangMapel
      });
      setNewMapelPrefix('');
      toast('Berhasil!', { description: `Mapel ${newMapelPrefix} berhasil ditambah.`, icon: <AlertCircle className="w-4 h-4" /> });
    } catch (err: any) {
      toast.error('Gagal menambahkan data: ' + err.message);
    }
  };

  const tanganiTambahKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKelasName) return;
    try {
      await addDoc(collection(db, 'kelas'), {
        name: newKelasName,
        jenjang: jenjangKelas,
        tingkat: parseInt(tingkatKelas as any)
      });
      setNewKelasName('');
      toast('Berhasil!', { description: `Kelas ${newKelasName} berhasil ditambah.` });
    } catch (err: any) {
      toast.error('Gagal menambahkan data: ' + err.message);
    }
  };

  // --- Student Management Functions ---
  const saveSiswa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siswaForm.nama || !siswaForm.kelas) {
      toast.error('Mohon isi Nama dan Kelas');
      return;
    }

    try {
      if (editingSiswa) {
        // Update
        await updateDoc(doc(db, 'users', editingSiswa.id), {
          displayName: siswaForm.nama,
          kelas: siswaForm.kelas,
          nis: siswaForm.nis || editingSiswa.nis,
          updatedAt: serverTimestamp()
        });
        toast.success(`Data ${siswaForm.nama} berhasil diperbarui.`);
      } else {
        // Create new
        const rawNis = siswaForm.nis || siswaForm.nama.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 8) + Math.floor(Math.random() * 1000);
        const email = `${rawNis}@edutest.local`;
        const pass = siswaForm.password || 'siswa123';
        
        // Use the manual registration method to avoid logging out
        const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pass, returnSecureToken: false })
        });
        const data = await res.json();
        
        if (!res.ok && data.error?.message !== 'EMAIL_EXISTS' && data.error?.message !== 'TOO_MANY_ATTEMPTS_TRY_LATER') throw new Error(data.error?.message || 'Gagal registrasi Auth');
        
        const uid = res.ok ? data.localId : null;
        const docId = uid || `recovered_${siswaForm.nis}`;
        
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'users', docId), {
          uid: uid, // will be null if EMAIL_EXISTS, recovered on login
          email,
          displayName: siswaForm.nama,
          role: 'siswa',
          kelas: siswaForm.kelas,
          nis: siswaForm.nis,
          isActive: true,
          createdAt: serverTimestamp()
        }, { merge: true });
        
        const message = res.ok 
          ? `Siswa ${siswaForm.nama} berhasil ditambahkan.` 
          : `Siswa ${siswaForm.nama} dipulihkan dari database keamanan.`;
        toast.success(message);
      }
      
      resetSiswaForm();
    } catch (err: any) {
      toast.error('Kesalahan: ' + err.message);
    }
  };

  const resetSiswaForm = () => {
    setEditingSiswa(null);
    setSiswaForm({ nama: '', kelas: '', nis: '', password: '' });
  };

  const editSiswaAction = (siswa: any) => {
    setEditingSiswa(siswa);
    setSiswaForm({
      nama: siswa.displayName || '',
      kelas: siswa.kelas || '',
      nis: siswa.nis || '',
      password: '' // Don't show password
    });
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const generateSiswaContoh = async () => {
    if (!confirm("Generate 5 siswa contoh untuk testing?")) return;
    setIsImporting(true);
    const contoh = [
      { nama: 'ALFY NUR ASHIFAK', nis: '1001', kelas: 'XE1' },
      { nama: 'ALIFIA NASWA HAFIDHOH', nis: '1002', kelas: 'XE1' },
      { nama: 'ARINA MANASIKANA', nis: '1003', kelas: 'XE1' },
      { nama: 'ADIT SOPO', nis: '2001', kelas: 'XE2' },
      { nama: 'AISYAH NIRMALA PUTRI TOIRINA', nis: '2002', kelas: 'XE2' },
    ];

    for (const s of contoh) {
      try {
        const email = `${s.nis}@edutest.local`;
        const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'password123', returnSecureToken: false })
        });
        const data = await res.json();
        if (res.ok) {
          const uid = data.localId;
          const { setDoc } = await import('firebase/firestore');
          await setDoc(doc(db, 'users', uid), {
            uid, email, displayName: s.nama, role: 'siswa', kelas: s.kelas, nis: s.nis, isActive: true, createdAt: serverTimestamp()
          }, { merge: true });
        }
      } catch (err) {}
    }
    setIsImporting(false);
    toast.success("5 Siswa contoh berhasil di-generate.");
  };

  // Manage Guru logic
  const saveGuru = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guruForm.nama || !guruForm.nip) {
      toast.error('Mohon isi Nama and NIP');
      return;
    }
    try {
      if (editingGuru) {
        await updateDoc(doc(db, 'users', editingGuru.id), {
          displayName: guruForm.nama,
          nip: guruForm.nip,
          updatedAt: serverTimestamp()
        });
        toast.success(`Data guru ${guruForm.nama} diperbarui.`);
      } else {
        const email = `guru_${guruForm.nip}@edutest.local`;
        const pass = guruForm.password || 'guru123';
        const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pass, returnSecureToken: false })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Gagal registrasi Guru');
        const uid = data.localId;
        const { setDoc } = await import('firebase/firestore');
        await setDoc(doc(db, 'users', uid), {
          uid, email, displayName: guruForm.nama, role: 'guru', nip: guruForm.nip, isActive: true, createdAt: serverTimestamp()
        }, { merge: true });
        toast.success(`Guru ${guruForm.nama} ditambahkan.`);
      }
      setEditingGuru(null);
      setGuruForm({ nama: '', nip: '', password: '' });
    } catch (err: any) {
      toast.error('Eror: ' + err.message);
    }
  };

  const hapusData = async (collectionName: string, id: string) => {
    if(!confirm("Yakin hapus data ini?")) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
      toast('Dihapus', { description: `Data berhasil dihapus dari ${collectionName}` });
    } catch (err: any) {
      toast.error('Gagal hapus: ' + err.message);
    }
  };

  const ubahRole = async (userId: string, targetRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: targetRole });
      toast.success(`Role pengguna berhasil diubah menjadi ${targetRole}`);
    } catch (err: any) {
      toast.error('Gagal mengubah role: ' + err.message);
    }
  };

  const handleSiswaFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        let successCount = 0;
        let failCount = 0;
        let lastError = "";

        for (const row of rows) {
          // Robust key searching
          const findVal = (keys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const k of rowKeys) {
              const cleanK = k.toLowerCase().trim();
              if (keys.some(searchKey => cleanK === searchKey.toLowerCase())) {
                return row[k];
              }
            }
            return null;
          };

          const name = findVal(['Nama', 'nama', 'name', 'DisplayName']);
          const classRoom = findVal(['Kelas', 'kelas', 'class', 'ClassRoom']);
          const password = findVal(['Password', 'password', 'pass', 'PIN']) || 'siswa123';
          
          let rawNis = findVal(['NIS', 'nis', 'username', 'ID', 'no_induk']);
          
          // Generate NIS if missing
          if (!rawNis && name) {
            rawNis = name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 8) + Math.floor(Math.random() * 1000);
          }
          
          if (!name || !classRoom || !rawNis) {
            console.warn("Skipping row due to missing data:", { name, classRoom, rawNis });
            lastError = `Ada baris dengan data tidak lengkap. Cek kolom Nama dan Kelas.`;
            failCount++;
            continue;
          }

          const email = `${rawNis.toString().toLowerCase().trim()}@edutest.local`;

          try {
            const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password, returnSecureToken: false })
            });

            const data = await res.json();
            
            if (res.ok || data.error?.message === 'EMAIL_EXISTS' || data.error?.message === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
              const { setDoc } = await import('firebase/firestore');
              
              if (res.ok) {
                const newUid = data.localId;
                await setDoc(doc(db, 'users', newUid), {
                  uid: newUid,
                  email,
                  displayName: name,
                  role: 'siswa',
                  kelas: classRoom,
                  nis: rawNis.toString(),
                  isActive: true,
                  createdAt: serverTimestamp()
                }, { merge: true });
                successCount++;
              } else {
                const fallbackDocId = `recovered_${rawNis}`;
                await setDoc(doc(db, 'users', fallbackDocId), {
                  uid: null,
                  email,
                  displayName: name,
                  role: 'siswa',
                  kelas: classRoom,
                  nis: rawNis.toString(),
                  isActive: true,
                  createdAt: serverTimestamp()
                }, { merge: true });
                successCount++;
                if (data.error?.message === 'TOO_MANY_ATTEMPTS_TRY_LATER' && !lastError.includes('Firebase')) {
                  lastError = 'Limit Firebase (100 akun/jam) tercapai. Data Database tersimpan & Siswa yang sudah terdaftar tadi akan tetap bisa login dengan akun yang sama.';
                }
              }
            } else {
              console.error("Auth creation failed:", data.error?.message);
              lastError = data.error?.message || 'Auth API failed';
              failCount++;
            }
          } catch (err: any) {
            console.error("Import error for row:", name, err);
            lastError = err.message || 'Firestore API failed';
            failCount++;
          }
        }

        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (failCount > 0) {
          toast.error(`Import Siswa selesai: ${successCount} berhasil, ${failCount} gagal. Pesan error: ${lastError}`, { duration: 10000 });
        } else {
          toast.success(`Import Siswa selesai: ${successCount} berhasil.`);
        }
      }
    });
  };

  const downloadTemplate = () => {
    const csvContent = "Nama,Kelas,Password\nALFY NUR ASHIFAK,XE1,siswa123\nALIFIA NASWA HAFIDHOH,XE1,siswa123";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_pengguna.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Manajemen Master Data</h2>
        <p className="text-muted-foreground text-sm mt-1">Mengelola relasi infrastruktur dan entitas sekolah.</p>
      </div>

      <Tabs defaultValue="siswa" className="w-full">
        <TabsList className="grid w-full max-w-4xl grid-cols-4 mb-6">
          <TabsTrigger value="siswa">Data Siswa</TabsTrigger>
          <TabsTrigger value="guru">Data Guru</TabsTrigger>
          <TabsTrigger value="mapel">Mata Pelajaran</TabsTrigger>
          <TabsTrigger value="kelas">Data Kelas</TabsTrigger>
        </TabsList>

        {/* --- TABS: DATA SISWA --- */}
        <TabsContent value="siswa" className="space-y-8">
          {/* Section: Edit/Tambah Siswa */}
          <Card className="p-0 border border-emerald-100 overflow-hidden shadow-sm">
            <div className="bg-white p-4 border-b flex justify-between items-center">
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <UserPlus className="w-5 h-5" />
                <span>{editingSiswa ? 'Edit Siswa' : 'Tambah Siswa Baru'}</span>
              </div>
              <div className="flex gap-2">
                <Input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleSiswaFileUpload}
                  disabled={isImporting}
                />
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="h-8 border-slate-200 text-slate-600 bg-slate-50">
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Template
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-8 border-blue-200 text-blue-600 bg-blue-50">
                  <CloudUpload className="w-3.5 h-3.5 mr-1.5" /> Upload CSV
                </Button>
                <Button variant="outline" size="sm" onClick={generateSiswaContoh} className="h-8 border-emerald-200 text-emerald-600 bg-emerald-50">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Generate Siswa Contoh
                </Button>
              </div>
            </div>
            
            <form onSubmit={saveSiswa} className="p-6 space-y-4">
              <div className="flex gap-4">
                <Input 
                  placeholder="NAMA LENGKAP SISWA" 
                  className="flex-1 uppercase font-medium h-11"
                  value={siswaForm.nama}
                  onChange={e => setSiswaForm({...siswaForm, nama: e.target.value})}
                />
                <Select 
                  value={siswaForm.kelas} 
                  onValueChange={val => setSiswaForm({...siswaForm, kelas: val})}
                >
                  <SelectTrigger className="w-40 h-11 font-medium bg-white">
                    <SelectValue placeholder="PILIH KELAS" />
                  </SelectTrigger>
                  <SelectContent>
                    {kelas.sort((a,b) => a.name.localeCompare(b.name)).map(k => (
                      <SelectItem key={k.id} value={k.name}>{k.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Input 
                placeholder="NIS / NOMOR INDUK SISWA (OPSIONAL)" 
                className="h-11 font-mono"
                value={siswaForm.nis}
                onChange={e => setSiswaForm({...siswaForm, nis: e.target.value})}
              />
              
              {!editingSiswa && (
                <Input 
                  type="password"
                  placeholder="PASSWORD (OPSIONAL, DEFAULT: siswa123)" 
                  className="h-11"
                  value={siswaForm.password}
                  onChange={e => setSiswaForm({...siswaForm, password: e.target.value})}
                />
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-sm">
                   Simpan
                </Button>
                {editingSiswa && (
                  <Button type="button" variant="outline" onClick={resetSiswaForm} className="h-11 px-8 border-slate-300 text-slate-600 font-medium">
                    Batal
                  </Button>
                )}
              </div>
              
              <p className="text-[11px] text-slate-400 italic">
                Tip: Untuk upload banyak, gunakan file CSV dengan format: <b>Nama, Kelas, Password(opsional)</b>.
              </p>
            </form>
          </Card>

          {/* Section: Database Siswa */}
          <div className="space-y-4">
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">
              Database Siswa <span className="text-sm font-normal text-slate-400 ml-2">(Klik nama untuk lihat profil)</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Group students by class */}
              {Array.from(new Set(users.filter(u => u.role === 'siswa' && u.kelas).map(u => u.kelas))).sort().map(className => {
                const studentsInClass = users.filter(u => u.role === 'siswa' && u.kelas === className).sort((a,b) => a.displayName.localeCompare(b.displayName));
                return (
                  <Card key={className as string} className="p-0 border border-slate-200 shadow-sm flex flex-col max-h-[350px]">
                    <div className="p-4 bg-slate-50/50 border-b flex justify-between items-center sticky top-0 z-10">
                      <span className="font-black text-lg text-slate-800">{className as string}</span>
                      <span className="bg-white border text-[11px] font-bold px-2 py-0.5 rounded shadow-sm text-slate-500">
                        {studentsInClass.length}
                      </span>
                    </div>
                    <div className="overflow-y-auto flex-1 p-0 custom-scrollbar">
                      <div className="divide-y">
                        {studentsInClass.map((student, idx) => (
                          <div key={student.id} className="flex items-center justify-between p-3 hover:bg-emerald-50/30 group transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <span className="text-xs font-medium text-slate-400 w-4">{idx + 1}.</span>
                              <span className="text-sm font-bold text-slate-700 truncate cursor-pointer hover:text-emerald-600 transition-colors">
                                {student.displayName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                onClick={() => editSiswaAction(student)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                onClick={() => hapusData('users', student.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
              
              {/* Empty state if no students by class findable */}
              {users.filter(u => u.role === 'siswa').length === 0 && (
                <div className="md:col-span-2 py-12 text-center bg-slate-50 rounded-xl border border-dashed text-slate-400">
                  <UserCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>Belum ada data siswa. Gunakan form di atas atau upload CSV.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* --- TABS: DATA GURU --- */}
        <TabsContent value="guru" className="space-y-6">
          <Card className="p-6 border border-blue-100 shadow-sm">
             <div className="flex items-center gap-2 text-blue-700 font-bold mb-6">
                <UserPlus className="w-5 h-5" />
                <span>{editingGuru ? 'Edit Guru' : 'Tambah Guru Baru'}</span>
              </div>
              <form onSubmit={saveGuru} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  placeholder="NAMA LENGKAP GURU" 
                  className="uppercase font-medium"
                  value={guruForm.nama}
                  onChange={e => setGuruForm({...guruForm, nama: e.target.value})}
                />
                <Input 
                  placeholder="NIP / ID PEGAWAI" 
                  value={guruForm.nip}
                  onChange={e => setGuruForm({...guruForm, nip: e.target.value})}
                />
                {!editingGuru && (
                  <Input 
                     type="password"
                     placeholder="PASSWORD LOGIN" 
                     value={guruForm.password}
                     onChange={e => setGuruForm({...guruForm, password: e.target.value})}
                  />
                )}
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-10">
                    Simpan Data Guru
                  </Button>
                  {editingGuru && (
                    <Button type="button" variant="outline" onClick={() => { setEditingGuru(null); setGuruForm({nama:'', nip:'', password:''}); }} className="h-10">
                      Batal
                    </Button>
                  )}
                </div>
              </form>
          </Card>

          <Card className="overflow-hidden border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Nama Guru</TableHead>
                  <TableHead>NIP / Username</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.filter(u => u.role === 'guru').length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-10 text-slate-400">Belum ada data guru.</TableCell></TableRow>
                ) : (
                  users.filter(u => u.role === 'guru').map(g => (
                    <TableRow key={g.id}>
                      <TableCell className="font-bold text-slate-700">{g.displayName}</TableCell>
                      <TableCell className="font-mono text-xs">{g.nip || g.email.split('@')[0]}</TableCell>
                      <TableCell className="flex justify-end gap-1">
                         <Button variant="ghost" size="sm" onClick={() => { setEditingGuru(g); setGuruForm({nama:g.displayName, nip:g.nip||'', password:''}); }} className="text-blue-500">
                           <Pencil className="w-4 h-4" />
                         </Button>
                         <Button variant="ghost" size="sm" onClick={() => hapusData('users', g.id)} className="text-rose-500">
                           <Trash2 className="w-4 h-4" />
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="mapel" className="space-y-6">
          <Card className="p-6 bg-card">
            <h3 className="font-semibold mb-4">Tambah Mata Pelajaran</h3>
            <form onSubmit={tanganiTambahMapel} className="flex gap-4 items-end">
              <div className="grid gap-2 flex-1">
                <label className="text-sm font-medium">Nama Mapel</label>
                <Input value={newMapelPrefix} onChange={e => setNewMapelPrefix(e.target.value)} placeholder="Contoh: Matematika Peminatan" />
              </div>
              <div className="grid gap-2 w-48">
                <label className="text-sm font-medium">Jenjang</label>
                <Select value={jenjangMapel} onValueChange={setJenjangMapel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SD">SD</SelectItem>
                    <SelectItem value="SMP">SMP</SelectItem>
                    <SelectItem value="SMA">SMA</SelectItem>
                    <SelectItem value="SMK">SMK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit">Simpan Mapel</Button>
            </form>
          </Card>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Mata Pelajaran</TableHead>
                  <TableHead>Jenjang</TableHead>
                  <TableHead className="w-[100px] text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mapel.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Belum ada data mapel tercatat.</TableCell></TableRow>
                ) : (
                  mapel.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-semibold">{m.name}</TableCell>
                      <TableCell>{m.jenjang}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" onClick={() => hapusData('mapel', m.id)} className="text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="kelas" className="space-y-6">
          <Card className="p-0 border border-indigo-100 overflow-hidden shadow-sm">
            <div className="bg-indigo-50/50 p-4 border-b flex items-center gap-2 text-indigo-700 font-bold">
              <Plus className="w-5 h-5" />
              <span>Kelola Kelas</span>
            </div>
            <form onSubmit={tanganiTambahKelas} className="p-6 flex flex-wrap gap-4 items-end bg-white">
              <div className="grid gap-1.5 flex-1 min-w-[240px]">
                <label className="text-xs font-bold text-slate-500 ml-1">NAMA KELAS LENGKAP</label>
                <Input 
                  value={newKelasName} 
                  onChange={e => setNewKelasName(e.target.value)} 
                  placeholder="Contoh: XII IPA 1 / XII RPL 2" 
                  className="h-10 border-slate-200"
                />
              </div>
              <div className="grid gap-1.5 w-32">
                <label className="text-xs font-bold text-slate-500 ml-1">JENJANG</label>
                <Select value={jenjangKelas} onValueChange={setJenjangKelas}>
                  <SelectTrigger className="h-10 border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SD">SD</SelectItem>
                    <SelectItem value="SMP">SMP</SelectItem>
                    <SelectItem value="SMA">SMA</SelectItem>
                    <SelectItem value="SMK">SMK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5 w-24">
                <label className="text-xs font-bold text-slate-500 ml-1">TINGKAT</label>
                <Input 
                  type="number" 
                  value={tingkatKelas} 
                  onChange={e => setTingkatKelas(parseInt(e.target.value))} 
                  min={1} max={12} 
                  className="h-10 border-slate-200 text-center font-bold"
                />
              </div>
              <Button type="submit" className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all">
                Tambah Kelas
              </Button>
            </form>
          </Card>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Database Kelas</h3>
            </div>

            {kelas.length === 0 ? (
              <Card className="py-20 text-center border-dashed border-2 bg-slate-50/50 flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                  <Hash className="w-8 h-8" />
                </div>
                <p className="text-slate-500 font-medium">Belum ada data kelas yang tercatat</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {kelas.sort((a,b) => a.name.localeCompare(b.name)).map((k) => {
                  const studentCount = users.filter(u => u.role === 'siswa' && u.kelas === k.name).length;
                  return (
                    <Card key={k.id} className="p-4 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group relative">
                      <div className="flex flex-col space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded tracking-wider">
                            {k.jenjang} - KLS {k.tingkat}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => hapusData('kelas', k.id)} 
                            className="h-7 w-7 p-0 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <h4 className="text-xl font-black text-slate-800 truncate" title={k.name}>
                          {k.name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                          <UserCircle className="w-3.5 h-3.5" />
                          <span>{studentCount} Siswa Terdaftar</span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
