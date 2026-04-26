import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
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
import GuruLayout from './layouts/GuruLayout';
import GuruDashboard from './pages/guru/GuruDashboard';
import GuruPaketSoal from './pages/guru/GuruPaketSoal';
import GuruSoalDetail from './pages/guru/GuruSoalDetail';
import GuruProfil from './pages/guru/GuruProfil';
import GuruScanLjk from './pages/guru/GuruScanLjk';
import SiswaDashboard from './pages/siswa/SiswaDashboard';
import UjianSession from './pages/siswa/UjianSession';
import { Toaster } from '@/components/ui/sonner';

import AdminLeger from './pages/admin/AdminLeger';

export default function App() {
  return (
    <AuthProvider>
      <Toaster />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Admin Routes with nested Layout */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="master-data" element={<AdminMasterData />} />
            <Route path="administrasi" element={<AdminMasterData />} />
            <Route path="bank-soal" element={<AdminBankSoal />} />
            <Route path="bank-soal/:paketId" element={<GuruSoalDetail />} />
            <Route path="ujian" element={<AdminUjian />} />
            <Route path="hasil" element={<AdminHasil />} />
            <Route path="leger" element={<AdminLeger />} />
            <Route path="cetak" element={<AdminCetak />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="docs" element={<AdminDocs />} />
          </Route>
          {/* Fullscreen tools */}
          <Route path="/admin/scan-ljk" element={<AdminScanLjk />} />
        </Route>

        {/* Guru Routes */}
        <Route element={<ProtectedRoute allowedRoles={['guru']} />}>
          <Route path="/guru" element={<GuruLayout />}>
            <Route index element={<GuruDashboard />} />
            <Route path="paket-soal" element={<GuruPaketSoal />} />
            <Route path="paket-soal/:paketId" element={<GuruSoalDetail />} />
            <Route path="hasil" element={<AdminHasil />} />
            <Route path="cetak" element={<AdminCetak />} />
            <Route path="profil" element={<GuruProfil />} />
          </Route>
          <Route path="/guru/scan" element={<GuruScanLjk />} />
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
