import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer, Settings, CreditCard, ListChecks, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCetak() {
  const handlePrintClick = (type: string) => {
    toast.info(`Fitur cetak ${type} akan segera hadir dalam versi berikutnya!`, {
      description: "Modul pembuatan PDF sedang disiapkan."
    });
  };

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Printer className="w-6 h-6 text-blue-600" /> Cetak / Print
          </h2>
          <p className="text-xs font-bold text-slate-400 mt-2 tracking-widest uppercase">
            Cetak Kartu Peserta, Daftar Hadir dan Berita Acara Ujian
          </p>
        </div>

        <Button className="bg-[#00d0f1] hover:bg-[#00b8d4] text-white font-bold h-11 px-6 rounded-lg uppercase text-xs tracking-wider shadow-lg shadow-cyan-500/20">
          <Settings className="w-4 h-4 mr-2" /> Pengaturan Kartu
        </Button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        
        {/* Card 1: Kartu Peserta */}
        <Card 
          className="p-10 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-100/50 shadow-sm rounded-2xl group"
          onClick={() => handlePrintClick('Kartu Peserta')}
        >
          <div className="w-24 h-24 rounded-3xl bg-[#00d0f1] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300 shadow-lg shadow-cyan-500/20">
            <CreditCard className="w-12 h-12 text-white" strokeWidth={1.5} />
          </div>
          <h3 className="font-bold text-slate-700 text-lg">Cetak Kartu Peserta</h3>
        </Card>

        {/* Card 2: Daftar Hadir */}
        <Card 
          className="p-10 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-100/50 shadow-sm rounded-2xl group"
          onClick={() => handlePrintClick('Daftar Hadir')}
        >
          <div className="w-24 h-24 rounded-3xl bg-[#f59e0b] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300 shadow-lg shadow-amber-500/20">
            <ListChecks className="w-12 h-12 text-white" strokeWidth={1.5} />
          </div>
          <h3 className="font-bold text-slate-700 text-lg">Cetak Daftar Hadir</h3>
        </Card>

        {/* Card 3: Berita Acara */}
        <Card 
          className="p-10 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-100/50 shadow-sm rounded-2xl group"
          onClick={() => handlePrintClick('Berita Acara')}
        >
          <div className="w-24 h-24 rounded-3xl bg-[#3b82f6] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300 shadow-lg shadow-blue-500/20">
            <FileText className="w-12 h-12 text-white" strokeWidth={1.5} />
          </div>
          <h3 className="font-bold text-slate-700 text-lg">Cetak Berita Acara</h3>
        </Card>

      </div>
    </div>
  );
}
