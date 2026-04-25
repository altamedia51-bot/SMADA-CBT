import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Settings, CreditCard, ListChecks, FileText, CheckCircle, School } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCetak() {
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [isKartuModalOpen, setIsKartuModalOpen] = useState(false);
  const [selectedKelasId, setSelectedKelasId] = useState('');
  
  // Print Mode State
  const [isPrintingKartu, setIsPrintingKartu] = useState(false);
  const [printData, setPrintData] = useState<any[]>([]);
  const [printKelasName, setPrintKelasName] = useState('');

  useEffect(() => {
    // Fetch Kelas
    getDocs(query(collection(db, 'kelas'), orderBy('name'))).then(snap => {
       setKelasList(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
  }, []);

  const handleOpenKartu = () => {
    setIsKartuModalOpen(true);
  };

  const handleGenerateKartu = async () => {
    if (!selectedKelasId) {
       toast.error("Silakan pilih kelas terlebih dahulu");
       return;
    }
    const kelasSelected = kelasList.find(k => k.id === selectedKelasId);
    if (!kelasSelected) return;

    try {
       // get users for this kelas
       // Normally we match by `kelasId` or `kelas` name
       const q = query(collection(db, 'users'), where('role', '==', 'siswa'));
       const snap = await getDocs(q);
       const siswaInKelas = snap.docs.map(d => d.data()).filter((s:any) => s.kelas === kelasSelected.name || s.kelasId === selectedKelasId);
       
       if (siswaInKelas.length === 0) {
          toast.error(`Tidak ada siswa ditemukan di kelas ${kelasSelected.name}`);
          return;
       }

       setPrintData(siswaInKelas.sort((a,b) => (a.name || a.displayName || '').localeCompare(b.name || b.displayName || '')));
       setPrintKelasName(kelasSelected.name);
       setIsKartuModalOpen(false);
       setIsPrintingKartu(true);
    } catch (err: any) {
       toast.error("Gagal mengambil data siswa: " + err.message);
    }
  };

  const handlePrintOther = (type: string) => {
    toast.info(`Fitur cetak ${type} akan segera hadir dalam versi berikutnya!`, {
      description: "Modul laporan PDF sedang disiapkan."
    });
  };

  if (isPrintingKartu) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-200 overflow-y-auto w-full h-full">
         <style>{`
            @media print {
              body * { visibility: hidden; }
              #print-container, #print-container * { visibility: visible; }
              #print-container { position: absolute; left: 0; top: 0; width: 100%; background: white;}
              .no-print { display: none !important; }
              .page-break { page-break-after: always; }
              @page { margin: 1cm; size: A4 portrait; }
            }
         `}</style>

         {/* Header / ActionBar (Hidden on print) */}
         <div className="no-print sticky top-0 bg-white border-b shadow-sm p-4 flex justify-between items-center z-10 px-8">
            <div>
               <h2 className="text-xl font-bold text-slate-800">Preview Kartu Peserta - {printKelasName}</h2>
               <p className="text-sm text-slate-500">Total: {printData.length} Peserta</p>
            </div>
            <div className="flex gap-3">
               <Button variant="outline" onClick={() => setIsPrintingKartu(false)} className="h-11">Kembali</Button>
               <Button onClick={() => window.print()} className="h-11 bg-blue-600 hover:bg-blue-700 px-6 font-bold shadow-lg shadow-blue-500/20">
                 <Printer className="w-4 h-4 mr-2" /> Cetak Sekarang
               </Button>
            </div>
         </div>

         {/* Print Page (Visible on print) */}
         <div id="print-container" className="max-w-[21cm] mx-auto bg-white min-h-[29.7cm] p-8 shadow-2xl my-8 print:my-0 print:shadow-none">
            <div className="grid grid-cols-2 gap-4">
               {printData.map((siswa, idx) => (
                 <div key={siswa.uid || idx} className="border-2 border-slate-800 rounded-xl overflow-hidden print:border-[1.5px] print:rounded-lg break-inside-avoid">
                    <div className="border-b-2 border-slate-800 p-3 bg-slate-100 flex items-center justify-between text-center print:border-b-[1.5px]">
                       <School className="w-8 h-8 text-slate-700" />
                       <div className="flex-1 px-2">
                         <h3 className="font-black text-[13px] uppercase tracking-wide">KARTU PESERTA UJIAN</h3>
                         <p className="font-bold text-[10px] text-slate-600 uppercase">SMADA CBT SYSTEM</p>
                       </div>
                    </div>
                    <div className="p-4 space-y-3">
                       <table className="w-full text-[11px] font-bold">
                          <tbody>
                             <tr className="border-b border-dashed border-slate-300">
                                <td className="py-2 text-slate-500 w-[70px]">NAMA</td>
                                <td className="py-2 px-1">:</td>
                                <td className="py-2 text-slate-900 uppercase truncate max-w-[120px]">{siswa.name || siswa.displayName || '-'}</td>
                             </tr>
                             <tr className="border-b border-dashed border-slate-300">
                                <td className="py-2 text-slate-500">NIS / ID</td>
                                <td className="py-2 px-1">:</td>
                                <td className="py-2 text-slate-900 font-mono tracking-wider">{siswa.nis || (siswa.email ? siswa.email.split('@')[0] : '-')}</td>
                             </tr>
                             <tr className="border-b border-dashed border-slate-300">
                                <td className="py-2 text-slate-500">KELAS</td>
                                <td className="py-2 px-1">:</td>
                                <td className="py-2 text-slate-900">{siswa.kelas || printKelasName}</td>
                             </tr>
                             <tr className="border-b border-dashed border-slate-300">
                                <td className="py-2 text-slate-500">RUANG & SESI</td>
                                <td className="py-2 px-1">:</td>
                                <td className="py-2 text-slate-900">{siswa.ruangId || '01'} - SESI {siswa.sesiId || '1'}</td>
                             </tr>
                             <tr className="border-t-2 border-slate-800">
                                <td className="pt-3 text-sm text-blue-800 w-[70px] font-black">PASSWORD</td>
                                <td className="pt-3 px-1">:</td>
                                <td className="pt-3 text-sm text-slate-900 font-mono font-black tracking-widest">{siswa.showPassword ? siswa.showPassword : (siswa.tempPassword || '123456')}</td>
                             </tr>
                          </tbody>
                       </table>
                    </div>
                 </div>
               ))}
            </div>
         </div>
      </div>
    );
  }

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

        <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 font-bold h-11 px-6 rounded-xl uppercase text-xs tracking-wider">
          <Settings className="w-4 h-4 mr-2" /> Pengaturan Cetak
        </Button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        
        {/* Card 1: Kartu Peserta */}
        <Card 
          className="p-10 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-100/50 shadow-sm rounded-2xl group relative overflow-hidden"
          onClick={handleOpenKartu}
        >
          <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
             <CheckCircle className="w-6 h-6 text-blue-500" />
          </div>
          <div className="w-24 h-24 rounded-3xl bg-[#00d0f1] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300 shadow-lg shadow-cyan-500/20">
            <CreditCard className="w-12 h-12 text-white" strokeWidth={1.5} />
          </div>
          <h3 className="font-bold text-slate-700 text-lg">Cetak Kartu Peserta</h3>
        </Card>

        {/* Card 2: Daftar Hadir */}
        <Card 
          className="p-10 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-100/50 shadow-sm rounded-2xl group"
          onClick={() => handlePrintOther('Daftar Hadir')}
        >
          <div className="w-24 h-24 rounded-3xl bg-[#f59e0b] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300 shadow-lg shadow-amber-500/20">
            <ListChecks className="w-12 h-12 text-white" strokeWidth={1.5} />
          </div>
          <h3 className="font-bold text-slate-700 text-lg">Cetak Daftar Hadir</h3>
        </Card>

        {/* Card 3: Berita Acara */}
        <Card 
          className="p-10 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-100/50 shadow-sm rounded-2xl group"
          onClick={() => handlePrintOther('Berita Acara')}
        >
          <div className="w-24 h-24 rounded-3xl bg-[#3b82f6] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300 shadow-lg shadow-blue-500/20">
            <FileText className="w-12 h-12 text-white" strokeWidth={1.5} />
          </div>
          <h3 className="font-bold text-slate-700 text-lg">Cetak Berita Acara</h3>
        </Card>

      </div>

      <Dialog open={isKartuModalOpen} onOpenChange={setIsKartuModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" /> Cetak Kartu Berdasarkan Kelas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pilih Kelas</label>
               <Select value={selectedKelasId} onValueChange={setSelectedKelasId}>
                 <SelectTrigger className="h-12 border-slate-200">
                   <SelectValue placeholder="Pilih Kelas Peserta" />
                 </SelectTrigger>
                 <SelectContent>
                   {kelasList.map(k => (
                     <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
            </div>
            
            <div className="flex gap-3">
               <Button variant="outline" className="h-11 flex-1 font-bold" onClick={() => setIsKartuModalOpen(false)}>Batal</Button>
               <Button className="h-11 flex-1 bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20" onClick={handleGenerateKartu}>
                 <Printer className="w-4 h-4 mr-2" /> Buat Kartu
               </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
