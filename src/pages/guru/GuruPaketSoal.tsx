import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Trash2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function GuruPaketSoal() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [paketList, setPaketList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<any[]>([]);
  
  const [isOpen, setIsOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMapelId, setNewMapelId] = useState('');
  const [newJenjang, setNewJenjang] = useState('SMA');

  useEffect(() => {
    if (!profile) return;
    
    // Listen to Mapel for selector
    const unMapel = onSnapshot(collection(db, 'mapel'), (snap) => {
      setMapelList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to Paket Soal owned by this guru
    const qPaket = query(collection(db, 'paket_soal'), where('guruId', '==', profile.uid));
    const unPaket = onSnapshot(qPaket, (snap) => {
      setPaketList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unMapel(); unPaket(); };
  }, [profile]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newMapelId) return;

    try {
      await addDoc(collection(db, 'paket_soal'), {
        title: newTitle,
        mapelId: newMapelId,
        jenjang: newJenjang,
        guruId: profile?.uid,
        kelasIds: [],
        createdAt: serverTimestamp()
      });
      setIsOpen(false);
      setNewTitle('');
      toast.success('Paket soal berhasil dibuat!');
    } catch (err: any) {
      toast.error('Gagal membuat paket: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Yakin hapus paket soal ini beserta data soal di dalamnya?")) return;
    try {
      await deleteDoc(doc(db, 'paket_soal', id));
      toast.success('Paket Dihapus');
    } catch (err: any) {
      toast.error('Gagal hapus: ' + err.message);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold">Bank Paket Soal</h2>
          <p className="text-muted-foreground text-sm mt-1">Kelola pembuatan evaluasi dan bank soal ujian.</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><FileText className="w-4 h-4 mr-2"/> Buat Paket Baru</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Paket Soal Baru</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Judul Ujian/Paket</label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Contoh: PAS Matematika Semester 1" required />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Mata Pelajaran</label>
                <Select value={newMapelId} onValueChange={setNewMapelId} required>
                  <SelectTrigger><SelectValue placeholder="Pilih Mapel" /></SelectTrigger>
                  <SelectContent>
                    {mapelList.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name} ({m.jenjang})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Jenjang Ujian</label>
                <Select value={newJenjang} onValueChange={setNewJenjang}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SD">SD</SelectItem>
                    <SelectItem value="SMP">SMP</SelectItem>
                    <SelectItem value="SMA">SMA</SelectItem>
                    <SelectItem value="SMK">SMK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Simpan & Buat</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nama Paket</TableHead>
              <TableHead>Mapel & Jenjang</TableHead>
              <TableHead>Dibuat Tanggal</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paketList.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Anda belum memiliki paket soal. Buat sekarang.</TableCell></TableRow>
            ) : (
              paketList.map((p) => {
                const mapelName = mapelList.find(m => m.id === p.mapelId)?.name || p.mapelId;
                const d = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString('id-ID') : '-';
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold text-primary">{p.title}</TableCell>
                    <TableCell>
                      <span className="font-medium">{mapelName}</span>
                      <span className="ml-2 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">{p.jenjang}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{d}</TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/guru/paket-soal/${p.id}`)}>
                        Manajemen Soal <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
