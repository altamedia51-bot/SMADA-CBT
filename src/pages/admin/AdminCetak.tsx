import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Settings, CreditCard, ListChecks, FileText, CheckCircle, School, FileQuestion, ScanLine, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCetak() {
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [ujianList, setUjianList] = useState<any[]>([]);
  const [paketList, setPaketList] = useState<any[]>([]);
  const [mapelList, setMapelList] = useState<any[]>([]);
  
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

  // New states for custom Soal Ujian print info
  const [tahunPelajaran, setTahunPelajaran] = useState('2024-2025');
  const [hariTanggal, setHariTanggal] = useState('');
  const [kelasProgram, setKelasProgram] = useState('');
  const [waktuUjian, setWaktuUjian] = useState('90 Menit');
  const [mapelOverride, setMapelOverride] = useState('');
  const [logoSoal, setLogoSoal] = useState<string | null>(null);

  // States for LJK specific info
  const [ljkKop1, setLjkKop1] = useState('PANITIA');
  const [ljkKop2, setLjkKop2] = useState('PENILAIAN SUMATIF AKHIR SEMESTER (PSAS)');
  const [ljkCode, setLjkCode] = useState('8596');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoSoal(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
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

    const unsubKelas = onSnapshot(query(collection(db, 'kelas'), orderBy('name')), (snap) => {
       setKelasList(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    
    const unsubUjian = onSnapshot(query(collection(db, 'ujian'), orderBy('createdAt', 'desc')), (snap) => {
       setUjianList(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    
    const unsubPaket = onSnapshot(collection(db, 'paket_soal'), (snap) => {
       setPaketList(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    
    const unsubMapel = onSnapshot(collection(db, 'mapel'), (snap) => {
       setMapelList(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });

    return () => {
      unsubKelas();
      unsubUjian();
      unsubPaket();
      unsubMapel();
    };
  }, []);

  const saveConfig = () => {
    localStorage.setItem('printConfig', JSON.stringify(config));
    toast.success("Pengaturan cetak disimpan!");
    setIsSettingsModalOpen(false);
  };

  const handleGenerateSoal = async () => {
    if (!selectedPaketId) { toast.error("Pilih paket soal terlebih dahulu"); return; }
    const paket = paketList.find(p => p.id === selectedPaketId);
    
    // Resolve Mapel Name properly
    let mapelName = mapelOverride || ".....................";
    if (!mapelOverride && paket?.mapelId) {
      const foundMapel = mapelList.find(m => m.id === paket.mapelId);
      if (foundMapel) {
        mapelName = foundMapel.name;
      } else {
        // Fallback if mapelId is actually a name (backward compatibility) or still an ID
        mapelName = paket.mapelId;
      }
    }
    
    try {
       const snap = await getDocs(collection(db, `paket_soal/${selectedPaketId}/soal`));
       const soal = snap.docs.map(d => d.data());
       if (soal.length === 0) { toast.error("Paket soal belum memiliki soal"); return; }
       
       setPrintData({ 
         judul: paket.title || 'Ujian', 
         mapel: mapelName, 
         soal,
         tahunPelajaran,
         hariTanggal,
         kelasProgram,
         waktuUjian,
         logo: logoSoal
       });
       setIsSoalModalOpen(false);
       setPrintMode('soal');
    } catch (err: any) { toast.error("Gagal: " + err.message); }
  };

  const handleGenerateLjk = () => {
     setIsLjkModalOpen(false);
     setPrintData({ 
       jumlahSoal: jumlahSoalLjk,
       ljkKop1,
       ljkKop2,
       ljkCode,
       tahunPelajaran,
       logo: logoSoal
     });
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
               <div className="text-[13px] font-serif print:text-black">
                  {/* Header / Kop */}
                  <div className="border-[1.5px] border-black p-0.5 mb-1 rounded-sm">
                     <div className="border-[1.5px] border-black p-4 text-center rounded-sm relative flex items-center justify-center min-h-[120px]">
                         {printData?.logo && (
                            <img src={printData.logo} alt="Logo" className="absolute left-6 h-20 w-auto object-contain" />
                         )}
                         <div>
                            <h2 className="font-bold text-[var(--primary)] uppercase tracking-[0.2em] text-lg lg:text-xl">{config.kop1 || 'PANITIA UJIAN SEKOLAH'}</h2>
                            <h1 className="text-2xl lg:text-3xl font-black text-emerald-600 uppercase tracking-wider mt-1">{config.sekolah}</h1>
                            <p className="italic font-bold font-sans mt-2 tracking-wide">Tahun Pelajaran {printData?.tahunPelajaran || '........'}</p>
                         </div>
                     </div>
                  </div>
                  
                  {/* Meta Info */}
                  <div className="border-t-[3px] border-black mt-2 mb-4 border-b pb-0.5">
                     <div className="border-b-[1.5px] border-black border-dotted flex justify-between py-1.5 font-bold px-2">
                        <div className="flex gap-2 w-1/2">
                           <div className="w-32">Mata Pelajaran</div>
                           <div>: {printData?.mapel || printData?.judul || '.....................'}</div>
                        </div>
                        <div className="flex gap-2 w-1/2 justify-start">
                           <div className="w-32">Hari, tanggal</div>
                           <div>: {printData?.hariTanggal || '.......................................'}</div>
                        </div>
                     </div>
                     <div className="flex justify-between py-1.5 font-bold px-2 border-b-[3px] border-black">
                        <div className="flex gap-2 w-1/2">
                           <div className="w-32">Kelas / Program</div>
                           <div>: {printData?.kelasProgram || '.......................................'}</div>
                        </div>
                        <div className="flex gap-2 w-1/2 justify-start">
                           <div className="w-32">Waktu</div>
                           <div>: {printData?.waktuUjian || '.......................................'}</div>
                        </div>
                     </div>
                  </div>

                  <h3 className="font-bold mb-3 italic">A. Pilihlah jawaban yang benar!</h3>
                  
                  {/* Soal Content in Two Columns */}
                  <div className="columns-1 sm:columns-2 gap-x-8 gap-y-0 space-y-4">
                     {printData?.soal.map((s:any, idx:number) => {
                        const ops = ['A.', 'B.', 'C.', 'D.', 'E.'];
                        return (
                          <div key={idx} className="break-inside-avoid w-full mb-4 inline-block">
                             <div className="flex items-start">
                                <div className="w-6 font-bold leading-relaxed">{idx + 1}.</div>
                                <div className="flex-1 mt-0">
                                   {s.stimulus && (
                                      <div 
                                         className="mb-2 italic text-[12px] border p-2 bg-slate-50/50" 
                                         dangerouslySetInnerHTML={{__html: s.stimulus}} 
                                      />
                                   )}
                                   <div 
                                      className="prose prose-sm max-w-none leading-relaxed text-justify text-[13px] text-black" 
                                      dangerouslySetInnerHTML={{__html: s.content}} 
                                   />
                                   {s.imageUrl && (
                                      <div className="my-2 border-[0.5px] border-slate-300 rounded-sm overflow-hidden bg-white max-w-full">
                                         <img src={s.imageUrl} alt="Lampiran" className="max-h-[300px] w-auto object-contain mx-auto" />
                                      </div>
                                   )}
                                   {s.type !== 'essay' && s.type !== 'isian' && s.options && s.options.length > 0 && (
                                     <div className="mt-2 text-[13px]">
                                        <div className="grid grid-cols-1 gap-y-1 gap-x-4">
                                           {s.options.map((opt:string, oIdx:number) => (
                                              <div key={oIdx} className="flex gap-1.5 items-start">
                                                 <div className="w-5 font-medium leading-relaxed">{ops[oIdx]}</div>
                                                 <div 
                                                    className="prose prose-sm max-w-none text-[13px] leading-relaxed text-black" 
                                                    dangerouslySetInnerHTML={{__html: opt}} 
                                                 />
                                              </div>
                                           ))}
                                        </div>
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
               <div className="w-full max-w-[800px] mx-auto bg-white text-black print:p-0 relative font-sans overflow-hidden">
                  
                  {/* Header Box */}
                  <div className="relative pt-2 px-2">
                    <div className="border-[3px] border-black rounded-[30px] p-2 flex relative items-center justify-center min-h-[140px]">
                      <div className="border border-black border-dashed rounded-[26px] absolute inset-0 m-1 pointer-events-none"></div>
                      <div className="flex flex-col items-center justify-center text-center font-serif leading-tight z-10 w-full relative h-[120px]">
                         <div className="absolute left-6 top-1/2 -translate-y-1/2">
                            {/* Logo inside */}
                            <div className="w-20 h-24 border border-slate-300 bg-white flex flex-col items-center justify-center p-1 shadow-sm overflow-hidden">
                               {printData?.logo ? (
                                 <img src={printData.logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                               ) : (
                                 <>
                                   <div className="text-[7px] font-sans text-center mb-1 leading-tight tracking-tight uppercase">
                                     {config.sekolah}
                                   </div>
                                   <div className="w-10 h-10 rounded-full border border-blue-400 bg-blue-50 mt-1 flex items-center justify-center shadow-inner">
                                      <div className="w-4 h-4 bg-blue-300 rotate-45 transform"></div>
                                   </div>
                                 </>
                               )}
                            </div>
                         </div>
                         <div className="pl-24 pr-4 w-full">
                            <h2 className="text-xl font-bold font-serif uppercase tracking-wide">{printData?.ljkKop1 || 'PANITIA'}</h2>
                            <h3 className="text-[17px] font-bold font-serif uppercase tracking-wide mt-1">{printData?.ljkKop2 || 'PENILAIAN SUMATIF AKHIR SEMESTER (PSAS)'}</h3>
                            <h1 className="text-[22px] font-bold font-serif uppercase tracking-wider mt-1">{config.sekolah}</h1>
                            <h4 className="text-base font-serif italic mt-1 pb-1">Tahun Pelajaran : {printData?.tahunPelajaran || '2025 / 2026'}</h4>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Grid */}
                  <div className="px-6 mt-8 relative">
                    
                    {/* Anchor 1: Top Left */}
                    <div className="absolute left-6 top-4 w-[18px] h-[18px] bg-black"></div>
                    {/* Anchor 2: Top Right */}
                    <div className="absolute right-6 top-4 w-[18px] h-[18px] bg-black"></div>

                    {/* Identitas */}
                    <div className="flex px-12 mb-10">
                       <div className="flex-1 max-w-[260px]">
                          <div className="font-sans text-sm font-semibold mb-0.5">Nama</div>
                          <div className="border-[2px] border-black h-[30px] w-full mb-3"></div>
                          <div className="font-sans text-sm font-semibold mb-0.5">Kelas</div>
                          <div className="border-[2px] border-black h-[30px] w-full"></div>
                       </div>
                       <div className="flex-1 ml-6">
                          <div className="font-sans text-sm font-semibold mb-0.5">Mapel</div>
                          <div className="border-[2px] border-black h-[30px] w-[260px]"></div>
                       </div>
                    </div>

                    <div className="flex justify-between px-10 relative">
                       {/* Rotated ZIPGRADE text left */}
                       <div className="absolute -left-6 top-32 text-[20px] font-bold tracking-widest text-black" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>
                          ZIPGRADE.COM
                       </div>

                       {/* Rotated PSAS text right - FIXED POSITIONING */}
                       <div className="absolute -right-4 top-32 text-[14px] font-semibold tracking-widest text-black whitespace-nowrap" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}>
                          {printData?.ljkKop2?.split('(')[0]?.substring(0, 30) || 'PSAS'} ({printData?.ljkCode || '8596'})
                       </div>

                       {/* Column 1 */}
                       <div className="flex flex-col items-center flex-1 relative">
                          {/* 1-10 */}
                          <div className="space-y-1.5">
                             {Array.from({length: 10}).map((_, i) => (
                                <div key={`q${i+1}`} className="flex items-center gap-1.5">
                                   <span className="w-5 text-right text-[14px] text-slate-800 pr-0.5">{i + 1}</span>
                                   {['A','B','C','D','E'].map(opt => (
                                     <div key={opt} className="w-[18px] h-[18px] rounded-full border-[1.5px] border-slate-300 text-slate-300 flex items-center justify-center text-[10px] font-bold">{opt}</div>
                                   ))}
                                </div>
                             ))}
                          </div>

                          {/* Anchor Middle Left */}
                          <div className="w-[18px] h-[18px] bg-black my-4"></div>

                          {/* 11-20 + Timing Marks */}
                          <div className="flex relative w-full justify-center">
                             <div className="absolute -left-12 top-0 bottom-0 flex flex-col justify-between py-[2px]">
                                {Array.from({length: 10}).map((_,i) => <div key={`tm${i}`} className="w-[22px] h-[6px] bg-black" />)}
                             </div>
                             <div className="space-y-1.5">
                                {Array.from({length: 10}).map((_, i) => (
                                   <div key={`q${i+11}`} className="flex items-center gap-1.5">
                                      <span className="w-5 text-right text-[14px] text-slate-800 pr-0.5">{i + 11}</span>
                                      {['A','B','C','D','E'].map(opt => (
                                        <div key={opt} className="w-[18px] h-[18px] rounded-full border-[1.5px] border-slate-300 text-slate-300 flex items-center justify-center text-[10px] font-bold">{opt}</div>
                                      ))}
                                   </div>
                                ))}
                             </div>
                          </div>
                          
                          {/* Bottom Left Timing + Anchor */}
                          <div className="absolute -left-2 bottom-0 flex flex-col items-start space-y-2">
                             <div className="w-[22px] h-[6px] bg-black" />
                             <div className="w-[22px] h-[6px] bg-black" />
                             <div className="w-[18px] h-[18px] bg-black mt-2" />
                          </div>
                          {/* Wait, the bottom left anchor is actually aligned with the columns, let me put it at the very bottom wrapper */}
                       </div>
                       
                       {/* Column 2 */}
                       <div className="flex flex-col items-center flex-1">
                          {/* 21-30 */}
                          <div className="space-y-1.5">
                             {Array.from({length: 10}).map((_, i) => (
                                <div key={`q${i+21}`} className="flex items-center gap-1.5">
                                   <span className="w-5 text-right text-[14px] text-slate-800 pr-0.5">{i + 21}</span>
                                   {['A','B','C','D','E'].map(opt => (
                                     <div key={opt} className="w-[18px] h-[18px] rounded-full border-[1.5px] border-slate-300 text-slate-300 flex items-center justify-center text-[10px] font-bold">{opt}</div>
                                   ))}
                                </div>
                             ))}
                          </div>

                          {/* Anchor Middle Center */}
                          <div className="w-[18px] h-[18px] bg-black my-4"></div>

                          {/* 31-40 */}
                          <div className="space-y-1.5">
                             {Array.from({length: 10}).map((_, i) => (
                                <div key={`q${i+31}`} className="flex items-center gap-1.5">
                                   <span className="w-5 text-right text-[14px] text-slate-800 pr-0.5">{i + 31}</span>
                                   {['A','B','C','D','E'].map(opt => (
                                     <div key={opt} className="w-[18px] h-[18px] rounded-full border-[1.5px] border-slate-300 text-slate-300 flex items-center justify-center text-[10px] font-bold">{opt}</div>
                                   ))}
                                </div>
                             ))}
                          </div>
                          
                       </div>

                       {/* Column 3 */}
                       <div className="flex flex-col items-center flex-1">
                          {/* 41-50 */}
                          <div className="space-y-1.5">
                             {Array.from({length: 10}).map((_, i) => (
                                <div key={`q${i+41}`} className="flex items-center gap-1.5">
                                   <span className="w-5 text-right text-[14px] text-slate-800 pr-0.5">{i + 41}</span>
                                   {['A','B','C','D','E'].map(opt => (
                                     <div key={opt} className="w-[18px] h-[18px] rounded-full border-[1.5px] border-slate-300 text-slate-300 flex items-center justify-center text-[10px] font-bold">{opt}</div>
                                   ))}
                                </div>
                             ))}
                          </div>

                          {/* Anchor Middle Right */}
                          <div className="w-[18px] h-[18px] bg-black my-4"></div>

                          {/* Nomer Ujian Box */}
                          <div className="flex flex-col items-center">
                            <div className="text-[12px] font-sans text-slate-800 mb-1">Nomer Ujian</div>
                            <div className="flex gap-1.5 mb-2">
                               {Array.from({length: 4}).map((_, i) => <div key={i} className="w-[18px] h-[22px] border border-black"></div>)}
                            </div>
                            <div className="flex gap-1.5">
                               {Array.from({length: 4}).map((_, colIdx) => (
                                 <div key={colIdx} className="flex flex-col gap-1.5">
                                    {Array.from({length: 10}).map((_, n) => (
                                       <div key={n} className="w-[18px] h-[18px] rounded-full border-[1.5px] border-slate-300 text-slate-300 flex items-center justify-center text-[10px] font-bold">{n}</div>
                                    ))}
                                 </div>
                               ))}
                            </div>
                          </div>
                       </div>
                    </div>
                  </div>
                  
                  {/* Bottom Anchors */}
                  <div className="flex justify-between px-6 pb-6 pt-4">
                     <div className="w-[18px] h-[18px] bg-black"></div>
                     <div className="w-[18px] h-[18px] bg-black mr-24"></div>
                     <div className="w-[18px] h-[18px] bg-black"></div>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-8 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-100/50 rounded-2xl group relative overflow-hidden" onClick={() => setIsKartuModalOpen(true)}>
           <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity"><CheckCircle className="w-5 h-5 text-blue-500" /></div>
           <div className="w-20 h-20 rounded-2xl bg-[#00d0f1] flex items-center justify-center mb-5 shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform"><CreditCard className="w-10 h-10 text-white" strokeWidth={1.5} /></div>
           <h3 className="font-bold text-slate-700 text-center text-sm md:text-base">Cetak Kartu Peserta</h3>
        </Card>

        <Card className="p-8 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-100/50 rounded-2xl group relative overflow-hidden" onClick={() => setIsHadirModalOpen(true)}>
           <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity"><CheckCircle className="w-5 h-5 text-amber-500" /></div>
           <div className="w-20 h-20 rounded-2xl bg-[#f59e0b] flex items-center justify-center mb-5 shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform"><ListChecks className="w-10 h-10 text-white" strokeWidth={1.5} /></div>
           <h3 className="font-bold text-slate-700 text-center text-sm md:text-base">Cetak Daftar Hadir</h3>
        </Card>

        <Card className="p-8 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-100/50 rounded-2xl group relative overflow-hidden" onClick={() => setIsBeritaModalOpen(true)}>
           <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity"><CheckCircle className="w-5 h-5 text-blue-500" /></div>
           <div className="w-20 h-20 rounded-2xl bg-[#3b82f6] flex items-center justify-center mb-5 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform"><FileText className="w-10 h-10 text-white" strokeWidth={1.5} /></div>
           <h3 className="font-bold text-slate-700 text-center text-sm md:text-base">Cetak Berita Acara</h3>
        </Card>

        <Card className="p-8 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-100/50 rounded-2xl group relative overflow-hidden" onClick={() => setIsSoalModalOpen(true)}>
           <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity"><CheckCircle className="w-5 h-5 text-violet-500" /></div>
           <div className="w-20 h-20 rounded-2xl bg-[#8b5cf6] flex items-center justify-center mb-5 shadow-lg shadow-violet-500/20 group-hover:scale-110 transition-transform"><FileQuestion className="w-10 h-10 text-white" strokeWidth={1.5} /></div>
           <h3 className="font-bold text-slate-700 text-center text-sm md:text-base">Cetak Soal Ujian</h3>
        </Card>

        <Card className="p-8 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-100/50 rounded-2xl group relative overflow-hidden" onClick={() => setIsLjkModalOpen(true)}>
           <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity"><CheckCircle className="w-5 h-5 text-emerald-500" /></div>
           <div className="w-20 h-20 rounded-2xl bg-[#10b981] flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform"><ScanLine className="w-10 h-10 text-white" strokeWidth={1.5} /></div>
           <h3 className="font-bold text-slate-700 text-center text-sm md:text-base">Cetak LJK</h3>
        </Card>

        <Card className="p-8 flex flex-col items-center justify-center cursor-pointer hover:shadow-xl transition-all duration-300 border-slate-100/50 rounded-2xl group relative overflow-hidden ring-2 ring-emerald-500/20 bg-emerald-50/50" onClick={() => window.location.href='/admin/scan-ljk'}>
           <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
           <div className="w-20 h-20 rounded-2xl bg-emerald-600 flex items-center justify-center mb-5 shadow-lg shadow-emerald-600/30 group-hover:scale-110 transition-transform">
              <ScanLine className="w-10 h-10 text-white" strokeWidth={1.5} />
           </div>
           <h3 className="font-bold text-emerald-800 text-center text-sm md:text-base leading-tight">Scan LJK<br/><span className="text-xs font-normal opacity-70">Webcam Scanner</span></h3>
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Cetak Soal Ujian</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Pilih Paket Soal</label>
              <Select value={selectedPaketId} onValueChange={setSelectedPaketId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Pilih Paket Soal" />
                </SelectTrigger>
                <SelectContent>
                  {paketList.map(p => {
                    const mName = mapelList.find(m => m.id === p.mapelId)?.name || '';
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title} {mName ? `(${mName})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Mata Pelajaran (Override)</label>
              <Input 
                value={mapelOverride} 
                onChange={e=>setMapelOverride(e.target.value)} 
                placeholder="Kosongkan untuk otomatis dari Bank Soal" 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Tahun Pelajaran</label>
                <Input value={tahunPelajaran} onChange={e=>setTahunPelajaran(e.target.value)} placeholder="Contoh: 2024-2025" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Waktu Ujian</label>
                <Input value={waktuUjian} onChange={e=>setWaktuUjian(e.target.value)} placeholder="Contoh: 90 Menit" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Hari, Tanggal</label>
              <Input value={hariTanggal} onChange={e=>setHariTanggal(e.target.value)} placeholder="Contoh: Senin, 12 Mei 2025" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Kelas / Program</label>
              <Input value={kelasProgram} onChange={e=>setKelasProgram(e.target.value)} placeholder="Contoh: X MIPA 1 / ALL" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Logo Sekolah (Opsional)</label>
              <div className="flex gap-4 items-center">
                <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl py-4 group hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer">
                  <ImagePlus className="w-6 h-6 text-slate-400 group-hover:text-blue-500 mb-1" />
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600">Klik untuk Upload Logo</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                </label>
                {logoSoal && (
                  <div className="relative w-20 h-20 border-2 border-slate-100 rounded-xl p-1 bg-white shadow-sm">
                    <img src={logoSoal} alt="Logo Preview" className="w-full h-full object-contain" />
                    <button 
                      onClick={() => setLogoSoal(null)} 
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <Button className="w-full bg-blue-600 hover:bg-blue-700 h-11 font-bold shadow-lg shadow-blue-500/20 mt-2" onClick={handleGenerateSoal}>
              Generate Lembar Soal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isLjkModalOpen} onOpenChange={setIsLjkModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Pengaturan Cetak LJK</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Jumlah Soal</label>
                <Input type="number" min={10} max={100} value={jumlahSoalLjk} onChange={e=>setJumlahSoalLjk(parseInt(e.target.value)||50)} className="h-11" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Tahun Pelajaran</label>
                <Input value={tahunPelajaran} onChange={e=>setTahunPelajaran(e.target.value)} placeholder="2025 / 2026" className="h-11" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Kop 1 (Atas)</label>
              <Input value={ljkKop1} onChange={e=>setLjkKop1(e.target.value)} placeholder="PANITIA" className="h-11" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block">Kop 2 (Judul Ujian)</label>
              <Input value={ljkKop2} onChange={e=>setLjkKop2(e.target.value)} placeholder="PENILAIAN SUMATIF AKHIR SEMESTER (PSAS)" className="h-11" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Logo Kop LJK</label>
              <div className="flex items-center gap-3 mt-1">
                <Input 
                   type="file" 
                   accept="image/*" 
                   onChange={handleLogoUpload} 
                   className="h-10 text-xs border-dashed border-2 p-1" 
                />
                {logoSoal && (
                   <div className="h-10 w-10 border rounded bg-white flex items-center justify-center overflow-hidden shrink-0">
                      <img src={logoSoal} alt="Preview" className="max-w-full max-h-full object-contain" />
                   </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Kode LJK</label>
                <Input value={ljkCode} onChange={e=>setLjkCode(e.target.value)} placeholder="8596" className="h-11" />
              </div>
              <div className="flex flex-col justify-end">
                <p className="text-[10px] text-slate-400 mb-2 italic">Kode ini akan muncul di samping LJK.</p>
              </div>
            </div>

            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 font-bold gap-2 mt-2 shadow-lg shadow-emerald-500/20" onClick={handleGenerateLjk}>
              <ScanLine className="w-5 h-5"/> Generate LJK Sekarang
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
