import React from 'react';
import { Card } from '@/components/ui/card';
import { BookOpen, AlertCircle, CheckCircle2, ChevronRight, FileText, Database, Calendar, Users, BarChart3, Presentation } from 'lucide-react';

export default function AdminDocs() {
  return (
    <div className="p-6 md:p-10 max-w-[1000px] mx-auto space-y-8 pb-20">
      <div className="border-b border-slate-200 pb-6">
        <div className="inline-flex items-center justify-center p-2.5 bg-blue-100 rounded-xl mb-4">
          <BookOpen className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Dokumentasi & Panduan</h2>
        <p className="text-slate-500 font-medium mt-2 text-lg">Pelajari cara mengoperasikan CBT System versi 1.0.0 dengan efisien.</p>
      </div>

      <div className="space-y-8">
        
        {/* Section 1: Alur Kerja */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Presentation className="w-5 h-5 text-indigo-500" /> 1. Alur Kerja Utama (Workflow)
          </h3>
          <Card className="p-6 shadow-sm border-slate-200 bg-white">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between text-center overflow-x-auto">
              {[
                { title: 'Master Data', desc: 'Isi mapel & kelas' },
                { title: 'Bank Soal', desc: 'Guru buat soal' },
                { title: 'Jadwal Ujian', desc: 'Set jadwal & token' },
                { title: 'Pelaksanaan', desc: 'Siswa ujian online' },
                { title: 'Hasil Ujian', desc: 'Cetak nilai & rekap' },
              ].map((step, idx) => (
                <React.Fragment key={idx}>
                  <div className="flex flex-col items-center flex-shrink-0 w-32">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-indigo-100 flex items-center justify-center font-black text-indigo-600 mb-2">
                      {idx + 1}
                    </div>
                    <span className="font-bold text-slate-700 text-sm">{step.title}</span>
                    <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{step.desc}</span>
                  </div>
                  {idx < 4 && <ChevronRight className="w-5 h-5 text-slate-300 hidden md:block" />}
                </React.Fragment>
              ))}
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100 flex gap-3 text-sm text-blue-800">
               <AlertCircle className="w-5 h-5 shrink-0 text-blue-600" />
               <p><strong>Tips:</strong> Aplikasi tidak bisa berjalan tanpa data pokok yang disiapkan. Pastikan menu <b>Master Data (Ruang, Sesi)</b> dan <b>Administrasi (Siswa, Kelas, Mapel)</b> diatur terlebih dahulu.</p>
            </div>
          </Card>
        </section>

        {/* Section 2: Administrasi */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-500" /> 2. Manajemen Master Data & Administrasi
          </h3>
          <Card className="p-0 shadow-sm border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
             <div className="p-5 flex gap-4">
               <div className="mt-1"><Users className="w-5 h-5 text-slate-400" /></div>
               <div>
                 <h4 className="font-bold text-slate-800">Data Siswa</h4>
                 <p className="text-slate-500 text-sm mt-1">Gunakan tombol <b>Import Excel</b> untuk memasukkan ratusan siswa sekaligus. Format excel sudah tersedia untuk didownload di dalam menu tersebut. Password default siswa hasil import adalah <b>123456</b>.</p>
               </div>
             </div>
             <div className="p-5 flex gap-4">
               <div className="mt-1"><AlertCircle className="w-5 h-5 text-slate-400" /></div>
               <div>
                 <h4 className="font-bold text-slate-800">Password / Login Siswa Gagal</h4>
                 <p className="text-slate-500 text-sm mt-1">Jika ada siswa yang lupa password atau gagal login dengan keterangan 'Akun tidak ditemukan di Firebase', Administrator dapat menekan tombol <b>Reset Akun Auth</b> di barisan data siswa (tabel aksi).</p>
               </div>
             </div>
          </Card>
        </section>

        {/* Section 3: Bank Soal */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-500" /> 3. Pembuatan Bank Soal
          </h3>
          <Card className="p-5 shadow-sm border-slate-200 bg-white">
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-2.5"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> <p>Admin atau Guru dapat membuat <b>Paket Soal</b> di menu Bank Soal.</p></li>
              <li className="flex gap-2.5"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> <p>Klik modul paket soal yang telah dibuat, Anda akan masuk ke <b>Editor Soal</b>.</p></li>
              <li className="flex gap-2.5"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> <p>Anda bisa menambahkan soal secara manual dengan editor teks berformat MS Word, atau <b>Import Soal dari Word / Excel</b> sesuai format yang kami sediakan di dalam aplikasi.</p></li>
            </ul>
          </Card>
        </section>

        {/* Section 4: Pelaksanaan Ujian */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-rose-500" /> 4. Jadwal & Pelaksanaan Ujian
          </h3>
          <Card className="p-6 shadow-sm border-slate-200 bg-white space-y-4">
            <p className="text-sm text-slate-600">Pelaksanaan ujian dikendalikan secara real-time oleh Administrator.</p>
            <div className="bg-slate-50 border rounded-lg p-4">
               <ol className="list-decimal pl-4 text-sm text-slate-700 space-y-2 font-medium">
                 <li>Buat <b>Jadwal Ujian</b> dengan memilih Paket Soal, Kelas Peserta, dan Durasi.</li>
                 <li>Aplikasi akan secara otomatis mengeluarkan <b>Token</b> secara otomatis (6 digit acak).</li>
                 <li>Siswa yang akan mengikuti ujian, <b>wajib memasukkan Token</b> tersebut sebelum mulai.</li>
                 <li>Siswa tidak bisa login apabila jadwal ujian bersatus <span className="text-slate-400 font-bold">Draft</span> atau <span className="text-slate-400 font-bold">Selesai</span>.</li>
                 <li>Ubah status jadwal menjadi <span className="text-emerald-600 font-bold outline outline-1 outline-emerald-200 px-1 rounded bg-emerald-50">AKTIF</span> untuk memulai. Status dapat diubah melalui tombol Play/Stop di kartu daftar ujian.</li>
               </ol>
            </div>
          </Card>
        </section>

        {/* Section 5: Hasil */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-500" /> 5. Buku Nilai & Log Reset Siswa 
          </h3>
          <Card className="p-5 shadow-sm border-slate-200 bg-white">
            <p className="text-sm text-slate-600 mb-4">Pengolahan hasil dapat dipantau langsung sewaktu siswa masih berjalan mengerjakan.</p>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-2.5"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> <p>Tombol <b>Ulang</b> pada analisis sesi digunakan untuk me-reset / menghapus sesi jawaban siswa. Peringatan: Aksi ini menghapus nilai ujian tersebut dan mengharuskan siswa login untuk memulai dari nomor 1 secara keseluruhan.</p></li>
              <li className="flex gap-2.5"><CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> <p><b>Buku Nilai (Riwayat)</b> sangat berguna ketika aplikasi dipakai untuk Ulangan Harian berulang kali di kelas, ini akan membentuk kumpulan perolehan nilai setiap UH (Ulangan Harian) dan akan dirata-rata di akhir kanan tabel secara otomatis dan dapat diexport Excel.</p></li>
            </ul>
          </Card>
        </section>

      </div>
    </div>
  );
}
