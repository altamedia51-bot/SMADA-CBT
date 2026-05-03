import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Settings, Upload, Image as ImageIcon } from 'lucide-react';

export default function AdminPengaturan() {
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [appName, setAppName] = useState<string>('CBT System');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.logo) setLogoBase64(data.logo);
          if (data.appName) setAppName(data.appName);
        }
      } catch (error) {
        console.error("Gagal mengambil pengaturan:", error);
      }
    };
    fetchSettings();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast.error('Ukuran file maksimal 500KB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), {
        logo: logoBase64,
        appName: appName
      }, { merge: true });
      toast.success('Pengaturan berhasil disimpan!');
    } catch (error: any) {
      toast.error('Gagal menyimpan pengaturan: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-8">
         <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 shadow-sm border border-slate-200">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Pengaturan Aplikasi</h1>
          <p className="text-slate-500 font-medium">Ubah identitas aplikasi seperti logo dan nama.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identitas Sekolah / Instansi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Nama Aplikasi</label>
            <Input 
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Contoh: CBT SMA Negeri 1"
              className="max-w-md"
            />
          </div>

          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-700 block">Logo Aplikasi</label>
            <div className="flex items-start gap-6">
               <div className="w-24 h-24 shrink-0 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden relative">
                  {logoBase64 ? (
                     <img src={logoBase64} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                     <ImageIcon className="w-8 h-8 text-slate-300" />
                  )}
               </div>
               <div className="flex-1 space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Pilih Gambar
                  </Button>
                  <p className="text-xs text-slate-500 font-medium tracking-wide">Format: JPG, PNG. Rekomendasi rasio 1:1, max 500KB.</p>
                  
                  {logoBase64 && (
                     <Button variant="ghost" size="sm" onClick={() => setLogoBase64('')} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-8 px-3">
                        Hapus Logo
                     </Button>
                  )}
               </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end">
            <Button onClick={handleSave} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
              {isLoading ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
