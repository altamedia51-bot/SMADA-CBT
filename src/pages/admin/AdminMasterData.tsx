import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getDocs, writeBatch, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, AlertCircle, Upload, Loader2, Download, UserPlus, UserCircle, Pencil, Plus, FileSpreadsheet, CloudUpload, Hash, ArrowUpCircle, GraduationCap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import firebaseConfig from '../../../firebase-applet-config.json';

export default function AdminMasterData() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isAdministrasi = location.pathname.includes('/administrasi');
  const currentTab = searchParams.get('tab') || 'siswa';

  const [mapel, setMapel] = useState<any[]>([]);
  const [kelas, setKelas] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [ruang, setRuang] = useState<any[]>([]);
  const [sesi, setSesi] = useState<any[]>([]);
  const [jenisUjian, setJenisUjian] = useState<any[]>([]);
  const [ekstra, setEkstra] = useState<any[]>([]);

  // Form states
  const [newRuangKode, setNewRuangKode] = useState('');
  const [newRuangName, setNewRuangName] = useState('');
  const [newSesiKode, setNewSesiKode] = useState('');
  const [newSesiName, setNewSesiName] = useState('');
  const [newJenisUjianKode, setNewJenisUjianKode] = useState('');
  const [newJenisUjianName, setNewJenisUjianName] = useState('');
  const [newEkstraName, setNewEkstraName] = useState('');
  const [editingEkstra, setEditingEkstra] = useState<any>(null);
  const [showFormEkstra, setShowFormEkstra] = useState(false);
  
  // Student Form State
  const [filterKelasSiswa, setFilterKelasSiswa] = useState('Semua');
  const [showSiswaModal, setShowSiswaModal] = useState(false);
  const [editingSiswa, setEditingSiswa] = useState<any>(null);
  const [siswaForm, setSiswaForm] = useState({
    nama: '',
    kelas: '',
    jurusan: 'Semua',
    sesiId: '',
    fotoUrl: '',
    nis: '',
    password: ''
  });
  
  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check size limit: 512KB
    if (file.size > 512 * 1024) {
      toast.error('Ukuran file foto maksimal 512KB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSiswaForm(prev => ({ ...prev, fotoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };
  const [showGuruModal, setShowGuruModal] = useState(false);
  const [editingGuru, setEditingGuru] = useState<any>(null);
  const [guruForm, setGuruForm] = useState({
    nama: '',
    nip: '',
    username: '',
    password: '',
    nomorWa: '',
    waliKelas: '',
    mengampu: [
      { mapelId: '', kelas: [] as string[] },
      { mapelId: '', kelas: [] as string[] },
      { mapelId: '', kelas: [] as string[] }
    ]
  });

  // Visibility states
  const [showFormKelas, setShowFormKelas] = useState(false);
  const [showFormRuang, setShowFormRuang] = useState(false);
  const [showFormSesi, setShowFormSesi] = useState(false);
  const [showFormJenis, setShowFormJenis] = useState(false);

  const [editingRuang, setEditingRuang] = useState<any>(null);
  const [editingSesi, setEditingSesi] = useState<any>(null);
  const [editingMapel, setEditingMapel] = useState<any>(null);
  const [editingJenisUjian, setEditingJenisUjian] = useState<any>(null);

  const [newMapelPrefix, setNewMapelPrefix] = useState('');
  const [jenjangMapel, setJenjangMapel] = useState('SMA');
  const [newKelasName, setNewKelasName] = useState('');
  const [jenjangKelas, setJenjangKelas] = useState('SMA');
  const [tingkatKelas, setTingkatKelas] = useState(10);
  const [waliKelas, setWaliKelas] = useState('');
  const [editingKelas, setEditingKelas] = useState<any>(null);
  
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const guruFileInputRef = useRef<HTMLInputElement>(null);

  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  const [promoTargetName, setPromoTargetName] = useState('');
  const [promoKelasData, setPromoKelasData] = useState<any>(null);
  const [isLulus, setIsLulus] = useState(false);

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

    const qEkstra = query(collection(db, 'ekstra'));
    const unEkstra = onSnapshot(qEkstra, (snap) => {
      setEkstra(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unMapel(); unKelas(); unUsers(); unRuang(); unSesi(); unJenisUjian(); unEkstra(); };
  }, []);

  const tanganiTambahMapel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMapelPrefix) return;
    try {
      if (editingMapel) {
        await updateDoc(doc(db, 'mapel', editingMapel.id), {
          name: newMapelPrefix,
          jenjang: jenjangMapel
        });
        setEditingMapel(null);
        toast.success(`Mapel ${newMapelPrefix} berhasil diperbarui.`);
      } else {
        await addDoc(collection(db, 'mapel'), {
          name: newMapelPrefix,
          jenjang: jenjangMapel
        });
        toast('Berhasil!', { description: `Mapel ${newMapelPrefix} berhasil ditambah.`, icon: <AlertCircle className="w-4 h-4" /> });
      }
      setNewMapelPrefix('');
    } catch (err: any) {
      toast.error('Gagal menyimpan data: ' + err.message);
    }
  };

  const downloadExcel = (data: any[], fileName: string, sheetName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTemplateMapel = () => {
    downloadExcel([
      { NAMA_MAPEL: 'Matematika Peminatan', JENJANG: 'SMA' },
      { NAMA_MAPEL: 'Ilmu Pengetahuan Alam', JENJANG: 'SMP' }
    ], "template_mapel.xlsx", "Template_Mapel");
  };

  const mapelFileInputRef = useRef<HTMLInputElement>(null);

  const handleMapelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];

        let successCount = 0;
        let failCount = 0;

        for (const row of rows) {
          const mapelName = (row.NAMA_MAPEL || row.nama_mapel || row.Nama_Mapel || '').toString().trim();
          const jenjang = (row.JENJANG || row.jenjang || row.Jenjang || 'SMA').toString().trim();

          if (mapelName) {
            try {
              await addDoc(collection(db, 'mapel'), {
                name: mapelName,
                jenjang: jenjang
              });
              successCount++;
            } catch (err) {
              failCount++;
            }
          } else {
             failCount++;
          }
        }

        setIsImporting(false);
        if (successCount > 0) {
          toast.success(`Berhasil mengimpor ${successCount} mapel.`);
        }
        if (failCount > 0) {
          toast.error(`Gagal mengimpor ${failCount} baris data (format tidak valid).`);
        }
        
        // Reset file input
        e.target.value = '';
      } catch (err: any) {
        setIsImporting(false);
        toast.error("Gagal membaca Excel: " + err.message);
      }
    };
    reader.onerror = () => {
       setIsImporting(false);
       toast.error("Gagal membaca file.");
    };
    reader.readAsBinaryString(file);
  };


  const tanganiTambahRuang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuangName) return;
    try {
      if (editingRuang) {
        await updateDoc(doc(db, 'ruang', editingRuang.id), {
          kode: newRuangKode,
          name: newRuangName
        });
        setEditingRuang(null);
        toast.success('Ruang berhasil diperbarui');
      } else {
        await addDoc(collection(db, 'ruang'), {
          kode: newRuangKode,
          name: newRuangName,
          createdAt: serverTimestamp()
        });
        toast.success('Ruang berhasil ditambahkan');
      }
      setNewRuangKode('');
      setNewRuangName('');
    } catch (err: any) {
      toast.error('Gagal menyimpan ruang: ' + err.message);
    }
  };

  const tanganiTambahSesi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSesiName) return;
    try {
      if (editingSesi) {
        await updateDoc(doc(db, 'sesi', editingSesi.id), {
          kode: newSesiKode,
          name: newSesiName
        });
        setEditingSesi(null);
        toast.success('Sesi berhasil diperbarui');
      } else {
        await addDoc(collection(db, 'sesi'), {
          kode: newSesiKode,
          name: newSesiName,
          createdAt: serverTimestamp()
        });
        toast.success('Sesi berhasil ditambahkan');
      }
      setNewSesiKode('');
      setNewSesiName('');
    } catch (err: any) {
      toast.error('Gagal menyimpan sesi: ' + err.message);
    }
  };

  const tanganiTambahJenisUjian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJenisUjianName) return;
    try {
      if (editingJenisUjian) {
        await updateDoc(doc(db, 'jenis_ujian', editingJenisUjian.id), {
          kode: newJenisUjianKode,
          name: newJenisUjianName
        });
        setEditingJenisUjian(null);
        toast.success('Jenis Ujian berhasil diperbarui');
      } else {
        await addDoc(collection(db, 'jenis_ujian'), {
          kode: newJenisUjianKode,
          name: newJenisUjianName,
          createdAt: serverTimestamp()
        });
        toast.success('Jenis Ujian berhasil ditambahkan');
      }
      setNewJenisUjianKode('');
      setNewJenisUjianName('');
    } catch (err: any) {
      toast.error('Gagal menyimpan jenis ujian: ' + err.message);
    }
  };

  const tanganiTambahEkstra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEkstraName) return;
    try {
      if (editingEkstra) {
        await updateDoc(doc(db, 'ekstra', editingEkstra.id), {
          name: newEkstraName,
          updatedAt: serverTimestamp()
        });
        setEditingEkstra(null);
        toast.success('Ekstrakurikuler berhasil diperbarui');
      } else {
        await addDoc(collection(db, 'ekstra'), {
          name: newEkstraName,
          createdAt: serverTimestamp()
        });
        toast.success('Ekstrakurikuler berhasil ditambahkan');
      }
      setNewEkstraName('');
    } catch (err: any) {
      toast.error('Gagal menyimpan ekstrakurikuler: ' + err.message);
    }
  };

  const handleDownloadTemplateKelas = () => {
    downloadExcel([
      { NAMA_KELAS: 'X IPA 1', JENJANG: 'SMA', TINGKAT: 10 },
      { NAMA_KELAS: 'XI IPS 2', JENJANG: 'SMA', TINGKAT: 11 }
    ], "template_kelas.xlsx", "Template_Kelas");
  };

  const downloadTemplateKelas = () => {
    // legacy fn kept just in case but we override the old one
  };

  const fileInputRefKelas = useRef<HTMLInputElement>(null);

  const handleKelasFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];

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

          const namaKelas = findVal(['nama', 'kelas', 'nama_kelas', 'nama kelas']).toString().trim();
          const jenjang = findVal(['jenjang']).toString().trim() || 'SMA';
          const tingkat = parseInt(findVal(['tingkat']).toString()) || 10;

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
      } catch (err: any) {
        setIsImporting(false);
        toast.error("Gagal membaca Excel: " + err.message);
      }
    };
    reader.onerror = () => {
       setIsImporting(false);
       toast.error("Gagal membaca file.");
    };
    reader.readAsBinaryString(file);
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

      // Sync data kelas ke guru
      const qGuruLama = query(collection(db, 'users'), where('role', '==', 'guru'), where('waliKelas', '==', newKelasName));
      const snapGuruLama = await getDocs(qGuruLama);
      for (const dg of snapGuruLama.docs) {
          if (dg.id !== waliKelas) {
             await updateDoc(dg.ref, { waliKelas: '' });
          }
      }
      if (waliKelas) {
          await updateDoc(doc(db, 'users', waliKelas), { waliKelas: newKelasName });
      }

      setNewKelasName('');
      setWaliKelas('');
      setShowFormKelas(false);
    } catch (err: any) {
      toast.error('Gagal menyimpan data: ' + err.message);
    }
  };

  const openPromoteDialog = (k: any) => {
      setPromoKelasData(k);
      const kelasAsli = k.name || '';
      let lulusStatus = k.tingkat === 12 || kelasAsli.startsWith('XII');
      setIsLulus(lulusStatus);
      
      setPromoTargetName('');
      setShowPromoteDialog(true);
  };

  const executePromotion = async () => {
      if (!promoTargetName || !promoKelasData) {
          toast.error('Kelas tujuan belum dipilih!');
          return;
      }
      try {
          // Validation: Check if destination class has active students
          if (promoTargetName !== 'ALUMNI') {
              const qExistingStudents = query(collection(db, 'users'), where('role', '==', 'siswa'), where('kelas', '==', promoTargetName));
              const snapExisting = await getDocs(qExistingStudents);
              if (!snapExisting.empty) {
                  toast.error(`Kelas ${promoTargetName} masih memiliki siswa! Harap naikkan/luluskan kelas tujuan tersebut terlebih dahulu.`);
                  return;
              }
          }

          const batch = writeBatch(db);
          let oldKelasName = promoKelasData.name;
          
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
          } else {
             snapSiswa.docs.forEach(d => {
                 batch.update(d.ref, { kelas: promoTargetName });
             });
             snapGuru.docs.forEach(d => {
                 batch.update(d.ref, { waliKelas: promoTargetName });
             });
          }
          
          if (promoTargetName !== 'ALUMNI') {
               const targetClassDoc = kelas.find(k => k.name === promoTargetName);
               if (targetClassDoc) {
                   batch.update(doc(db, 'kelas', targetClassDoc.id), { waliKelas: promoKelasData.waliKelas || '' });
               }
          }
          batch.update(doc(db, 'kelas', promoKelasData.id), { waliKelas: '' });

          await batch.commit();
          toast.success(isLulus ? 'Kelas lulus dan Wali Kelas dirotasi!' : 'Kelas berhasil dinaikkan!');
          setShowPromoteDialog(false);
      } catch(err:any) {
          toast.error('Gagal melakukan operasi kelas: ' + err.message);
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
          jurusan: siswaForm.jurusan,
          sesiId: siswaForm.sesiId,
          fotoUrl: siswaForm.fotoUrl,
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
          jurusan: siswaForm.jurusan,
          sesiId: siswaForm.sesiId,
          fotoUrl: siswaForm.fotoUrl,
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
    setSiswaForm({ nama: '', kelas: '', jurusan: 'Semua', sesiId: '', fotoUrl: '', nis: '', password: '' });
    setShowSiswaModal(false);
  };

  const editSiswaAction = (siswa: any) => {
    setEditingSiswa(siswa);
    setSiswaForm({
      nama: siswa.displayName || '',
      kelas: siswa.kelas || '',
      jurusan: siswa.jurusan || 'Semua',
      sesiId: siswa.sesiId || '',
      fotoUrl: siswa.fotoUrl || '',
      nis: siswa.nis || '',
      password: '' // Don't show password
    });
    setShowSiswaModal(true);
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
    if (!guruForm.nama || !guruForm.username) {
      toast.error('Mohon isi Nama dan Username');
      return;
    }
    try {
      let currentUid = '';
      if (editingGuru) {
        currentUid = editingGuru.id;
        await updateDoc(doc(db, 'users', currentUid), {
          displayName: guruForm.nama,
          nip: guruForm.nip || '-',
          username: guruForm.username.toString().toLowerCase().trim(),
          nomorWa: guruForm.nomorWa,
          waliKelas: guruForm.waliKelas,
          mengampu: guruForm.mengampu.filter(m => m.mapelId),
          updatedAt: serverTimestamp()
        });
        toast.success(`Data guru ${guruForm.nama} diperbarui.`);
      } else {
        const cleanUsername = guruForm.username.toString().toLowerCase().trim();
        const email = `guru_${cleanUsername}@edutest.local`;
        const pass = guruForm.password || 'guru123';
        const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pass, returnSecureToken: false })
        });
        const data = await res.json();
        
        if (!res.ok && data.error?.message !== 'EMAIL_EXISTS') {
           throw new Error(data.error?.message || 'Gagal registrasi Guru');
        }
        
        if (res.ok) {
           currentUid = data.localId;
           const { setDoc } = await import('firebase/firestore');
           await setDoc(doc(db, 'users', currentUid), {
             uid: currentUid, email, displayName: guruForm.nama, role: 'guru', username: guruForm.username.toString().toLowerCase().trim(), nip: guruForm.nip || '-', nomorWa: guruForm.nomorWa, waliKelas: guruForm.waliKelas, mengampu: guruForm.mengampu.filter(m => m.mapelId), isActive: true, createdAt: serverTimestamp()
           }, { merge: true });
        } else if (data.error?.message === 'EMAIL_EXISTS') {
           // If auth exists, just create a fallback profile so the user can still login (since their Firebase Auth account is still alive).
           currentUid = `recovered_guru_${cleanUsername}`;
           const { setDoc } = await import('firebase/firestore');
           await setDoc(doc(db, 'users', currentUid), {
             uid: null, email, displayName: guruForm.nama, role: 'guru', username: guruForm.username.toString().toLowerCase().trim(), nip: guruForm.nip || '-', nomorWa: guruForm.nomorWa, waliKelas: guruForm.waliKelas, mengampu: guruForm.mengampu.filter(m => m.mapelId), isActive: true, createdAt: serverTimestamp()
           }, { merge: true });
           toast.success('Guru terhubung dengan akun yang sudah ada sebelumnya.');
        }
        toast.success(`Guru ${guruForm.nama} ditambahkan.`);
      }

      if (currentUid) {
         // Hapus currentUid dari waliKelas kelas yang bukan target 
         const qOldClass = query(collection(db, 'kelas'), where('waliKelas', '==', currentUid));
         const oldClassSnap = await getDocs(qOldClass);
         for (const d of oldClassSnap.docs) {
            if (d.data().name !== guruForm.waliKelas) {
                await updateDoc(d.ref, { waliKelas: '' });
            }
         }
         // Jika ada waliKelas, update kelas terkait
         if (guruForm.waliKelas) {
             const targetClassDoc = kelas.find(k => k.name === guruForm.waliKelas);
             if (targetClassDoc) {
                await updateDoc(doc(db, 'kelas', targetClassDoc.id), { waliKelas: currentUid });
             }
         }
      }

      resetGuruForm();
    } catch (err: any) {
      toast.error('Eror: ' + err.message);
    }
  };

  const resetGuruForm = () => {
    setEditingGuru(null);
    setGuruForm({ nama: '', nip: '', username: '', password: '', nomorWa: '', waliKelas: '', mengampu: [{ mapelId: '', kelas: [] }, { mapelId: '', kelas: [] }, { mapelId: '', kelas: [] }] });
    setShowGuruModal(false);
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
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const fileData = event.target?.result;
        const workbook = XLSX.read(fileData, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];

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

          const name = findVal(['Nama', 'nama', 'name', 'DisplayName'])?.toString().trim();
          const classRoom = findVal(['Kelas', 'kelas', 'class', 'ClassRoom'])?.toString().trim();
          const password = findVal(['Password', 'password', 'pass', 'PIN'])?.toString().trim() || 'siswa123';
          const jurusanCSV = findVal(['Jurusan', 'jurusan'])?.toString().trim() || 'Semua';
          
          let sesiIdCSV = '';
          const sesiInput = findVal(['Sesi', 'sesi', 'Session']);
          if (sesiInput) {
            const foundSesi = sesi.find(s => s.name?.toLowerCase() === sesiInput.toString().toLowerCase() || s.kode?.toLowerCase() === sesiInput.toString().toLowerCase());
            if (foundSesi) sesiIdCSV = foundSesi.id;
          }

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

          const cleanNis = rawNis.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '') || Math.floor(Math.random() * 1000000).toString();
          const email = `${cleanNis}@edutest.local`;

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
                  jurusan: jurusanCSV,
                  sesiId: sesiIdCSV,
                  fotoUrl: '',
                  nis: rawNis.toString(),
                  isActive: true,
                  createdAt: serverTimestamp()
                }, { merge: true });
                successCount++;
              } else {
                const fallbackDocId = `recovered_${cleanNis}`;
                await setDoc(doc(db, 'users', fallbackDocId), {
                  uid: null,
                  email,
                  displayName: name,
                  role: 'siswa',
                  kelas: classRoom,
                  jurusan: jurusanCSV,
                  sesiId: sesiIdCSV,
                  fotoUrl: '',
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
      } catch (err: any) {
         setIsImporting(false);
         toast.error("Gagal membaca Excel: " + err.message);
      }
    };
    reader.onerror = () => {
       setIsImporting(false);
       toast.error("Gagal membaca file.");
    };
    reader.readAsBinaryString(file);
  };

  const handleGuruFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const fileData = event.target?.result;
        const workbook = XLSX.read(fileData, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) as any[];

        let successCount = 0;
        let failCount = 0;
        let lastError = "";

        for (const row of rows) {
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

          const name = findVal(['Nama', 'nama', 'name', 'DisplayName'])?.toString().trim();
          const nip = findVal(['NIP', 'nip', 'ID Pegawai', 'ID'])?.toString().trim() || '-';
          let username = findVal(['Username', 'username'])?.toString().trim();
          const nomorWa = findVal(['Nomor WA', 'whatsapp', 'No WA', 'Nomor HP'])?.toString().trim() || '';
          const password = findVal(['Password', 'password', 'pass', 'PIN'])?.toString().trim() || 'guru123';
          
          if (!name) {
            console.warn("Skipping row due to missing data:", { name });
            lastError = `Ada baris dengan data tidak lengkap. Cek kolom Nama.`;
            failCount++;
            continue;
          }

          if (!username) {
            if (nip && nip !== '-') {
              username = nip;
            } else {
              username = name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000);
            }
          }

          const cleanUsername = username.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '') || Math.floor(Math.random() * 1000000).toString();
          const email = `guru_${cleanUsername}@edutest.local`;

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
                  role: 'guru',
                  username: cleanUsername,
                  nip: nip.toString(),
                  nomorWa: nomorWa,
                  waliKelas: '',
                  mengampu: [],
                  isActive: true,
                  createdAt: serverTimestamp()
                }, { merge: true });
                successCount++;
              } else {
                const fallbackDocId = `recovered_guru_${cleanUsername}`;
                await setDoc(doc(db, 'users', fallbackDocId), {
                  uid: null,
                  email,
                  displayName: name,
                  role: 'guru',
                  username: cleanUsername,
                  nip: nip.toString(),
                  nomorWa: nomorWa,
                  waliKelas: '',
                  mengampu: [],
                  isActive: true,
                  createdAt: serverTimestamp()
                }, { merge: true });
                successCount++;
                if (data.error?.message === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
                   lastError = 'Limit Firebase (100 akun/jam) tercapai. Data Database tersimpan & Guru yang sudah terdaftar tadi akan tetap bisa login dengan akun yang sama.';
                }
              }
            } else {
              lastError = data.error?.message || 'Auth API failed';
              failCount++;
            }
          } catch (err: any) {
            lastError = err.message || 'Firestore API failed';
            failCount++;
          }
        }

        setIsImporting(false);
        if (guruFileInputRef.current) guruFileInputRef.current.value = '';
        if (failCount > 0) {
          toast.error(`Import Guru selesai: ${successCount} berhasil, ${failCount} gagal. Pesan error: ${lastError}`, { duration: 10000 });
        } else {
          toast.success(`Import Guru selesai: ${successCount} berhasil.`);
        }
      } catch (err: any) {
         setIsImporting(false);
         toast.error("Gagal membaca Excel: " + err.message);
      }
    };
    reader.onerror = () => {
       setIsImporting(false);
       toast.error("Gagal membaca file.");
    };
    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    downloadExcel([
      { Nama: 'ALFY NUR ASHIFAK', Kelas: 'XE1', Jurusan: 'IPA', NIS: '123456', Sesi: 'Sesi 1', Password: 'siswa123' },
      { Nama: 'ALIFIA NASWA HAFIDHOH', Kelas: 'XE2', Jurusan: 'IPS', NIS: '123457', Sesi: 'Sesi 2', Password: 'siswa123' }
    ], "template_pengguna.xlsx", "Template_Siswa");
  };

  const downloadTemplateGuru = () => {
    downloadExcel([
      { Nama: 'Budigantara', NIP: '198702319238', Username: 'budikeren', 'Nomor WA': '081234567890', Password: 'guru123' },
      { Nama: 'Susi Susanti', NIP: '198203112345', Username: 'susi82', 'Nomor WA': '087712345678', Password: 'guru123' }
    ], "template_guru.xlsx", "Template_Guru");
  };

  const getTitle = () => {
    switch (currentTab) {
      case 'siswa': return 'Data Siswa';
      case 'guru': return 'Data Guru';
      case 'kelas': return 'Data Kelas';
      case 'mapel': return 'Data Mapel';
      case 'ekstra': return 'Data Ekstra';
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
      case 'ekstra': return '🎨';
      case 'ruang': return '🏫';
      case 'sesi': return '⏱️';
      case 'jenis_ujian': return '📝';
      default: return '🏫';
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto space-y-8">
      
      <Dialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
         <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
               <DialogTitle className="text-xl font-bold flex items-center gap-2">
                   {isLulus ? <GraduationCap className="w-6 h-6 text-indigo-600" /> : <ArrowUpCircle className="w-6 h-6 text-indigo-600" />}
                   {isLulus ? 'Kelulusan Kelas & Rotasi' : 'Kenaikan Kelas'}
               </DialogTitle>
               <DialogDescription>
                   {isLulus ? (
                       <>Siswa di kelas <b>{promoKelasData?.name}</b> akan diluluskan (dipindah ke LULUS/ALUMNI). Wali Kelas dan nama kelas ini akan berganti mengulang ke awal.</>
                   ) : (
                       <>Siswa dan Wali Kelas <b>{promoKelasData?.name}</b> akan dinaikkan ke tingkat selanjutnya secara bersamaan.</>
                   )}
               </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
               <div className="space-y-2">
                   <label className="text-sm font-bold text-slate-700">
                      {isLulus ? 'Wali Kelas ini akan Beralih Ke Kelas:' : 'Beralih Ke Kelas Tujuan:'}
                   </label>

                   <Select value={promoTargetName} onValueChange={setPromoTargetName}>
                       <SelectTrigger className="h-11 font-bold text-indigo-700 w-full border-slate-300">
                           <SelectValue placeholder="-- Pilih Kelas Tujuan --" />
                       </SelectTrigger>
                       <SelectContent>
                           {isLulus && <SelectItem value="ALUMNI">LULUS / ALUMNI</SelectItem>}
                           {kelas.sort((a,b) => a.name.localeCompare(b.name)).map(k => (
                               <SelectItem key={k.id} value={k.name}>{k.name} (Tingkat {k.tingkat})</SelectItem>
                           ))}
                       </SelectContent>
                   </Select>

                   <p className="text-xs text-slate-500 mt-2">
                      {isLulus
                         ? 'Wali Kelas ini akan dipindahkan ke kelas yang dipilih. Siswa otomatis dipindah ke LULUS/ALUMNI.'
                         : 'Siswa dan Wali Kelas akan dipindahkan bersamaan ke kelas yang dipilih.'
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
        <div className="space-y-4">
          <Dialog open={showSiswaModal} onOpenChange={(open) => {
             setShowSiswaModal(open);
             if (!open) resetSiswaForm();
          }}>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl font-black text-slate-800">{editingSiswa ? 'Edit Siswa' : 'Tambah Siswa Baru'}</DialogTitle>
                <DialogDescription className="text-sm md:text-base text-slate-500">
                  {editingSiswa ? 'Ubah detail siswa di bawah ini.' : 'Masukkan detail informasi siswa baru.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={saveSiswa} className="space-y-6 pt-4">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-1/2">
                       <label className="block text-xs font-bold text-slate-500 mb-1">NAMA LENGKAP</label>
                       <Input 
                         placeholder="Masukkan Nama Lengkap" 
                         className="w-full uppercase font-medium h-11 bg-slate-50 focus:bg-white transition-colors"
                         value={siswaForm.nama}
                         onChange={e => setSiswaForm({...siswaForm, nama: e.target.value})}
                       />
                    </div>
                    <div className="w-full md:w-1/2 flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 mb-1">KELAS</label>
                        <Select 
                          value={siswaForm.kelas} 
                          onValueChange={val => setSiswaForm({...siswaForm, kelas: val})}
                        >
                          <SelectTrigger className="w-full h-11 font-medium bg-slate-50 focus:bg-white transition-colors">
                            <SelectValue placeholder="Pilih Kelas" />
                          </SelectTrigger>
                          <SelectContent>
                            {kelas.sort((a,b) => a.name.localeCompare(b.name)).map(k => (
                              <SelectItem key={k.id} value={k.name}>{k.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-[0.6]">
                        <label className="block text-xs font-bold text-slate-500 mb-1">JURUSAN</label>
                        <Select 
                          value={siswaForm.jurusan} 
                          onValueChange={val => setSiswaForm({...siswaForm, jurusan: val})}
                        >
                          <SelectTrigger className="w-full h-11 font-medium bg-slate-50 focus:bg-white transition-colors">
                            <SelectValue placeholder="Jurusan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Semua">Semua</SelectItem>
                            <SelectItem value="IPA">IPA</SelectItem>
                            <SelectItem value="IPS">IPS</SelectItem>
                            <SelectItem value="Bahasa">Bahasa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-1/3">
                      <label className="block text-xs font-bold text-slate-500 mb-1">NIS / NOMOR INDUK</label>
                      <Input 
                        placeholder="Masukkan NIS" 
                        className="w-full h-11 font-mono bg-slate-50 focus:bg-white transition-colors"
                        value={siswaForm.nis}
                        onChange={e => setSiswaForm({...siswaForm, nis: e.target.value})}
                      />
                    </div>
                    <div className="w-full md:w-1/3">
                      <label className="block text-xs font-bold text-slate-500 mb-1">SESI UJIAN (OPSIONAL)</label>
                      <Select 
                        value={siswaForm.sesiId} 
                        onValueChange={val => setSiswaForm({...siswaForm, sesiId: val})}
                      >
                        <SelectTrigger className="w-full h-11 font-medium bg-slate-50 focus:bg-white transition-colors">
                          <SelectValue placeholder="Pilih Sesi">
                            {siswaForm.sesiId === 'none' ? 'Tidak Ada' : siswaForm.sesiId ? `${sesi.find(s=>s.id===siswaForm.sesiId)?.name} (${sesi.find(s=>s.id===siswaForm.sesiId)?.kode})` : "Pilih Sesi"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Tidak Ada</SelectItem>
                          {sesi.sort((a,b) => a.name.localeCompare(b.name)).map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name} ({s.kode})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full md:w-1/3">
                      <label className="block text-xs font-bold text-slate-500 mb-1">FOTO (OPSIONAL)</label>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="file" 
                          accept="image/*"
                          className="h-11 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 flex-1 pt-2 w-full text-xs"
                          onChange={handleFotoUpload}
                        />
                        {siswaForm.fotoUrl && (
                          <div className="w-11 h-11 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
                            <img src={siswaForm.fotoUrl} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {!editingSiswa ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">PASSWORD (OPSIONAL)</label>
                    <Input 
                      type="password"
                      placeholder="Default: siswa123" 
                      className="w-full h-11 bg-slate-50 focus:bg-white transition-colors"
                      value={siswaForm.password}
                      onChange={e => setSiswaForm({...siswaForm, password: e.target.value})}
                    />
                  </div>
                ) : (
                  <div className="space-y-1 bg-amber-50 p-3 rounded-xl border border-amber-100">
                    <label className="block text-xs font-bold text-amber-800 mb-1">PASSWORD AKUN</label>
                    <Input 
                      type="password"
                      placeholder="TIDAK DAPAT DIUBAH VIA APLIKASI" 
                      className="w-full h-11 bg-white text-slate-400 border-amber-200/50 cursor-not-allowed"
                      disabled
                    />
                    <p className="text-[13px] text-amber-700 font-medium pt-1 flex gap-1.5 items-start">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> 
                      <span>Demi keamanan, password langsung tidak bisa diubah di sini. Hapus data ini dan buat ulang jika siswa lupa password.</span>
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={resetSiswaForm} className="w-full sm:w-auto h-11 px-6 border-slate-200 text-slate-600 hover:bg-slate-100">
                    Batalkan
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto h-11 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20">
                     Simpan Data Siswa
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Section: Database Siswa */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center rounded gap-4 pt-4 border-t">
              <div className="flex items-center gap-4 w-full md:w-auto">
                 <h3 className="text-xl font-extrabold text-slate-800 tracking-tight whitespace-nowrap">
                   Data Siswa
                 </h3>
                 <Select value={filterKelasSiswa} onValueChange={setFilterKelasSiswa}>
                   <SelectTrigger className="w-[140px] md:w-[180px] bg-white h-9 border-slate-200">
                     <SelectValue placeholder="Pilih Kelas" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="Semua">Semua Kelas</SelectItem>
                     {Array.from(new Set(users.filter(u => u.role === 'siswa' && u.kelas).map(u => u.kelas))).sort().map(className => (
                       <SelectItem key={className as string} value={className as string}>{className as string}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
              </div>

              <div className="flex gap-2 w-full md:w-auto justify-end overflow-x-auto pb-2 md:pb-0">
                <Input 
                  type="file" 
                  accept=".csv, .xlsx, .xls" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleSiswaFileUpload}
                  disabled={isImporting}
                />
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="h-9 border-slate-200 text-slate-600 bg-slate-50 shrink-0">
                  <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Template
                </Button>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-9 border-blue-200 text-blue-600 bg-blue-50 shrink-0">
                  <CloudUpload className="w-4 h-4 mr-1.5" /> Upload Excel
                </Button>
                <Button size="sm" onClick={() => { resetSiswaForm(); setShowSiswaModal(true); }} className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shrink-0">
                  <UserPlus className="w-4 h-4 mr-1.5" /> Tambah Siswa
                </Button>
              </div>
            </div>
            
            <Card className="p-0 border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto w-full">
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                      <TableHead className="text-base py-4 w-12 text-center font-bold text-slate-600">No</TableHead>
                      <TableHead className="text-base py-4 font-bold text-slate-600">Nama Lengkap</TableHead>
                      <TableHead className="text-base py-4 font-bold text-slate-600">Kelas</TableHead>
                      <TableHead className="text-base py-4 font-bold text-slate-600">Jurusan</TableHead>
                      <TableHead className="text-base py-4 font-bold text-slate-600">Sesi</TableHead>
                      <TableHead className="text-base py-4 w-24 text-center font-bold text-slate-600">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users
                      .filter(u => u.role === 'siswa' && (filterKelasSiswa === 'Semua' || u.kelas === filterKelasSiswa))
                      .sort((a,b) => a.displayName.localeCompare(b.displayName))
                      .map((student, idx) => (
                      <TableRow key={student.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="text-center font-medium text-slate-500">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="font-bold text-base text-slate-800">{student.displayName}</div>
                          <div className="text-xs text-slate-500 font-mono">NIS: {student.nis || '-'}</div>
                        </TableCell>
                        <TableCell className="font-medium text-sm text-slate-600">{student.kelas}</TableCell>
                        <TableCell>
                           {student.jurusan && student.jurusan !== 'Semua' ? (
                             <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                               {student.jurusan}
                             </span>
                           ) : <span className="text-slate-400">-</span>}
                        </TableCell>
                        <TableCell>
                           {student.sesiId && student.sesiId !== 'none' ? (
                             <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                               SESI: {sesi.find(s => s.id === student.sesiId)?.name || '?'}
                             </span>
                           ) : <span className="text-slate-400">-</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               className="h-8 w-8 p-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50 focus:ring-0"
                               onClick={() => editSiswaAction(student)}
                             >
                               <Pencil className="w-3.5 h-3.5" />
                             </Button>
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 focus:ring-0"
                               onClick={() => hapusData('users', student.id)}
                             >
                               <Trash2 className="w-3.5 h-3.5" />
                             </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.filter(u => u.role === 'siswa' && (filterKelasSiswa === 'Semua' || u.kelas === filterKelasSiswa)).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center py-6">
                            <UserCircle className="w-10 h-10 mb-2 opacity-20" />
                            <p>Tidak ada data siswa{filterKelasSiswa !== 'Semua' ? ` untuk kelas ${filterKelasSiswa}` : ''}.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </div>
        )}

        {/* --- TABS: DATA GURU --- */}
        {currentTab === 'guru' && (
        <div className="space-y-4">
          <Dialog open={showGuruModal} onOpenChange={(open) => {
             setShowGuruModal(open);
             if (!open) resetGuruForm();
          }}>
            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl font-black text-slate-800">{editingGuru ? 'Edit Guru' : 'Tambah Guru Baru'}</DialogTitle>
                <DialogDescription className="text-sm md:text-base text-slate-500">
                  {editingGuru ? 'Ubah detail data guru di bawah ini.' : 'Masukkan detail informasi guru baru.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={saveGuru} className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1">NAMA LENGKAP</label>
                     <Input 
                       placeholder="Masukkan Nama Lengkap" 
                       className="uppercase font-medium h-11 bg-slate-50 focus:bg-white transition-colors"
                       value={guruForm.nama}
                       onChange={e => setGuruForm({...guruForm, nama: e.target.value})}
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1">NIP CETAK RAPOR</label>
                     <Input 
                       placeholder="Masukkan NIP (Isi - jika kosong)" 
                       className="h-11 bg-slate-50 focus:bg-white transition-colors"
                       value={guruForm.nip}
                       onChange={e => setGuruForm({...guruForm, nip: e.target.value})}
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1">USERNAME LOGIN</label>
                     <Input 
                       placeholder="Masukkan Username" 
                       className="h-11 bg-slate-50 focus:bg-white transition-colors"
                       value={guruForm.username}
                       onChange={e => setGuruForm({...guruForm, username: e.target.value})}
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1">NOMOR WHATSAPP</label>
                     <Input 
                       placeholder="CONTOH: 081234567890" 
                       className="h-11 bg-slate-50 focus:bg-white transition-colors"
                       value={guruForm.nomorWa}
                       onChange={e => setGuruForm({...guruForm, nomorWa: e.target.value})}
                     />
                  </div>
                  {!editingGuru ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">PASSWORD (OPSIONAL)</label>
                      <Input 
                         type="password"
                         placeholder="DEFAULT: guru123" 
                         className="h-11 bg-slate-50 focus:bg-white transition-colors"
                         value={guruForm.password}
                         onChange={e => setGuruForm({...guruForm, password: e.target.value})}
                      />
                    </div>
                  ) : (
                     <div className="space-y-1 bg-amber-50 p-3 rounded-xl border border-amber-100">
                      <label className="block text-xs font-bold text-amber-800 mb-1">PASSWORD AKUN</label>
                      <Input 
                        type="password"
                        placeholder="TIDAK DAPAT DIUBAH VIA APLIKASI" 
                        className="h-11 bg-white text-slate-400 border-amber-200/50 cursor-not-allowed"
                        disabled
                      />
                      <p className="text-[13px] text-amber-700 font-medium pt-1 flex gap-1.5 items-start">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> 
                        <span>Reset password harus dengan hapus data & buat ulang dengan NIP berbeda.</span>
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                   <label className="text-sm font-bold text-slate-700">Wali Kelas</label>
                   <select
                     className="flex h-11 w-full rounded-md border border-input bg-slate-50 focus:bg-white px-3 py-2 text-sm transition-colors"
                     value={guruForm.waliKelas}
                     onChange={e => setGuruForm({...guruForm, waliKelas: e.target.value})}
                   >
                     <option value="">-- TANPA WALI KELAS --</option>
                     {kelas.map(k => (
                       <option key={k.id} value={k.name}>{k.name}</option>
                     ))}
                   </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Mengampu Mapel & Kelas (Maks 3)</label>
                    <div className="flex flex-col gap-3">
                       {[0, 1, 2].map(index => (
                          <div key={`mengampu-${index}`} className="border rounded-xl p-4 bg-slate-50 space-y-3">
                             <div>
                                <label className="text-xs font-bold text-slate-700">Mapel {index + 1}</label>
                                <select 
                                   className="mt-1 flex h-10 w-full rounded-md border border-input bg-white px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                   value={guruForm.mengampu[index].mapelId || ''}
                                   onChange={(e) => {
                                      const newMengampu = [...guruForm.mengampu];
                                      newMengampu[index].mapelId = e.target.value;
                                      if (!e.target.value) newMengampu[index].kelas = [];
                                      setGuruForm(prev => ({ ...prev, mengampu: newMengampu }));
                                   }}
                                >
                                   <option value="">-- Pilih Mapel --</option>
                                   {mapel.map(m => (
                                      <option key={m.id} value={m.id}>{m.name}</option>
                                   ))}
                                </select>
                             </div>
                             {guruForm.mengampu[index].mapelId && (
                                <div>
                                   <label className="text-xs font-bold text-slate-700">Kelas Diampu</label>
                                   <div className="flex flex-wrap gap-2 mt-1.5">
                                      {kelas.sort((a,b)=>a.name.localeCompare(b.name)).map(k => (
                                         <label key={k.id} className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors shadow-sm">
                                            <input 
                                               type="checkbox" 
                                               checked={guruForm.mengampu[index].kelas.includes(k.name)}
                                               onChange={(e) => {
                                                  const newMengampu = [...guruForm.mengampu];
                                                  if (e.target.checked) {
                                                     newMengampu[index].kelas = [...newMengampu[index].kelas, k.name];
                                                  } else {
                                                     newMengampu[index].kelas = newMengampu[index].kelas.filter(name => name !== k.name);
                                                  }
                                                  setGuruForm(prev => ({ ...prev, mengampu: newMengampu }));
                                               }}
                                               className="accent-blue-600 rounded w-4 h-4"
                                            />
                                            <span className="text-xs font-bold text-slate-700">{k.name}</span>
                                         </label>
                                      ))}
                                   </div>
                                </div>
                             )}
                          </div>
                       ))}
                    </div>
                 </div>

                 <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
                    <Button type="button" variant="outline" onClick={resetGuruForm} className="w-full sm:w-auto h-11 px-6 border-slate-200 text-slate-600 hover:bg-slate-100">
                      Batalkan
                    </Button>
                    <Button type="submit" className="w-full sm:w-auto h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20">
                      Simpan Data Guru
                    </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center rounded gap-4 pt-4 border-t">
              <div className="flex items-center gap-4 w-full md:w-auto">
                 <h3 className="text-xl font-extrabold text-slate-800 tracking-tight whitespace-nowrap">
                   Data Guru
                 </h3>
              </div>

              <div className="flex gap-2 w-full md:w-auto justify-end overflow-x-auto pb-2 md:pb-0">
                <Input 
                  type="file" 
                  accept=".csv, .xlsx, .xls" 
                  className="hidden" 
                  ref={guruFileInputRef}
                  onChange={handleGuruFileUpload}
                  disabled={isImporting}
                />
                <Button variant="outline" size="sm" onClick={downloadTemplateGuru} className="h-9 border-slate-200 text-slate-600 bg-slate-50 shrink-0">
                  <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Template
                </Button>
                <Button variant="outline" size="sm" onClick={() => guruFileInputRef.current?.click()} className="h-9 border-blue-200 text-blue-600 bg-blue-50 shrink-0">
                  <CloudUpload className="w-4 h-4 mr-1.5" /> Upload Excel
                </Button>
                <Button size="sm" onClick={() => { resetGuruForm(); setShowGuruModal(true); }} className="h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-sm shrink-0">
                  <UserPlus className="w-4 h-4 mr-1.5" /> Tambah Guru
                </Button>
              </div>
            </div>

          <Card className="overflow-hidden border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-base py-4">Nama Guru</TableHead>
                  <TableHead className="text-base py-4">NIP</TableHead><TableHead className="text-base py-4">Username</TableHead>
                  <TableHead className="text-base py-4">No. WA</TableHead>
                  <TableHead className="text-base py-4">Wali Kelas</TableHead>
                  <TableHead className="text-base py-4">Mapel Diampu</TableHead>
                  <TableHead className="text-base py-4">Kelas Diampu</TableHead>
                  <TableHead className="text-base py-4 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.filter(u => u.role === 'guru').length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-slate-400">Belum ada data guru.</TableCell></TableRow>
                ) : (
                  users.filter(u => u.role === 'guru').sort((a,b) => (a.displayName || '').localeCompare(b.displayName || '')).map(g => (
                    <TableRow key={g.id}>
                      <TableCell className="font-bold text-base text-slate-800">{g.displayName}</TableCell>
                      <TableCell className="font-mono text-sm">{g.nip || '-'}</TableCell>
                      <TableCell className="font-mono text-sm text-blue-600">{g.username || (g.email ? g.email.split('@')[0].replace('guru_', '') : '-')}</TableCell>
                      <TableCell className="text-sm text-slate-600">{g.nomorWa || '-'}</TableCell>
                      <TableCell className="font-bold text-sm text-blue-600">{g.waliKelas || '-'}</TableCell>
                      <TableCell className="text-sm text-slate-500">
                         {g.mengampu && g.mengampu.length > 0 
                            ? g.mengampu.map((m: any) => mapel.find((map:any) => map.id === m.mapelId)?.name || m.mapelId).join(', ')
                            : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                         {g.mengampu && g.mengampu.length > 0
                            ? g.mengampu.map((m: any) => m.kelas.join(', ')).filter(Boolean).join(' | ')
                            : '-'}
                      </TableCell>
                      <TableCell className="flex justify-end gap-1">
                         <Button variant="ghost" size="sm" onClick={() => { 
                            let initMengampu = g.mengampu || [];
                            // Ensure 3 items
                            let parsedMengampu = [...initMengampu];
                            while(parsedMengampu.length < 3) parsedMengampu.push({ mapelId:'', kelas:[] });
                            setEditingGuru(g); 
                            setGuruForm({nama:g.displayName, nip:(g.nip && g.nip !== '-') ? g.nip : '', username: g.username || (g.email ? g.email.split('@')[0].replace('guru_', '') : ''), password:'', nomorWa: g.nomorWa || '', waliKelas: g.waliKelas || '', mengampu: parsedMengampu }); 
                            setShowGuruModal(true);
                         }} className="text-blue-500">
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
        </div>
        )}

        {currentTab === 'mapel' && (
        <div className="space-y-6">
          <Card className="p-6 bg-card">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
              <h3 className="font-semibold">{editingMapel ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}</h3>
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  accept=".csv, .xlsx, .xls" 
                  className="hidden" 
                  ref={mapelFileInputRef}
                  onChange={handleMapelFileUpload}
                  disabled={isImporting}
                />
                <Button variant="outline" size="sm" onClick={downloadTemplateMapel} className="h-8 border-slate-200 text-slate-600 bg-slate-50">
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Template
                </Button>
                <Button variant="outline" size="sm" onClick={() => mapelFileInputRef.current?.click()} className="h-8 border-blue-200 text-blue-600 bg-blue-50">
                  <CloudUpload className="w-3.5 h-3.5 mr-1.5" /> Upload Excel
                </Button>
              </div>
            </div>
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
              <div className="flex gap-2">
                <Button type="submit">{editingMapel ? 'Simpan' : 'Simpan Mapel'}</Button>
                {editingMapel && <Button type="button" variant="outline" onClick={() => { setEditingMapel(null); setNewMapelPrefix(''); setJenjangMapel('SMA'); }}>Batal</Button>}
              </div>
            </form>
          </Card>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-base py-4">Mata Pelajaran</TableHead>
                  <TableHead className="text-base py-4">Jenjang</TableHead>
                  <TableHead className="text-base py-4 w-[120px] text-center">Aksi</TableHead>
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
                        <div className="flex justify-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingMapel(m); setNewMapelPrefix(m.name); setJenjangMapel(m.jenjang || 'SMA'); }} className="text-blue-500 hover:bg-blue-50">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => hapusData('mapel', m.id)} className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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
                 accept=".csv, .xlsx, .xls"
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
                  <SelectTrigger className="h-11 border-slate-200">
                    <SelectValue placeholder="Pilih Guru...">
                      {waliKelas === '' || waliKelas === 'none' ? '--TIDAK ADA--' : users.find(u=>u.id===waliKelas)?.displayName || 'Pilih Guru...'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">--TIDAK ADA--</SelectItem>
                    {users.filter(u => u.role === 'guru').sort((a,b) => (a.displayName||'').localeCompare(b.displayName||'')).map(g => (
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
                     <th className="py-5 px-6 text-left text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em] w-20">NO</th>
                     <th className="py-5 px-6 text-left text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em] w-40">KODE / JENJANG</th>
                     <th className="py-5 px-6 text-left text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em]">NAMA KELAS</th>
                     <th className="py-5 px-6 text-left text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em]">WALI KELAS</th>
                     <th className="py-5 px-6 text-left text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em] w-36 whitespace-nowrap">WHATSAPP</th>
                     <th className="py-5 px-6 text-center text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em] w-32">JUMLAH SISWA</th>
                     <th className="py-5 px-6 text-right text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em] w-32">AKSI</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {kelas.length === 0 ? (
                       <tr>
                         <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">Belum ada data.</td>
                       </tr>
                    ) : (
                      kelas.sort((a,b) => a.name.localeCompare(b.name)).map((k, i) => {
                        const studentCount = users.filter(u => u.role === 'siswa' && u.kelas === k.name).length;
                        const wali = users.find(u => u.id === k.waliKelas || u.displayName === k.waliKelas);
                        return (
                        <tr key={k.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="py-5 px-6 text-base text-slate-500 font-semibold">{i + 1}</td>
                           <td className="py-5 px-6 text-base font-bold text-blue-600">
                              {k.jenjang}-{k.tingkat}
                           </td>
                           <td className="py-5 px-6 text-base font-bold text-slate-800">
                              {k.name}
                           </td>
                           <td className="py-5 px-6 text-base text-slate-600">
                              {wali ? (
                                  <div className="font-bold text-slate-700">{wali.displayName}</div>
                              ) : (
                                <span className="text-slate-400 italic text-xs">Belum diatur</span>
                              )}
                           </td>
                           <td className="py-5 px-6 text-base text-slate-600">
                              {wali && wali.nomorWa ? (
                                <a 
                                  href={`https://wa.me/${wali.nomorWa.replace(/\D/g, '').replace(/^0/, '62')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-green-600 bg-green-50 hover:bg-green-100 inline-flex items-center justify-center px-2 py-1 rounded transition-colors font-medium border border-green-200 whitespace-nowrap w-max"
                                  title="Wali Kelas"
                                >
                                  {wali.nomorWa}
                                </a>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                           </td>
                           <td className="py-5 px-6 text-base font-bold text-slate-600 text-center">
                              {studentCount}
                           </td>
                           <td className="py-5 px-6 text-right">
                              <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => {
                                   openPromoteDialog(k);
                                }} className="text-indigo-500 hover:text-indigo-700 transition-colors" title={k.tingkat === 12 || k.name?.startsWith('XII') ? 'Kelulusan Kelas' : 'Kenaikan Kelas'}>
                                   {k.tingkat === 12 || k.name?.startsWith('XII') ? <GraduationCap className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                                </button>
                                <button onClick={() => {
                                  setEditingKelas(k);
                                  setNewKelasName(k.name);
                                  setJenjangKelas(k.jenjang || 'SMA');
                                  setTingkatKelas(k.tingkat || 10);
                                  const realWali = users.find(u => u.id === k.waliKelas || u.displayName === k.waliKelas);
                                  setWaliKelas(realWali ? realWali.id : '');
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
                <label className="text-xs font-bold text-slate-500 uppercase">{editingRuang ? 'Edit KODE' : 'KODE'}</label>
                <Input value={newRuangKode} onChange={e => setNewRuangKode(e.target.value)} placeholder="Contoh: R1" className="h-11 border-slate-200 uppercase font-bold" />
              </div>
              <div className="grid gap-1.5 flex-1 min-w-[240px]">
                <label className="text-xs font-bold text-slate-500 uppercase">{editingRuang ? 'Edit Nama Ruang' : 'Nama Ruang'}</label>
                <Input value={newRuangName} onChange={e => setNewRuangName(e.target.value)} placeholder="Contoh: Ruang 1" className="h-11 border-slate-200 font-bold" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all">Simpan</Button>
                {editingRuang && <Button type="button" variant="outline" className="h-11 px-6 font-bold" onClick={() => { setEditingRuang(null); setNewRuangKode(''); setNewRuangName(''); setShowFormRuang(false); }}>Batal</Button>}
              </div>
            </form>
          </Card>
          )}

          <Card className="bg-white border-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] rounded-2xl overflow-hidden py-2 px-4">
             <div className="overflow-x-auto min-h-[300px]">
               <table className="w-full">
                 <thead>
                   <tr className="border-b-2 border-slate-100">
                     <th className="py-5 px-6 text-left text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em] w-20">NO</th>
                     <th className="py-5 px-6 text-left text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em] w-40">KODE RUANG</th>
                     <th className="py-5 px-6 text-left text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em]">NAMA RUANG</th>
                     <th className="py-5 px-6 text-right text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em] w-32">AKSI</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {ruang.length === 0 ? (
                       <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-medium">Belum ada data ruang.</td></tr>
                    ) : (
                      ruang.sort((a,b) => a.kode.localeCompare(b.kode)).map((item, i) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="py-5 px-6 text-base text-slate-500 font-semibold">{i + 1}</td>
                           <td className="py-5 px-6 text-base font-bold text-blue-600">{item.kode}</td>
                           <td className="py-5 px-6 text-base font-bold text-slate-800">{item.name}</td>
                           <td className="py-5 px-6 text-right">
                              <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingRuang(item); setNewRuangKode(item.kode || ''); setNewRuangName(item.name || ''); setShowFormRuang(true); }} className="text-blue-500 hover:text-blue-700 transition-colors"><Pencil className="w-4 h-4" /></button>
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
                <label className="text-xs font-bold text-slate-500 uppercase">{editingSesi ? 'Edit KODE' : 'KODE'}</label>
                <Input value={newSesiKode} onChange={e => setNewSesiKode(e.target.value)} placeholder="S1" className="h-11 border-slate-200 uppercase font-bold" />
              </div>
              <div className="grid gap-1.5 flex-1 min-w-[240px]">
                <label className="text-xs font-bold text-slate-500 uppercase">{editingSesi ? 'Edit Nama Sesi' : 'Nama Sesi'}</label>
                <Input value={newSesiName} onChange={e => setNewSesiName(e.target.value)} placeholder="Sesi 1" className="h-11 border-slate-200 font-bold" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all">Simpan</Button>
                {editingSesi && <Button type="button" variant="outline" className="h-11 px-6 font-bold" onClick={() => { setEditingSesi(null); setNewSesiKode(''); setNewSesiName(''); setShowFormSesi(false); }}>Batal</Button>}
              </div>
            </form>
          </Card>
          )}

          <Card className="bg-white border-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] rounded-2xl overflow-hidden py-2 px-4">
             <div className="overflow-x-auto min-h-[300px]">
               <table className="w-full">
                 <thead>
                   <tr className="border-b-2 border-slate-100">
                     <th className="py-5 px-6 text-left text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em] w-20">NO</th>
                     <th className="py-5 px-6 text-left text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em] w-40">KODE SESI</th>
                     <th className="py-5 px-6 text-left text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em]">NAMA SESI</th>
                     <th className="py-5 px-6 text-right text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em] w-32">AKSI</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {sesi.length === 0 ? (
                       <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-medium">Belum ada data sesi.</td></tr>
                    ) : (
                      sesi.sort((a,b) => a.kode.localeCompare(b.kode)).map((item, i) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="py-5 px-6 text-base text-slate-500 font-semibold">{i + 1}</td>
                           <td className="py-5 px-6 text-base font-bold text-blue-600">{item.kode}</td>
                           <td className="py-5 px-6 text-base font-bold text-slate-800">{item.name}</td>
                           <td className="py-5 px-6 text-right">
                              <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingSesi(item); setNewSesiKode(item.kode || ''); setNewSesiName(item.name || ''); setShowFormSesi(true); }} className="text-blue-500 hover:text-blue-700 transition-colors"><Pencil className="w-4 h-4" /></button>
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
                <label className="text-xs font-bold text-slate-500 uppercase">{editingJenisUjian ? 'Edit KODE' : 'KODE'}</label>
                <Input value={newJenisUjianKode} onChange={e => setNewJenisUjianKode(e.target.value)} placeholder="PTS" className="h-11 border-slate-200 uppercase font-bold" />
              </div>
              <div className="grid gap-1.5 flex-1 min-w-[240px]">
                <label className="text-xs font-bold text-slate-500 uppercase">{editingJenisUjian ? 'Edit Jenis Ujian' : 'Jenis Ujian'}</label>
                <Input value={newJenisUjianName} onChange={e => setNewJenisUjianName(e.target.value)} placeholder="Penilaian Tengah Semester" className="h-11 border-slate-200 font-bold" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all">Simpan</Button>
                {editingJenisUjian && <Button type="button" variant="outline" className="h-11 px-6 font-bold" onClick={() => { setEditingJenisUjian(null); setNewJenisUjianKode(''); setNewJenisUjianName(''); setShowFormJenis(false); }}>Batal</Button>}
              </div>
            </form>
          </Card>
          )}

          <Card className="bg-white border-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] rounded-2xl overflow-hidden py-2 px-4">
             <div className="overflow-x-auto min-h-[300px]">
               <table className="w-full">
                 <thead>
                   <tr className="border-b-2 border-slate-100">
                     <th className="py-5 px-6 text-left text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em] w-20">NO</th>
                     <th className="py-5 px-6 text-left text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em] w-40">KODE UJIAN</th>
                     <th className="py-5 px-6 text-left text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em]">JENIS UJIAN</th>
                     <th className="py-5 px-6 text-right text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em] w-32">AKSI</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {jenisUjian.length === 0 ? (
                       <tr><td colSpan={4} className="py-12 text-center text-slate-400 font-medium">Belum ada data.</td></tr>
                    ) : (
                       jenisUjian.sort((a,b) => a.kode.localeCompare(b.kode)).map((item, i) => (
                         <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="py-5 px-6 text-base text-slate-500 font-semibold">{i + 1}</td>
                           <td className="py-5 px-6 text-base font-bold text-blue-600">{item.kode}</td>
                           <td className="py-5 px-6 text-base font-bold text-slate-800">{item.name}</td>
                           <td className="py-5 px-6 text-right">
                              <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingJenisUjian(item); setNewJenisUjianKode(item.kode || ''); setNewJenisUjianName(item.name || ''); setShowFormJenis(true); }} className="text-blue-500 hover:text-blue-700 transition-colors"><Pencil className="w-4 h-4" /></button>
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

        {currentTab === 'ekstra' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 py-2">
            <div className="relative w-full md:w-80">
              <Input 
                placeholder="Cari ekstra..." 
                className="pl-10 bg-white border-slate-200 rounded-full h-11 text-sm font-medium shadow-sm w-full focus-visible:ring-blue-500" 
              />
              <svg className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={() => setShowFormEkstra(!showFormEkstra)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6 font-bold text-xs h-10 shadow-md shadow-indigo-600/20">
                 <Plus className="w-3.5 h-3.5 mr-2" /> TAMBAH DATA
              </Button>
            </div>
          </div>

          {showFormEkstra && (
          <Card className="p-0 border border-indigo-100 overflow-hidden shadow-sm">
            <form onSubmit={tanganiTambahEkstra} className="p-6 flex flex-wrap gap-4 items-end bg-white">
              <div className="grid gap-1.5 flex-1 min-w-[240px]">
                <label className="text-xs font-bold text-slate-500 uppercase">{editingEkstra ? 'Edit Nama Ekstrakurikuler' : 'Nama Ekstrakurikuler'}</label>
                <Input value={newEkstraName} onChange={e => setNewEkstraName(e.target.value)} placeholder="Contoh: Pramuka" className="h-11 border-slate-200 font-bold" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="h-11 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all">Simpan</Button>
                {editingEkstra && <Button type="button" variant="outline" className="h-11 px-6 font-bold" onClick={() => { setEditingEkstra(null); setNewEkstraName(''); setShowFormEkstra(false); }}>Batal</Button>}
              </div>
            </form>
          </Card>
          )}

          <Card className="bg-white border-0 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] rounded-2xl overflow-hidden py-2 px-4">
             <div className="overflow-x-auto min-h-[300px]">
               <table className="w-full">
                 <thead>
                   <tr className="border-b-2 border-slate-100">
                     <th className="py-5 px-6 text-left text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em] w-20">NO</th>
                     <th className="py-5 px-6 text-left text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em]">NAMA EKSTRAKURIKULER</th>
                     <th className="py-5 px-6 text-right text-[13px] font-bold text-slate-400 uppercase tracking-[0.15em] w-32">AKSI</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {ekstra.length === 0 ? (
                       <tr><td colSpan={3} className="py-12 text-center text-slate-400 font-medium">Belum ada data ekstrakurikuler.</td></tr>
                    ) : (
                       ekstra.sort((a,b) => a.name.localeCompare(b.name)).map((item, i) => (
                         <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="py-5 px-6 text-base text-slate-500 font-semibold">{i + 1}</td>
                           <td className="py-5 px-6 text-base font-bold text-slate-800">{item.name}</td>
                           <td className="py-5 px-6 text-right">
                              <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingEkstra(item); setNewEkstraName(item.name || ''); setShowFormEkstra(true); }} className="text-blue-500 hover:text-blue-700 transition-colors"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => hapusData('ekstra', item.id)} className="text-rose-400 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
