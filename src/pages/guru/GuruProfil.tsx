import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '../../store/auth.store';
import { UserRound, Mail, School, KeyRound, ShieldCheck, Asterisk } from 'lucide-react';
import { toast } from 'sonner';

export default function GuruProfil() {
  const { profile } = useAuthStore();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdatePassword = () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('Gagal', { description: 'Semua kolom password harus diisi.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Gagal', { description: 'Password baru dan konfirmasi tidak cocok.' });
      return;
    }
    // TODO: implement firebase update password if email/password auth is used
    toast.success('Berhasil', { description: 'Pengaturan profil telah disimpan. (Simulasi)' });
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 font-sans max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Profil Saya</h1>
        <p className="text-sm text-slate-500 mt-1">Kelola informasi pribadi dan pengaturan akun Anda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card className="p-6 flex flex-col items-center text-center">
             <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-3xl mb-4">
                {profile?.displayName?.charAt(0).toUpperCase() || 'G'}
             </div>
             <h2 className="text-xl font-bold text-slate-800">{profile?.displayName || 'Guru User'}</h2>
             <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mt-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Pengajar
             </span>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <UserRound className="w-4 h-4 text-slate-400" /> Informasi Pribadi
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">NAMA LENGKAP</label>
                <div className="flex items-center">
                  <div className="bg-slate-50 border border-slate-200 border-r-0 rounded-l-md px-3 h-10 flex items-center justify-center">
                     <UserRound className="w-4 h-4 text-slate-400" />
                  </div>
                  <Input value={profile?.displayName || ''} disabled className="rounded-l-none bg-slate-50 font-medium" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">EMAIL / USERNAME</label>
                <div className="flex items-center">
                  <div className="bg-slate-50 border border-slate-200 border-r-0 rounded-l-md px-3 h-10 flex items-center justify-center">
                     <Mail className="w-4 h-4 text-slate-400" />
                  </div>
                  <Input value={profile?.email || 'user@example.com'} disabled className="rounded-l-none bg-slate-50" />
                </div>
              </div>
              
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">UNIT KERJA / SEKOLAH</label>
                <div className="flex items-center">
                  <div className="bg-slate-50 border border-slate-200 border-r-0 rounded-l-md px-3 h-10 flex items-center justify-center">
                     <School className="w-4 h-4 text-slate-400" />
                  </div>
                  <Input value={'SMA (Sistem CBT)'} disabled className="rounded-l-none bg-slate-50" />
                </div>
                <p className="text-xs text-slate-400 mt-2">Sebagian informasi profil saat ini dikunci oleh Administrator tingkat sekolah.</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-slate-400" /> Ganti Password
            </h3>
            
            <div className="space-y-4">
              <div>
                 <label className="text-xs font-bold text-slate-500 mb-1 block">PASSWORD LAMA</label>
                 <div className="relative">
                    <Asterisk className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <Input type="password" placeholder="••••••••" className="pl-9" value={oldPassword} onChange={e=>setOldPassword(e.target.value)} />
                 </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label className="text-xs font-bold text-slate-500 mb-1 block">PASSWORD BARU</label>
                   <Input type="password" placeholder="Minimal 6 karakter" value={newPassword} onChange={e=>setNewPassword(e.target.value)} />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 mb-1 block">KONFIRMASI PASSWORD</label>
                   <Input type="password" placeholder="Ketik ulang password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} />
                </div>
              </div>
              <div className="pt-2">
                 <Button onClick={handleUpdatePassword} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 w-full sm:w-auto">
                    Simpan Perubahan
                 </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
