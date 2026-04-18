import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, AlertCircle, Upload, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import firebaseConfig from '../../../firebase-applet-config.json';

export default function AdminMasterData() {
  const [mapel, setMapel] = useState<any[]>([]);
  const [kelas, setKelas] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

        for (const row of rows) {
          const rawUsername = row.username || row.nis || row.nip;
          const password = row.password;
          const name = row.nama || row.name;
          const roleRaw = (row.role || 'siswa').toLowerCase();
          
          if (!rawUsername || !password || !name) {
            failCount++;
            continue;
          }

          const role = ['admin', 'guru', 'siswa'].includes(roleRaw) ? roleRaw : 'siswa';
          const email = `${rawUsername.toLowerCase().trim()}@edutest.local`;

          try {
            // Create user securely via REST API so it doesn't log the admin out!
            const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password, returnSecureToken: false })
            });

            const data = await res.json();
            
            if (!res.ok) {
              if (data.error?.message === 'EMAIL_EXISTS') {
                // If exists, skip (or update in future)
                failCount++;
              } else {
                failCount++;
                console.error("Firebase Auth REST Error:", data.error);
              }
              continue;
            }

            const uid = data.localId;

            // Save to users collection
            await updateDoc(doc(db, 'users', uid), { 
              uid, 
              email, 
              displayName: name, 
              role,
              isActive: true,
              createdAt: serverTimestamp() 
            }).catch(async () => {
              // Create if doc doesn't exist
              const { setDoc } = await import('firebase/firestore');
              await setDoc(doc(db, 'users', uid), {
                uid, 
                email, 
                displayName: name, 
                role,
                isActive: true,
                createdAt: serverTimestamp() 
              });
            });

            successCount++;
          } catch (err) {
            console.error('Import error for row:', row, err);
            failCount++;
          }
        }

        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        toast.success(`Import selesai! ${successCount} berhasil ditambahkan, ${failCount} gagal/dilewati.`);
      },
      error: (error) => {
        setIsImporting(false);
        toast.error('Gagal membaca file CSV: ' + error.message);
      }
    });
  };

  const downloadTemplate = () => {
    const csvContent = "username,password,nama,role\n12345,rahasia123,Siswa Coba,siswa\nguru01,gururaha456,Bapak Guru,guru";
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

      <Tabs defaultValue="pengguna" className="w-full">
        <TabsList className="grid w-full max-w-3xl grid-cols-3 mb-6">
          <TabsTrigger value="pengguna">Data Pengguna (Siswa/Guru)</TabsTrigger>
          <TabsTrigger value="mapel">Mata Pelajaran</TabsTrigger>
          <TabsTrigger value="kelas">Data Kelas</TabsTrigger>
        </TabsList>

        <TabsContent value="pengguna" className="space-y-6">
          <Card className="p-6 bg-card flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div>
              <h3 className="font-semibold mb-2">Impor Pengguna (Siswa & Guru)</h3>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Unggah file CSV dengan kolom <code className="bg-slate-100 p-1 rounded">username, password, nama, role</code> untuk memasukkan data siswa dan guru sekaligus. Fitur ini menggunakan format Username dan Password lokal.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Template CSV
              </Button>
              <div className="relative">
                <Input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  disabled={isImporting}
                />
                <Button onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                  {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  {isImporting ? 'Mengimpor...' : 'Unggah CSV'}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nama Pengguna</TableHead>
                  <TableHead>Username / Email Internal</TableHead>
                  <TableHead>Peran Sistem (Role)</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Belum ada pengguna tercatat.</TableCell></TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-semibold">{u.displayName}</TableCell>
                      <TableCell>{u.email.replace('@edutest.local', '')} <span className="text-xs text-muted-foreground">({u.email})</span></TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                          u.role === 'admin' ? 'bg-red-100 text-red-700' : 
                          u.role === 'guru' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {u.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={(val) => ubahRole(u.id, val)}>
                          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="siswa">Siswa</SelectItem>
                            <SelectItem value="guru">Guru</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
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
          <Card className="p-6 bg-card">
            <h3 className="font-semibold mb-4">Tambah Kelas</h3>
            <form onSubmit={tanganiTambahKelas} className="flex flex-wrap gap-4 items-end">
              <div className="grid gap-2 flex-1 min-w-[200px]">
                <label className="text-sm font-medium">Nama Kelas Lengkap</label>
                <Input value={newKelasName} onChange={e => setNewKelasName(e.target.value)} placeholder="Contoh: XII IPA 1 / XII RPL 2" />
              </div>
              <div className="grid gap-2 w-32">
                <label className="text-sm font-medium">Jenjang</label>
                <Select value={jenjangKelas} onValueChange={setJenjangKelas}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SD">SD</SelectItem>
                    <SelectItem value="SMP">SMP</SelectItem>
                    <SelectItem value="SMA">SMA</SelectItem>
                    <SelectItem value="SMK">SMK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 w-32">
                <label className="text-sm font-medium">Tingkat</label>
                <Input type="number" value={tingkatKelas} onChange={e => setTingkatKelas(parseInt(e.target.value))} min={1} max={12} />
              </div>
              <Button type="submit">Tambah Kelas</Button>
            </form>
          </Card>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Nama Kelas</TableHead>
                  <TableHead>Jenjang</TableHead>
                  <TableHead>Tingkat</TableHead>
                  <TableHead className="w-[100px] text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kelas.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Belum ada data kelas tercatat.</TableCell></TableRow>
                ) : (
                  kelas.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-semibold">{k.name}</TableCell>
                      <TableCell>{k.jenjang}</TableCell>
                      <TableCell>Kelas {k.tingkat}</TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" onClick={() => hapusData('kelas', k.id)} className="text-destructive hover:bg-destructive/10">
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
      </Tabs>
    </div>
  );
}
