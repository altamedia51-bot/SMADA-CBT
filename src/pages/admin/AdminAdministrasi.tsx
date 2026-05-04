import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { AlertCircle, FileText, Users, Box, ClipboardCheck } from 'lucide-react';

export default function AdminAdministrasi() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  
  // Determine which section we are in based on path
  const pathParts = location.pathname.split('/');
  const section = pathParts[2]; // kurikulum, sarpras, kesiswaan, humas
  const subSection = pathParts[4]; // nilai, dkn, raport
  
  const getTitle = () => {
    if (section === 'kurikulum') {
      if (subSection === 'nilai') return 'Input Nilai Keseluruhan';
      if (subSection === 'dkn') return 'DKN (Daftar Kumpulan Nilai)';
      if (subSection === 'raport') return 'Cetak Raport Siswa';
      return 'Administrasi Kurikulum';
    }
    if (section === 'sarpras') return 'Sarana & Prasarana';
    if (section === 'kesiswaan') return 'Administrasi Kesiswaan';
    if (section === 'humas') return 'Hubungan Masyarakat (Humas)';
    return 'Administrasi';
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between border-b pb-5 border-slate-200">
        <div>
           <h1 className="text-3xl font-black text-slate-800 tracking-tight">{getTitle()}</h1>
           <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-1">Sistem Informasi Administrasi Sekolah</p>
        </div>
      </div>

      <Card className="p-12 text-center space-y-4 border-dashed border-2 border-slate-200 bg-slate-50/50">
         <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <AlertCircle className="w-10 h-10 text-blue-600" />
         </div>
         <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
               {subSection ? `Modul ${subSection.toUpperCase()} Segera Hadir` : `${getTitle()} Dalam Pengembangan`}
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed font-medium">
               Kami sedang merancang modul ini untuk memudahkan pengelolaan data <b>{getTitle()}</b> secara digital dan terintegrasi.
            </p>
         </div>
      </Card>
      
      {/* Specific Module Containers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {section === 'kesiswaan' && (
           <Card className="p-6 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-black text-slate-800 mb-4 flex items-center gap-3 text-lg">
                 <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    <Users className="w-5 h-5" />
                 </div>
                 Pelanggaran Siswa
              </h3>
              <div className="p-10 border-2 border-dashed border-slate-100 rounded-xl text-center text-slate-400 text-sm font-bold italic bg-slate-50/30">
                 Daftar & Point Pelanggaran Siswa
              </div>
           </Card>
        )}

        {section === 'humas' && (
           <Card className="p-6 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-black text-slate-800 mb-4 flex items-center gap-3 text-lg">
                 <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                    <Users className="w-5 h-5" />
                 </div>
                 Bantuan LSD
              </h3>
              <div className="p-10 border-2 border-dashed border-slate-100 rounded-xl text-center text-slate-400 text-sm font-bold italic bg-slate-50/30">
                 Manajemen Logistik & Bantuan LSD
              </div>
           </Card>
        )}

        {section === 'sarpras' && (
           <Card className="p-6 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-black text-slate-800 mb-4 flex items-center gap-3 text-lg">
                 <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                    <Box className="w-5 h-5" />
                 </div>
                 Data Inventaris
              </h3>
              <div className="p-10 border-2 border-dashed border-slate-100 rounded-xl text-center text-slate-400 text-sm font-bold italic bg-slate-50/30">
                 Gudang & Sarana Prasarana
              </div>
           </Card>
        )}

        {section === 'kurikulum' && (
           <Card className="p-6 border-slate-200 shadow-sm hover:shadow-md transition-shadow md:col-span-2">
              <h3 className="font-black text-slate-800 mb-6 flex items-center gap-3 text-lg border-b pb-4">
                 <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <ClipboardCheck className="w-5 h-5" />
                 </div>
                 Data Akademik & Kurikulum
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                 {[
                    { label: 'Input Nilai Keseluruhan', path: '/admin/kurikulum/akademik/nilai', icon: FileText, color: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                    { label: 'DKN (Daftar Nilai)', path: '/admin/kurikulum/akademik/dkn', icon: ClipboardCheck, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                    { label: 'Cetak Raport', path: '/admin/kurikulum/akademik/raport', icon: FileText, color: 'bg-amber-50 text-amber-700 border-amber-100' },
                    { label: 'Ledger Kelas', path: '/admin/kurikulum/akademik/leger', icon: Box, color: 'bg-rose-50 text-rose-700 border-rose-100' },
                 ].map((mod) => (
                    <button
                       key={mod.path}
                       onClick={() => window.location.href = mod.path}
                       className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all hover:scale-105 active:scale-95 text-center gap-3 cursor-pointer ${mod.color}`}
                    >
                       <mod.icon className="w-8 h-8 opacity-80" />
                       <span className="font-black text-xs uppercase tracking-tighter leading-tight">{mod.label}</span>
                    </button>
                 ))}
              </div>
           </Card>
        )}
      </div>
    </div>
  );
}
