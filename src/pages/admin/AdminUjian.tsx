import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, PlayCircle, StopCircle, Calendar, Hash, Eye, Clock, Users, BookOpen } from 'lucide-react';

export default function AdminUjian() {
  const navigate = useNavigate();
  const [ujianList, setUjianList] = useState<any[]>([]);
  const [paketList, setPaketList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [jenisUjianList, setJenisUjianList] = useState<any[]>([]);
  const [soalCounts, setSoalCounts] = useState<Record<string, number>>({});
  
  const [title, setTitle] = useState('');
  const [paketId, setPaketId] = useState('');
  const [kelasId, setKelasId] = useState('');
  const [jenisUjianId, setJenisUjianId] = useState('');
  const [duration, setDuration] = useState('120'); // minutes
  const [status, setStatus] = useState('draft'); // draft, aktif, selesai

  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch Ujian
    const qUjian = query(collection(db, 'ujian'));
    const unsubUjian = onSnapshot(qUjian, snap => {
      setUjianList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch Jenis Ujian
    const qJenisUjian = query(collection(db, 'jenis_ujian'));
    const unsubJenis = onSnapshot(qJenisUjian, snap => {
      setJenisUjianList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch Paket Soal
    const qPaket = query(collection(db, 'paket_soal'));
    const unsubPaket = onSnapshot(qPaket, async (snap) => {
      const pList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPaketList(pList);
      
      // Fetch question counts for each paket
      const counts: Record<string, number> = {};
      for (const p of pList) {
        try {
          const sSnap = await getDocs(collection(db, `paket_soal/${p.id}/soal`));
          counts[p.id] = sSnap.size;
        } catch (e) {
          counts[p.id] = 0;
        }
      }
      setSoalCounts(counts);
    });

    // Fetch Kelas
    const qKelas = query(collection(db, 'kelas'));
    const unsubKelas = onSnapshot(qKelas, snap => {
      setKelasList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubUjian(); unsubPaket(); unsubKelas(); unsubJenis();
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !paketId || !kelasId || !jenisUjianId || !duration) {
      return toast.error('Harap lengkapi semua bidang');
    }

    try {
      const payload = {
        title,
        paketId,
        kelasId,
        jenisUjianId,
        duration: parseInt(duration),
        status,
        token: Math.random().toString(36).substring(2, 8).toUpperCase(), // Generate random 6-char token
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'ujian', editingId), payload);
        toast.success('Ujian berhasil diperbarui!');
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'ujian'), {
          ...payload,
          createdAt: serverTimestamp()
        });
        toast.success('Jadwal Ujian berhasil dibuat!');
      }

      // Reset form
      setTitle('');
      setPaketId('');
      setKelasId('');
      setJenisUjianId('');
      setDuration('120');
      setStatus('draft');
    } catch (err: any) {
      toast.error('Gagal menyimpan ujian: ' + err.message);
    }
  };

  const handleEdit = (u: any) => {
    setEditingId(u.id);
    setTitle(u.title || '');
    setPaketId(u.paketId || '');
    setKelasId(u.kelasId || '');
    setJenisUjianId(u.jenisUjianId || '');
    setDuration(u.duration?.toString() || '120');
    setStatus(u.status || 'draft');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus jadwal ujian ini?')) return;
    try {
      await deleteDoc(doc(db, 'ujian', id));
      toast.success('Berhasil dihapus');
    } catch (err: any) {
      toast.error('Gagal menghapus: ' + err.message);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'aktif' ? 'selesai' : 'aktif';
    try {
      await updateDoc(doc(db, 'ujian', id), { status: newStatus });
      toast.success(`Status ujian diubah menjadi ${newStatus}`);
    } catch (err: any) {
      toast.error('Gagal mengubah status: ' + err.message);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600">
               <Calendar className="w-6 h-6" />
             </div>
             <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Jadwal Ujian</h2>
          </div>
          <p className="text-slate-500 font-medium max-w-xl">
            Atur dan kelola pelaksanaan ujian. Mulai atau hentikan sesi ujian secara real-time, bagikan token ujian, dan pantau status pelaksanaan.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Kiri: Form Dashboard-style */}
        <div className="w-full lg:w-1/3 sticky top-6">
          <Card className="border-0 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden bg-white">
            <div className="bg-slate-50/80 p-5 items-center border-b border-slate-100">
               <h3 className="text-sm font-bold uppercase tracking-widest text-slate-800 flex items-center gap-2">
                 {editingId ? <Edit2 className="w-4 h-4 text-blue-600" /> : <Plus className="w-4 h-4 text-indigo-600" />}
                 {editingId ? 'Edit Jadwal' : 'Buat Jadwal Baru'}
               </h3>
               <p className="text-xs text-slate-500 mt-1 font-medium">Buka sesi ujian dan generate token otomatis</p>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nama Ujian / Sesi</label>
                <Input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Contoh: PAS Matematika X" 
                  className="h-11 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bank Soal (Materi)</label>
                <Select value={paketId} onValueChange={setPaketId}>
                  <SelectTrigger className="h-11 bg-slate-50 border-slate-200 focus:ring-indigo-500">
                    <SelectValue placeholder="Pilih Paket Soal" />
                  </SelectTrigger>
                  <SelectContent>
                    {paketList.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Peserta (Kelas)</label>
                  <Select value={kelasId} onValueChange={setKelasId}>
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200 focus:ring-indigo-500">
                      <SelectValue placeholder="Pilih Kelas" />
                    </SelectTrigger>
                    <SelectContent>
                      {kelasList.map(k => (
                        <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Durasi (Menit)</label>
                  <Input 
                    type="number"
                    value={duration} 
                    onChange={(e) => setDuration(e.target.value)} 
                    className="h-11 bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 font-mono text-center text-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jenis Ujian</label>
                  <Select value={jenisUjianId} onValueChange={setJenisUjianId}>
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200 focus:ring-indigo-500">
                      <SelectValue placeholder="Jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      {jenisUjianList.map(j => (
                        <SelectItem key={j.id} value={j.id}>{j.kode}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status Awal</label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-11 bg-slate-50 border-slate-200 font-bold focus:ring-indigo-500">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft"><span className="text-slate-600">Draft</span></SelectItem>
                      <SelectItem value="aktif"><span className="text-emerald-600">Aktif</span></SelectItem>
                      <SelectItem value="selesai"><span className="text-rose-600">Selesai</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                {editingId && (
                  <Button type="button" variant="outline" className="h-11 flex-1 font-bold rounded-xl" onClick={() => {
                    setEditingId(null);
                    setTitle(''); setPaketId(''); setKelasId(''); setDuration('120'); setStatus('draft');
                  }}>Batal</Button>
                )}
                <Button type="submit" className={`h-11 ${editingId ? 'flex-1' : 'w-full'} font-bold rounded-xl shadow-md ${editingId ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'}`}>
                  {editingId ? 'Update Jadwal' : 'Buat Jadwal & Token'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Kanan: Daftar Ujian Aktif & Lalu */}
        <div className="w-full lg:w-2/3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {ujianList.length === 0 && (
              <div className="col-span-full py-16 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                <div className="w-16 h-16 bg-white border border-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Calendar className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">Tidak ada Jadwal Ujian</h3>
                <p className="text-slate-500 max-w-sm mx-auto">Buat jadwal baru di form sebelah kiri untuk memulai sesi ujian.</p>
              </div>
            )}

            {ujianList.map(u => {
              const paket = paketList.find(p => p.id === u.paketId);
              const kelas = kelasList.find(k => k.id === u.kelasId);
              const jenis = jenisUjianList.find(j => j.id === u.jenisUjianId);
              
              const isAktif = u.status === 'aktif';
              const isSelesai = u.status === 'selesai';

              return (
                <Card 
                  key={u.id} 
                  className={`border-0 shadow-lg rounded-2xl overflow-hidden flex flex-col group transition-all duration-300 ${isAktif ? 'shadow-emerald-500/10 hover:shadow-emerald-500/20 ring-1 ring-emerald-500/20 bg-emerald-50/30' : isSelesai ? 'shadow-slate-200 bg-slate-50' : 'shadow-slate-200 bg-white hover:shadow-xl hover:shadow-indigo-500/5 ring-1 ring-slate-100'}`}
                >
                  <div className={`h-1.5 w-full ${isAktif ? 'bg-emerald-500' : isSelesai ? 'bg-slate-300' : 'bg-amber-400'}`} />
                  
                  <div className="p-5 flex-1 relative">
                    <div className="flex justify-between items-start mb-3">
                      <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 border
                        ${isAktif ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                          isSelesai ? 'bg-slate-200 text-slate-600 border-slate-300' : 
                          'bg-amber-100 text-amber-700 border-amber-200'}`}
                      >
                        {isAktif && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        {u.status}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-100 rounded-lg" onClick={() => handleEdit(u)}>
                           <Edit2 className="w-3.5 h-3.5" />
                         </Button>
                         <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:bg-red-100 rounded-lg" onClick={() => handleDelete(u.id)}>
                           <Trash2 className="w-3.5 h-3.5" />
                         </Button>
                      </div>
                    </div>

                    <h4 className="font-extrabold text-[1.1rem] leading-tight text-slate-800 mb-4 pr-6">{u.title}</h4>
                    
                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[13px]">
                      <div className="flex items-center gap-2 text-slate-600">
                        <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span className="font-medium truncate">{paket?.title || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-medium truncate">{kelas?.name || 'Semua Kelas'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="font-bold">{u.duration} <span className="font-medium text-slate-500">mnt</span></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Hash className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="font-bold">{soalCounts[u.paketId] || 0} <span className="font-medium text-slate-500">Soal</span></span>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100/80 flex items-center justify-between">
                       <div>
                         <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5 tracking-wider">Token Ujian</p>
                         <p className={`font-mono text-xl font-black tracking-widest ${isAktif ? 'text-emerald-600' : isSelesai ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                           {u.token || '------'}
                         </p>
                       </div>
                       
                       <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-10 w-10 text-indigo-600 border-indigo-200 hover:bg-indigo-50 rounded-xl" 
                            onClick={() => navigate(`/admin/bank-soal/${u.paketId}`)}
                            title="Pratinjau Soal"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {u.status !== 'selesai' && (
                            <Button 
                              onClick={() => toggleStatus(u.id, u.status)}
                              className={`h-10 px-4 rounded-xl font-bold shadow-sm ${
                                isAktif 
                                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200' 
                                  : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                              }`}
                            >
                              {isAktif ? (
                                <><StopCircle className="w-4 h-4 mr-1.5" /> Stop</>
                              ) : (
                                <><PlayCircle className="w-4 h-4 mr-1.5" /> Mulai</>
                              )}
                            </Button>
                          )}
                       </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
