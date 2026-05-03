import React from 'react';
import { Card } from '@/components/ui/card';
import { BookOpen, HelpCircle, FileText, CheckCircle, GraduationCap, Users } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

export default function Panduan() {
  const { profile } = useAuthStore();
  const isAdmin = profile?.role === 'admin';
  const isWaliKelas = !!profile?.waliKelas;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Buku Panduan </h1>
          <p className="text-slate-500 font-medium mt-1">Dokumentasi dan petunjuk penggunaan sistem untuk {isAdmin ? 'Administrator' : 'Guru & Wali Kelas'}.</p>
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
               <p>Sebelum memulai konfigurasi lain, pastikan modul Master Data sudah terisi dengan benar:</p>
               <ul className="list-disc pl-5 mt-2 space-y-1">
                 <li><b>Mata Pelajaran & Kelas:</b> Digunakan sebagai atribut data dan pemetaan.</li>
                 <li><b>Ruang & Sesi:</b> Digunakan untuk pembagian jadwal ujian dan percetakan kartu/daftar hadir.</li>
                 <li><b>Jenis Ujian:</b> Digunakan untuk mengelompokkan ujian (misal: PTS, PAS, TO).</li>
               </ul>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-2">2. Administrasi User (Siswa & Guru)</h3>
               <p>Kelola akses untuk Siswa dan Guru melalui menu ini.</p>
               <ul className="list-disc pl-5 mt-2 space-y-1">
                 <li>Data Siswa dapat diinput massal menggunakan fitur <b>Import Excel</b>.</li>
                 <li>Email siswa ter-generate secara otomatis berdasarkan NIS/NISN.</li>
                 <li>Guru akan memiliki email default (misal: guru_nip@edutest.local) kecuali diubah.</li>
                 <li>Siswa yang lupa password dapat di-reset melalui tombol "Reset Sandi" atau ubah Profilnya.</li>
               </ul>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-2">3. Jadwal Ujian & Token</h3>
               <p>Jadwal Ujian adalah inti dari sistem CBT ini.</p>
               <ul className="list-disc pl-5 mt-2 space-y-1">
                 <li>Suaikan bank soal yang sudah dibuat dengan Jadwal Ujian.</li>
                 <li>Admin dapat mengatur waktu tampil, durasi, sesi, acak soal, opsi hingga batas waktu keterlambatan.</li>
                 <li>Token dapat digenerate secara dinamis dan ditampilkan kepada peserta di ruangan.</li>
               </ul>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-2">4. Hasil & Koreksi Manual</h3>
               <p>Laporan langsung dari siswa yang mengerjakan soal tersedia di Dashboard maupun Hasil Ujian.</p>
               <ul className="list-disc pl-5 mt-2 space-y-1">
                 <li>Bisa mengekspor data ke Excel per jadwal.</li>
                 <li>Sistem otomatis mengoreksi soal PG, Benar-Salah, dan Menjodohkan.</li>
                 <li>Jika Paket Soal memuat soal Isian / Essay, pastikan Admin atau Guru Pengampu melakukan koreksi manual pada halaman Hasil Kerja siswa.</li>
               </ul>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-2">5. Fitur Cetak (Print Out)</h3>
               <p>Admin dapat mencetak berbagai kelengkapan administrasi ujian dari menu <b>Cetak</b>.</p>
               <ul className="list-disc pl-5 mt-2 space-y-1">
                 <li><b>Kartu Peserta:</b> Mencetak kartu berisi Nama, NIS, Kelas, Ruang, dan Password login ujian.</li>
                 <li><b>Daftar Hadir:</b> Rekapitulasi absensi siswa per Ruang Ujian.</li>
                 <li><b>Berita Acara:</b> Formulir Berita Acara pelaksanaan Ujian.</li>
                 <li>Semua berkas cetak akan menyesuaikan KOP pengaturan Admin (Kop Baris 1, Kop Baris 2, Nama Sekolah).</li>
               </ul>
            </div>

             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-2">6. Database & Keamanan</h3>
               <p>Untuk mengamankan database, beberapa hal penting wajib diperhatikan:</p>
               <ul className="list-disc pl-5 mt-2 space-y-1">
                 <li>Jangan membagikan kredensial Admin ke pihak yang tidak bertanggung jawab.</li>
                 <li>Fitur "Hapus Semua Data" di menu Pengaturan sangat berisiko, hanya gunakan saat pergantian tahun ajaran secara total.</li>
               </ul>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* GURU MAPEL GUIDE */}
          <Card className="p-6 border-0 shadow-lg shadow-slate-200/50">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Panduan Guru Mata Pelajaran
            </h2>
            
            <div className="space-y-6 text-slate-600 leading-relaxed text-sm">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-2">1. Manajemen Paket Soal</h3>
                <p>Guru Mapel bertanggung jawab membuat Paket Soal/Bank Soal untuk diujikan.</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Pilih menu <b>Paket Soal</b>, buat paket baru, sesuaikan tingkat kelas dan mapel terkait.</li>
                  <li>Manfaatkan fitur <b>Import Word</b> untuk metode cepat memasukkan puluhan soal Pilihan Ganda (PG).</li>
                  <li>Aplikasi CBT ini mendukung jenis soal AKM: <i>PG (Pilihan Ganda), Menjodohkan, PGK (PG Kompleks / Checkbox), Benar/Salah,</i> dan <i>Isian Singkat</i>.</li>
                  <li>Pastikan pada menu Setelan Soal, <b>Total Bobot</b> bernilai tepat 100%.</li>
                </ul>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                 <h3 className="font-bold text-slate-800 mb-2">2. Memantau Hasil Ujian (CBT)</h3>
                 <p>Hasil ujian siswa yang mengerjakan paket soal milik Bapak/Ibu dapat dilihat di menu <b>Hasil Ujian</b>.</p>
                 <ul className="list-disc pl-5 mt-2 space-y-1">
                   <li>Jika di paket soal terdapat tipe "Isian Singkat", Bapak/Ibu wajib mengoreksi manual dengan mengklik hasil kerja peserta didik dan memberikan nilai isian.</li>
                 </ul>
              </div>

              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                 <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-1.5"><GraduationCap className="w-4 h-4"/> 3. Input Nilai Raport (Kurikulum Merdeka)</h3>
                 <p>Guru Mapel menginputkan capaian Nilai Formatif, Sumatif, PTS, hingga PSAS di menu <b>Input Nilai Mapel</b>.</p>
                 <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-700">
                   <li>Pilih Kelas dan Mapel yang Bapak/Ibu ampu untuk membuka tabel nilai. Hanya guru pengampu mapel bersangkutan yang dapat mengeditnya.</li>
                   <li>Terdapat 8 kolom untuk masing-masing Nilai Formatif dan Nilai Sumatif.</li>
                   <li>Jika ada nilai yang kurang memenuhi KKM, manfaatkan fitur <b>Katrol PTS</b> atau <b>Katrol PSAS</b> secara otomatis.</li>
                   <li>Sistem dapat membuat Capaian Kompetensi (Deskripsi Raport) secara <b>Otomatis</b> mengikuti persentase KKM dan capaian siswa sesuai Panduan Deskripsi yang telah diset.</li>
                   <li>Gunakan fasilitas <b>Export Excel</b> & <b>Import Excel</b> untuk pengisian nilai secara offline yang lebih cepat memuat satu kelas.</li>
                 </ul>
              </div>
            </div>
          </Card>

          {/* WALI KELAS GUIDE */}
          {isWaliKelas && (
             <Card className="p-6 border-0 shadow-[0_0_20px_rgba(245,158,11,0.1)] relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
               <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                 <Users className="w-5 h-5 text-amber-500" />
                 Panduan Wali Kelas: {profile?.waliKelas}
               </h2>
               
               <div className="space-y-6 text-slate-600 leading-relaxed text-sm">
                 <div className="bg-amber-50/30 p-4 rounded-xl border border-amber-100">
                   <h3 className="font-bold text-slate-800 mb-2">1. Memonitor Integrasi Data Siswa</h3>
                   <p>Pada menu <b>Data Siswa</b>, Bapak/Ibu dapat mengawasi identitas anak didiknya.</p>
                   <ul className="list-disc pl-5 mt-2 space-y-1">
                     <li>Wali Kelas dapat <b>mereset password</b> jika ada siswa yang kesulitan untuk login ujian.</li>
                     <li>Wali Kelas dapat <b>mengubah profil NIS dan nama</b> apabila tidak sesuai.</li>
                     <li>Akses pengelolaan ini dibatasi hanya untuk anggota dari kelas {profile?.waliKelas}.</li>
                   </ul>
                 </div>
                 
                 <div className="bg-amber-50/30 p-4 rounded-xl border border-amber-100">
                    <h3 className="font-bold text-slate-800 mb-2">2. Percetakan Raport & Ledger</h3>
                    <p>Wali Kelas berhak mengakses menu <b>Raport Kelas</b> untuk melihat, mengevaluasi dan mencetak hasil akademik seluruh siswa didiknya.</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li><b>Ledger PTS & Ledger Akhir:</b> merupakan rekapan hasil nilai kompetensi siswa berbentuk tabel lanskap horizontal, sudah dilengkapi Rerata, Peringkat Kelas (Ranking), Total capaian setiap mapel.</li>
                      <li><b>Raport PTS & Raport Akhir:</b> merupakan dokumen cetak Rapor individual per Siswa berisi Capaian Kompetensi (Deskripsi per mapel) sesuai standar.</li>
                      <li>Jika ada "Nilai Kosong", komunikasikan dengan Guru Mapel tersebut agar menginput di menu Input Nilainya.</li>
                      <li><b>Catatan Pembinaan:</b> Bapak/Ibu dapat mengisi evaluasi Catatan Wali Kelas yang akan terbaca di rapor PTS/Semester. Jangan lupa klik <b>Simpan Catatan Wali Kelas</b> agar masuk database.</li>
                      <li>Semua laporan ini bisa secara langsung direview lalu <b>Cetak (Lewat Browser)</b> atau <b>Eksport PDF</b>.</li>
                    </ul>
                 </div>
               </div>
             </Card>
          )}

        </div>
      )}
    </div>
  );
}
