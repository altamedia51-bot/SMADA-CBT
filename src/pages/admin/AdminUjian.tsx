import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, PlayCircle, StopCircle, Calendar } from 'lucide-react';

export default function AdminUjian() {
  const [ujianList, setUjianList] = useState<any[]>([]);
  const [paketList, setPaketList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  
  const [title, setTitle] = useState('');
  const [paketId, setPaketId] = useState('');
  const [kelasId, setKelasId] = useState('');
  const [duration, setDuration] = useState('120'); // minutes
  const [status, setStatus] = useState('draft'); // draft, aktif, selesai

  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch Ujian
    const qUjian = query(collection(db, 'ujian'));
    const unsubUjian = onSnapshot(qUjian, snap => {
      setUjianList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch Paket Soal
    const qPaket = query(collection(db, 'paket_soal'));
    const unsubPaket = onSnapshot(qPaket, snap => {
      setPaketList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch Kelas
    const qKelas = query(collection(db, 'kelas'));
    const unsubKelas = onSnapshot(qKelas, snap => {
      setKelasList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubUjian(); unsubPaket(); unsubKelas();
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !paketId || !kelasId || !duration) {
      return toast.error('Harap lengkapi semua bidang');
    }

    try {
      const payload = {
        title,
        paketId,
        kelasId,
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
      {/* Kiri: Form */}
      <div className="w-full md:w-1/3">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">Manajemen Ujian</h2>
        <Card className="p-5 shadow-sm">
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1 block">Nama Ujian</label>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="Contoh: PAS Matematika X" 
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">Paket Soal</label>
              <Select value={paketId} onValueChange={setPaketId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Paket Soal" />
                </SelectTrigger>
                <SelectContent>
                  {paketList.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">Peserta (Kelas)</label>
              <Select value={kelasId} onValueChange={setKelasId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Kelas" />
                </SelectTrigger>
                <SelectContent>
                  {kelasList.map(k => (
                    <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">Durasi (Menit)</label>
              <Input 
                type="number"
                value={duration} 
                onChange={(e) => setDuration(e.target.value)} 
              />
            </div>

            <div>
              <label className="text-sm font-semibold mb-1 block">Status Awal</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft (Belum Mulai)</SelectItem>
                  <SelectItem value="aktif">Aktif (Sedang Berjalan)</SelectItem>
                  <SelectItem value="selesai">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 flex gap-2">
              <Button type="submit" className="flex-1">
                {editingId ? 'Update Ujian' : 'Simpan Ujian'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={() => {
                  setEditingId(null);
                  setTitle(''); setPaketId(''); setKelasId(''); setDuration('120'); setStatus('draft');
                }}>Batal</Button>
              )}
            </div>
          </form>
        </Card>
      </div>

      {/* Kanan: Daftar Ujian */}
      <div className="w-full md:w-2/3">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" /> Daftar Sesi Ujian
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ujianList.map(u => {
            const paket = paketList.find(p => p.id === u.paketId);
            const kelas = kelasList.find(k => k.id === u.kelasId);
            
            return (
              <Card key={u.id} className="p-4 border shadow-sm flex flex-col relative overflow-hidden transition-all hover:shadow-md">
                <div className={`absolute top-0 right-0 w-2 h-full ${
                  u.status === 'aktif' ? 'bg-emerald-500' : 
                  u.status === 'selesai' ? 'bg-slate-300' : 'bg-amber-400'
                }`} />
                
                <h4 className="font-bold text-lg mb-1 pr-4">{u.title}</h4>
                <div className="text-sm text-muted-foreground space-y-1 mb-4 flex-1">
                  <p>Paket: <span className="font-medium text-slate-700">{paket?.title || '-'}</span></p>
                  <p>Kelas: <span className="font-medium text-slate-700">{kelas?.name || '-'}</span></p>
                  <p>Durasi: <span className="font-medium text-slate-700">{u.duration} Menit</span></p>
                  <div className="mt-2 bg-slate-100 p-2 rounded-md border text-center">
                    <p className="text-xs uppercase font-bold text-slate-400 mb-0.5">Token Ujian</p>
                    <p className="text-xl font-black tracking-[0.2em] text-blue-600">{u.token || '------'}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-auto border-t pt-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${
                    u.status === 'aktif' ? 'bg-emerald-100 text-emerald-700' : 
                    u.status === 'selesai' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {u.status}
                  </span>

                  <div className="flex gap-1.5">
                    {u.status !== 'selesai' && (
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className={`h-8 w-8 ${u.status === 'aktif' ? 'text-rose-600 border-rose-200 hover:bg-rose-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}
                        onClick={() => toggleStatus(u.id, u.status)}
                        title={u.status === 'aktif' ? 'Hentikan Ujian' : 'Mulai Ujian'}
                      >
                        {u.status === 'aktif' ? <StopCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                      </Button>
                    )}
                    <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleEdit(u)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(u.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
          
          {ujianList.length === 0 && (
            <div className="col-span-2 text-center p-8 border border-dashed rounded-lg text-muted-foreground">
              Belum ada ujian yang dijadwalkan. Buat baru melalui form di samping.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
