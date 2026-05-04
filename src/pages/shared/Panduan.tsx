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
               <p>Kelola data utama sekolah melalui menu <b>Master Data</b> yang menaungi:</p>
               <ul className="list-disc pl-5 mt-2 space-y-1">
                 <li><b>Data Siswa & Guru:</b> Dapat diinput massal dengan <b>Import Excel</b>. Akun login siswa menggunakan NISN, sedangkan guru menggunakan NIP (atau default jika kosong).</li>
                 <li><b>Data Kelas & Mapel:</b> Digunakan untuk pemetaan rombel dan atribut mata pelajaran. Terdapat fitur kenaikan/kelulusan kelas massal di menu Data Kelas.</li>
                 <li><b>Data Ekstra:</b> Digunakan untuk pendataan kegiatan ekstrakurikuler.</li>
               </ul>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-2">2. Manajemen Ujian (CBT)</h3>
               <p>Inti pelaksanaan Computer Based Test (CBT) dikoordinasi di menu <b>Manajemen Ujian</b>:</p>
               <ul className="list-disc pl-5 mt-2 space-y-1">
                 <li><b>Bank Soal:</b> Admin memiliki akses penuh atas seluruh Paket Soal guru. Bisa melakukan penambahan, edit, maupun delete.</li>
                 <li><b>Jadwal Ujian:</b> Admin membuat jadwal dari Bank Soal yang sedia. Atur waktu, durasi, sesi, fitur acak, sampai token dinamis.</li>
                 <li><b>Hasil Ujian:</b> Memantau hasil pengerjaan real-time. Export excel. Untuk soal Isian, dapat dikoreksi manual pada hasil kerja individu.</li>
                 <li>Sistem otomatis mengoreksi soal PG, Benar-Salah, dan Menjodohkan.</li>
               </ul>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-2">3. Administrasi Kurikulum (Akademik)</h3>
               <p>Admin Kurikulum dapat melakukan rekap nilai dan raport terpusat:</p>
               <ul className="list-disc pl-5 mt-2 space-y-1">
                 <li><b>Input Nilai:</b> Memantau pengisian form formatif/sumatif dari seluruh kelas secara administratif.</li>
                 <li><b>DKN & Ledger:</b> Melakukan pencetakan massal Daftar Kumpulan Nilai dan Ledger dari tiap kelas di akhir semester.</li>
                 <li><b>Raport:</b> Administrator dapat mencetak rapot seluruh siswa dan mengaksesnya untuk dokumentasi.</li>
               </ul>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-2">4. Fitur Cetak Berkas</h3>
               <p>Admin dapat mencetak atribut kelengkapan administrasi ujian dari menu <b>Cetak</b>.</p>
               <ul className="list-disc pl-5 mt-2 space-y-1">
                 <li><b>Kartu Peserta:</b> Mencetak kartu berisi Nama, NIS, Kelas, Ruang, dan Sandi (Password) peserta didik.</li>
                 <li><b>Daftar Hadir:</b> Lembaran absensi ujian per Ruang/Sesi.</li>
                 <li><b>Berita Acara:</b> Formulir penunjang serah terima dan integritas ujian.</li>
               </ul>
            </div>

             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-2">5. Pengaturan & Reset Data</h3>
               <p>Sistem ini dirancang untuk sustain tiap pergantian semester:</p>
               <ul className="list-disc pl-5 mt-2 space-y-1">
                 <li>Menu <b>Pengaturan:</b> Untuk mengatur nama sekolah, logo, KOP Surat, Tanda Tangan, dan tahun ajaran aktif.</li>
                 <li>Gunakan menu kenaikan kelas untuk rolling otomatis identitas siswa tiap semester/tahun.</li>
                 <li>Hapus Semua Data/Tabel tertentu jika ingin memulai fresh tanpa membebani storage secara radikal (Hati-Hati!).</li>
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
                 <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-1.5"><GraduationCap className="w-4 h-4"/> 3. Input Nilai Mapel (Kurikulum Merdeka)</h3>
                 <p>Guru Mapel menginputkan capaian Nilai Formatif, Sumatif, PTS, hingga PSAS di menu <b>Input Nilai Mapel</b>.</p>
                 <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-700">
                   <li>Pilih Kelas dan Mapel yang Bapak/Ibu ampu untuk membuka tabel nilai. Hanya guru pengampu mapel bersangkutan yang dapat mengeditnya.</li>
                   <li>Terdapat 8 kolom untuk masing-masing Nilai Formatif dan Nilai Sumatif.</li>
                   <li>Jika ada nilai yang kurang memenuhi KKM, manfaatkan fitur <b>Konversi Nilai PTS/PSAS Otomatis</b>.</li>
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
                   <p>Pada menu <b>Data Siswa</b>, Bapak/Ibu dapat mengawasi identitas anak didiknya khusus kelas yang diampu.</p>
                   <ul className="list-disc pl-5 mt-2 space-y-1">
                     <li>Wali Kelas dapat <b>mereset password</b> jika ada siswa yang kesulitan untuk login ujian.</li>
                     <li>Wali Kelas dapat <b>mengubah profil NIS dan nama</b> apabila tidak sesuai.</li>
                     <li>Wali Kelas dapat mencetak <b>Kartu Login Individu</b> per peserta didik.</li>
                   </ul>
                 </div>
                 
                 <div className="bg-amber-50/30 p-4 rounded-xl border border-amber-100">
                    <h3 className="font-bold text-slate-800 mb-2">2. Administrasi Raport Kelas</h3>
                    <p>Wali Kelas berhak mengakses menu <b>Administrasi Raport</b> untuk melihat, mengevaluasi dan mencetak hasil akademik seluruh anak didiknya.</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>Terdapat panel dropdown cetak lengkap: <b>DKN, Ledger Akhir, Ledger PTS, Raport PTS, Raport Semester, Halaman 1 2 (Identitas), dan Halaman 12 13 (Prestasi)</b>.</li>
                      <li><b>Catatan Pembinaan / Wali Kelas:</b> Wali kelas dapat memanfaatkan tombol <b>Isi Otomatis Catatan</b> berbasis AI agar lebih praktis mengenerate motivasi, lalu jangan lupa klik <b>Simpan Catatan Wali Kelas</b>.</li>
                      <li>Pengaturan kop surat sekolah dan tanggal tanda-tangan bisa diakses lewat menu <b>Pengaturan Raport</b>.</li>
                      <li>Jika ada peringatan "Ada Mapel Masih Kosong", mohon hubungi Guru Pengampu mapel terkait untuk segera mengisi nilainya.</li>
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
