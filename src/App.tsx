import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMasterData from './pages/admin/AdminMasterData';
import AdminUjian from './pages/admin/AdminUjian';
import AdminHasil from './pages/admin/AdminHasil';
import GuruLayout from './layouts/GuruLayout';
import GuruDashboard from './pages/guru/GuruDashboard';
import GuruPaketSoal from './pages/guru/GuruPaketSoal';
import GuruSoalDetail from './pages/guru/GuruSoalDetail';
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
            <Route path="ujian" element={<AdminUjian />} />
            <Route path="ujian/soal/:paketId" element={<GuruSoalDetail />} />
            <Route path="hasil" element={<AdminHasil />} />
            <Route path="leger" element={<AdminLeger />} />
          </Route>
        </Route>

        {/* Guru Routes */}
        <Route element={<ProtectedRoute allowedRoles={['guru']} />}>
          <Route path="/guru" element={<GuruLayout />}>
            <Route index element={<GuruDashboard />} />
            <Route path="paket-soal" element={<GuruPaketSoal />} />
            <Route path="paket-soal/:paketId" element={<GuruSoalDetail />} />
            <Route path="hasil" element={<AdminHasil />} />
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
