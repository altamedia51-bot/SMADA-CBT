import React from 'react';
import { Card } from '@/components/ui/card';
import { BookOpen, HelpCircle, FileText, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

export default function Panduan() {
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Panduan Penggunaan App</h1>
          <p className="text-slate-500 font-medium mt-1">Dokumentasi dan petunjuk penggunaan sistem untuk {isAdmin ? 'Administrator' : 'Guru'}.</p>
        </div>
      </div>

      {isAdmin ? (
        <Card className="p-6 border-0 shadow-lg shadow-slate-200/50">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
             <HelpCircle className="w-5 h-5 text-indigo-500" />
             Panduan Administrator
          </h2>
          
          <div className="space-y-6 text-slate-600 leading-relaxed text-sm">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-2">1. Master Data</h3>
               <p>Sebelum memulai ujian, pastikan <b>Data Ruang</b>, <b>Data Sesi</b>, dan <b>Jenis Ujian</b> sudah terisi.</p>
               <ul className="list-disc pl-5 mt-2 space-y-1">
                 <li>Data Ruang: digunakan untuk pembagian ruang siswa.</li>
                 <li>Data Sesi: digunakan untuk pembagian jam ujian siswa.</li>
                 <li>Jenis Ujian: digunakan sebagai label ujian (misal: PTS, PAS, TO).</li>
               </ul>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-2">2. Administrasi User</h3>
               <p>Tambahkan data <b>Siswa</b>, <b>Guru</b>, <b>Kelas</b>, dan <b>Mapel</b>.</p>
               <ul className="list-disc pl-5 mt-2 space-y-1">
                 <li>Anda dapat melakukan Import Data Siswa melalui file Excel.</li>
                 <li>Email siswa otomatis ter-generate dari NIS/NISN, pastikan NIS unik.</li>
                 <li>Guru dapat ditambahkan dan otomatis bisa login menggunakan email default guru_nip@edutest.local.</li>
               </ul>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-2">3. Jadwal Ujian</h3>
               <p>Jadwal Ujian akan mengambil Paket Soal yang telah dibuat oleh Admin atau Guru.</p>
               <ul className="list-disc pl-5 mt-2 space-y-1">
                 <li>Pilih paket soal, jenis ujian, token, dan kelas-kelas yang diujikan.</li>
                 <li>Anda dapat mengatur agar hasil bisa dilihat oleh siswa setelah selesai.</li>
               </ul>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-2">4. Hasil & Koreksi</h3>
               <p>Menu Hasil Ujian memungkinkan Admin untuk melihat seluruh progres ujian siswa.</p>
               <ul className="list-disc pl-5 mt-2 space-y-1">
                 <li>Soal Isian Singkat membutuhkan koreksi manual jika auto-koreksi tidak cocok.</li>
                 <li>Gunakan menu koreksi pada hasil kerja siswa untuk memberikan nilai Isian Singkat.</li>
               </ul>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6 border-0 shadow-lg shadow-slate-200/50">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
             <CheckCircle className="w-5 h-5 text-emerald-500" />
             Panduan Guru
          </h2>
          
          <div className="space-y-6 text-slate-600 leading-relaxed text-sm">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-2">1. Membuat Paket Soal</h3>
               <p>Anda dapat membuat paket soal untuk mata pelajaran yang anda ampu.</p>
               <ul className="list-disc pl-5 mt-2 space-y-1">
                 <li>Masuk ke menu <b>Paket Soal</b> lalu klik Tambah Paket.</li>
                 <li>Anda juga dapat mengimpor soal pilihan ganda melalui format Word.</li>
               </ul>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-2">2. Tipe Soal Terpadu (AKM)</h3>
               <p>Aplikasi ini mendukung berbagai jenis soal:</p>
               <ul className="list-disc pl-5 mt-2 space-y-1">
                 <li>Pilihan Ganda (PG)</li>
                 <li>Pilihan Ganda Kompleks (PGK - jawaban lebih dari 1)</li>
                 <li>Menjodohkan (Drag and drop pasangan jawaban)</li>
                 <li>Isian Singkat (Jawaban teks terbatas, akan butuh koreksi manual di hasil ujian jika tidak exact)</li>
                 <li>Benar/Salah (Menyatakan benar salah pada beberapa pernyataan)</li>
               </ul>
            </div>
            
             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-2">3. Konfigurasi Bobot Penilaian</h3>
               <p>Setelah membuat soal, jangan lupa atur bobot penilaian pada detail Paket Soal.</p>
               <ul className="list-disc pl-5 mt-2 space-y-1">
                 <li>Total bobot harus tepat berjumlah 100%.</li>
                 <li>Jika anda tidak mempunyai tipe soal Isian, berikan Isian nilai 0.</li>
               </ul>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-2">4. Hasil & Nilai</h3>
               <p>Anda dapat melihat hasil ujian dan mendownload rekap nilai siswa yang mengerjakan paket Bapak/Ibu pada menu <b>Hasil Ujian</b>.</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
