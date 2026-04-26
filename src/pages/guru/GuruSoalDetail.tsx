import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, addDoc, doc, getDoc, writeBatch, serverTimestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Plus, ChevronLeft, Save, Download, FileType, Trash2, Edit2 } from 'lucide-react';
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
      if (file.size > 1024 * 1024 * 2) { // 2MB Limit for safety with base64
        return toast.error("Ukuran gambar maksimal 2MB");
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto flex flex-col md:flex-row gap-6">
      
      {/* Left: Input Areas */}
      <div className="flex-1 space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="shrink-0 p-2">
             <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold bg-secondary text-primary px-3 py-1 rounded-md inline-block mb-1">
              Bank Soal: {paketInfo?.title || 'Loading...'}
            </h2>
            <p className="text-muted-foreground text-sm">Builder Interaktif Soal Standar & AKM Terpadu.</p>
          </div>
        </div>

        <Tabs defaultValue="manual" className="w-full">
          <Card className="p-1 mb-4 bg-muted/30">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="manual">Manual / AKM</TabsTrigger>
              <TabsTrigger value="excel">Excel (.xlsx)</TabsTrigger>
              <TabsTrigger value="word">Word (.docx)</TabsTrigger>
            </TabsList>
          </Card>

          <TabsContent value="manual">
            <Card className="p-5 border-t-4 border-t-primary shadow-sm">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                   <FileType className="text-primary w-5 h-5"/> Builder Soal (Standar & AKM)
                </h3>
                <div className="w-[280px]">
                  <Select value={soalType} onValueChange={setSoalType}>
                    <SelectTrigger className="w-full"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pg">Pilihan Ganda (1 Benar)</SelectItem>
                      <SelectItem value="pgk">PG Kompleks (Banyak Benar)</SelectItem>
                      <SelectItem value="isian">Isian Singkat</SelectItem>
                      <SelectItem value="essay">Uraian / Essay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <form onSubmit={handleAddManual} className="space-y-5 text-sm">
                
                {/* Wacana / Stimulus Literasi (OPSIONAL TAPI KRUSIAL UNTUK AKM) */}
                <div className="bg-secondary/30 p-4 rounded-xl border border-secondary">
                  <label className="font-semibold mb-1 block text-primary">Wacana / Stimulus (Opsional)</label>
                  <p className="text-xs text-muted-foreground mb-3">Teks cerita, artikel, data, atau konteks literasi sebelum pertanyaan.</p>
                  <Textarea value={stimulus} onChange={e=>setStimulus(e.target.value)} rows={3} placeholder="Contoh: Pada tahun 2045, teknologi AI telah mengambil alih..." />
                </div>

                <div>
                  <label className="font-bold text-base mb-2 block">Isi Pertanyaan *</label>
                  <Textarea value={content} onChange={e=>setContent(e.target.value)} rows={3} placeholder="Tuliskan pertanyaan spesifik..." required className="text-base" />
                </div>

                {/* IMAGE UPLOAD UI */}
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50">
                  <label className="font-semibold mb-2 block text-slate-700 text-sm">Lampiran Gambar (Opsional)</label>
                  <div className="flex flex-wrap gap-4 items-start">
                    <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 text-slate-400 mb-2" />
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Upload Gambar</p>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                    {imageContent && (
                      <div className="relative group">
                        <img src={imageContent} alt="Preview" className="w-32 h-32 object-cover rounded-lg border shadow-sm" />
                        <button 
                          type="button"
                          onClick={() => setImageContent(null)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <div className="flex-1 text-[11px] text-slate-400 leading-relaxed italic">
                      Gunakan gambar untuk melengkapi soal (grafik, peta, tabel gambar, dll). Gambar akan tersimpan langsung ke database. Maksimal 2MB.
                    </div>
                  </div>
                </div>
                
                {/* Dynamic Input based on Type */}
                {(soalType === 'pg' || soalType === 'pgk') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border">
                    <div className="space-y-3">
                      <Input value={optA} onChange={e=>setOptA(e.target.value)} placeholder="Opsi A (Wajib dsi)" required />
                      <Input value={optB} onChange={e=>setOptB(e.target.value)} placeholder="Opsi B (Wajib disi)" required />
                      <Input value={optC} onChange={e=>setOptC(e.target.value)} placeholder="Opsi C" />
                    </div>
                    <div className="space-y-3">
                      <Input value={optD} onChange={e=>setOptD(e.target.value)} placeholder="Opsi D" />
                      <Input value={optE} onChange={e=>setOptE(e.target.value)} placeholder="Opsi E" />
                      
                      <div className="p-3 border rounded-md bg-white">
                         <label className="font-medium text-xs mb-3 block text-primary">Pilih Kunci Jawaban Benar:</label>
                         
                         {soalType === 'pg' ? (
                           <RadioGroup value={correctKey} onValueChange={setCorrectKey} className="flex gap-4">
                              {['A','B','C','D','E'].map(k => (
                                <div key={k} className="flex items-center space-x-1">
                                  <RadioGroupItem value={k} id={`key-${k}`} />
                                  <label htmlFor={`key-${k}`} className="cursor-pointer font-medium">{k}</label>
                                </div>
                              ))}
                           </RadioGroup>
                         ) : (
                           <div className="flex gap-4">
                              {['A','B','C','D','E'].map(k => (
                                <div key={k} className="flex items-center space-x-1">
                                  <Checkbox 
                                    id={`check-${k}`} 
                                    checked={pgkKeys.includes(k)} 
                                    onCheckedChange={()=>togglePgkKey(k)} 
                                  />
                                  <label htmlFor={`check-${k}`} className="cursor-pointer font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{k}</label>
                                </div>
                              ))}
                           </div>
                         )}
                      </div>
                    </div>
                  </div>
                )}

                {(soalType === 'isian') && (
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                    <label className="font-semibold text-amber-800 mb-2 block">Kunci Jawaban Tepat (Isian Singkat) *</label>
                    <p className="text-xs text-amber-700/80 mb-3">Sistem akan menilai 'Benar' jika jawaban siswa identik dengan teks ini (case-insensitive).</p>
                    <Input value={textAnswer} onChange={e=>setTextAnswer(e.target.value)} placeholder="Contoh: 1945" required className="border-amber-300" />
                  </div>
                )}

                {(soalType === 'essay') && (
                  <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
                    <label className="font-semibold text-rose-800 mb-2 block">Kriteria Jawaban / Rubrik Penilaian *</label>
                    <p className="text-xs text-rose-700/80 mb-3">Siswa akan menjawab panjang. Panduan ini hanya untuk referensi penilaian manual guru kelak.</p>
                    <Textarea value={textAnswer} onChange={e=>setTextAnswer(e.target.value)} rows={4} placeholder="Kriteria benarnya harus mencakup A, B, dan C..." required className="border-rose-300" />
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 text-base py-6">
                    <Save className="w-5 h-5 mr-2"/> 
                    {editingSoalId ? 'Simpan Perubahan' : 'Tambahkan ke Paket Ujian'}
                  </Button>
                  {editingSoalId && (
                    <Button type="button" variant="outline" className="text-base py-6 px-6" onClick={() => {
                        setEditingSoalId(null);
                        setContent(''); setStimulus(''); setOptA(''); setOptB(''); setOptC(''); setOptD(''); setOptE(''); setCorrectKey('A'); setPgkKeys([]); setTextAnswer('');
                    }}>
                      Batal
                    </Button>
                  )}
                </div>
              </form>
            </Card>
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
      <div className="w-full md:w-[450px] flex flex-col">
        <h3 className="font-bold text-lg mb-4 text-foreground flex items-center justify-between">
          Daftar Soal 
          <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded text-sm">{soalList.length} Item</span>
        </h3>
        <div className="flex-1 overflow-y-auto space-y-4 pb-8 pr-2">
          {soalList.length === 0 ? (
            <div className="text-center p-8 bg-muted border border-dashed rounded-xl">
              <p className="text-muted-foreground text-sm">Belum ada soal pada paket ini.</p>
            </div>
          ) : (
            soalList.map((s, i) => (
              <Card key={s.id} className="overflow-hidden border bg-white shadow-sm hover:shadow relative transition-all">
                
                {/* Visual Label for AKM */}
                <div className="bg-muted px-3 py-2 border-b flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                    {getBadgeFormat(s.type || 'pg')}
                  </div>
                  {s.stimulus && <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-1 rounded font-bold uppercase tracking-wider">Has Stimulus</span>}
                </div>

                <div className="p-4">
                  {s.stimulus && (
                    <div className="mb-3 p-3 bg-secondary/50 rounded-lg text-sm text-muted-foreground border-l-2 border-primary line-clamp-2 italic">
                      "{s.stimulus}"
                    </div>
                  )}

                  <p className="font-medium text-sm text-foreground leading-relaxed mb-3">
                     {s.content}
                  </p>

                  {s.imageUrl && (
                    <div className="mb-4 rounded-lg overflow-hidden border bg-slate-50">
                      <img src={s.imageUrl} alt="Lampiran Soal" className="max-h-48 w-full object-contain mx-auto" />
                    </div>
                  )}
                  
                  {/* Option Renderer */}
                  {s.type === 'pg' && (
                    <div className="space-y-1.5 selection-none">
                      {s.options?.map((opt: string, idx: number) => {
                        const isCorrect = opt === s.correctAnswer;
                        const label = String.fromCharCode(65 + idx);
                        return (
                          <div key={idx} className={`text-xs px-2.5 py-1.5 rounded-md border ${isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold' : 'bg-slate-50 border-slate-100 text-muted-foreground'}`}>
                            {label}. {opt}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {s.type === 'pgk' && (
                    <div className="space-y-1.5 selection-none">
                      {s.options?.map((opt: string, idx: number) => {
                        const isCorrect = Array.isArray(s.correctAnswer) && s.correctAnswer.includes(opt);
                        return (
                          <div key={idx} className={`text-xs px-2.5 py-1.5 rounded-md border flex items-center gap-2 ${isCorrect ? 'bg-purple-50 border-purple-300 text-purple-800 font-semibold' : 'bg-slate-50 border-slate-100 text-muted-foreground'}`}>
                            <div className={`w-3 h-3 rounded-sm border ${isCorrect ? 'bg-purple-600 border-purple-600' : 'bg-white border-slate-300'}`}></div>
                            {opt}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {s.type === 'isian' && (
                     <div className="text-xs bg-amber-50 text-amber-800 rounded p-2 border border-amber-200">
                       <span className="font-semibold block mb-1">Kunci Pasti:</span>
                       {s.correctAnswer}
                     </div>
                  )}

                  {s.type === 'essay' && (
                     <div className="text-xs bg-rose-50 text-rose-800 rounded p-2 border border-rose-200">
                       <span className="font-semibold block mb-1">Rubrik Penilaian:</span>
                       <span className="line-clamp-2">{s.correctAnswer}</span>
                     </div>
                  )}

                  <div className="mt-4 pt-3 border-t flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditSoal(s)} className="text-blue-600 border-blue-200 hover:bg-blue-50 h-8">
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteSoal(s.id)} className="text-red-600 border-red-200 hover:bg-red-50 h-8">
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
