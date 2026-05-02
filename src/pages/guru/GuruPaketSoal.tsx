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
import { Checkbox } from '@/components/ui/checkbox';

export default function GuruPaketSoal() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [paketList, setPaketList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<any[]>([]);
  const [kelasList, setKelasList] = useState<any[]>([]);
  
  const [isOpen, setIsOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMapelId, setNewMapelId] = useState('');
  const [newJenjang, setNewJenjang] = useState('SMA');
  const [newJurusan, setNewJurusan] = useState('Semua');
  const [newKelasIds, setNewKelasIds] = useState<string[]>([]);

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
    
    // Listen to Kelas
    const unKelas = onSnapshot(collection(db, 'kelas'), (snap) => {
      setKelasList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unMapel(); unPaket(); unKelas(); };
  }, [profile]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newMapelId || newKelasIds.length === 0) {
      if (newKelasIds.length === 0) toast.error('Pilih minimal 1 Kelas/Rombel');
      return;
    }

    try {
      await addDoc(collection(db, 'paket_soal'), {
        title: newTitle,
        mapelId: newMapelId,
        jenjang: newJenjang,
        jurusan: newJurusan,
        guruId: profile?.uid,
        kelasIds: newKelasIds,
        createdAt: serverTimestamp()
      });
      setIsOpen(false);
      setNewTitle('');
      setNewMapelId('');
      setNewJenjang('SMA');
      setNewJurusan('Semua');
      setNewKelasIds([]);
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
          <DialogTrigger render={<Button><FileText className="w-4 h-4 mr-2"/> Buat Paket Baru</Button>} />
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
                  <SelectTrigger><SelectValue placeholder="Pilih Mapel">
                    {mapelList.find(m=>m.id===newMapelId)?.name}
                  </SelectValue></SelectTrigger>
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
              <div className="grid gap-2">
                <label className="text-sm font-medium">Jurusan</label>
                <Select value={newJurusan} onValueChange={setNewJurusan}>
                  <SelectTrigger><SelectValue placeholder="Pilih Jurusan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semua">Semua Jurusan</SelectItem>
                    <SelectItem value="IPA">IPA</SelectItem>
                    <SelectItem value="IPS">IPS</SelectItem>
                    <SelectItem value="Bahasa">Bahasa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Kelas / Rombel <span className="text-rose-500">*</span></label>
                <div className="border border-input rounded-md p-3 max-h-[160px] overflow-y-auto space-y-2 bg-slate-50">
                  {kelasList.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2 font-medium">Belum ada data kelas</p>
                  ) : (
                    kelasList.map(kelas => (
                      <div key={kelas.id} className="flex items-center space-x-3 bg-white p-2 rounded border border-slate-100 shadow-sm hover:border-blue-200 transition-colors cursor-pointer">
                        <Checkbox 
                          id={`kelas-${kelas.id}`} 
                          checked={newKelasIds.includes(kelas.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewKelasIds([...newKelasIds, kelas.id]);
                            } else {
                              setNewKelasIds(newKelasIds.filter(id => id !== kelas.id));
                            }
                          }}
                        />
                        <label 
                          htmlFor={`kelas-${kelas.id}`} 
                          className="text-sm font-bold text-slate-700 cursor-pointer flex-1 py-1"
                        >
                          {kelas.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Bisa pilih lebih dari satu kelas.</p>
              </div>
              <Button type="submit" className="w-full font-bold">Simpan & Buat Paket</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nama Paket</TableHead>
              <TableHead>Mapel & Detail</TableHead>
              <TableHead>Kelas Tujuan</TableHead>
              <TableHead>Dibuat Tanggal</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paketList.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Anda belum memiliki paket soal. Buat sekarang.</TableCell></TableRow>
            ) : (
              paketList.map((p) => {
                const mapelName = mapelList.find(m => m.id === p.mapelId)?.name || p.mapelId;
                const d = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString('id-ID') : '-';
                
                // Get kelas names
                const kelasNames = p.kelasIds?.map((kid: string) => {
                  const k = kelasList.find(c => c.id === kid);
                  return k ? k.name : kid;
                }).join(', ') || '-';

                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-semibold text-primary">{p.title}</TableCell>
                    <TableCell>
                      <span className="font-bold text-slate-700">{mapelName}</span>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{p.jenjang}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{p.jurusan || 'Semua'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-slate-600 line-clamp-2 max-w-[200px]" title={kelasNames}>
                        {kelasNames}
                      </span>
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
