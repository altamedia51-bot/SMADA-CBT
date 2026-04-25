import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Users, Plus, Trash2, Key } from 'lucide-react';
import firebaseConfig from '../../../firebase-applet-config.json';

export default function AdminUsers() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'admin'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAdmins(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('Harap lengkapi semua field');
      return;
    }
    
    setIsLoading(true);
    try {
      // Create user auth with explicit REST API call so we don't log out the current admin
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, returnSecureToken: false })
      });
      const authData = await res.json();
      
      if (!res.ok) throw new Error(authData.error?.message || "Gagal membuat user");

      const uid = authData.localId;

      // Save to db
      await setDoc(doc(db, 'users', uid), {
        uid: uid,
        email: form.email,
        displayName: form.name,
        role: 'admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast.success('Berhasil menambahkan administrator');
      setForm({ name: '', email: '', password: '' });
      fetchAdmins();
    } catch (err: any) {
      toast.error('Gagal menambahkan admin: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!window.confirm(`Yakin ingin menghapus administrator ${email}?`)) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      toast.success('Administrator dihapus (auth masih ada, tapi tidak bisa login CBT)');
      fetchAdmins();
    } catch (err: any) {
      toast.error('Gagal menghapus admin: ' + err.message);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600">
          <Users className="w-6 h-6" />
        </div>
        <div>
           <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">User Management</h2>
           <p className="text-slate-500 font-medium">Platform administrator & root users</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 col-span-1 shadow-sm border-slate-200">
           <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
             <Plus className="w-5 h-5 text-indigo-500" /> Tambah Admin Baru
           </h3>
           <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                 <label className="text-xs font-bold text-slate-500 block mb-1">Nama Lengkap</label>
                 <Input value={form.name} onChange={e=>setForm({...form, name: e.target.value})} placeholder="Contoh: Admin Utama" />
              </div>
              <div>
                 <label className="text-xs font-bold text-slate-500 block mb-1">Email</label>
                 <Input type="email" value={form.email} onChange={e=>setForm({...form, email: e.target.value})} placeholder="admin@smada.ac.id" />
              </div>
              <div>
                 <label className="text-xs font-bold text-slate-500 block mb-1">Password Baru</label>
                 <Input type="password" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} placeholder="******" />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                 {isLoading ? 'Menyimpan...' : 'Simpan Administrator'}
              </Button>
           </form>
        </Card>

        <Card className="p-0 col-span-1 md:col-span-2 shadow-sm border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100">
             <h3 className="font-bold text-lg flex items-center gap-2">
               <Key className="w-5 h-5 text-emerald-500" /> Daftar Administrator
             </h3>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100/50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200/60">
              <tr>
                <th className="px-5 py-3">Nama & Email</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map(admin => (
                <tr key={admin.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                     <p className="font-bold text-slate-800">{admin.displayName || admin.name}</p>
                     <p className="text-indigo-600 font-mono text-xs">{admin.email}</p>
                  </td>
                  <td className="px-5 py-3 text-center">
                     <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider">Aktif</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                     <Button variant="ghost" size="icon" onClick={() => handleDelete(admin.id, admin.email)} className="text-rose-500 hover:bg-rose-50 rounded-lg">
                       <Trash2 className="w-4 h-4" />
                     </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
