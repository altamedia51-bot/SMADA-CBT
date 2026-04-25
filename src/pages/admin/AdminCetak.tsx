import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Settings, CreditCard, ListChecks, FileText, CheckCircle, School, FileQuestion, ScanLine } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCetak() {
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [ujianList, setUjianList] = useState<any[]>([]);
  const [paketList, setPaketList] = useState<any[]>([]);
  
  const [isKartuModalOpen, setIsKartuModalOpen] = useState(false);
  const [isHadirModalOpen, setIsHadirModalOpen] = useState(false);
  const [isBeritaModalOpen, setIsBeritaModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSoalModalOpen, setIsSoalModalOpen] = useState(false);
  const [isLjkModalOpen, setIsLjkModalOpen] = useState(false);
  
  const [selectedKelasId, setSelectedKelasId] = useState('');
  const [selectedUjianId, setSelectedUjianId] = useState('');
  const [selectedPaketId, setSelectedPaketId] = useState('');
  const [jumlahSoalLjk, setJumlahSoalLjk] = useState(50);
  
  const [printMode, setPrintMode] = useState<'none'|'kartu'|'hadir'|'berita'|'soal'|'ljk'>('none');
  const [printData, setPrintData] = useState<any>(null);
  
  const [config, setConfig] = useState({
    kop1: 'PEMERINTAH PROVINSI JAWA TIMUR',
    kop2: 'DINAS PENDIDIKAN',
    sekolah: 'SMA NEGERI 2 SUKOREJO',
    alamat: 'Jl. Raya Sukorejo No. 1, Pasuruan',
    kepsek: 'Dr. H. Ahmad, M.Pd.',
    nip: '19700101 199512 1 001'
  });

  useEffect(() => {
    const savedConfig = localStorage.getItem('printConfig');
    if (savedConfig) setConfig(JSON.parse(savedConfig));

    getDocs(query(collection(db, 'kelas'), orderBy('name'))).then(snap => {
       setKelasList(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    getDocs(query(collection(db, 'ujian'), orderBy('createdAt', 'desc'))).then(snap => {
       setUjianList(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    getDocs(query(collection(db, 'paket_soal'))).then(snap => {
       setPaketList(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
  }, []);

  const saveConfig = () => {
    localStorage.setItem('printConfig', JSON.stringify(config));
    toast.success("Pengaturan cetak disimpan!");
    setIsSettingsModalOpen(false);
  };

  const handleGenerateSoal = async () => {
    if (!selectedPaketId) { toast.error("Pilih paket soal terlebih dahulu"); return; }
    const paket = paketList.find(p => p.id === selectedPaketId);
    try {
       const snap = await getDocs(collection(db, `paket_soal/${selectedPaketId}/soal`));
       const soal = snap.docs.map(d => d.data());
       if (soal.length === 0) { toast.error("Paket soal belum memiliki soal"); return; }
       
       setPrintData({ judul: paket.title, mapel: paket.mapelId, soal });
       setIsSoalModalOpen(false);
       setPrintMode('soal');
    } catch (err: any) { toast.error("Gagal: " + err.message); }
  };

  const handleGenerateLjk = () => {
     setIsLjkModalOpen(false);
     setPrintData({ jumlahSoal: jumlahSoalLjk });
     setPrintMode('ljk');
  };

  const handleGenerateKartu = async () => {
    if (!selectedKelasId) { toast.error("Pilih kelas terlebih dahulu"); return; }
    const kls = kelasList.find(k => k.id === selectedKelasId);
    try {
       const q = query(collection(db, 'users'), where('role', '==', 'siswa'));
       const snap = await getDocs(q);
       const siswa = snap.docs.map(d => d.data()).filter((s:any) => s.kelas === kls.name || s.kelasId === kls.id);
       if (siswa.length === 0) { toast.error("Tidak ada siswa di kelas ini"); return; }
       
       setPrintData({ kelasName: kls.name, siswa: siswa.sort((a,b) => (a.name||'').localeCompare(b.name||'')) });
       setIsKartuModalOpen(false);
       setPrintMode('kartu');
    } catch (err: any) { toast.error("Gagal: " + err.message); }
  };

  const handleGenerateHadir = async () => {
    if (!selectedKelasId) { toast.error("Pilih kelas terlebih dahulu"); return; }
    const kls = kelasList.find(k => k.id === selectedKelasId);
    try {
       const q = query(collection(db, 'users'), where('role', '==', 'siswa'));
       const snap = await getDocs(q);
       const siswa = snap.docs.map(d => d.data()).filter((s:any) => s.kelas === kls.name || s.kelasId === kls.id);
       if (siswa.length === 0) { toast.error("Tidak ada siswa di kelas ini"); return; }
       
       setPrintData({ kelasName: kls.name, siswa: siswa.sort((a,b) => (a.name||a.displayName||'').localeCompare(b.name||b.displayName||'')) });
       setIsHadirModalOpen(false);
       setPrintMode('hadir');
    } catch (err: any) { toast.error("Gagal: " + err.message); }
  };

  const handleGenerateBerita = async () => {
    if (!selectedUjianId) { toast.error("Pilih jadwal ujian terlebih dahulu"); return; }
    const uj = ujianList.find(u => u.id === selectedUjianId);
    let kelasName = "Semua Kelas";
    if (uj.kelasId) {
      const kls = kelasList.find(k => k.id === uj.kelasId);
      if (kls) kelasName = kls.name;
    }
    
    setPrintData({ 
       mapel: uj.title || 'Mata Pelajaran',
       kelas: kelasName,
       ruang: '01',
       tanggal: new Date().toLocaleDateString('id-ID', {weekday:'long', year:'numeric', month:'long', day:'numeric'})
    });
    setIsBeritaModalOpen(false);
    setPrintMode('berita');
  };

  if (printMode !== 'none') {
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
         <div className="no-print sticky top-0 bg-white border-b shadow-sm p-4 flex justify-between items-center z-10 px-8">
            <div>
               <h2 className="text-xl font-bold text-slate-800">Preview {printMode === 'kartu' ? 'Kartu Peserta' : printMode === 'hadir' ? 'Daftar Hadir' : printMode === 'berita' ? 'Berita Acara' : printMode === 'soal' ? 'Soal Ujian' : 'Lembar Jawaban'}</h2>
            </div>
            <div className="flex gap-3">
               <Button variant="outline" onClick={() => setPrintMode('none')} className="h-11">Kembali</Button>
               <Button onClick={() => window.print()} className="h-11 bg-blue-600 hover:bg-blue-700 px-6 font-bold shadow-lg shadow-blue-500/20">
                 <Printer className="w-4 h-4 mr-2" /> Cetak Sekarang
               </Button>
            </div>
         </div>

         <div id="print-container" className="max-w-[21cm] mx-auto bg-white min-h-[29.7cm] p-8 shadow-2xl my-8 print:my-0 print:shadow-none font-sans text-slate-900">
            {/* KARTU PRINT */}
            {printMode === 'kartu' && (
              <div className="grid grid-cols-2 gap-4">
                 {printData?.siswa.map((s:any, idx:number) => (
                   <div key={idx} className="border-2 border-slate-800 rounded-xl overflow-hidden print:border-[1.5px] print:rounded-lg break-inside-avoid">
                      <div className="border-b-2 border-slate-800 p-3 bg-slate-100 flex items-center justify-between text-center print:border-b-[1.5px]">
                         <School className="w-8 h-8 text-slate-700" />
                         <div className="flex-1 px-2">
                           <h3 className="font-black text-[13px] uppercase tracking-wide">KARTU PESERTA UJIAN</h3>
                           <p className="font-bold text-[10px] text-slate-600 uppercase">{config.sekolah}</p>
                         </div>
                      </div>
                      <div className="p-4 space-y-3">
                         <table className="w-full text-[11px] font-bold">
                            <tbody>
                               <tr className="border-b border-dashed border-slate-300">
                                  <td className="py-2 text-slate-500 w-[70px]">NAMA</td><td className="py-2 px-1">:</td><td className="py-2 uppercase truncate max-w-[120px]">{s.name || s.displayName || '-'}</td>
                               </tr>
                               <tr className="border-b border-dashed border-slate-300">
                                  <td className="py-2 text-slate-500">NIS / ID</td><td className="py-2 px-1">:</td><td className="py-2 font-mono">{s.nis || (s.email ? s.email.split('@')[0] : '-')}</td>
                               </tr>
                               <tr className="border-b border-dashed border-slate-300">
                                  <td className="py-2 text-slate-500">KELAS</td><td className="py-2 px-1">:</td><td className="py-2">{s.kelas || printData.kelasName}</td>
                               </tr>
                               <tr className="border-b border-dashed border-slate-300">
                                  <td className="py-2 text-slate-500">RUANG</td><td className="py-2 px-1">:</td><td className="py-2">{s.ruangId || '01'} - SESI {s.sesiId || '1'}</td>
                               </tr>
                               <tr className="border-t-2 border-slate-800">
                                  <td className="pt-3 text-sm text-blue-800 font-black">PASSWORD</td><td className="pt-3 px-1">:</td><td className="pt-3 text-sm font-mono font-black">{s.showPassword ? s.showPassword : (s.tempPassword || '123456')}</td>
                               </tr>
                            </tbody>
                         </table>
                      </div>
                   </div>
                 ))}
              </div>
            )}

            {/* DAFTAR HADIR PRINT */}
            {printMode === 'hadir' && (
               <div>
                  <div className="text-center border-b-[3px] border-black pb-4 mb-6">
                     <h2 className="font-bold">{config.kop1}</h2>
                     <h2 className="font-bold">{config.kop2}</h2>
                     <h1 className="text-2xl font-black uppercase">{config.sekolah}</h1>
                     <p className="text-sm">{config.alamat}</p>
                  </div>
                  <h3 className="text-center font-black text-lg underline mb-6">DAFTAR HADIR PESERTA UJIAN</h3>
                  <div className="flex justify-between mb-4 font-bold text-sm">
                     <div><p>Kelas: {printData?.kelasName}</p><p>Ruang: 01</p></div>
                     <div><p>Mata Pelajaran: ...............................</p><p>Tanggal: ...............................</p></div>
                  </div>
                  <table className="w-full border-collapse border border-slate-800 text-sm">
                     <thead>
                        <tr className="bg-slate-100">
                           <th className="border border-slate-800 py-2 px-3 w-10">No</th>
                           <th className="border border-slate-800 py-2 px-3">NIS</th>
                           <th className="border border-slate-800 py-2 px-3">Nama Siswa</th>
                           <th className="border border-slate-800 py-2 px-3 w-40" colSpan={2}>Tanda Tangan</th>
                           <th className="border border-slate-800 py-2 px-3 w-20">Ket</th>
                        </tr>
                     </thead>
                     <tbody>
                        {printData?.siswa.map((s:any, i:number) => (
                           <tr key={i}>
                              <td className="border border-slate-800 py-3 px-3 text-center">{i+1}</td>
                              <td className="border border-slate-800 py-3 px-3 font-mono text-center">{s.nis||(s.email ? s.email.split('@')[0] : '-')}</td>
                              <td className="border border-slate-800 py-3 px-3 uppercase">{s.name || s.displayName}</td>
                              {i % 2 === 0 ? (
                                 <><td className="border-r-0 border-b border-t border-l border-slate-800 py-3 px-3 relative"><span className="absolute top-1 left-2 text-[10px]">{i+1}.</span></td><td className="border-l-0 border-b border-t border-r border-slate-800 py-3 px-3"></td></>
                              ) : (
                                 <><td className="border-r-0 border-b border-t border-l border-slate-800 py-3 px-3"></td><td className="border-l-0 border-b border-t border-r border-slate-800 py-3 px-3 relative"><span className="absolute top-1 left-2 text-[10px]">{i+1}.</span></td></>
                              )}
                              <td className="border border-slate-800 py-3 px-3"></td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            )}

            {/* BERITA ACARA PRINT */}
            {printMode === 'berita' && (
               <div>
                  <div className="text-center border-b-[3px] border-black pb-4 mb-8">
                     <h2 className="font-bold">{config.kop1}</h2>
                     <h2 className="font-bold">{config.kop2}</h2>
                     <h1 className="text-2xl font-black uppercase">{config.sekolah}</h1>
                     <p className="text-sm">{config.alamat}</p>
                  </div>
                  <h3 className="text-center font-black text-xl mb-8">BERITA ACARA PENYELENGGARAAN UJIAN</h3>
                  <div className="text-justify leading-relaxed space-y-6">
                     <p>Pada hari ini tanggal <strong>...............................</strong> telah diselenggarakan Ujian untuk mata pelajaran <strong>{printData.mapel}</strong> dari pukul ................... sampai ...................</p>
                     
                     <ol className="list-[lower-alpha] pl-6 space-y-2">
                        <li>Ruang Ujian: <strong>{printData.ruang}</strong></li>
                        <li>Jumlah Peserta Seharusnya: ...............................</li>
                        <li>Jumlah Peserta Hadir: ...............................</li>
                        <li>Jumlah Peserta Tidak Hadir: ...............................</li>
                        <li>Nomor Peserta Tidak Hadir: ...............................</li>
                     </ol>

                     <div>
                        <p>Catatan selama pelaksanaan ujian:</p>
                        <div className="w-full h-32 border border-slate-800 mt-2"></div>
                     </div>

                     <p>Demikian Berita Acara ini dibuat dengan sesungguhnya.</p>

                     <div className="flex justify-between mt-16 text-center">
                        <div>
                           <p>Mengetahui,<br/>Kepala Sekolah</p>
                           <br/><br/><br/>
                           <p className="font-bold underline">{config.kepsek}</p>
                           <p>NIP. {config.nip}</p>
                        </div>
                        <div>
                           <p>Sukorejo, ...............................<br/>Pengawas Ruang,</p>
                           <br/><br/><br/>
                           <p className="font-bold underline">.........................................</p>
                           <p>NIP. ....................................</p>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {/* NASKAH SOAL PRINT */}
            {printMode === 'soal' && (
               <div>
                  <div className="text-center border-b-[3px] border-black pb-4 mb-6">
                     <h2 className="font-bold">{config.kop1}</h2>
                     <h2 className="font-bold">{config.kop2}</h2>
                     <h1 className="text-2xl font-black uppercase">{config.sekolah}</h1>
                     <p className="text-sm">{config.alamat}</p>
                  </div>
                  <h3 className="text-center font-black text-lg mb-6">NASKAH SOAL UJIAN - {printData?.judul}</h3>
                  <div className="space-y-6">
                     {printData?.soal.map((s:any, idx:number) => {
                        const ops = ['A', 'B', 'C', 'D', 'E'];
                        return (
                          <div key={idx} className="break-inside-avoid">
                             <div className="flex">
                                <div className="w-8 font-bold text-lg">{idx + 1}.</div>
                                <div className="flex-1">
                                   {s.stimulus && <div className="mb-3 italic text-sm border p-4 bg-slate-50 rounded-lg shadow-sm" dangerouslySetInnerHTML={{__html: s.stimulus}} />}
                                   <div className="prose max-w-none text-justify" dangerouslySetInnerHTML={{__html: s.content}} />
                                   {s.type !== 'essay' && s.type !== 'isian' && s.options && s.options.length > 0 && (
                                     <div className="mt-4 space-y-3">
                                        {s.options.map((opt:string, oIdx:number) => (
                                           <div key={oIdx} className="flex">
                                              <div className="w-8 font-semibold">{ops[oIdx]}.</div>
                                              <div className="prose max-w-none" dangerouslySetInnerHTML={{__html: opt}} />
                                           </div>
                                        ))}
                                     </div>
                                   )}
                                </div>
                             </div>
                          </div>
                        )
                     })}
                  </div>
               </div>
            )}

            {/* LJK PRINT */}
            {printMode === 'ljk' && (
               <div>
                  <div className="text-center border-b-[3px] border-black pb-4 mb-6">
                     <h1 className="text-3xl font-black uppercase tracking-widest text-slate-900">LEMBAR JAWABAN KOMPUTER (LJK)</h1>
                     <h2 className="text-xl font-bold uppercase mt-2">{config.sekolah}</h2>
                  </div>
                  
                  <div className="flex gap-8 mb-8 border-2 border-slate-800 p-5 rounded-xl bg-slate-50/50">
                      <div className="flex-1 space-y-4 font-bold text-sm">
                         <div className="flex items-end"><span className="w-40 inline-block uppercase tracking-wider">Nama Peserta</span> <span className="flex-1 border-b-2 border-slate-400 border-dotted"></span></div>
                         <div className="flex items-end"><span className="w-40 inline-block uppercase tracking-wider">NIS / Kelas</span> <span className="w-32 border-b-2 border-slate-400 border-dotted"></span><span className="mx-2">/</span><span className="flex-1 border-b-2 border-slate-400 border-dotted"></span></div>
                         <div className="flex items-end"><span className="w-40 inline-block uppercase tracking-wider">Mata Pelajaran</span> <span className="flex-1 border-b-2 border-slate-400 border-dotted"></span></div>
                      </div>
                      <div className="flex-1 space-y-4 font-bold text-sm">
                         <div className="flex items-end"><span className="w-36 inline-block uppercase tracking-wider">Tanggal Ujian</span> <span className="flex-1 border-b-2 border-slate-400 border-dotted"></span></div>
                         <div className="flex items-end"><span className="w-36 inline-block uppercase tracking-wider">Ruang / Sesi</span> <span className="w-32 border-b-2 border-slate-400 border-dotted"></span><span className="mx-2">/</span><span className="flex-1 border-b-2 border-slate-400 border-dotted"></span></div>
                         <div className="flex items-end"><span className="w-36 inline-block uppercase tracking-wider">Paraf Peserta</span> <span className="flex-1 border-b-2 border-slate-400 border-dotted h-6"></span></div>
                      </div>
                  </div>

                  <div className="font-bold text-sm mb-6 p-3 bg-slate-800 text-white rounded-lg flex items-center justify-center tracking-widest uppercase">
                    Petunjuk: Silang (X) atau hitamkan bulatan pada huruf A, B, C, D, atau E yang dianggap paling benar!
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                     {Array.from({length: printData.jumlahSoal}).map((_, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white p-2 border-b border-dashed border-slate-200 hover:bg-slate-50 transition-colors">
                           <span className="w-8 text-right font-black text-lg text-slate-800">{idx + 1}.</span>
                           {['A','B','C','D','E'].map(opt => (
                              <div key={opt} className="w-7 h-7 rounded-full border-[1.5px] border-slate-800 flex items-center justify-center text-xs font-bold text-slate-700 mx-0.5">
                                 {opt}
                              </div>
                           ))}
                        </div>
                     ))}
                  </div>
               </div>
            )}
         </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-[1200px] mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Printer className="w-6 h-6 text-blue-600" /> Cetak / Print</h2>
          <p className="text-xs font-bold text-slate-400 mt-2 tracking-widest uppercase">Cetak Kartu Peserta, Daftar Hadir dan Berita Acara Ujian</p>
        </div>
        <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 font-bold h-11 px-6 rounded-xl uppercase text-xs tracking-wider" onClick={() => setIsSettingsModalOpen(true)}>
          <Settings className="w-4 h-4 mr-2" /> Pengaturan Cetak
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <Card className="p-8 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-100/50 rounded-2xl group relative overflow-hidden" onClick={() => setIsKartuModalOpen(true)}>
           <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity"><CheckCircle className="w-5 h-5 text-blue-500" /></div>
           <div className="w-20 h-20 rounded-2xl bg-[#00d0f1] flex items-center justify-center mb-5 shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform"><CreditCard className="w-10 h-10 text-white" strokeWidth={1.5} /></div>
           <h3 className="font-bold text-slate-700 text-center">Cetak Kartu Peserta</h3>
        </Card>

        <Card className="p-8 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-100/50 rounded-2xl group relative overflow-hidden" onClick={() => setIsHadirModalOpen(true)}>
           <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity"><CheckCircle className="w-5 h-5 text-amber-500" /></div>
           <div className="w-20 h-20 rounded-2xl bg-[#f59e0b] flex items-center justify-center mb-5 shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform"><ListChecks className="w-10 h-10 text-white" strokeWidth={1.5} /></div>
           <h3 className="font-bold text-slate-700 text-center">Cetak Daftar Hadir</h3>
        </Card>

        <Card className="p-8 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-100/50 rounded-2xl group relative overflow-hidden" onClick={() => setIsBeritaModalOpen(true)}>
           <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity"><CheckCircle className="w-5 h-5 text-blue-500" /></div>
           <div className="w-20 h-20 rounded-2xl bg-[#3b82f6] flex items-center justify-center mb-5 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform"><FileText className="w-10 h-10 text-white" strokeWidth={1.5} /></div>
           <h3 className="font-bold text-slate-700 text-center">Cetak Berita Acara</h3>
        </Card>

        <Card className="p-8 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-100/50 rounded-2xl group relative overflow-hidden" onClick={() => setIsSoalModalOpen(true)}>
           <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity"><CheckCircle className="w-5 h-5 text-violet-500" /></div>
           <div className="w-20 h-20 rounded-2xl bg-[#8b5cf6] flex items-center justify-center mb-5 shadow-lg shadow-violet-500/20 group-hover:scale-110 transition-transform"><FileQuestion className="w-10 h-10 text-white" strokeWidth={1.5} /></div>
           <h3 className="font-bold text-slate-700 text-center">Cetak Soal Ujian</h3>
        </Card>

        <Card className="p-8 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-100/50 rounded-2xl group relative overflow-hidden" onClick={() => setIsLjkModalOpen(true)}>
           <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity"><CheckCircle className="w-5 h-5 text-emerald-500" /></div>
           <div className="w-20 h-20 rounded-2xl bg-[#10b981] flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform"><ScanLine className="w-10 h-10 text-white" strokeWidth={1.5} /></div>
           <h3 className="font-bold text-slate-700 text-center">Cetak LJK</h3>
        </Card>
      </div>

      <Dialog open={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Pengaturan Cetak / Kop Surat</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
             <div className="grid grid-cols-2 gap-4">
               <div><label className="text-xs font-bold text-slate-500 mb-1 block">Kop Baris 1</label><Input value={config.kop1} onChange={e=>setConfig({...config, kop1: e.target.value})} /></div>
               <div><label className="text-xs font-bold text-slate-500 mb-1 block">Kop Baris 2</label><Input value={config.kop2} onChange={e=>setConfig({...config, kop2: e.target.value})} /></div>
             </div>
             <div><label className="text-xs font-bold text-slate-500 mb-1 block">Nama Sekolah</label><Input value={config.sekolah} onChange={e=>setConfig({...config, sekolah: e.target.value})} /></div>
             <div><label className="text-xs font-bold text-slate-500 mb-1 block">Alamat Sekolah</label><Input value={config.alamat} onChange={e=>setConfig({...config, alamat: e.target.value})} /></div>
             <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
               <div><label className="text-xs font-bold text-slate-500 mb-1 block">Nama Kepala Sekolah</label><Input value={config.kepsek} onChange={e=>setConfig({...config, kepsek: e.target.value})} /></div>
               <div><label className="text-xs font-bold text-slate-500 mb-1 block">NIP</label><Input value={config.nip} onChange={e=>setConfig({...config, nip: e.target.value})} /></div>
             </div>
             <Button className="w-full bg-blue-600 hover:bg-blue-700 font-bold h-11" onClick={saveConfig}>Simpan Pengaturan</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isKartuModalOpen} onOpenChange={setIsKartuModalOpen}>
        <DialogContent><DialogHeader><DialogTitle>Cetak Kartu Peserta</DialogTitle></DialogHeader><div className="space-y-4 pt-4"><Select value={selectedKelasId} onValueChange={setSelectedKelasId}><SelectTrigger className="h-11"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger><SelectContent>{kelasList.map(k => (<SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>))}</SelectContent></Select><Button className="w-full bg-blue-600 h-11 font-bold" onClick={handleGenerateKartu}>Buat Kartu</Button></div></DialogContent>
      </Dialog>
      
      <Dialog open={isHadirModalOpen} onOpenChange={setIsHadirModalOpen}>
        <DialogContent><DialogHeader><DialogTitle>Cetak Daftar Hadir</DialogTitle></DialogHeader><div className="space-y-4 pt-4"><Select value={selectedKelasId} onValueChange={setSelectedKelasId}><SelectTrigger className="h-11"><SelectValue placeholder="Pilih Kelas" /></SelectTrigger><SelectContent>{kelasList.map(k => (<SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>))}</SelectContent></Select><Button className="w-full bg-blue-600 h-11 font-bold" onClick={handleGenerateHadir}>Buat Daftar Hadir</Button></div></DialogContent>
      </Dialog>

      <Dialog open={isBeritaModalOpen} onOpenChange={setIsBeritaModalOpen}>
        <DialogContent><DialogHeader><DialogTitle>Cetak Berita Acara Ujian</DialogTitle></DialogHeader><div className="space-y-4 pt-4"><Select value={selectedUjianId} onValueChange={setSelectedUjianId}><SelectTrigger className="h-11"><SelectValue placeholder="Pilih Jadwal Ujian" /></SelectTrigger><SelectContent>{ujianList.map(u => (<SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>))}</SelectContent></Select><Button className="w-full bg-blue-600 h-11 font-bold" onClick={handleGenerateBerita}>Buat Berita Acara</Button></div></DialogContent>
      </Dialog>
      <Dialog open={isSoalModalOpen} onOpenChange={setIsSoalModalOpen}>
        <DialogContent><DialogHeader><DialogTitle>Cetak Soal Ujian</DialogTitle></DialogHeader><div className="space-y-4 pt-4"><Select value={selectedPaketId} onValueChange={setSelectedPaketId}><SelectTrigger className="h-11"><SelectValue placeholder="Pilih Paket Soal" /></SelectTrigger><SelectContent>{paketList.map(p => (<SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>))}</SelectContent></Select><Button className="w-full bg-blue-600 h-11 font-bold" onClick={handleGenerateSoal}>Generate Lembar Soal</Button></div></DialogContent>
      </Dialog>
      
      <Dialog open={isLjkModalOpen} onOpenChange={setIsLjkModalOpen}>
        <DialogContent><DialogHeader><DialogTitle>Cetak LJK</DialogTitle></DialogHeader><div className="space-y-4 pt-4"><div><label className="text-xs font-bold text-slate-500 mb-1 block">Jumlah Soal</label><Input type="number" min={10} max={100} value={jumlahSoalLjk} onChange={e=>setJumlahSoalLjk(parseInt(e.target.value)||50)} className="h-11" /></div><Button className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 font-bold gap-2" onClick={handleGenerateLjk}><ScanLine className="w-4 h-4"/> Generate LJK</Button></div></DialogContent>
      </Dialog>
    </div>
  );
}
