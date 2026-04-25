import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/auth.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Trash2, ArrowRight, BookOpen, Layers, Plus, PencilRuler } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function AdminBankSoal() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [paketList, setPaketList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<any[]>([]);
  const [guruList, setGuruList] = useState<any[]>([]);
  
  const [isOpen, setIsOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMapelId, setNewMapelId] = useState('');
  const [newJenjang, setNewJenjang] = useState('SMA');
  const [newGuruId, setNewGuruId] = useState('');

  // Search and Filter states (optional enhancements)
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Listen to Mapel for selector
    const unMapel = onSnapshot(collection(db, 'mapel'), (snap) => {
      setMapelList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unGuru = onSnapshot(collection(db, 'users'), (snap) => {
      // Filtering out only users with role guru might be required. But let's get all for now, or just users.
      // Assuming users collection stores roles:
      const teachers = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((u: any) => u.role === 'guru' || u.role === 'admin');
      setGuruList(teachers);
    });

    // Listen to all Paket Soal
    const qPaket = query(collection(db, 'paket_soal'));
    const unPaket = onSnapshot(qPaket, (snap) => {
      setPaketList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unMapel(); unPaket(); unGuru(); };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newMapelId || !newGuruId) return toast.error("Semua field wajib diisi");

    try {
      await addDoc(collection(db, 'paket_soal'), {
        title: newTitle,
        mapelId: newMapelId,
        jenjang: newJenjang,
        guruId: newGuruId, // Assigned Guru
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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(!confirm("Yakin hapus paket soal ini beserta data soal di dalamnya?")) return;
    try {
      await deleteDoc(doc(db, 'paket_soal', id));
      toast.success('Paket Dihapus');
    } catch (err: any) {
      toast.error('Gagal hapus: ' + err.message);
    }
  };

  const filteredPaket = paketList.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600">
               <BookOpen className="w-6 h-6" />
             </div>
             <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Bank Soal</h2>
          </div>
          <p className="text-slate-500 font-medium max-w-xl">Pusat repositori modul paket soal. Semua paket soal yang dibuat oleh guru atau admin tersimpan di sini dan siap dijadwalkan untuk Ujian.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <Input 
             placeholder="Cari nama paket soal..." 
             value={search}
             onChange={e => setSearch(e.target.value)}
             className="w-full sm:w-64 h-11 bg-white border-slate-200"
          />
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto h-11 px-6 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 rounded-full font-bold">
                <Plus className="w-4 h-4 mr-2"/> Buat Paket Bank Soal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   <Layers className="text-blue-600 w-5 h-5"/> Buat Paket Soal Baru
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Judul Paket Soal</label>
                  <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Contoh: PAS Matematika Semester 1" className="h-11" required />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mata Pelajaran</label>
                  <Select value={newMapelId} onValueChange={setNewMapelId} required>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Pilih Mapel" /></SelectTrigger>
                    <SelectContent>
                      {mapelList.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jenjang Set</label>
                    <Select value={newJenjang} onValueChange={setNewJenjang}>
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SD">SD</SelectItem>
                        <SelectItem value="SMP">SMP</SelectItem>
                        <SelectItem value="SMA">SMA</SelectItem>
                        <SelectItem value="SMK">SMK</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Penulis / Guru</label>
                    <Select value={newGuruId} onValueChange={setNewGuruId} required>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Pilih Pembuat" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={profile?.uid || ''}>Saya Sendiri (Admin)</SelectItem>
                        {guruList.map(g => (
                          g.id !== profile?.uid && <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-4">
                  <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-base shadow-md shadow-blue-600/20">
                     Simpan & Buka Editor Editor
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Grid List Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {filteredPaket.length === 0 ? (
           <div className="col-span-full py-16 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
             <div className="w-16 h-16 bg-white border border-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <FileText className="w-8 h-8 text-slate-400" />
             </div>
             <h3 className="text-lg font-bold text-slate-700 mb-1">Belum ada Bank Soal</h3>
             <p className="text-slate-500 max-w-sm mx-auto">Mulai dengan membuat paket soal pertama Anda. Atau biarkan guru-guru yang membuatnya.</p>
           </div>
         ) : (
            filteredPaket.map((p) => {
              const mapelName = mapelList.find(m => m.id === p.mapelId)?.name || "Unknown Mapel";
              const author = guruList.find(g => g.id === p.guruId)?.name || 'Admin';
              
              return (
                <Card 
                  key={p.id} 
                  className="bg-white border hover:border-blue-400 group cursor-pointer transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 rounded-2xl overflow-hidden flex flex-col"
                  onClick={() => navigate(`/admin/bank-soal/${p.id}`)}
                >
                  <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                  <CardHeader className="pb-3 relative flex-1">
                    <div className="flex justify-between items-start mb-2">
                       <span className="inline-flex font-bold uppercase tracking-wider text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full border border-indigo-100">
                         {p.jenjang}
                       </span>
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 -mt-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                         onClick={(e) => handleDelete(p.id, e)}
                       >
                          <Trash2 className="w-4 h-4" />
                       </Button>
                    </div>
                    <CardTitle className="text-xl font-bold leading-snug text-slate-800 group-hover:text-blue-600 transition-colors">
                      {p.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                         <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                           <BookOpen className="w-4 h-4 text-blue-500" />
                         </div>
                         <div className="font-medium truncate">{mapelName}</div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                         <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                           <PencilRuler className="w-4 h-4 text-emerald-500" />
                         </div>
                         <div className="font-medium truncate">By: {author}</div>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t flex justify-between items-center text-sm font-medium">
                       <span className="text-slate-500 text-xs">Klik untuk kelola soal &rarr;</span>
                       <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold border">
                          Modul Soal
                       </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
         )}
      </div>
    </div>
  );
}
