import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, AlertCircle, Upload, Loader2, Download, UserPlus, UserCircle, Pencil, Plus, FileSpreadsheet, CloudUpload, Hash } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import firebaseConfig from '../../../firebase-applet-config.json';

export default function AdminMasterData() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isAdministrasi = location.pathname.includes('/administrasi');
  const currentTab = searchParams.get('tab') || (isAdministrasi ? 'siswa' : 'ruang');

  const [mapel, setMapel] = useState<any[]>([]);
  const [kelas, setKelas] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [ruang, setRuang] = useState<any[]>([]);
  const [sesi, setSesi] = useState<any[]>([]);
  const [jenisUjian, setJenisUjian] = useState<any[]>([]);

  // Form states
  const [newRuangKode, setNewRuangKode] = useState('');
  const [newRuangName, setNewRuangName] = useState('');
  const [newSesiKode, setNewSesiKode] = useState('');
  const [newSesiName, setNewSesiName] = useState('');
  const [newJenisUjianKode, setNewJenisUjianKode] = useState('');
  const [newJenisUjianName, setNewJenisUjianName] = useState('');
  
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
    password: '',
    nomorWa: ''
  });

  // Visibility states
  const [showFormKelas, setShowFormKelas] = useState(false);
  const [showFormRuang, setShowFormRuang] = useState(false);
  const [showFormSesi, setShowFormSesi] = useState(false);
  const [showFormJenis, setShowFormJenis] = useState(false);

  const [newMapelPrefix, setNewMapelPrefix] = useState('');
  const [jenjangMapel, setJenjangMapel] = useState('SMA');
  const [newKelasName, setNewKelasName] = useState('');
  const [jenjangKelas, setJenjangKelas] = useState('SMA');
  const [tingkatKelas, setTingkatKelas] = useState(10);
  const [waliKelas, setWaliKelas] = useState('');
  const [editingKelas, setEditingKelas] = useState<any>(null);
  
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

    const qRuang = query(collection(db, 'ruang'));
    const unRuang = onSnapshot(qRuang, (snap) => {
      setRuang(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qSesi = query(collection(db, 'sesi'));
    const unSesi = onSnapshot(qSesi, (snap) => {
      setSesi(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qJenisUjian = query(collection(db, 'jenis_ujian'));
    const unJenisUjian = onSnapshot(qJenisUjian, (snap) => {
      setJenisUjian(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unMapel(); unKelas(); unUsers(); unRuang(); unSesi(); unJenisUjian(); };
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

  const tanganiTambahRuang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuangName) return;
    try {
      await addDoc(collection(db, 'ruang'), {
        kode: newRuangKode,
        name: newRuangName,
        createdAt: serverTimestamp()
      });
      setNewRuangKode('');
      setNewRuangName('');
      toast.success('Ruang berhasil ditambahkan');
    } catch (err: any) {
      toast.error('Gagal menambah ruang: ' + err.message);
    }
  };

  const tanganiTambahSesi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSesiName) return;
    try {
      await addDoc(collection(db, 'sesi'), {
        kode: newSesiKode,
        name: newSesiName,
        createdAt: serverTimestamp()
      });
      setNewSesiKode('');
      setNewSesiName('');
      toast.success('Sesi berhasil ditambahkan');
    } catch (err: any) {
      toast.error('Gagal menambah sesi: ' + err.message);
    }
  };

  const tanganiTambahJenisUjian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJenisUjianName) return;
    try {
      await addDoc(collection(db, 'jenis_ujian'), {
        kode: newJenisUjianKode,
        name: newJenisUjianName,
        createdAt: serverTimestamp()
      });
      setNewJenisUjianKode('');
      setNewJenisUjianName('');
      toast.success('Jenis Ujian berhasil ditambahkan');
    } catch (err: any) {
      toast.error('Gagal menambah jenis ujian: ' + err.message);
    }
  };

  const handleDownloadTemplateKelas = () => {
    const csvContent = "NAMA_KELAS,JENJANG,TINGKAT\nXII IPA 1,SMA,12\nXII IPS 1,SMA,12";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_kelas.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fileInputRefKelas = useRef<HTMLInputElement>(null);

  const handleKelasFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          const findVal = (keys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const k of rowKeys) {
              const cleanK = k.toLowerCase().trim();
              if (keys.some(searchKey => cleanK === searchKey.toLowerCase())) {
                return row[k];
              }
            }
            return '';
          };

          const namaKelas = findVal(['nama', 'kelas', 'nama_kelas', 'nama kelas']);
          const jenjang = findVal(['jenjang']) || 'SMA';
          const tingkat = parseInt(findVal(['tingkat'])) || 10;

          if (namaKelas) {
             try {
               await addDoc(collection(db, 'kelas'), {
                 name: namaKelas,
                 jenjang,
                 tingkat,
                 createdAt: serverTimestamp()
               });
               successCount++;
             } catch (e) {
               failCount++;
             }
          } else {
             failCount++;
          }
        }

        setIsImporting(false);
        if (successCount > 0) {
          toast.success(`Berhasil mengimpor ${successCount} kelas.`);
        }
        if (failCount > 0) {
          toast.error(`Gagal mengimpor ${failCount} baris data (format tidak valid).`);
        }
        
        // Reset file input
        e.target.value = '';
      },
      error: (error) => {
        setIsImporting(false);
        toast.error("Gagal membaca file CSV: " + error.message);
      }
    });
  };

  const tanganiTambahKelas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKelasName) return;
    try {
      if (editingKelas) {
        await updateDoc(doc(db, 'kelas', editingKelas.id), {
          name: newKelasName,
          jenjang: jenjangKelas,
          tingkat: parseInt(tingkatKelas as any),
          waliKelas: waliKelas
        });
        toast.success(`Data kelas ${newKelasName} berhasil diperbarui.`);
        setEditingKelas(null);
      } else {
        await addDoc(collection(db, 'kelas'), {
          name: newKelasName,
          jenjang: jenjangKelas,
          tingkat: parseInt(tingkatKelas as any),
          waliKelas: waliKelas
        });
        toast('Berhasil!', { description: `Kelas ${newKelasName} berhasil ditambah.` });
      }
      setNewKelasName('');
      setWaliKelas('');
      setShowFormKelas(false);
    } catch (err: any) {
      toast.error('Gagal menyimpan data: ' + err.message);
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
          nomorWa: guruForm.nomorWa,
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
          uid, email, displayName: guruForm.nama, role: 'guru', nip: guruForm.nip, nomorWa: guruForm.nomorWa, isActive: true, createdAt: serverTimestamp()
        }, { merge: true });
        toast.success(`Guru ${guruForm.nama} ditambahkan.`);
      }
      setEditingGuru(null);
      setGuruForm({ nama: '', nip: '', password: '', nomorWa: '' });
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

  const getTitle = () => {
    switch (currentTab) {
      case 'siswa': return 'Data Siswa';
      case 'guru': return 'Data Guru';
      case 'kelas': return 'Data Kelas';
      case 'mapel': return 'Data Mapel';
      case 'ruang': return 'Data Ruang';
      case 'sesi': return 'Data Sesi';
      case 'jenis_ujian': return 'Jenis Ujian';
      default: return 'Master Data';
    }
  };

  const getIcon = () => {
    switch (currentTab) {
      case 'siswa': return '👨‍🎓';
      case 'guru': return '👨‍🏫';
      case 'kelas': return '🏫';
      case 'mapel': return '📚';
      case 'ruang': return '🏫';
      case 'sesi': return '⏱️';
      case 'jenis_ujian': return '📝';
      default: return '🏫';
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <span className="text-2xl">{getIcon()}</span> {getTitle()}
            </h2>
          </div>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-1 ml-10 text-left">
            {isAdministrasi ? 'Administrasi' : 'Master Data'}
          </p>
        </div>
      </div>

      <div className="w-full">
        {/* Submenu is now handled by the sidebar */}

        {/* --- TABS: DATA SISWA --- */}
        {currentTab === 'siswa' && (
        <div className="space-y-8">
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
              
              {!editingSiswa ? (
                <Input 
                  type="password"
                  placeholder="PASSWORD (OPSIONAL, DEFAULT: siswa123)" 
                  className="h-11"
                  value={siswaForm.password}
                  onChange={e => setSiswaForm({...siswaForm, password: e.target.value})}
                />
              ) : (
                <div className="space-y-1">
                  <Input 
                    type="password"
                    placeholder="PASSWORD TIDAK DAPAT DIUBAH VIA APLIKASI" 
                    className="h-11 bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
                    disabled
                  />
                  <p className="text-[11px] text-amber-600 font-medium px-1 flex gap-1 items-start">
                    <span className="text-amber-500 font-bold">*</span> 
                    Demi keamanan Firebase, password akun tidak bisa diubah langsung. Jika siswa lupa password, hapus data ini dan buat ulang dengan NIS berbeda.
                  </p>
                </div>
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
        </div>
        )}

        {/* --- TABS: DATA GURU --- */}
        {currentTab === 'guru' && (
        <div className="space-y-6">
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
                <Input 
                  placeholder="NOMOR WHATSAPP (CONTOH: 081234567890)" 
                  value={guruForm.nomorWa}
                  onChange={e => setGuruForm({...guruForm, nomorWa: e.target.value})}
                />
                {!editingGuru ? (
                  <Input 
                     type="password"
                     placeholder="PASSWORD LOGIN (OPSIONAL, DEFAULT: guru123)" 
                     value={guruForm.password}
                     onChange={e => setGuruForm({...guruForm, password: e.target.value})}
                  />
                ) : (
                   <div className="space-y-1">
                    <Input 
                      type="password"
                      placeholder="PASSWORD TIDAK DAPAT DIUBAH VIA APLIKASI" 
                      className="bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
                      disabled
                    />
                    <p className="text-[11px] text-amber-600 font-medium px-1 flex gap-1 items-start">
                      <span className="text-amber-500 font-bold">*</span> 
                      Reset password harus dengan hapus data & buat ulang.
                    </p>
                  </div>
                )}
                <div className="flex gap-2 w-full md:col-span-2">
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-10">
                    Simpan Data Guru
                  </Button>
                  {editingGuru && (
                    <Button type="button" variant="outline" onClick={() => { setEditingGuru(null); setGuruForm({nama:'', nip:'', password:'', nomorWa: ''}); }} className="h-10">
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
                  <TableHead>No. WA</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.filter(u => u.role === 'guru').length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-400">Belum ada data guru.</TableCell></TableRow>
                ) : (
                  users.filter(u => u.role === 'guru').map(g => (
                    <TableRow key={g.id}>
                      <TableCell className="font-bold text-slate-700">{g.displayName}</TableCell>
                      <TableCell className="font-mono text-xs">{g.nip || g.email.split('@')[0]}</TableCell>
                      <TableCell className="text-slate-600">{g.nomorWa || '-'}</TableCell>
                      <TableCell className="flex justify-end gap-1">
                         <Button variant="ghost" size="sm" onClick={() => { setEditingGuru(g); setGuruForm({nama:g.displayName, nip:g.nip||'', password:'', nomorWa: g.nomorWa || ''}); }} className="text-blue-500">
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
        </div>
        )}

        {currentTab === 'mapel' && (
        <div className="space-y-6">
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
        </div>
        )}

        {currentTab === 'kelas' && (
        <div className="space-y-6">
          {/* Action Header */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 py-2">
            <div className="relative w-full md:w-80">
              <Input 
                placeholder="Cari kelas..." 
                className="pl-10 bg-white border-slate-200 rounded-full h-11 text-sm font-medium shadow-sm w-full focus-visible:ring-blue-500" 
              />
              <svg className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <input
                 type="file"
                 accept=".csv"
                 className="hidden"
                 ref={fileInputRefKelas}
                 onChange={handleKelasFileUpload}
              />
              <Button type="button" onClick={handleDownloadTemplateKelas} className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6 font-bold text-xs h-10 shadow-md shadow-blue-500/20">
                 <Download className="w-3.5 h-3.5 mr-2" /> TEMPLATE
              </Button>
              <Button type="button" onClick={() => fileInputRefKelas.current?.click()} disabled={isImporting} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-6 font-bold text-xs h-10 shadow-md shadow-emerald-500/20">
                 {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-2" />} IMPORT
              </Button>
              <Button type="button" onClick={() => setShowFormKelas(!showFormKelas)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 font-bold text-xs h-10 shadow-md shadow-indigo-600/20">
                 <Plus className="w-3.5 h-3.5 mr-2" /> TAMBAH DATA
              </Button>
            </div>
          </div>

          {showFormKelas && (
          <Card className="p-0 border border-indigo-100 overflow-hidden shadow-sm">
            <div className="bg-indigo-50/50 p-4 border-b flex items-center gap-2 text-indigo-700 font-bold">
              <Plus className="w-5 h-5" />
              <span>{editingKelas ? 'Edit Data Kelas' : 'Form Kelas Baru'}</span>
            </div>
            <form onSubmit={tanganiTambahKelas} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-start bg-white">
              <div className="md:col-span-4 grid gap-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1">NAMA KELAS LENGKAP</label>
                <Input 
                  value={newKelasName} 
                  onChange={e => setNewKelasName(e.target.value)} 
                  placeholder="Contoh: XII IPA 1" 
                  className="h-11 border-slate-200"
                />
              </div>
              <div className="md:col-span-2 grid gap-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1">JENJANG</label>
                <Select value={jenjangKelas} onValueChange={setJenjangKelas}>
                  <SelectTrigger className="h-11 border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SD">SD</SelectItem>
                    <SelectItem value="SMP">SMP</SelectItem>
                    <SelectItem value="SMA">SMA</SelectItem>
                    <SelectItem value="SMK">SMK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 grid gap-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1">TINGKAT</label>
                <Input 
                  type="number" 
                  value={tingkatKelas} 
                  onChange={e => setTingkatKelas(parseInt(e.target.value))} 
                  min={1} max={12} 
                  className="h-11 border-slate-200 text-center font-bold"
                />
              </div>
              <div className="md:col-span-4 grid gap-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1">WALI KELAS (OPSIONAL)</label>
                <Select value={waliKelas === '' ? 'none' : waliKelas} onValueChange={v => setWaliKelas(v === 'none' ? '' : v)}>
                  <SelectTrigger className="h-11 border-slate-200"><SelectValue placeholder="Pilih Guru..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">--TIDAK ADA--</SelectItem>
                    {users.filter(u => u.role === 'guru').map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-12 flex gap-2 justify-end mt-2">
                {editingKelas && (
                  <Button type="button" variant="outline" className="h-11 font-bold" onClick={() => {
                    setEditingKelas(null);
                    setNewKelasName('');
                    setJenjangKelas('SMA');
                    setTingkatKelas(10);
                    setWaliKelas('');
                    setShowFormKelas(false);
                  }}>
                    Batal
                  </Button>
                )}
                <Button type="submit" className="h-11 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all">
                  Simpan
                </Button>
              </div>
            </form>
          </Card>
          )}

          <Card className="bg-white border-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] rounded-2xl overflow-hidden py-2 px-4">
             <div className="overflow-x-auto min-h-[400px]">
               <table className="w-full">
                 <thead>
                   <tr className="border-b-2 border-slate-100">
                     <th className="py-5 px-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] w-20">NO</th>
                     <th className="py-5 px-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] w-40">KODE / JENJANG</th>
                     <th className="py-5 px-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">NAMA KELAS</th>
                     <th className="py-5 px-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">WALI KELAS & WA</th>
                     <th className="py-5 px-6 text-center text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] w-32">JUMLAH SISWA</th>
                     <th className="py-5 px-6 text-right text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] w-32">AKSI</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {kelas.length === 0 ? (
                       <tr>
                         <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">Belum ada data.</td>
                       </tr>
                    ) : (
                      kelas.sort((a,b) => a.name.localeCompare(b.name)).map((k, i) => {
                        const studentCount = users.filter(u => u.role === 'siswa' && u.kelas === k.name).length;
                        const wali = users.find(u => u.id === k.waliKelas);
                        return (
                        <tr key={k.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="py-5 px-6 text-sm text-slate-500 font-semibold">{i + 1}</td>
                           <td className="py-5 px-6 text-sm font-bold text-blue-600">
                              {k.jenjang}-{k.tingkat}
                           </td>
                           <td className="py-5 px-6 text-sm font-bold text-slate-800">
                              {k.name}
                           </td>
                           <td className="py-5 px-6 text-sm text-slate-600">
                              {wali ? (
                                <div className="flex items-center gap-2">
                                  <div className="font-bold text-slate-700">{wali.displayName}</div>
                                  {wali.nomorWa && (
                                    <a 
                                      href={`https://wa.me/${wali.nomorWa.replace(/\D/g, '').replace(/^0/, '62')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-green-600 bg-green-50 hover:bg-green-100 flex items-center px-2 py-0.5 rounded transition-colors font-medium border border-green-200"
                                    >
                                      Chat WA: {wali.nomorWa}
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-xs">Belum diatur</span>
                              )}
                           </td>
                           <td className="py-5 px-6 text-sm font-bold text-slate-600 text-center">
                              {studentCount}
                           </td>
                           <td className="py-5 px-6 text-right">
                              <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => {
                                  setEditingKelas(k);
                                  setNewKelasName(k.name);
                                  setJenjangKelas(k.jenjang || 'SMA');
                                  setTingkatKelas(k.tingkat || 10);
                                  setWaliKelas(k.waliKelas || '');
                                  setShowFormKelas(true);
                                }} className="text-blue-500 hover:text-blue-700 transition-colors">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => hapusData('kelas', k.id)} className="text-rose-400 hover:text-rose-600 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                           </td>
                        </tr>
                        );
                      })
                    )}
                 </tbody>
               </table>
               <div className="py-4 px-6 text-xs font-semibold text-slate-400 mt-2">
                 Ditampilkan: {kelas.length} dari {kelas.length} data
               </div>
             </div>
          </Card>
        </div>
        )}
        
        {currentTab === 'ruang' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 py-2">
            <div className="relative w-full md:w-80">
              <Input 
                placeholder="Cari ruang..." 
                className="pl-10 bg-white border-slate-200 rounded-full h-11 text-sm font-medium shadow-sm w-full focus-visible:ring-blue-500" 
              />
              <svg className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={() => toast("Fitur Template akan segera hadir")} className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6 font-bold text-xs h-10 shadow-md shadow-blue-500/20">
                 <Download className="w-3.5 h-3.5 mr-2" /> TEMPLATE
              </Button>
              <Button type="button" onClick={() => toast("Fitur Import akan segera hadir")} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-6 font-bold text-xs h-10 shadow-md shadow-emerald-500/20">
                 <Upload className="w-3.5 h-3.5 mr-2" /> IMPORT
              </Button>
              <Button type="button" onClick={() => setShowFormRuang(!showFormRuang)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 font-bold text-xs h-10 shadow-md shadow-blue-600/20">
                 <Plus className="w-3.5 h-3.5 mr-2" /> TAMBAH DATA
              </Button>
            </div>
          </div>

          {showFormRuang && (
          <Card className="p-0 border border-blue-100 overflow-hidden shadow-sm">
            <form onSubmit={tanganiTambahRuang} className="p-6 flex flex-wrap gap-4 items-end bg-white">
              <div className="grid gap-1.5 w-40">
                <label className="text-xs font-bold text-slate-500 uppercase">KODE</label>
                <Input value={newRuangKode} onChange={e => setNewRuangKode(e.target.value)} placeholder="Contoh: R1" className="h-11 border-slate-200 uppercase font-bold" />
              </div>
              <div className="grid gap-1.5 flex-1 min-w-[240px]">
                <label className="text-xs font-bold text-slate-500 uppercase">Nama Ruang</label>
                <Input value={newRuangName} onChange={e => setNewRuangName(e.target.value)} placeholder="Contoh: Ruang 1" className="h-11 border-slate-200 font-bold" />
              </div>
              <Button type="submit" className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all">Simpan</Button>
            </form>
          </Card>
          )}

          <Card className="bg-white border-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] rounded-2xl overflow-hidden py-2 px-4">
             <div className="overflow-x-auto min-h-[300px]">
               <table className="w-full">
                 <thead>
                   <tr className="border-b-2 border-slate-100">
                     <th className="py-5 px-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] w-20">NO</th>
                     <th className="py-5 px-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] w-40">KODE RUANG</th>
                     <th className="py-5 px-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">NAMA RUANG</th>
                     <th className="py-5 px-6 text-right text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] w-32">AKSI</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {ruang.length === 0 ? (
                       <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-medium">Belum ada data ruang.</td></tr>
                    ) : (
                      ruang.sort((a,b) => a.kode.localeCompare(b.kode)).map((item, i) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="py-5 px-6 text-sm text-slate-500 font-semibold">{i + 1}</td>
                           <td className="py-5 px-6 text-sm font-bold text-blue-600">{item.kode}</td>
                           <td className="py-5 px-6 text-sm font-bold text-slate-800">{item.name}</td>
                           <td className="py-5 px-6 text-right">
                              <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="text-blue-500 hover:text-blue-700 transition-colors"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => hapusData('ruang', item.id)} className="text-rose-400 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </div>
                           </td>
                        </tr>
                      ))
                    )}
                 </tbody>
               </table>
             </div>
          </Card>
        </div>
        )}

        {currentTab === 'sesi' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 py-2">
            <div className="relative w-full md:w-80">
              <Input 
                placeholder="Cari sesi..." 
                className="pl-10 bg-white border-slate-200 rounded-full h-11 text-sm font-medium shadow-sm w-full focus-visible:ring-blue-500" 
              />
              <svg className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={() => toast("Fitur Template akan segera hadir")} className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6 font-bold text-xs h-10 shadow-md shadow-blue-500/20">
                 <Download className="w-3.5 h-3.5 mr-2" /> TEMPLATE
              </Button>
              <Button type="button" onClick={() => toast("Fitur Import akan segera hadir")} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-6 font-bold text-xs h-10 shadow-md shadow-emerald-500/20">
                 <Upload className="w-3.5 h-3.5 mr-2" /> IMPORT
              </Button>
              <Button type="button" onClick={() => setShowFormSesi(!showFormSesi)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 font-bold text-xs h-10 shadow-md shadow-blue-600/20">
                 <Plus className="w-3.5 h-3.5 mr-2" /> TAMBAH DATA
              </Button>
            </div>
          </div>

          {showFormSesi && (
          <Card className="p-0 border border-blue-100 overflow-hidden shadow-sm">
            <form onSubmit={tanganiTambahSesi} className="p-6 flex flex-wrap gap-4 items-end bg-white">
              <div className="grid gap-1.5 w-40">
                <label className="text-xs font-bold text-slate-500 uppercase">KODE</label>
                <Input value={newSesiKode} onChange={e => setNewSesiKode(e.target.value)} placeholder="S1" className="h-11 border-slate-200 uppercase font-bold" />
              </div>
              <div className="grid gap-1.5 flex-1 min-w-[240px]">
                <label className="text-xs font-bold text-slate-500 uppercase">Nama Sesi</label>
                <Input value={newSesiName} onChange={e => setNewSesiName(e.target.value)} placeholder="Sesi 1" className="h-11 border-slate-200 font-bold" />
              </div>
              <Button type="submit" className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all">Simpan</Button>
            </form>
          </Card>
          )}

          <Card className="bg-white border-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] rounded-2xl overflow-hidden py-2 px-4">
             <div className="overflow-x-auto min-h-[300px]">
               <table className="w-full">
                 <thead>
                   <tr className="border-b-2 border-slate-100">
                     <th className="py-5 px-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] w-20">NO</th>
                     <th className="py-5 px-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] w-40">KODE SESI</th>
                     <th className="py-5 px-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">NAMA SESI</th>
                     <th className="py-5 px-6 text-right text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] w-32">AKSI</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {sesi.length === 0 ? (
                       <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-medium">Belum ada data sesi.</td></tr>
                    ) : (
                      sesi.sort((a,b) => a.kode.localeCompare(b.kode)).map((item, i) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="py-5 px-6 text-sm text-slate-500 font-semibold">{i + 1}</td>
                           <td className="py-5 px-6 text-sm font-bold text-blue-600">{item.kode}</td>
                           <td className="py-5 px-6 text-sm font-bold text-slate-800">{item.name}</td>
                           <td className="py-5 px-6 text-right">
                              <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="text-blue-500 hover:text-blue-700 transition-colors"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => hapusData('sesi', item.id)} className="text-rose-400 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </div>
                           </td>
                        </tr>
                      ))
                    )}
                 </tbody>
               </table>
             </div>
          </Card>
        </div>
        )}

        {currentTab === 'jenis_ujian' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 py-2">
            <div className="relative w-full md:w-80">
              <Input 
                placeholder="Cari jenis ujian..." 
                className="pl-10 bg-white border-slate-200 rounded-full h-11 text-sm font-medium shadow-sm w-full focus-visible:ring-blue-500" 
              />
              <svg className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={() => toast("Fitur Template akan segera hadir")} className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-6 font-bold text-xs h-10 shadow-md shadow-blue-500/20">
                 <Download className="w-3.5 h-3.5 mr-2" /> TEMPLATE
              </Button>
              <Button type="button" onClick={() => toast("Fitur Import akan segera hadir")} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-6 font-bold text-xs h-10 shadow-md shadow-emerald-500/20">
                 <Upload className="w-3.5 h-3.5 mr-2" /> IMPORT
              </Button>
              <Button type="button" onClick={() => setShowFormJenis(!showFormJenis)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 font-bold text-xs h-10 shadow-md shadow-blue-600/20">
                 <Plus className="w-3.5 h-3.5 mr-2" /> TAMBAH DATA
              </Button>
            </div>
          </div>

          {showFormJenis && (
          <Card className="p-0 border border-blue-100 overflow-hidden shadow-sm">
            <form onSubmit={tanganiTambahJenisUjian} className="p-6 flex flex-wrap gap-4 items-end bg-white">
              <div className="grid gap-1.5 w-40">
                <label className="text-xs font-bold text-slate-500 uppercase">KODE</label>
                <Input value={newJenisUjianKode} onChange={e => setNewJenisUjianKode(e.target.value)} placeholder="PTS" className="h-11 border-slate-200 uppercase font-bold" />
              </div>
              <div className="grid gap-1.5 flex-1 min-w-[240px]">
                <label className="text-xs font-bold text-slate-500 uppercase">Jenis Ujian</label>
                <Input value={newJenisUjianName} onChange={e => setNewJenisUjianName(e.target.value)} placeholder="Penilaian Tengah Semester" className="h-11 border-slate-200 font-bold" />
              </div>
              <Button type="submit" className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all">Simpan</Button>
            </form>
          </Card>
          )}

          <Card className="bg-white border-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] rounded-2xl overflow-hidden py-2 px-4">
             <div className="overflow-x-auto min-h-[300px]">
               <table className="w-full">
                 <thead>
                   <tr className="border-b-2 border-slate-100">
                     <th className="py-5 px-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] w-20">NO</th>
                     <th className="py-5 px-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] w-40">KODE UJIAN</th>
                     <th className="py-5 px-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">JENIS UJIAN</th>
                     <th className="py-5 px-6 text-right text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] w-32">AKSI</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {jenisUjian.length === 0 ? (
                       <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-medium">Belum ada data.</td></tr>
                    ) : (
                      jenisUjian.sort((a,b) => a.kode.localeCompare(b.kode)).map((item, i) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="py-5 px-6 text-sm text-slate-500 font-semibold">{i + 1}</td>
                           <td className="py-5 px-6 text-sm font-bold text-blue-600">{item.kode}</td>
                           <td className="py-5 px-6 text-sm font-bold text-slate-800">{item.name}</td>
                           <td className="py-5 px-6 text-right">
                              <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="text-blue-500 hover:text-blue-700 transition-colors"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => hapusData('jenis_ujian', item.id)} className="text-rose-400 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </div>
                           </td>
                        </tr>
                      ))
                    )}
                 </tbody>
               </table>
             </div>
          </Card>
        </div>
        )}
      </div>
    </div>
  );
}
