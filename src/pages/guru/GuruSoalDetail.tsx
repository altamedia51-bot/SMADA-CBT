import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, addDoc, doc, getDoc, writeBatch, serverTimestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Plus, ChevronLeft, Save, Download, FileType, Trash2, Edit2, BookOpen, CheckCircle2, GripVertical, HelpCircle, ImagePlus, Check } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as XLSX from 'xlsx';
// @ts-ignore
import mammoth from 'mammoth';

export default function GuruSoalDetail() {
  const { paketId } = useParams();
  const navigate = useNavigate();
  const [paketInfo, setPaketInfo] = useState<any>(null);
  const [soalList, setSoalList] = useState<any[]>([]);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const wordInputRef = useRef<HTMLInputElement>(null);

  // Form states untuk soal baru (Termasuk AKM)
  const [soalType, setSoalType] = useState('pg'); // pg, pgk, isian, essay
  const [stimulus, setStimulus] = useState(''); // Text wacana (AKM)
  const [content, setContent] = useState('');
  
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [optE, setOptE] = useState('');
  
  // Jawaban untuk berbagai tipe
  const [correctKey, setCorrectKey] = useState('A'); // Untuk PG
  const [pgkKeys, setPgkKeys] = useState<string[]>([]); // Untuk PG Kompleks (multiple correct options)
  const [textAnswer, setTextAnswer] = useState(''); // Untuk Isian / Essay (Rubrik)
  const [imageContent, setImageContent] = useState<string | null>(null);

  const [editingSoalId, setEditingSoalId] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 500) { // 500KB Limit for firestore 1MB doc limit
        return toast.error("Ukuran gambar maksimal 500KB");
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageContent(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!paketId) return;

    getDoc(doc(db, 'paket_soal', paketId)).then(d => {
      if(d.exists()) setPaketInfo({ id: d.id, ...d.data() });
    });

    const qSoal = query(collection(db, `paket_soal/${paketId}/soal`));
    const unsubscribe = onSnapshot(qSoal, (snap) => {
      setSoalList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubscribe();
  }, [paketId]);

  // Handle Checkbox for PGK
  const togglePgkKey = (key: string) => {
    setPgkKeys(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const downloadExcelTemplate = () => { /* ... unchanged ... */
    const ws = XLSX.utils.json_to_sheet([
      { Pertanyaan: "Siapa penemu gravitasi?", "Opsi A": "Einstein", "Opsi B": "Newton", "Opsi C": "Tesla", "Opsi D": "Galileo", "Opsi E": "Edison", Jawaban: "B" }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Soal");
    XLSX.writeFile(wb, "Template_Soal_EduTest.xlsx");
  };

  const downloadWordTemplate = () => { /* ... unchanged ... */
    const guideText = `Sistem format file ini fokus ke PG Standar.\nUntuk soal tipe AKM (Stimulus/PGK), silakan gunakan form manual Builder AKM di web.`;
    const blob = new Blob([guideText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Panduan_Word.txt";
    link.click();
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content) return toast.error('Pertanyaan tidak boleh kosong');
    
    let options: string[] = [];
    let finalAnswer: any = '';

    if (soalType === 'pg' || soalType === 'pgk') {
      options = [optA, optB, optC, optD, optE].filter(val => val.trim() !== '');
      if(options.length < 2) return toast.error('Untuk soal pilihan, minimal 2 opsi wajib disi!');
      
      if (soalType === 'pg') {
         const idx = ['A', 'B', 'C', 'D', 'E'].indexOf(correctKey);
         finalAnswer = options[idx] || options[0];
      } else {
         if(pgkKeys.length === 0) return toast.error('Pilih minimal 1 jawaban benar untuk PG Kompleks');
         // Convert 'A', 'B' to actual string value
         finalAnswer = pgkKeys.map(k => {
           const i = ['A', 'B', 'C', 'D', 'E'].indexOf(k);
           return options[i] || '';
         }).filter(Boolean);
      }
    } else if (soalType === 'isian' || soalType === 'essay') {
      if(!textAnswer) return toast.error('Kunci / Kriteria jawaban wajib diisi');
      finalAnswer = textAnswer;
    }

    try {
      const payload = {
        type: soalType,
        stimulus,
        content,
        options,
        correctAnswer: finalAnswer,
        imageUrl: imageContent || ''
      };

      if (editingSoalId) {
        await updateDoc(doc(db, `paket_soal/${paketId}/soal`, editingSoalId), payload);
        toast.success('Soal berhasil diperbarui');
        setEditingSoalId(null);
      } else {
        await addDoc(collection(db, `paket_soal/${paketId}/soal`), {
          ...payload,
          paketId,
          createdAt: serverTimestamp()
        });
        toast.success('Soal berhasil ditambah ke paket');
      }

      // Reset Form
      setContent(''); setStimulus(''); setImageContent(null);
      setOptA(''); setOptB(''); setOptC(''); setOptD(''); setOptE(''); 
      setCorrectKey('A'); setPgkKeys([]); setTextAnswer('');
      
    } catch(err: any) {
      toast.error('Gagal menyimpan soal: ' + err.message);
    }
  };

  const handleEditSoal = (s: any) => {
    setEditingSoalId(s.id);
    setSoalType(s.type || 'pg');
    setStimulus(s.stimulus || '');
    setContent(s.content || '');
    setImageContent(s.imageUrl || null);
    
    if (s.type === 'pg' || s.type === 'pgk') {
      setOptA(s.options?.[0] || '');
      setOptB(s.options?.[1] || '');
      setOptC(s.options?.[2] || '');
      setOptD(s.options?.[3] || '');
      setOptE(s.options?.[4] || '');
      
      if (s.type === 'pg') {
         const idx = s.options?.indexOf(s.correctAnswer);
         if (idx >= 0) setCorrectKey(['A','B','C','D','E'][idx]);
      } else {
         const keys = Array.isArray(s.correctAnswer) ? s.correctAnswer.map(ans => {
           const idx = s.options?.indexOf(ans);
           return idx >= 0 ? ['A','B','C','D','E'][idx] : null;
         }).filter(Boolean) : [];
         setPgkKeys(keys);
      }
    } else {
      setTextAnswer(s.correctAnswer || '');
    }
    
    // Switch to manual tab
    const el = document.querySelector('[value="manual"]');
    if (el) (el as HTMLElement).click();
  };

  const handleDeleteSoal = async (id: string) => {
    if(!confirm('Yakin ingin menghapus soal ini?')) return;
    try {
      await deleteDoc(doc(db, `paket_soal/${paketId}/soal`, id));
      toast.success('Soal berhasil dihapus');
    } catch (err: any) {
      toast.error('Gagal menghapus soal: ' + err.message);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !paketId) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet) as any[];

        if (rows.length === 0) return toast.error('File Excel kosong atau format tidak sesuai');

        const batch = writeBatch(db);
        let count = 0;

        rows.forEach((row) => {
          // Mapping fields (Case insensitive / flexible)
          const content = row.Pertanyaan || row.pertanyaan || row.Question || row.question;
          const optA = row['Opsi A'] || row.A;
          const optB = row['Opsi B'] || row.B;
          const optC = row['Opsi C'] || row.C;
          const optD = row['Opsi D'] || row.D;
          const optE = row['Opsi E'] || row.E;
          const jawab = row.Jawaban || row.jawaban || row.Answer || row.answer || row.Kunci || row.kunci;

          if (content && optA && optB && jawab) {
            const options = [optA, optB, optC, optD, optE].filter(Boolean).map(o => o.toString());
            const keyChar = jawab.toString().toUpperCase().trim();
            const keyIdx = ['A', 'B', 'C', 'D', 'E'].indexOf(keyChar);
            const correctAnswer = options[keyIdx] || options[0];

            const docRef = doc(collection(db, `paket_soal/${paketId}/soal`));
            batch.set(docRef, {
              paketId,
              type: 'pg',
              stimulus: '',
              content: content.toString(),
              options,
              correctAnswer,
              createdAt: serverTimestamp()
            });
            count++;
          }
        });

        if (count > 0) {
          await batch.commit();
          toast.success(`Berhasil mengimpor ${count} soal PG dari Excel!`);
        } else {
          toast.error('Tidak ada data soal yang valid ditemukan di Excel. Pastikan kolom Pertanyaan, Opsi A, Opsi B, dan Jawaban tersedia.');
        }
      } catch (err: any) {
        toast.error('Gagal membaca Excel: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
    if (excelInputRef.current) excelInputRef.current.value = '';
  };
  
  const handleImportWord = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !paketId) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value;

        // Simple Regex Based Parser for standard CBT format:
        // [Number]. [Question]
        // A. [Opt]
        // B. [Opt]
        // ...
        // Jawab: A
        
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const importedSoal: any[] = [];
        let currentSoal: any = null;

        lines.forEach(line => {
          // Check for start of question (e.g. "1. " or "10) ")
          const qMatch = line.match(/^(\d+)[.)]\s+(.*)/);
          if (qMatch) {
            if (currentSoal && currentSoal.content && currentSoal.options.length >= 2) {
              importedSoal.push(currentSoal);
            }
            currentSoal = { content: qMatch[2], options: [], correctAnswer: '' };
            return;
          }

          // Check for options (e.g. "A. Option content")
          const optMatch = line.match(/^([A-E])[.)]\s+(.*)/);
          if (optMatch && currentSoal) {
            currentSoal.options.push(optMatch[2]);
            return;
          }

          // Check for key (e.g. "Jawab: A" or "Kunci: A" or "Ans: A")
          const keyMatch = line.match(/^(Jawab|Kunci|Ans|Answer|Jawaban):\s*([A-E])/i);
          if (keyMatch && currentSoal) {
            const keyChar = keyMatch[2].toUpperCase();
            const keyIdx = ['A', 'B', 'C', 'D', 'E'].indexOf(keyChar);
            currentSoal.correctAnswer = currentSoal.options[keyIdx] || '';
            return;
          }

          // If it's just text and we have a current question, append to content
          if (currentSoal && !currentSoal.correctAnswer && currentSoal.options.length === 0) {
            currentSoal.content += ' ' + line;
          }
        });

        // Push last one
        if (currentSoal && currentSoal.content && currentSoal.options.length >= 2) {
          importedSoal.push(currentSoal);
        }

        if (importedSoal.length === 0) {
          return toast.error('Format Word tidak dikenali. Pastikan format: 1. Soal? A. Opsi... Jawab: A');
        }

        const batch = writeBatch(db);
        importedSoal.forEach(s => {
          const docRef = doc(collection(db, `paket_soal/${paketId}/soal`));
          batch.set(docRef, {
            ...s,
            paketId,
            type: 'pg',
            stimulus: '',
            createdAt: serverTimestamp()
          });
        });

        await batch.commit();
        toast.success(`Berhasil mengimpor ${importedSoal.length} soal dari Word!`);

      } catch (err: any) {
        toast.error('Gagal membaca Word: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    if (wordInputRef.current) wordInputRef.current.value = '';
  };

  const getBadgeFormat = (type: string) => {
    switch(type) {
      case 'pg': return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">PG Sederhana</span>;
      case 'pgk': return <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">PG Kompleks</span>;
      case 'isian': return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Isian Singkat</span>;
      case 'essay': return <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Uraian / Essay</span>;
      default: return null;
    }
  }

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 flex flex-col md:flex-row gap-8 font-sans">
      
      {/* Left: Form Builder */}
      <div className="flex-1 w-full md:w-[70%] space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="shrink-0 rounded-full border-slate-200 hover:bg-slate-100 bg-white">
             <ChevronLeft className="w-5 h-5 text-slate-700" />
          </Button>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-1">
              {paketInfo?.title || 'Loading...'}
            </h2>
            <p className="text-slate-500 text-sm font-medium">Builder Interaktif Soal Standar & AKM Terpadu.</p>
          </div>
        </div>

        <Tabs defaultValue="manual" className="w-full">
          <Card className="p-1.5 mb-6 bg-white border border-slate-200 shadow-sm rounded-xl">
            <TabsList className="grid w-full grid-cols-3 bg-slate-50 rounded-lg">
              <TabsTrigger value="manual" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 font-semibold text-slate-600">Builder Utama</TabsTrigger>
              <TabsTrigger value="excel" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-600 font-semibold text-slate-600">Impor Excel</TabsTrigger>
              <TabsTrigger value="word" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 font-semibold text-slate-600">Impor Word</TabsTrigger>
            </TabsList>
          </Card>

          <TabsContent value="manual" className="mt-0 focus-visible:outline-none">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm shadow-slate-200/50 overflow-hidden relative">
               <div className="bg-gradient-to-r from-blue-50/80 to-white px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center border border-blue-200/50 shadow-inner">
                        <FileType className="text-blue-600 w-5 h-5"/>
                     </div>
                     <div>
                        <h3 className="font-bold text-slate-800 text-lg">Editor Pertanyaan</h3>
                        <p className="text-xs text-slate-500 font-medium">Konfigurasi materi & jenis soal</p>
                     </div>
                  </div>
                  <div className="w-full sm:w-[260px]">
                     <Select value={soalType} onValueChange={setSoalType}>
                        <SelectTrigger className="w-full h-11 border-slate-200 bg-white font-medium shadow-sm hover:border-blue-400 focus:ring-blue-500 rounded-xl transition-all">
                           <SelectValue/>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl font-medium">
                          <SelectItem value="pg">Pilihan Ganda (1 Benar)</SelectItem>
                          <SelectItem value="pgk">PG Kompleks (Banyak Benar)</SelectItem>
                          <SelectItem value="isian">Isian Singkat</SelectItem>
                          <SelectItem value="essay">Uraian / Essay</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
               </div>

               <form onSubmit={handleAddManual} className="p-6 md:p-8 space-y-8">
                
                  {/* Wacana / Stimulus */}
                  <div className="group rounded-2xl p-5 border border-blue-100 bg-blue-50/50 hover:bg-blue-50/80 transition-colors duration-300">
                     <div className="flex items-start gap-3 mb-3">
                        <BookOpen className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                           <label className="font-bold text-slate-800 text-sm block">Wacana / Stimulus Literasi (Opsional)</label>
                           <p className="text-xs text-slate-500 font-medium mt-0.5">Berikan cerita, studi kasus, atau teks referensi sebelum soal bagi tipe AKM.</p>
                        </div>
                     </div>
                     <Textarea 
                        value={stimulus} 
                        onChange={e=>setStimulus(e.target.value)} 
                        rows={3} 
                        placeholder="Ketik teks wacana bacaan di sini..." 
                        className="bg-white border-blue-200 focus:bg-white focus:ring-blue-500 focus:border-blue-500 min-h-[100px] resize-y rounded-xl shadow-sm text-sm transition-all"
                     />
                  </div>

                  {/* Isi Pertanyaan */}
                  <div className="relative">
                     <div className="flex items-start gap-2 mb-2">
                        <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                        <label className="font-black text-slate-800 text-base md:text-lg">Isi Pertanyaan <span className="text-rose-500">*</span></label>
                     </div>
                     <Textarea 
                        value={content} 
                        onChange={e=>setContent(e.target.value)} 
                        rows={4} 
                        placeholder="Contoh: Berdasarkan wacana di atas, apa langkah selanjutnya yang paling rasional..." 
                        required 
                        className="text-base min-h-[120px] bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm rounded-xl resize-y transition-all duration-200 p-4" 
                     />
                  </div>

                  {/* Upload Image */}
                  <div>
                    <label className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                       <ImagePlus className="w-4 h-4 text-slate-400" />
                       Lampiran Gambar (Opsional)
                    </label>
                    <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-6 bg-slate-50 relative group transition-all duration-200 hover:bg-slate-50/50">
                       <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept="image/*" onChange={handleImageUpload} />
                       
                       {!imageContent ? (
                          <div className="flex flex-col items-center justify-center text-center">
                             <div className="w-16 h-16 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                                <Upload className="w-7 h-7 text-blue-500" />
                             </div>
                             <p className="text-sm font-bold text-slate-700">Tarik & Lepas, atau Klik untuk Upload</p>
                             <p className="text-xs text-slate-500 mt-1 max-w-[250px] mx-auto">Format didukung: JPG, PNG, WEBP. Ukuran maksimal 500KB.</p>
                          </div>
                       ) : (
                          <div className="flex gap-6 items-center">
                             <div className="relative z-20 group/img">
                                <img src={imageContent} alt="Preview Lampiran" className="w-32 h-32 object-cover rounded-xl border border-slate-200 shadow-sm" />
                                <button type="button" onClick={() => setImageContent(null)} className="absolute -top-3 -right-3 bg-rose-500 hover:bg-rose-600 text-white p-1.5 rounded-full shadow-lg transition-transform hover:scale-110">
                                   <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                             <div className="z-20 text-sm">
                                <p className="font-bold text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4"/> Gambar siap diunggah</p>
                                <p className="text-slate-500 text-xs mt-1 max-w-[200px]">Gambar akan dilampirkan tepat di bawah teks pertanyaan ujian.</p>
                             </div>
                          </div>
                       )}
                    </div>
                  </div>
                
                  {/* Dynamic Input based on Type */}
                  {(soalType === 'pg' || soalType === 'pgk') && (
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                       <div className="flex items-center gap-2 mb-4">
                          <Check className="w-5 h-5 text-slate-400" />
                          <label className="font-bold text-slate-800 text-sm">Pilihan Jawaban</label>
                       </div>
                       
                       <div className="space-y-4">
                          {[
                             { opt: 'A', val: optA, set: setOptA },
                             { opt: 'B', val: optB, set: setOptB },
                             { opt: 'C', val: optC, set: setOptC },
                             { opt: 'D', val: optD, set: setOptD },
                             { opt: 'E', val: optE, set: setOptE }
                          ].map((item) => (
                             <div key={item.opt} className="flex gap-3">
                                {soalType === 'pg' ? (
                                   <div className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-xl cursor-pointer border-2 transition-all ${correctKey === item.opt ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-300 text-slate-500 hover:border-blue-400'}`} onClick={() => setCorrectKey(item.opt)}>
                                      <span className="font-bold text-sm">{item.opt}</span>
                                   </div>
                                ) : (
                                   <div className={`shrink-0 w-11 h-11 flex items-center justify-center rounded-xl cursor-pointer border-2 transition-all ${pgkKeys.includes(item.opt) ? 'bg-purple-600 border-purple-600 text-white shadow-md' : 'bg-white border-slate-300 text-slate-500 hover:border-purple-400'}`} onClick={() => togglePgkKey(item.opt)}>
                                      <span className="font-bold text-sm">{item.opt}</span>
                                   </div>
                                )}
                                <Input 
                                   value={item.val} 
                                   onChange={e=>item.set(e.target.value)} 
                                   placeholder={`Opsi ${item.opt} ${['A','B'].includes(item.opt) ? '(Wajib)' : ''}`} 
                                   required={['A','B'].includes(item.opt)} 
                                   className={`h-11 rounded-xl transition-all bg-white shadow-sm focus:ring-2 focus:ring-offset-1 ${soalType === 'pg' && correctKey === item.opt ? 'border-blue-300 focus:border-blue-500 focus:ring-blue-500/20' : soalType === 'pgk' && pgkKeys.includes(item.opt) ? 'border-purple-300 focus:border-purple-500 focus:ring-purple-500/20' : 'border-slate-200 hover:border-slate-300 focus:border-slate-400 focus:ring-slate-400/20'}`}
                                />
                             </div>
                          ))}
                       </div>
                       <p className="text-xs text-slate-500 mt-4 text-center">Klik pada kotak huruf untuk memilih <span className="font-bold text-slate-700">Kunci Jawaban</span> yang benar.</p>
                    </div>
                  )}

                  {(soalType === 'isian') && (
                    <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-200">
                      <label className="font-bold text-amber-900 mb-2 block flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-amber-600"/> Kunci Jawaban Tepat (Isian Singkat)</label>
                      <p className="text-xs text-amber-700/70 mb-4 font-medium">Sistem akan secara otomatis menilai 'Benar' jika jawaban siswa identik dengan teks ini (case-insensitive).</p>
                      <Input value={textAnswer} onChange={e=>setTextAnswer(e.target.value)} placeholder="Contoh: 1945" required className="border-amber-300 focus:border-amber-500 focus:ring-amber-500/30 h-12 bg-white rounded-xl shadow-sm text-base" />
                    </div>
                  )}

                  {(soalType === 'essay') && (
                    <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-200">
                      <label className="font-bold text-rose-900 mb-2 block flex items-center gap-2"><HelpCircle className="w-5 h-5 text-rose-600"/> Rubrik Penilaian / Kriteria (Uraian)</label>
                      <p className="text-xs text-rose-700/70 mb-4 font-medium">Panduan pengkoreksian ini tidak dapat dilihat siswa. Hanya dapat dilihat guru saat review.</p>
                      <Textarea value={textAnswer} onChange={e=>setTextAnswer(e.target.value)} rows={4} placeholder="Tuliskan kata kunci yang wajib dijawab siswa, contoh: harus mencakup Proklamasi..." required className="border-rose-300 focus:border-rose-500 focus:ring-rose-500/30 bg-white rounded-xl shadow-sm text-base p-4 resize-y" />
                    </div>
                  )}
                  
                  <div className="flex gap-3 pt-2">
                    <Button type="submit" className="flex-1 h-12 md:h-14 text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl shadow-blue-500/20 rounded-xl transition-all hover:shadow-blue-500/30 hover:-translate-y-0.5">
                      <Save className="w-5 h-5 mr-2"/> 
                      {editingSoalId ? 'Simpan Perubahan' : 'Tambahkan ke Paket Ujian'}
                    </Button>
                    {editingSoalId && (
                      <Button type="button" variant="outline" className="h-12 md:h-14 text-base font-bold px-8 rounded-xl border-slate-300 text-slate-600 hover:bg-slate-100 transition-all" onClick={() => {
                          setEditingSoalId(null);
                          setContent(''); setStimulus(''); setOptA(''); setOptB(''); setOptC(''); setOptD(''); setOptE(''); setCorrectKey('A'); setPgkKeys([]); setTextAnswer('');
                      }}>
                        Batal
                      </Button>
                    )}
                  </div>
               </form>
            </div>
          </TabsContent>

          {/* ... Excel & Word Tab Content Omitted for brevity ... */}
          <TabsContent value="excel">
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Notice</h3>
                  <Button variant="outline" size="sm" onClick={downloadExcelTemplate}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">Fungsionalitas Excel saat ini dioptimalkan untuk soal tipe Pilihan Ganda Biasa seperti instruksi awal. Untuk input AKM (PGK, Essay, Stimulus) direkomendasikan menggunakan Manual Builder untuk memastikan struktur data ke Cloud terjaga.</p>
                <div className="mt-4"><Input ref={excelInputRef} type="file" onChange={handleImportExcel} accept=".xlsx" /></div>
            </Card>
          </TabsContent>
          <TabsContent value="word">
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Notice</h3>
                  <Button variant="outline" size="sm" onClick={downloadWordTemplate}>
                    <Download className="w-4 h-4 mr-2" />
                    Panduan Format
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">Fungsionalitas Word saat ini dioptimalkan untuk mengekstrak Pilihan Ganda. Untuk soal bernarasi AKM, gunakan tab Manual AKM.</p>
                <div className="mt-4"><Input ref={wordInputRef} type="file" onChange={handleImportWord} accept=".docx" /></div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right: Soal List Sidebar */}
      <div className="w-full md:w-[30%] flex flex-col h-[calc(100vh-6rem)] sticky top-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
               <h3 className="font-bold text-lg text-slate-800">Preview Soal</h3>
               <p className="text-xs text-slate-500 font-medium">Berisi {soalList.length} butir pertanyaan</p>
            </div>
            <span className="bg-blue-100 text-blue-700 font-black px-2.5 py-1 rounded-lg text-sm">{soalList.length}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
            {soalList.length === 0 ? (
              <div className="text-center p-8 bg-white border border-dashed rounded-xl h-40 flex flex-col items-center justify-center">
                <p className="text-slate-400 text-sm font-medium">Belum ada soal pada paket ini.</p>
              </div>
            ) : (
              soalList.map((s, i) => (
                <Card key={s.id} className="overflow-hidden border-slate-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 group transition-all duration-300 rounded-xl relative">
                  
                  {/* Action Overlay */}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                     <Button variant="secondary" size="icon" onClick={() => handleEditSoal(s)} className="w-7 h-7 rounded-md bg-white border border-slate-200 shadow-sm text-blue-600 hover:bg-blue-50">
                        <Edit2 className="w-3.5 h-3.5" />
                     </Button>
                     <Button variant="secondary" size="icon" onClick={() => handleDeleteSoal(s.id)} className="w-7 h-7 rounded-md bg-white border border-slate-200 shadow-sm text-rose-600 hover:bg-rose-50">
                        <Trash2 className="w-3.5 h-3.5" />
                     </Button>
                  </div>

                  {/* Visual Label */}
                  <div className="px-4 py-3 flex items-center gap-2 border-b border-slate-50">
                    <span className="w-6 h-6 rounded-md bg-slate-800 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-sm">{i + 1}</span>
                    <div className="flex-1 overflow-hidden">{getBadgeFormat(s.type || 'pg')}</div>
                    {s.stimulus && <span className="text-[9px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider shrink-0" title="Ada Wacana">WACANA</span>}
                  </div>

                  <div className="p-4 pt-2">
                    {s.stimulus && (
                      <div className="mb-3 p-3 bg-blue-50/50 rounded-lg text-xs text-slate-600 border-l-2 border-blue-400 max-h-20 overflow-hidden relative">
                        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-blue-50/50 to-transparent"></div>
                        "{s.stimulus}"
                      </div>
                    )}

                    <p className="font-semibold text-sm text-slate-800 leading-relaxed mb-3 line-clamp-3">
                       {s.content}
                    </p>

                    {s.imageUrl && (
                      <div className="mb-3 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 hidden group-hover:block transition-all">
                        <img src={s.imageUrl} alt="Lampiran" className="max-h-24 w-full object-cover" />
                      </div>
                    )}
                    
                    {/* Option Renderer (Preview Mode) */}
                    {s.type === 'pg' && (
                      <div className="space-y-1.5 selection-none mt-2">
                        {s.options?.slice(0, 3).map((opt: string, idx: number) => {
                          const isCorrect = opt === s.correctAnswer;
                          const label = String.fromCharCode(65 + idx);
                          return (
                            <div key={idx} className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-2 truncate ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-white border-slate-100 text-slate-500 font-medium'}`}>
                              <span className="opacity-70 font-bold w-4 text-center">{label}</span> {opt}
                            </div>
                          )
                        })}
                        {s.options?.length > 3 && (
                           <div className="text-[10px] text-center text-slate-400 font-bold tracking-widest pt-1">+ {s.options.length - 3} OPSI LAINNYA</div>
                        )}
                      </div>
                    )}

                    {s.type === 'pgk' && (
                      <div className="space-y-1.5 selection-none mt-2">
                        {s.options?.slice(0,3).map((opt: string, idx: number) => {
                          const isCorrect = Array.isArray(s.correctAnswer) && s.correctAnswer.includes(opt);
                          return (
                            <div key={idx} className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-2 truncate ${isCorrect ? 'bg-purple-50 border-purple-200 text-purple-800 font-bold' : 'bg-white border-slate-100 text-slate-500 font-medium'}`}>
                              <div className={`w-3 h-3 rounded box-border border ${isCorrect ? 'bg-purple-600 border-purple-600' : 'bg-white border-slate-300'}`}></div>
                              {opt}
                            </div>
                          )
                        })}
                        {s.options?.length > 3 && (
                           <div className="text-[10px] text-center text-slate-400 font-bold tracking-widest pt-1">+ {s.options.length - 3} OPSI LAINNYA</div>
                        )}
                      </div>
                    )}

                    {s.type === 'isian' && (
                       <div className="text-xs bg-amber-50 text-amber-800 rounded-lg p-2.5 border border-amber-200 mt-2 font-medium">
                         <span className="font-bold mr-1 opacity-70">Jawaban:</span> 
                         {s.correctAnswer}
                       </div>
                    )}

                    {s.type === 'essay' && (
                       <div className="text-xs bg-rose-50 text-rose-800 rounded-lg p-2.5 border border-rose-200 mt-2 font-medium">
                         <span className="font-bold mr-1 opacity-70">Rubrik:</span> 
                         <span className="truncate inline-block max-w-[200px] align-bottom">{s.correctAnswer}</span>
                       </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
