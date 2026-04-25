import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../store/auth.store';
import { LogOut, LayoutDashboard, Database, FileText, ClipboardCheck, LineChart, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import { useIdleLogout } from '../hooks/useIdleLogout';

export default function AdminLayout() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useIdleLogout(10); // Auto logout 10 menit

  const [isMasterDataOpen, setIsMasterDataOpen] = useState(true);
  const [isAdministrasiOpen, setIsAdministrasiOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Master Data', path: '/admin/master-data', icon: Database, 
      id: 'master-data',
      subItems: [
        { label: 'Data Ruang', path: '/admin/master-data?tab=ruang' },
        { label: 'Data Sesi', path: '/admin/master-data?tab=sesi' },
        { label: 'Jenis Ujian', path: '/admin/master-data?tab=jenis_ujian' }
      ]
    },
    { label: 'Administrasi', path: '/admin/administrasi', icon: FileText,
      id: 'administrasi',
      subItems: [
        { label: 'Data Siswa', path: '/admin/administrasi?tab=siswa' },
        { label: 'Data Guru', path: '/admin/administrasi?tab=guru' },
        { label: 'Data Kelas', path: '/admin/administrasi?tab=kelas' },
        { label: 'Data Mapel', path: '/admin/administrasi?tab=mapel' }
      ]
    },
    { label: 'Bank Soal', path: '/admin/bank-soal', icon: FileText },
    { label: 'Jadwal Ujian', path: '/admin/ujian', icon: Calendar },
    { label: 'Hasil Ujian', path: '/admin/hasil', icon: ClipboardCheck },
    { label: 'Cetak', path: '/admin/cetak', icon: FileText },
    { label: 'Analisis Butir Soal', path: '/admin/analisis', icon: LineChart },
  ];

  return (
    <div className="min-h-screen flex font-sans bg-slate-50">
      {/* Sidebar - Dark theme like the image */}
      <aside className="w-[260px] bg-[#0E1726] text-slate-300 flex flex-col hidden md:flex shrink-0 border-r border-[#1a2942]">
        <div className="h-20 flex items-center px-6 border-b border-[#1a2942]">
          <div className="w-8 h-8 bg-blue-500 rounded-lg shrink-0 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30">
            MG
          </div>
          <span className="font-extrabold text-xl tracking-tight ml-3 text-white">CBT System</span>
        </div>

        <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
           {navItems.map((item) => {
             const isActive = location.pathname === item.path || (item.subItems && location.pathname.startsWith(item.path));
             const Icon = item.icon;
             
             if (item.subItems) {
               const isOpen = item.id === 'master-data' ? isMasterDataOpen : isAdministrasiOpen;
               const setIsOpen = item.id === 'master-data' ? setIsMasterDataOpen : setIsAdministrasiOpen;
               
               return (
                 <div key={item.path} className="space-y-1">
                   <button
                     onClick={() => {
                        setIsOpen(!isOpen);
                     }}
                     className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                       isActive 
                         ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                         : 'text-slate-400 hover:text-slate-100 hover:bg-[#1a2942]'
                     }`}
                   >
                     <div className="flex items-center gap-3">
                       <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                       {item.label}
                     </div>
                     {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                   </button>
                   {isOpen && (
                     <div className="pl-4 pr-2 py-1 space-y-1">
                       {item.subItems.map(subItem => {
                         const searchParams = new URLSearchParams(location.search);
                         const currentTab = searchParams.get('tab');
                         const subItemTab = new URLSearchParams(subItem.path.split('?')[1]).get('tab');
                         
                         const isSubActive = currentTab === subItemTab || (!currentTab && location.pathname === item.path && ((item.id === 'master-data' && subItemTab === 'ruang') || (item.id === 'administrasi' && subItemTab === 'siswa')));
                         return (
                           <button
                             key={subItem.path}
                             onClick={() => navigate(subItem.path)}
                             className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                               isSubActive 
                                 ? 'bg-[#1a2942] text-blue-400 border border-blue-500/20' 
                                 : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2942]/50'
                             }`}
                           >
                             <div className={`w-1.5 h-1.5 rounded-full ${isSubActive ? 'bg-blue-500' : 'bg-slate-600'}`} />
                             {subItem.label}
                           </button>
                         )
                       })}
                     </div>
                   )}
                 </div>
               );
             }

             return (
               <button
                 key={item.path}
                 onClick={() => navigate(item.path)}
                 className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                   isActive 
                     ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                     : 'text-slate-400 hover:text-slate-100 hover:bg-[#1a2942]'
                 }`}
               >
                 <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                 {item.label}
               </button>
             );
           })}
        </div>
        
        {/* User Info & Logout at bottom */}
        <div className="p-4 border-t border-[#1a2942]">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
               {profile?.displayName?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-sm font-semibold text-white truncate">{profile?.displayName || 'Administrator'}</p>
               <p className="text-xs text-slate-400">Otoritas Sistem</p>
            </div>
          </div>
          <button
                 onClick={() => auth.signOut()}
                 className={`w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-xl transition-all text-rose-400 hover:text-rose-300 hover:bg-rose-400/10`}
               >
                 <LogOut className="w-4 h-4" />
                 Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
         {/* Mobile Header */}
         <div className="md:hidden h-16 bg-[#0E1726] text-white flex items-center px-4 justify-between shrink-0">
            <div className="font-bold flex items-center gap-2">
               <div className="w-8 h-8 bg-blue-500 rounded-lg shrink-0 flex items-center justify-center font-bold">MG</div>
               CBT System
            </div>
            <button onClick={() => auth.signOut()}>
              <LogOut className="w-5 h-5" />
            </button>
         </div>

         <div className="flex-1 overflow-auto bg-slate-50 relative">
           <Outlet />
           
           <div className="p-6 text-center text-xs text-slate-400 font-medium tracking-widest uppercase">
              © 2026 DEVELOPED BY MGHOUSE DIGITAL - ALL RIGHTS RESERVED
           </div>
         </div>
      </div>
    </div>
  );
}
