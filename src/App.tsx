import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { AppGlobalSettings } from './components/AppGlobalSettings';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMasterData from './pages/admin/AdminMasterData';
import AdminBankSoal from './pages/admin/AdminBankSoal';
import AdminUjian from './pages/admin/AdminUjian';
import AdminHasil from './pages/admin/AdminHasil';
import AdminCetak from './pages/admin/AdminCetak';
import AdminDocs from './pages/admin/AdminDocs';
import AdminUsers from './pages/admin/AdminUsers';
import AdminScanLjk from './pages/admin/AdminScanLjk';
import AdminReset from './pages/admin/AdminReset';
import GuruLayout from './layouts/GuruLayout';
import GuruDashboard from './pages/guru/GuruDashboard';
import GuruPaketSoal from './pages/guru/GuruPaketSoal';
import GuruSoalDetail from './pages/guru/GuruSoalDetail';
import GuruProfil from './pages/guru/GuruProfil';
import GuruDataSiswa from './pages/guru/GuruDataSiswa';
import GuruNilaiRaport from './pages/guru/GuruNilaiRaport';
import GuruRaportKelas from './pages/guru/GuruRaportKelas';
import GuruScanLjk from './pages/guru/GuruScanLjk';
import SiswaDashboard from './pages/siswa/SiswaDashboard';
import UjianSession from './pages/siswa/UjianSession';
import { Toaster } from '@/components/ui/sonner';

import AdminLeger from './pages/admin/AdminLeger';
import AdminPengaturan from './pages/admin/AdminPengaturan';
import AdminAdministrasi from './pages/admin/AdminAdministrasi';
import AdminInputNilai from './pages/admin/AdminInputNilai';
import AdminCetakAkademik from './pages/admin/AdminCetakAkademik';

import Panduan from './pages/shared/Panduan';
import InputNilaiEkstrakurikuler from './pages/shared/InputNilaiEkstrakurikuler';
import InputNilaiKokurikuler from './pages/shared/InputNilaiKokurikuler';

export default function App() {
  return (
    <AuthProvider>
      <AppGlobalSettings />
      <Toaster />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Admin Routes with nested Layout */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="master-data" element={<AdminMasterData />} />
            
            {/* Administrasi Routes */}
            <Route path="kurikulum" element={<AdminAdministrasi />} />
            <Route path="kurikulum/akademik/nilai" element={<AdminInputNilai />} />
            <Route path="kurikulum/akademik/ekstrakurikuler" element={<InputNilaiEkstrakurikuler isAdmin={true} />} />
            <Route path="kurikulum/akademik/kokurikuler" element={<InputNilaiKokurikuler isAdmin={true} />} />
            <Route path="kurikulum/akademik/dkn" element={<AdminCetakAkademik />} />
            <Route path="kurikulum/akademik/raport" element={<AdminCetakAkademik />} />
            <Route path="kurikulum/akademik/leger" element={<AdminCetakAkademik />} />
            
            <Route path="sarpras" element={<AdminAdministrasi />} />
            <Route path="kesiswaan" element={<AdminAdministrasi />} />
            <Route path="humas" element={<AdminAdministrasi />} />

            <Route path="bank-soal" element={<AdminBankSoal />} />
            <Route path="bank-soal/:paketId" element={<GuruSoalDetail />} />
            <Route path="ujian" element={<AdminUjian />} />
            <Route path="hasil" element={<AdminHasil />} />
            <Route path="leger" element={<AdminLeger />} />
            <Route path="cetak" element={<AdminCetak />} />
            <Route path="reset" element={<AdminReset />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="docs" element={<AdminDocs />} />
            <Route path="pengaturan" element={<AdminPengaturan />} />
            <Route path="panduan" element={<Panduan />} />
          </Route>
          {/* Fullscreen tools */}
          <Route path="/admin/scan-ljk" element={<AdminScanLjk />} />
        </Route>

        {/* Guru Routes */}
        <Route element={<ProtectedRoute allowedRoles={['guru']} />}>
          <Route path="/guru" element={<GuruLayout />}>
            <Route index element={<Navigate to="paket-soal" replace />} />
            <Route path="paket-soal" element={<GuruPaketSoal />} />
            <Route path="paket-soal/:paketId" element={<GuruSoalDetail />} />
            <Route path="data-siswa" element={<GuruDataSiswa />} />
            <Route path="nilai-raport" element={<GuruNilaiRaport />} />
            <Route path="raport-kelas" element={<GuruRaportKelas />} />
            <Route path="ekstrakurikuler" element={<InputNilaiEkstrakurikuler isAdmin={false} />} />
            <Route path="kokurikuler" element={<InputNilaiKokurikuler isAdmin={false} />} />
            <Route path="hasil" element={<AdminHasil />} />
            <Route path="profil" element={<GuruProfil />} />
            <Route path="panduan" element={<Panduan />} />
          </Route>
        </Route>

        {/* Siswa Routes */}
        <Route element={<ProtectedRoute allowedRoles={['siswa']} />}>
          <Route path="/siswa" element={<SiswaDashboard />} />
          <Route path="/siswa/ujian/:ujianId" element={<UjianSession />} />
        </Route>

        {/* Default route */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
